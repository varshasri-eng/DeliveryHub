"""
Shipment Routes
----------------
GET  /api/shipments              - list current customer's shipments
GET  /api/shipments/<id>         - shipment detail (owner only)
POST /api/shipments              - book a shipment (authenticated)
POST /api/shipments/guest        - book a shipment (no auth)

POST /api/shipments/<id>/invoice/payment - submit payment proof
     (unchanged pattern from the original app: moves the invoice to
     'payment_submitted' for an admin to review/verify separately)

Unlike a product order, a shipment has no inventory to reserve — the
service (Document Shipping, Air Cargo, etc.) and its pricing tier are
admin-defined content, not stock. Validation here is about making sure
the customer actually filled in every field the admin configured for
that service (service_fields), not about availability.
"""

import os
import re
import secrets
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from app import db
from app.models.shipment import Shipment, generate_shipment_number
from app.models.service_type import ServiceType, ServicePricingTier, ServiceSubservice
from app.utils.auth import login_required

shipments_bp = Blueprint("shipments", __name__)

PAYMENT_SCREENSHOT_SUBDIR = os.path.join("static", "uploads", "payment_screenshots")
PAYMENT_SCREENSHOT_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "pdf"}
PAYMENT_SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
VALID_ROUTE_DIRECTIONS = {"US_TO_IN", "IN_TO_US"}
ROUTE_COUNTRIES = {
    "US_TO_IN": ("United States", "India"),
    "IN_TO_US": ("India", "United States"),
}


def _validate_route_details(data, direction):
    sender_country, receiver_country = ROUTE_COUNTRIES[direction]
    for role, expected_country in (
        ("sender", sender_country),
        ("receiver", receiver_country),
    ):
        country = (data.get(f"{role}_country") or "").strip()
        if country != expected_country:
            return jsonify({"error": f"{role.title()} country must be {expected_country} for this direction."}), 400

        postal_code = (data.get(f"{role}_postal_code") or "").strip()
        if expected_country == "India":
            if not re.fullmatch(r"\d{6}", postal_code):
                return jsonify({"error": f"Enter a valid 6-digit {role} PIN code."}), 400
        elif not re.fullmatch(r"\d{5}(?:-\d{4})?", postal_code):
            return jsonify({"error": f"Enter a valid {role} ZIP code (5 digits or ZIP+4)."}), 400
    return None


def _validate_booking(data):
    """
    Validate a shipment booking request against its service type,
    pricing tier, quantity, sender/receiver info, and the service's
    admin-defined fields.

    Returns (service, tier, sub_service, quantity, field_values, sender,
    receiver, error_response). error_response is None on success; on failure
    it's a (jsonify(...), status_code) tuple the caller should return
    immediately.
    """
    service_type_id = data.get("service_type_id")
    pricing_tier_id = data.get("pricing_tier_id")

    service = ServiceType.query.filter_by(id=service_type_id, is_active=True).first()
    if not service:
        return None, None, None, None, None, None, None, (
            jsonify({"error": "Service not found."}), 404
        )

    tier = ServicePricingTier.query.filter_by(
        id=pricing_tier_id, service_type_id=service.id
    ).first()
    if not tier:
        return None, None, None, None, None, None, None, (
            jsonify({"error": "Selected pricing tier does not belong to this service."}), 400
        )

    sub_service_id = data.get("sub_service_id")
    sub_service = None
    if tier.sub_services:
        if sub_service_id is None:
            return None, None, None, None, None, None, None, (
                jsonify({"error": "Choose a sub-service for this delivery option."}), 400
            )
        sub_service = ServiceSubservice.query.filter_by(
            id=sub_service_id,
            pricing_tier_id=tier.id,
        ).first()
        if not sub_service:
            return None, None, None, None, None, None, None, (
                jsonify({"error": "Selected sub-service does not belong to this delivery option."}), 400
            )
    elif sub_service_id is not None:
        return None, None, None, None, None, None, None, (
            jsonify({"error": "Selected sub-service does not belong to this delivery option."}), 400
        )

    # ── quantity ─────────────────────────────────────────────
    quantity = 1
    if service.enable_quantity:
        try:
            quantity = int(data.get("quantity", 1))
        except (TypeError, ValueError):
            quantity = 0
        if quantity <= 0:
            return None, None, None, None, None, None, None, (
                jsonify({"error": "Quantity must be a positive integer."}), 400
            )

    # ── sender / receiver ────────────────────────────────────
    sender = {
        "name": (data.get("sender_name") or "").strip(),
        "phone": (data.get("sender_phone") or "").strip(),
        "address": (data.get("sender_address") or "").strip(),
    }
    receiver = {
        "name": (data.get("receiver_name") or "").strip(),
        "phone": (data.get("receiver_phone") or "").strip(),
        "address": (data.get("receiver_address") or "").strip(),
    }
    for role, info in (("Sender", sender), ("Receiver", receiver)):
        if not info["name"] or not info["phone"] or not info["address"]:
            return None, None, None, None, None, None, None, (
                jsonify({"error": f"{role} name, phone, and address are all required."}), 400
            )

    # ── service-specific fields — every configured field is required ──
    submitted_values = data.get("field_values") or {}
    field_values = {}
    for field in service.fields:
        value = submitted_values.get(field.field_key)

        if field.field_type == "file":
            continue

        if field.field_type == "checkbox":
            # Checkboxes are the one type where "unchecked" is a real,
            # valid answer — presence, not truthiness, is what's required.
            if field.field_key not in submitted_values:
                return None, None, None, None, None, None, None, (
                    jsonify({"error": f"'{field.label}' is required."}), 400
                )
            field_values[field.field_key] = bool(value)
            continue

        if value is None or (isinstance(value, str) and not value.strip()):
            return None, None, None, None, None, None, None, (
                jsonify({"error": f"'{field.label}' is required."}), 400
            )

        if field.field_type == "number":
            try:
                value = float(value)
            except (TypeError, ValueError):
                return None, None, None, None, None, None, None, (
                    jsonify({"error": f"'{field.label}' must be a number."}), 400
                )
        elif field.field_type == "select":
            options = field.options or []
            if value not in options:
                return None, None, None, None, None, None, None, (
                    jsonify({"error": f"'{field.label}' must be one of: {options}"}), 400
                )

        field_values[field.field_key] = value

    return service, tier, sub_service, quantity, field_values, sender, receiver, None


