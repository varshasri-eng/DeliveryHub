import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from app import db
from app.models.offer_code import OfferCode
from app.utils.auth import permission_required

admin_offers_bp = Blueprint("admin_offers", __name__)
CODE_PATTERN = re.compile(r"^[A-Z0-9][A-Z0-9_-]{1,49}$")


def _parse_datetime(value, field):
    if value in (None, ""):
        return None, None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None, f"{field} must be a valid date and time."
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc), None


def _parse_offer_data(data, offer=None):
    code = str(data.get("code", offer.code if offer else "")).strip().upper()
    if not CODE_PATTERN.fullmatch(code):
        return None, "Code must be 2–50 characters and contain only letters, numbers, hyphens, or underscores."

    raw_percent = data.get(
        "discount_percent",
        offer.discount_percent if offer else None,
    )
    try:
        percent = Decimal(str(raw_percent))
    except (InvalidOperation, TypeError, ValueError):
        return None, "Enter a valid percentage discount."
    if not percent.is_finite() or percent <= 0 or percent > 100:
        return None, "Percentage discount must be greater than 0 and at most 100."

    valid_from, error = _parse_datetime(
        data.get("valid_from", offer.valid_from.isoformat() if offer and offer.valid_from else None),
        "Start date",
    )
    if error:
        return None, error
    valid_until, error = _parse_datetime(
        data.get("valid_until", offer.valid_until.isoformat() if offer and offer.valid_until else None),
        "End date",
    )
    if error:
        return None, error
    if valid_from and valid_until and valid_until <= valid_from:
        return None, "End date must be later than start date."

    raw_max_uses = data.get("max_uses", offer.max_uses if offer else None)
    if raw_max_uses in (None, ""):
        max_uses = None
    else:
        try:
            max_uses_text = str(raw_max_uses).strip()
            if not re.fullmatch(r"\d+", max_uses_text):
                raise ValueError
            max_uses = int(max_uses_text)
        except (TypeError, ValueError):
            return None, "Maximum uses must be a positive whole number or blank."
        if max_uses < 1:
            return None, "Maximum uses must be a positive whole number or blank."
        if offer and max_uses < offer.times_used:
            return None, "Maximum uses cannot be lower than the number of times this code has already been used."

    is_active = data.get("is_active", offer.is_active if offer else True)
    if not isinstance(is_active, bool):
        return None, "Active status must be true or false."

    return {
        "code": code,
        "discount_percent": percent,
        "valid_from": valid_from,
        "valid_until": valid_until,
        "max_uses": max_uses,
        "is_active": is_active,
    }, None


@admin_offers_bp.route("", methods=["GET"])
@permission_required("read")
def list_offer_codes(customer):
    offers = OfferCode.query.order_by(OfferCode.created_at.desc(), OfferCode.id.desc()).all()
    return jsonify({"offer_codes": [offer.to_dict() for offer in offers]}), 200


@admin_offers_bp.route("", methods=["POST"])
@permission_required("write")
def create_offer_code(customer):
    data = request.get_json(silent=True) or {}
    values, error = _parse_offer_data(data)
    if error:
        return jsonify({"error": error}), 400
    if OfferCode.query.filter_by(code=values["code"]).first():
        return jsonify({"error": "An offer code with this code already exists."}), 409

    offer = OfferCode(**values)
    db.session.add(offer)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "An offer code with this code already exists."}), 409
    return jsonify({"message": "Offer code created.", "offer_code": offer.to_dict()}), 201


@admin_offers_bp.route("/<int:offer_id>", methods=["PUT"])
@permission_required("write")
def update_offer_code(customer, offer_id):
    offer = OfferCode.query.get(offer_id)
    if not offer:
        return jsonify({"error": "Offer code not found."}), 404
    data = request.get_json(silent=True) or {}
    values, error = _parse_offer_data(data, offer)
    if error:
        return jsonify({"error": error}), 400
    duplicate = OfferCode.query.filter(
        OfferCode.code == values["code"],
        OfferCode.id != offer.id,
    ).first()
    if duplicate:
        return jsonify({"error": "An offer code with this code already exists."}), 409

    for key, value in values.items():
        setattr(offer, key, value)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "An offer code with this code already exists."}), 409
    return jsonify({"message": "Offer code updated.", "offer_code": offer.to_dict()}), 200


@admin_offers_bp.route("/<int:offer_id>", methods=["DELETE"])
@permission_required("write")
def delete_offer_code(customer, offer_id):
    offer = OfferCode.query.get(offer_id)
    if not offer:
        return jsonify({"error": "Offer code not found."}), 404
    db.session.delete(offer)
    db.session.commit()
    return jsonify({"message": "Offer code deleted."}), 200
