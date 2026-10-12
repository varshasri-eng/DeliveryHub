"""
Admin Shipment Management Routes
-----------------------------------
GET  /api/admin/shipments                      - list all shipments, optional ?status= filter  [read]
GET  /api/admin/shipments/<id>                  - one shipment, full detail                     [read]
PUT  /api/admin/shipments/<id>/status           - update status (requested/picked_up/etc.)       [write]

-- Billing (same issued -> payment_submitted -> verified/rejected flow
   as the original app, now pointing at shipments instead of orders) --
POST /api/admin/shipments/<id>/invoice          - raise an invoice for this shipment  [write]
PUT  /api/admin/invoices/<id>/verify            - mark payment verified              [write]
PUT  /api/admin/invoices/<id>/reject            - mark payment rejected (with reason) [write]
"""

from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from flask import Blueprint, request, jsonify
from app import db
from app.models.shipment import Shipment, VALID_SHIPMENT_STATUSES
from app.models.invoice import Invoice, InvoiceItem
from app.utils.auth import permission_required

admin_shipments_bp = Blueprint("admin_shipments", __name__)


def _generate_invoice_number():
    last = Invoice.query.order_by(Invoice.id.desc()).first()
    next_id = (last.id + 1) if last else 1
    return f"INV-{10000 + next_id}"


def _parse_invoice_draft(shipment, data):
    raw_items = data.get("items")
    if not isinstance(raw_items, list) or not raw_items or len(raw_items) > 10:
        return None, "Invoice must contain between 1 and 10 line items."

    items = []
    subtotal = Decimal("0.00")
    for raw_item in raw_items:
        if not isinstance(raw_item, dict):
            return None, "Each invoice line item must be an object."
        description = str(raw_item.get("description") or "").strip()
        if not description or len(description) > 255:
            return None, "Each invoice line needs a description of at most 255 characters."
        try:
            quantity = int(raw_item.get("quantity"))
            unit_price = Decimal(str(raw_item.get("unit_price")))
        except (TypeError, ValueError, InvalidOperation):
            return None, "Enter a valid quantity and unit price for each invoice line."
        if quantity < 1 or not unit_price.is_finite() or unit_price < 0:
            return None, "Invoice quantity must be positive and unit price cannot be negative."
        if unit_price > Decimal("99999999.99"):
            return None, "Invoice unit price exceeds the supported limit."
        line_total = (unit_price * quantity).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP,
        )
        if line_total > Decimal("99999999.99"):
            return None, "Invoice line total exceeds the supported limit."
        items.append({
            "description": description,
            "quantity": quantity,
            "unit_price": unit_price,
            "line_total": line_total,
        })
        subtotal += line_total
    subtotal = subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if subtotal > Decimal("99999999.99"):
        return None, "Invoice subtotal exceeds the supported limit."

    offer_discount = Decimal(str(shipment.offer_discount_amount or 0)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP,
    )
    if offer_discount > subtotal:
        return None, "Invoice subtotal cannot be less than the applied offer-code discount."

    discount_type = data.get("manual_discount_type", "none")
    if discount_type not in {"none", "percentage", "fixed"}:
        return None, "Manual discount must be none, percentage, or fixed."
    try:
        discount_value = Decimal(str(data.get("manual_discount_value", 0)))
    except (TypeError, ValueError, InvalidOperation):
        return None, "Enter a valid manual discount."
    if not discount_value.is_finite() or discount_value < 0:
        return None, "Manual discount cannot be negative."
    discount_base = subtotal - offer_discount
    if discount_type == "none":
        discount_value = Decimal("0.00")
        manual_discount = Decimal("0.00")
    elif discount_type == "percentage":
        if discount_value > 100:
            return None, "Percentage discount cannot exceed 100%."
        manual_discount = (discount_base * discount_value / 100).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP,
        )
    else:
        manual_discount = discount_value.quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP,
        )
        if manual_discount > discount_base:
            return None, "Fixed discount cannot be greater than the amount remaining after the offer code."

    return {
        "items": items,
        "subtotal_amount": subtotal,
        "offer_discount_amount": offer_discount,
        "manual_discount_type": discount_type,
        "manual_discount_value": discount_value,
        "manual_discount_amount": manual_discount,
        "total_amount": subtotal - offer_discount - manual_discount,
    }, None


def _replace_invoice_items(invoice, item_values):
    invoice.items.clear()
    invoice.items.extend(
        InvoiceItem(
            description=item["description"],
            quantity=item["quantity"],
            unit_price=item["unit_price"],
            line_total=item["line_total"],
        )
        for item in item_values
    )


# ── SHIPMENTS ────────────────────────────────────────────────
@admin_shipments_bp.route("", methods=["GET"])
@permission_required("read")
def list_shipments(customer):
    query = Shipment.query
    status = request.args.get("status")
    if status:
        if status not in VALID_SHIPMENT_STATUSES:
            return jsonify({"error": f"status must be one of: {sorted(VALID_SHIPMENT_STATUSES)}"}), 400
        query = query.filter_by(status=status)

    shipments = query.order_by(Shipment.created_at.desc()).all()
    return jsonify({
        "count": len(shipments),
        "shipments": [s.to_dict() for s in shipments],
    }), 200


