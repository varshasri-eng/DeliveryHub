import os
import secrets
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, request

from app import db
from app.models.offer_code import OfferCode
from app.models.offer_link import OfferLink
from app.models.service_type import ServiceType
from app.utils.auth import permission_required

admin_offer_links_bp = Blueprint("admin_offer_links", __name__)
offer_popup_bp = Blueprint("offer_popup", __name__)

UPLOAD_SUBDIR = os.path.join("static", "uploads", "offers")
ALLOWED_EXT = {"png", "jpg", "jpeg", "webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def _dt(value, label):
    if value in (None, ""):
        return None, None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None, f"{label} must be a valid date and time."
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc), None


def _as_bool(value, default):
    if value is None:
        return default
    return str(value).strip().lower() in ("1", "true", "yes", "on")


def _save_image(file):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXT:
        return None, "Image must be a PNG, JPG or WebP file."
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > MAX_IMAGE_BYTES:
        return None, "Image must be 5 MB or smaller."
    folder = os.path.join(current_app.root_path, UPLOAD_SUBDIR)
    os.makedirs(folder, exist_ok=True)
    name = f"offer_{secrets.token_hex(8)}.{ext}"
    file.save(os.path.join(folder, name))
    return f"/static/uploads/offers/{name}", None


def _remove_image(path):
    if not path or not path.startswith("/static/uploads/offers/"):
        return
    full = os.path.join(current_app.root_path, path.lstrip("/"))
    try:
        os.remove(full)
    except OSError:
        pass


def _apply_form(link, form, files):
    """Validate form data and write it onto `link`. Returns an error string or None."""
    if "offer_code_id" in form:
        offer = OfferCode.query.get(form.get("offer_code_id", type=int))
        if not offer:
            return "Choose an offer code."
        link.offer_code_id = offer.id
    if "service_slug" in form:
        slug = (form.get("service_slug") or "").strip()
        if not ServiceType.query.filter_by(slug=slug).first():
            return "Choose a service."
        link.service_slug = slug
    if not link.offer_code_id or not link.service_slug:
        return "Choose an offer code and a service."

    if "headline" in form:
        link.headline = (form.get("headline") or "").strip()[:150] or None
    link.show_popup = _as_bool(form.get("show_popup"), link.show_popup or False)
    link.is_active = _as_bool(form.get("is_active"), True if link.is_active is None else link.is_active)

    for field, label in (("popup_start", "Pop-up start"), ("popup_end", "Pop-up end")):
        if field in form:
            value, error = _dt(form.get(field), label)
            if error:
                return error
            setattr(link, field, value)
    if link.popup_start and link.popup_end and link.popup_end <= link.popup_start:
        return "Pop-up end must be later than pop-up start."

    upload = files.get("image")
    if upload and upload.filename:
        path, error = _save_image(upload)
        if error:
            return error
        _remove_image(link.image_path)
        link.image_path = path
    elif _as_bool(form.get("remove_image"), False):
        _remove_image(link.image_path)
        link.image_path = None

    if link.show_popup and not link.image_path:
        return "Upload an image to show this offer as a pop-up."
    return None


@admin_offer_links_bp.route("", methods=["GET"])
@permission_required("read")
def list_links(customer):
    links = OfferLink.query.order_by(OfferLink.created_at.desc(), OfferLink.id.desc()).all()
    return jsonify({"offer_links": [l.to_dict() for l in links]}), 200


@admin_offer_links_bp.route("", methods=["POST"])
@permission_required("write")
def create_link(customer):
    link = OfferLink()
    error = _apply_form(link, request.form, request.files)
    if error:
        return jsonify({"error": error}), 400
    db.session.add(link)
    db.session.commit()
    return jsonify({"message": "Offer link created.", "offer_link": link.to_dict()}), 201


@admin_offer_links_bp.route("/<int:link_id>", methods=["PUT"])
@permission_required("write")
def update_link(customer, link_id):
    link = OfferLink.query.get(link_id)
    if not link:
        return jsonify({"error": "Offer link not found."}), 404
    error = _apply_form(link, request.form, request.files)
    if error:
        db.session.rollback()
        return jsonify({"error": error}), 400
    db.session.commit()
    return jsonify({"message": "Offer link updated.", "offer_link": link.to_dict()}), 200


@admin_offer_links_bp.route("/<int:link_id>", methods=["DELETE"])
@permission_required("write")
def delete_link(customer, link_id):
    link = OfferLink.query.get(link_id)
    if not link:
        return jsonify({"error": "Offer link not found."}), 404
    _remove_image(link.image_path)
    db.session.delete(link)
    db.session.commit()
    return jsonify({"message": "Offer link deleted."}), 200


def _aware(value):
    return value.replace(tzinfo=timezone.utc) if value and value.tzinfo is None else value


# Public: the single pop-up to show right now (newest eligible wins). No auth.
@offer_popup_bp.route("", methods=["GET"])
def current_popup():
    now = datetime.now(timezone.utc)
    links = (
        OfferLink.query.filter_by(is_active=True, show_popup=True)
        .order_by(OfferLink.created_at.desc(), OfferLink.id.desc())
        .all()
    )
    for link in links:
        offer = link.offer_code
        if not link.image_path or not offer or not offer.is_active:
            continue
        start, end = _aware(link.popup_start), _aware(link.popup_end)
        if start and now < start:
            continue
        if end and now >= end:
            continue
        o_from, o_until = _aware(offer.valid_from), _aware(offer.valid_until)
        if o_from and now < o_from:
            continue
        if o_until and now >= o_until:
            continue
        if offer.max_uses is not None and offer.times_used >= offer.max_uses:
            continue
        service = ServiceType.query.filter_by(slug=link.service_slug, is_active=True).first()
        if not service:
            continue
        ends = [d for d in (end, o_until) if d]
        return jsonify({"popup": {
            "id": link.id,
            "image_url": link.image_path,
            "headline": link.headline,
            "code": offer.code,
            "discount_percent": float(offer.discount_percent),
            "link": link.link,
            "ends_at": min(ends).isoformat() if ends else None,
        }}), 200
    return jsonify({"popup": None}), 200