def _price_booking(tier, sub_service, quantity):
    unit_price = float(sub_service.price if sub_service else tier.price)
    total_price = round(unit_price * quantity, 2)
    return unit_price, total_price


# ── AUTHENTICATED ────────────────────────────────────────────
@shipments_bp.route("", methods=["GET"])
@login_required
def list_shipments(customer):
    shipments = (
        Shipment.query.filter_by(customer_id=customer.id)
        .order_by(Shipment.created_at.desc())
        .all()
    )
    return jsonify({
        "count": len(shipments),
        "shipments": [s.to_dict() for s in shipments],
    }), 200


@shipments_bp.route("/<int:shipment_id>", methods=["GET"])
@login_required
def get_shipment(customer, shipment_id):
    shipment = Shipment.query.filter_by(id=shipment_id, customer_id=customer.id).first()
    if not shipment:
        return jsonify({"error": "Shipment not found."}), 404
    return jsonify({"shipment": shipment.to_dict()}), 200


@shipments_bp.route("", methods=["POST"])
@login_required
def create_shipment(customer):
    data = request.get_json(silent=True) or {}
    route_direction = data.get("route_direction")
    if route_direction not in VALID_ROUTE_DIRECTIONS:
        return jsonify({"error": "Choose a valid shipment direction."}), 400
    route_error = _validate_route_details(data, route_direction)
    if route_error:
        return route_error

    service, tier, sub_service, quantity, field_values, sender, receiver, err = _validate_booking(data)
    if err:
        return err

    unit_price, total_price = _price_booking(tier, sub_service, quantity)

    shipment = Shipment(
        shipment_number=generate_shipment_number(),
        customer_id=customer.id,
        route_direction=route_direction,
        service_type_id=service.id,
        pricing_tier_id=tier.id,
        sub_service_id=sub_service.id if sub_service else None,
        sub_service_name=sub_service.name if sub_service else None,
        quantity=quantity,
        unit_price=unit_price,
        total_price=total_price,
        sender_name=sender["name"],
        sender_phone=sender["phone"],
        sender_address=sender["address"],
        receiver_name=receiver["name"],
        receiver_phone=receiver["phone"],
        receiver_address=receiver["address"],
        field_values=field_values,
        notes=(data.get("notes") or "").strip() or None,
        status="requested",
    )
    db.session.add(shipment)
    db.session.commit()

    return jsonify({
        "message": "Shipment booked successfully.",
        "shipment": shipment.to_dict(),
    }), 201


