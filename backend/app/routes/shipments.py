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

import json
import os
import re
import secrets
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

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
US_TOLL_FREE_CODES = {"800", "833", "844", "855", "866", "877", "888"}
US_STATE_ABBREVIATIONS = {
    "alabama": "al", "alaska": "ak", "arizona": "az", "arkansas": "ar",
    "california": "ca", "colorado": "co", "connecticut": "ct", "delaware": "de",
    "florida": "fl", "georgia": "ga", "hawaii": "hi", "idaho": "id",
    "illinois": "il", "indiana": "in", "iowa": "ia", "kansas": "ks",
    "kentucky": "ky", "louisiana": "la", "maine": "me", "maryland": "md",
    "massachusetts": "ma", "michigan": "mi", "minnesota": "mn", "mississippi": "ms",
    "missouri": "mo", "montana": "mt", "nebraska": "ne", "nevada": "nv",
    "new hampshire": "nh", "new jersey": "nj", "new mexico": "nm", "new york": "ny",
    "north carolina": "nc", "north dakota": "nd", "ohio": "oh", "oklahoma": "ok",
    "oregon": "or", "pennsylvania": "pa", "rhode island": "ri", "south carolina": "sc",
    "south dakota": "sd", "tennessee": "tn", "texas": "tx", "utah": "ut",
    "vermont": "vt", "virginia": "va", "washington": "wa", "west virginia": "wv",
    "wisconsin": "wi", "wyoming": "wy", "district of columbia": "dc",
}


def _normalize_location(value):
    return re.sub(r"[^a-z0-9]", "", (value or "").casefold())


def _lookup_postal_locations(country, postal_code):
    lookup_postal_code = postal_code[:5] if country == "United States" else postal_code
    if country == "United States":
        url = f"https://api.zippopotam.us/us/{lookup_postal_code}"
    else:
        url = f"https://api.postalpincode.in/pincode/{lookup_postal_code}"

    request = Request(url, headers={"User-Agent": "DeliveryHub/1.0"})
    try:
        with urlopen(request, timeout=4) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        if error.code == 404:
            return []
        current_app.logger.warning(
            "Postal lookup failed for %s: HTTP %s", country, error.code
        )
        raise RuntimeError("Postal-code verification is temporarily unavailable. Please try again.") from error
    except (URLError, TimeoutError, OSError, ValueError) as error:
        current_app.logger.warning("Postal lookup failed for %s: %s", country, type(error).__name__)
        raise RuntimeError("Postal-code verification is temporarily unavailable. Please try again.") from error

    if country == "United States":
        places = result.get("places") if isinstance(result, dict) else None
        if not places:
            return []
        return [
            {
                "cities": [place.get("place name", "")],
                "states": [place.get("state", ""), place.get("state abbreviation", "")],
            }
            for place in places
        ]

    if not isinstance(result, list) or not result or result[0].get("Status") != "Success":
        return []
    offices = result[0].get("PostOffice") or []
    return [
        {
            "cities": [office.get("Name", ""), office.get("District", "")],
            "states": [office.get("State", "")],
        }
        for office in offices
    ]