@admin_shipments_bp.route("/<int:shipment_id>", methods=["GET"])
@permission_required("read")
def get_shipment(customer, shipment_id):
    shipment = Shipment.query.get(shipment_id)
    if not shipment:
        return jsonify({"error": "Shipment not found."}), 404
    return jsonify({"shipment": shipment.to_dict()}), 200


@admin_shipments_bp.route("/<int:shipment_id>/status", methods=["PUT"])
@permission_required("write")
def update_status(customer, shipment_id):
    shipment = Shipment.query.get(shipment_id)
    if not shipment:
        return jsonify({"error": "Shipment not found."}), 404

    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    if new_status not in VALID_SHIPMENT_STATUSES:
        return jsonify({"error": f"status must be one of: {sorted(VALID_SHIPMENT_STATUSES)}"}), 400

    shipment.status = new_status
    db.session.commit()
    return jsonify({"message": "Status updated.", "shipment": shipment.to_dict()}), 200


# ── BILLING ──────────────────────────────────────────────────
@admin_shipments_bp.route("/<int:shipment_id>/invoice", methods=["POST"])
@permission_required("write")
def raise_invoice(customer, shipment_id):
    shipment = Shipment.query.get(shipment_id)
    if not shipment:
        return jsonify({"error": "Shipment not found."}), 404
    if shipment.invoice:
        return jsonify({"error": "This shipment already has an invoice."}), 409

    data = request.get_json(silent=True) or {}
    if "items" not in data:
        data["items"] = [{
            "description": (
                f"{shipment.service_type.name} — {shipment.pricing_tier.tier_name}"
                f"{' — ' + shipment.sub_service_name if shipment.sub_service_name else ''}"
            ),
            "quantity": shipment.quantity,
            "unit_price": float(shipment.unit_price),
        }]
    values, error = _parse_invoice_draft(shipment, data)
    if error:
        return jsonify({"error": error}), 400

    invoice = Invoice(
        invoice_number=_generate_invoice_number(),
        shipment_id=shipment.id,
        subtotal_amount=values["subtotal_amount"],
        offer_code=shipment.offer_code,
        offer_discount_amount=values["offer_discount_amount"],
        manual_discount_type=values["manual_discount_type"],
        manual_discount_value=values["manual_discount_value"],
        manual_discount_amount=values["manual_discount_amount"],
        total_amount=values["total_amount"],
        status="issued",
    )
    db.session.add(invoice)
    db.session.flush()
    _replace_invoice_items(invoice, values["items"])
    db.session.commit()

    return jsonify({"message": "Invoice raised.", "invoice": invoice.to_dict()}), 201


@admin_shipments_bp.route("/invoices/<int:invoice_id>", methods=["PUT"])
@permission_required("write")
def update_invoice(customer, invoice_id):
    invoice = Invoice.query.get(invoice_id)
    if not invoice:
        return jsonify({"error": "Invoice not found."}), 404
    if invoice.status != "issued":
        return jsonify({
            "error": "Invoices cannot be edited after payment proof has been submitted or verified.",
        }), 409

    data = request.get_json(silent=True) or {}
    values, error = _parse_invoice_draft(invoice.shipment, data)
    if error:
        return jsonify({"error": error}), 400

    invoice.subtotal_amount = values["subtotal_amount"]
    invoice.offer_discount_amount = values["offer_discount_amount"]
    invoice.manual_discount_type = values["manual_discount_type"]
    invoice.manual_discount_value = values["manual_discount_value"]
    invoice.manual_discount_amount = values["manual_discount_amount"]
    invoice.total_amount = values["total_amount"]
    _replace_invoice_items(invoice, values["items"])
    db.session.commit()
    return jsonify({"message": "Invoice updated.", "invoice": invoice.to_dict()}), 200


@admin_shipments_bp.route("/invoices/<int:invoice_id>/verify", methods=["PUT"])
@permission_required("write")
def verify_payment(customer, invoice_id):
    invoice = Invoice.query.get(invoice_id)
    if not invoice:
        return jsonify({"error": "Invoice not found."}), 404
    if invoice.status != "payment_submitted":
        return jsonify({"error": "This invoice has no pending payment submission to verify."}), 400

    invoice.status = "payment_verified"
    invoice.paid_at = datetime.now(timezone.utc)
    invoice.payment_verified_by = customer.id
    db.session.commit()

    return jsonify({"message": "Payment verified.", "invoice": invoice.to_dict()}), 200


@admin_shipments_bp.route("/invoices/<int:invoice_id>/reject", methods=["PUT"])
@permission_required("write")
def reject_payment(customer, invoice_id):
    invoice = Invoice.query.get(invoice_id)
    if not invoice:
        return jsonify({"error": "Invoice not found."}), 404
    if invoice.status != "payment_submitted":
        return jsonify({"error": "This invoice has no pending payment submission to reject."}), 400

    data = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "").strip()

    invoice.status = "payment_rejected"
    invoice.payment_rejection_reason = reason or None
    db.session.commit()

    return jsonify({"message": "Payment rejected.", "invoice": invoice.to_dict()}), 200
