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

    invoice = Invoice(
        invoice_number=_generate_invoice_number(),
        shipment_id=shipment.id,
        total_amount=shipment.total_price,
        status="issued",
    )
    db.session.add(invoice)
    db.session.flush()

    db.session.add(InvoiceItem(
        invoice_id=invoice.id,
        description=f"{shipment.service_type.name} — {shipment.pricing_tier.tier_name}",
        quantity=shipment.quantity,
        unit_price=shipment.unit_price,
        line_total=shipment.total_price,
    ))
    db.session.commit()

    return jsonify({"message": "Invoice raised.", "invoice": invoice.to_dict()}), 201


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