def _phone_error(phone, country, role):
    if re.search(r"[^\d\s()+.-]", phone or ""):
        return f"Enter a valid {role} phone number for {country}."
    digits = re.sub(r"\D", "", phone or "")
    country_code = "91" if country == "India" else "1"
    if not digits.startswith(country_code):
        return f"Enter a valid {role} phone number for {country}."
    national_number = digits[len(country_code):]
    if country == "India":
        if not re.fullmatch(r"[6-9]\d{9}", national_number):
            return f"Enter a valid 10-digit {role} Indian mobile number starting with 6, 7, 8, or 9."
    else:
        if not re.fullmatch(r"[2-9]\d{2}[2-9]\d{6}", national_number):
            return f"Enter a valid 10-digit {role} U.S. phone number."
        if national_number[:3] in US_TOLL_FREE_CODES:
            return f"Toll-free numbers cannot be used as the {role} contact."
    return None


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
                return jsonify({"error": f"Enter a valid 6-digit {role} postal code."}), 400
        elif not re.fullmatch(r"\d{5}(?:-\d{4})?", postal_code):
            return jsonify({"error": f"Enter a valid {role} ZIP code (5 digits or ZIP+4)."}), 400

        phone_error = _phone_error(data.get(f"{role}_phone"), expected_country, role)
        if phone_error:
            return jsonify({"error": phone_error}), 400

        city = (data.get(f"{role}_city") or "").strip()
        province = (data.get(f"{role}_province") or "").strip()
        if not city:
            return jsonify({"error": f"Enter the {role} city."}), 400
        if not province:
            return jsonify({"error": f"Enter the {role} state or province."}), 400
        try:
            locations = _lookup_postal_locations(expected_country, postal_code)
        except RuntimeError as error:
            return jsonify({"error": str(error)}), 503
        if not locations:
            label = "ZIP code" if expected_country == "United States" else "postal code"
            return jsonify({"error": f"The {role} {label} was not found."}), 400

        city_matches = any(
            _normalize_location(city) == _normalize_location(candidate)
            for location in locations for candidate in location["cities"] if candidate
        )
        state_values = {
            _normalize_location(candidate)
            for location in locations for candidate in location["states"] if candidate
        }
        if expected_country == "United States":
            matched_state_abbr = next(
                (abbr for state, abbr in US_STATE_ABBREVIATIONS.items()
                 if _normalize_location(state) in state_values),
                None,
            )
            if matched_state_abbr:
                state_values.add(_normalize_location(matched_state_abbr))
        state_matches = _normalize_location(province) in state_values
        if not city_matches or not state_matches:
            return jsonify({
                "error": (
                    f"The {role} city and state/province do not match "
                    f"postal code {postal_code}."
                )
            }), 400
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

    currency_code = "INR" if data.get("route_direction") == "IN_TO_US" else "USD"
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

    selected_price = (
        sub_service.price_inr if currency_code == "INR" else sub_service.price
    ) if sub_service else (
        tier.price_inr if currency_code == "INR" else tier.price
    )
    if selected_price is None:
        label = "INR" if currency_code == "INR" else "USD"
        return None, None, None, None, None, None, None, (
            jsonify({"error": f"{label} pricing is not set for this option yet. Please contact us."}), 400
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
    is_document_service = service.slug in {"document-services", "document-shipping"}
    booking_fields = [] if is_document_service else service.fields

    for field in booking_fields:
        value = submitted_values.get(field.field_key)
        field_label = "Date of Booking" if is_document_service else field.label

        if field.field_type == "file":
            continue

        if field.field_type == "checkbox":
            # Checkboxes are the one type where "unchecked" is a real,
            # valid answer — presence, not truthiness, is what's required.
            if field.field_key not in submitted_values:
                return None, None, None, None, None, None, None, (
                    jsonify({"error": f"'{field_label}' is required."}), 400
                )
            field_values[field.field_key] = bool(value)
            continue

        if value is None or (isinstance(value, str) and not value.strip()):
            return None, None, None, None, None, None, None, (
                jsonify({"error": f"'{field_label}' is required."}), 400
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


def _price_booking(tier, sub_service, quantity, currency_code):
    price = (
        sub_service.price_inr if currency_code == "INR" else sub_service.price
    ) if sub_service else (
        tier.price_inr if currency_code == "INR" else tier.price
    )
    unit_price = float(price)
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

    currency_code = "INR" if route_direction == "IN_TO_US" else "USD"
    unit_price, total_price = _price_booking(tier, sub_service, quantity, currency_code)

    shipment = Shipment(
        shipment_number=generate_shipment_number(),
        customer_id=customer.id,
        route_direction=route_direction,
        currency_code=currency_code,
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
    from app.models.customer import Customer
    service, tier, sub_service, quantity, field_values, sender, receiver, err = _validate_booking(data)
    if err:
        return err

    is_document_service = service.slug in {"document-services", "document-shipping"}
    if not guest_email and not is_document_service:
        return jsonify({"error": "Email is required."}), 400

    customer = None
    if guest_email:
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

    currency_code = "INR" if route_direction == "IN_TO_US" else "USD"
    unit_price, total_price = _price_booking(tier, sub_service, quantity, currency_code)

    shipment = Shipment(
        shipment_number=generate_shipment_number(),
        customer_id=customer.id if customer else None,
        route_direction=route_direction,
        currency_code=currency_code,
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