# ── GUEST (no auth required) ─────────────────────────────────
@shipments_bp.route("/guest", methods=["POST"])
def create_guest_shipment():
    data = request.get_json(silent=True) or {}
    route_direction = data.get("route_direction")
    if route_direction not in VALID_ROUTE_DIRECTIONS:
        return jsonify({"error": "Choose a valid shipment direction."}), 400
    route_error = _validate_route_details(data, route_direction)
    if route_error:
        return route_error

    guest_name = (data.get("guest_name") or "").strip()
    guest_email = (data.get("guest_email") or "").strip()
    guest_phone = (data.get("guest_phone") or "").strip()

    if not guest_name:
        return jsonify({"error": "Name is required."}), 400
    if not guest_email:
        return jsonify({"error": "Email is required."}), 400

    from app.models.customer import Customer
    customer = Customer.query.filter_by(email=guest_email).first()
    if not customer:
        guest_phone = guest_phone or f"guest-{guest_email.split('@')[0]}"
        if Customer.query.filter_by(phone=guest_phone).first():
            guest_phone = f"guest-{secrets.token_hex(6)}"
        customer = Customer(
            name=guest_name,
            email=guest_email,
            phone=guest_phone,
            role="customer",
            is_active=True,
        )
        db.session.add(customer)
        db.session.flush()

    service, tier, sub_service, quantity, field_values, sender, receiver, err = _validate_booking(data)
    if err:
        return err

    unit_price, total_price = _price_booking(tier, sub_service, quantity)

    shipment = Shipment(
        shipment_number=generate_shipment_number(),
        customer_id=customer.id,
        route_direction=route_direction,
        service_type_id=service.id,
        pricing_tier_id=tier.id,
        sub_service_id=sub_service.id if sub_service else None,
        sub_service_name=sub_service.name if sub_service else None,
        quantity=quantity,
        unit_price=unit_price,
        total_price=total_price,
        sender_name=sender["name"],
        sender_phone=sender["phone"],
        sender_address=sender["address"],
        receiver_name=receiver["name"],
        receiver_phone=receiver["phone"],
        receiver_address=receiver["address"],
        field_values=field_values,
        notes=(data.get("notes") or "").strip() or None,
        status="requested",
    )
    db.session.add(shipment)
    db.session.commit()

    return jsonify({
        "message": "Shipment booked successfully.",
        "shipment": shipment.to_dict(),
    }), 201


# ── PAYMENT PROOF SUBMISSION ──────────────────────────────────
@shipments_bp.route("/<int:shipment_id>/invoice/payment", methods=["POST"])
@login_required
def submit_payment_proof(customer, shipment_id):
    shipment = Shipment.query.filter_by(id=shipment_id, customer_id=customer.id).first()
    if not shipment:
        return jsonify({"error": "Shipment not found."}), 404

    invoice = shipment.invoice
    if not invoice:
        return jsonify({"error": "This shipment does not have an invoice yet."}), 404

    if invoice.status not in {"issued", "payment_rejected"}:
        return jsonify({
            "error": (
                "Payment proof has already been submitted for this invoice."
                if invoice.status == "payment_submitted"
                else "This invoice has already been verified."
            )
        }), 400

    note = (request.form.get("note") or "").strip()
    file = request.files.get("screenshot")
    has_file = bool(file and file.filename)

    if not has_file and not note:
        return jsonify({"error": "Please upload a screenshot or add a note."}), 400

    screenshot_path = invoice.payment_screenshot_path

    if has_file:
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in PAYMENT_SCREENSHOT_EXTENSIONS:
            return jsonify({"error": "Screenshot must be an image (png/jpg/jpeg/webp) or PDF."}), 400

        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)
        if size > PAYMENT_SCREENSHOT_MAX_BYTES:
            return jsonify({"error": "Screenshot must be under 5MB."}), 400

        upload_dir = os.path.join(current_app.root_path, PAYMENT_SCREENSHOT_SUBDIR)
        os.makedirs(upload_dir, exist_ok=True)

        timestamp = int(datetime.now(timezone.utc).timestamp())
        filename = secure_filename(f"invoice_{invoice.id}_{timestamp}.{ext}")
        file.save(os.path.join(upload_dir, filename))
        screenshot_path = f"/static/uploads/payment_screenshots/{filename}"

    invoice.payment_screenshot_path = screenshot_path
    invoice.payment_note = note or invoice.payment_note
    invoice.payment_submitted_at = datetime.now(timezone.utc)
    invoice.status = "payment_submitted"
    invoice.payment_rejection_reason = None

    db.session.commit()

    return jsonify({
        "message": "Payment proof submitted. Awaiting admin verification.",
        "invoice": invoice.to_dict(),
    }), 200


# ── PUBLIC TRACKING ──────────────────────────────────────────
# No auth required — anyone with the shipment number can check status.
# Returns only non-sensitive fields: never addresses, phone numbers,
# or who booked it. The shipment_number itself is an unguessable
# random token (see generate_shipment_number), which is the only
# protection this needs for a first version.
@shipments_bp.route("/track/<shipment_number>", methods=["GET"])
def track_shipment(shipment_number):
    shipment = Shipment.query.filter_by(shipment_number=shipment_number).first()
    if not shipment:
        return jsonify({"error": "No shipment found with that number."}), 404

    return jsonify({
        "shipment": {
            "shipment_number": shipment.shipment_number,
            "service_name": shipment.service_type.name if shipment.service_type else None,
            "tier_name": shipment.pricing_tier.tier_name if shipment.pricing_tier else None,
            "sub_service_name": shipment.sub_service_name,
            "status": shipment.status,
            "created_at": shipment.created_at.isoformat() if shipment.created_at else None,
            "updated_at": shipment.updated_at.isoformat() if shipment.updated_at else None,
        }
    }), 200
