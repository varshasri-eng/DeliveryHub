"""
Payment Settings Routes
------------------------
GET    /api/payment-settings      - public: QR codes + instructions for invoice payment
PUT    /api/payment-settings      - admin only: update instructions / qr_code_url directly
POST   /api/payment-settings/qr   - admin only: upload/replace a QR image file
DELETE /api/payment-settings/qr   - admin only: remove a QR image

Every write takes a `route` (US_TO_IN or IN_TO_US) so each direction has its own QR and
instructions. Without `route`, the original shared (fallback) values are used.

Each direction's QR is saved under a constant file name (qr_us_in.<ext>, qr_in_us.<ext>,
qr_current.<ext> for the fallback) so re-uploading replaces it in place; the stored URL carries
a `?v=<timestamp>` cache-buster so browsers don't show a stale image.
"""

import os
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models.payment_settings import PaymentSettings
from app.utils.auth import admin_required

payment_settings_bp = Blueprint("payment_settings", __name__)

QR_UPLOAD_SUBDIR = os.path.join("static", "uploads", "payment_qr")
QR_ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
QR_MAX_BYTES = 5 * 1024 * 1024  # 5 MB

# route -> (qr column, instructions column, file stem)
ROUTE_FIELDS = {
    "US_TO_IN": ("qr_code_url_us_in", "instructions_us_in", "qr_us_in"),
    "IN_TO_US": ("qr_code_url_in_us", "instructions_in_us", "qr_in_us"),
    None: ("qr_code_url", "instructions", "qr_current"),
}


def _route_fields(route):
    """Returns the column / file names for a route, or None when `route` is not valid."""
    route = (route or None)
    return ROUTE_FIELDS.get(route)


def _get_payment_settings():
    """Get or create the singleton payment-settings row."""
    s = PaymentSettings.query.get(1)
    if not s:
        s = PaymentSettings(id=1)
        db.session.add(s)
        db.session.commit()
    return s


def _qr_upload_dir():
    path = os.path.join(current_app.root_path, QR_UPLOAD_SUBDIR)
    os.makedirs(path, exist_ok=True)
    return path


def _remove_stale(stem):
    upload_dir = _qr_upload_dir()
    for stale_ext in QR_ALLOWED_EXTENSIONS:
        stale_path = os.path.join(upload_dir, f"{stem}.{stale_ext}")
        if os.path.exists(stale_path):
            try:
                os.remove(stale_path)
            except OSError:
                pass


@payment_settings_bp.route("", methods=["GET"])
def get_payment_settings():
    return jsonify(_get_payment_settings().to_dict()), 200


@payment_settings_bp.route("", methods=["PUT"])
@admin_required
def update_payment_settings(customer):
    """Set instructions and / or qr_code_url (e.g. an externally hosted image) for a route."""
    data = request.get_json(silent=True) or {}
    fields = _route_fields(data.get("route"))
    if not fields:
        return jsonify({"error": "route must be US_TO_IN or IN_TO_US."}), 400
    qr_col, ins_col, _ = fields
    s = _get_payment_settings()

    if "qr_code_url" in data:
        setattr(s, qr_col, (data["qr_code_url"] or "").strip() or None)
    if "instructions" in data:
        setattr(s, ins_col, (data["instructions"] or "").strip() or None)

    db.session.commit()
    return jsonify({
        "message": "Payment settings updated.",
        "settings": s.to_dict(),
    }), 200


@payment_settings_bp.route("/qr", methods=["POST"])
@admin_required
def upload_qr(customer):
    """Upload / replace the QR image for a route (form field `qr`, plus `route`)."""
    fields = _route_fields(request.form.get("route"))
    if not fields:
        return jsonify({"error": "route must be US_TO_IN or IN_TO_US."}), 400
    qr_col, _, stem = fields

    file = request.files.get("qr")
    if not file or not file.filename:
        return jsonify({"error": "Please choose an image to upload."}), 400

    ext = (
        file.filename.rsplit(".", 1)[-1].lower()
        if "." in file.filename else ""
    )
    if ext not in QR_ALLOWED_EXTENSIONS:
        return jsonify({"error": "QR image must be PNG, JPG, JPEG, or WEBP."}), 400

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > QR_MAX_BYTES:
        return jsonify({"error": "QR image must be under 5MB."}), 400

    # Remove any previous QR for this route under a different extension.
    _remove_stale(stem)

    filename = f"{stem}.{ext}"
    file.save(os.path.join(_qr_upload_dir(), filename))

    s = _get_payment_settings()
    version = int(datetime.now(timezone.utc).timestamp())
    setattr(s, qr_col, f"/static/uploads/payment_qr/{filename}?v={version}")
    db.session.commit()

    return jsonify({"message": "QR code uploaded.", "settings": s.to_dict()}), 200


@payment_settings_bp.route("/qr", methods=["DELETE"])
@admin_required
def delete_qr(customer):
    """Remove the QR for a route (`?route=US_TO_IN` or `IN_TO_US`)."""
    fields = _route_fields(request.args.get("route"))
    if not fields:
        return jsonify({"error": "route must be US_TO_IN or IN_TO_US."}), 400
    qr_col, _, stem = fields

    _remove_stale(stem)

    s = _get_payment_settings()
    setattr(s, qr_col, None)
    db.session.commit()

    return jsonify({"message": "QR code removed.", "settings": s.to_dict()}), 200