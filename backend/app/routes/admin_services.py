"""
Admin Service Management Routes
---------------------------------
GET    /api/admin/services              - list ALL services (incl. inactive)  [read]
POST   /api/admin/services              - create a service                    [write]
GET    /api/admin/services/<id>         - one service, full detail            [read]
PUT    /api/admin/services/<id>         - update a service's own fields       [write]
DELETE /api/admin/services/<id>         - delete a service (cascades)         [write]

-- Coverage items ("Included Coverage" bullets) --
POST   /api/admin/services/<id>/coverage           - add a bullet   [write]
PUT    /api/admin/coverage/<item_id>               - edit a bullet  [write]
DELETE /api/admin/coverage/<item_id>               - remove         [write]

-- Restrictions ("Not Allowed" bullets) --
POST   /api/admin/services/<id>/restrictions       - add a bullet   [write]
PUT    /api/admin/restrictions/<item_id>           - edit a bullet  [write]
DELETE /api/admin/restrictions/<item_id>           - remove         [write]

-- Pricing tiers --
POST   /api/admin/services/<id>/pricing-tiers      - add a tier     [write]
PUT    /api/admin/pricing-tiers/<tier_id>          - edit a tier    [write]
DELETE /api/admin/pricing-tiers/<tier_id>          - remove         [write]
POST   /api/admin/pricing-tiers/<tier_id>/sub-services - add a sub-service [write]
PUT    /api/admin/sub-services/<id>                - edit a sub-service [write]
DELETE /api/admin/sub-services/<id>                - remove a sub-service [write]

-- Intake fields (the customer booking form) --
POST   /api/admin/services/<id>/fields             - add a field    [write]
PUT    /api/admin/fields/<field_id>                - edit a field   [write]
DELETE /api/admin/fields/<field_id>                - remove         [write]
"""

import math
import re
from flask import Blueprint, request, jsonify
from app import db
from app.models.service_type import (
    ServiceType, ServiceCoverageItem, ServiceRestriction,
    ServicePricingTier, ServiceSubservice, ServiceField, VALID_FIELD_TYPES,
)
from app.utils.auth import permission_required

admin_services_bp = Blueprint("admin_services", __name__)


def _slugify(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


DEFAULT_PRICING_TIERS = (
    ("Express", "Fastest delivery", "3-5 business days", 75, "⚡"),
    ("Economy", "Lower cost when time is flexible", "10-15 business days", 55, "💰"),
    ("Group", "Best value for flexible delivery", "15-25 business days", 45, "👥"),
)

DEFAULT_SUBSERVICES = (
    ("Same Day Label", 80, "⚡"),
    ("Next Day Label", 75, "🚚"),
    ("Non Metros → 2 Hop Shipping", 80, "📦"),
)


def _seed_default_subservices(tier):
    normalized_name = re.sub(r"\s+", " ", tier.tier_name.strip().lower())
    if normalized_name not in {"express", "express shipping", "standard", "standard shipping"}:
        return
    tier.sub_services.extend(
        ServiceSubservice(
            name=name,
            price=price,
            icon=icon,
            display_order=order,
        )
        for order, (name, price, icon) in enumerate(DEFAULT_SUBSERVICES)
    )


def _parse_optional_price(data, field_name):
    value = data.get(field_name)
    if value is None or value == "":
        return None, None
    try:
        price = float(value)
    except (TypeError, ValueError):
        return None, f"A valid {field_name.upper()} price is required."
    if not math.isfinite(price) or price < 0:
        return None, f"{field_name.upper()} price must be a non-negative amount."
    return price, None


# ── SERVICE TYPES ────────────────────────────────────────────
@admin_services_bp.route("", methods=["GET"])
@permission_required("read")
def list_services(customer):
    services = ServiceType.query.order_by(ServiceType.display_order, ServiceType.name).all()
    return jsonify({"services": [s.to_dict() for s in services]}), 200


@admin_services_bp.route("", methods=["POST"])
@permission_required("write")
def create_service(customer):
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Name is required."}), 400

    slug = (data.get("slug") or "").strip() or _slugify(name)
    if ServiceType.query.filter_by(slug=slug).first():
        return jsonify({"error": f"A service with slug '{slug}' already exists."}), 409

    service = ServiceType(
        name=name,
        slug=slug,
        badge_label=(data.get("badge_label") or "").strip() or None,
        tagline=(data.get("tagline") or "").strip() or None,
        description=data.get("description") or None,
        icon=(data.get("icon") or "").strip() or None,
        enable_quantity=bool(data.get("enable_quantity", False)),
        is_active=bool(data.get("is_active", True)),
        display_order=int(data.get("display_order") or 0),
    )
    db.session.add(service)
    for display_order, (tier_name, description, duration_label, price, icon) in enumerate(DEFAULT_PRICING_TIERS):
        tier = ServicePricingTier(
            tier_name=tier_name,
            description=description,
            duration_label=duration_label,
            price=price,
            icon=icon,
            display_order=display_order,
        )
        _seed_default_subservices(tier)
        service.pricing_tiers.append(tier)
    db.session.commit()
    return jsonify({"message": "Service created.", "service": service.to_dict(include_details=True)}), 201


@admin_services_bp.route("/<int:service_id>", methods=["GET"])
@permission_required("read")
def get_service(customer, service_id):
    service = ServiceType.query.get(service_id)
    if not service:
        return jsonify({"error": "Service not found."}), 404
    return jsonify({"service": service.to_dict(include_details=True)}), 200


@admin_services_bp.route("/<int:service_id>", methods=["PUT"])
@permission_required("write")
def update_service(customer, service_id):
    service = ServiceType.query.get(service_id)
    if not service:
        return jsonify({"error": "Service not found."}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data:
        service.name = data["name"].strip()
    if "slug" in data:
        new_slug = data["slug"].strip()
        existing = ServiceType.query.filter(
            ServiceType.slug == new_slug, ServiceType.id != service.id
        ).first()
        if existing:
            return jsonify({"error": f"A service with slug '{new_slug}' already exists."}), 409
        service.slug = new_slug
    if "badge_label" in data:
        service.badge_label = (data["badge_label"] or "").strip() or None
    if "tagline" in data:
        service.tagline = (data["tagline"] or "").strip() or None
    if "description" in data:
        service.description = data["description"] or None
    if "icon" in data:
        service.icon = (data["icon"] or "").strip() or None
    if "enable_quantity" in data:
        service.enable_quantity = bool(data["enable_quantity"])
    if "is_active" in data:
        service.is_active = bool(data["is_active"])
    if "display_order" in data:
        service.display_order = int(data["display_order"] or 0)

    db.session.commit()
    return jsonify({"message": "Service updated.", "service": service.to_dict(include_details=True)}), 200


@admin_services_bp.route("/<int:service_id>", methods=["DELETE"])
@permission_required("write")
def delete_service(customer, service_id):
    service = ServiceType.query.get(service_id)
    if not service:
        return jsonify({"error": "Service not found."}), 404
    db.session.delete(service)
    db.session.commit()
    return jsonify({"message": "Service deleted."}), 200


# ── COVERAGE ITEMS ───────────────────────────────────────────
@admin_services_bp.route("/<int:service_id>/coverage", methods=["POST"])
@permission_required("write")
def add_coverage(customer, service_id):
    service = ServiceType.query.get(service_id)
    if not service:
        return jsonify({"error": "Service not found."}), 404
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Text is required."}), 400
    item = ServiceCoverageItem(
        service_type_id=service.id, text=text,
        display_order=int(data.get("display_order") or 0),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({"message": "Coverage item added.", "item": item.to_dict()}), 201


@admin_services_bp.route("/coverage/<int:item_id>", methods=["PUT"])
@permission_required("write")
def update_coverage(customer, item_id):
    item = ServiceCoverageItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Coverage item not found."}), 404
    data = request.get_json(silent=True) or {}
    if "text" in data:
        item.text = data["text"].strip()
    if "display_order" in data:
        item.display_order = int(data["display_order"] or 0)
    db.session.commit()
    return jsonify({"message": "Coverage item updated.", "item": item.to_dict()}), 200


@admin_services_bp.route("/coverage/<int:item_id>", methods=["DELETE"])
@permission_required("write")
def delete_coverage(customer, item_id):
    item = ServiceCoverageItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Coverage item not found."}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Coverage item removed."}), 200


# ── RESTRICTIONS ─────────────────────────────────────────────
@admin_services_bp.route("/<int:service_id>/restrictions", methods=["POST"])
@permission_required("write")
def add_restriction(customer, service_id):
    service = ServiceType.query.get(service_id)
    if not service:
        return jsonify({"error": "Service not found."}), 404
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Text is required."}), 400
    item = ServiceRestriction(
        service_type_id=service.id, text=text,
        display_order=int(data.get("display_order") or 0),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({"message": "Restriction added.", "item": item.to_dict()}), 201


@admin_services_bp.route("/restrictions/<int:item_id>", methods=["PUT"])
@permission_required("write")
def update_restriction(customer, item_id):
    item = ServiceRestriction.query.get(item_id)
    if not item:
        return jsonify({"error": "Restriction not found."}), 404
    data = request.get_json(silent=True) or {}
    if "text" in data:
        item.text = data["text"].strip()
    if "display_order" in data:
        item.display_order = int(data["display_order"] or 0)
    db.session.commit()
    return jsonify({"message": "Restriction updated.", "item": item.to_dict()}), 200


@admin_services_bp.route("/restrictions/<int:item_id>", methods=["DELETE"])
@permission_required("write")
def delete_restriction(customer, item_id):
    item = ServiceRestriction.query.get(item_id)
    if not item:
        return jsonify({"error": "Restriction not found."}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Restriction removed."}), 200


# ── PRICING TIERS ────────────────────────────────────────────
@admin_services_bp.route("/<int:service_id>/pricing-tiers", methods=["POST"])
@permission_required("write")
def add_pricing_tier(customer, service_id):
    service = ServiceType.query.get(service_id)
    if not service:
        return jsonify({"error": "Service not found."}), 404
    data = request.get_json(silent=True) or {}
    tier_name = (data.get("tier_name") or "").strip()
    if not tier_name:
        return jsonify({"error": "Tier name is required."}), 400
    try:
        price = float(data.get("price"))
    except (TypeError, ValueError):
        return jsonify({"error": "A valid price is required."}), 400
    if not math.isfinite(price) or price < 0:
        return jsonify({"error": "Price must be a non-negative amount."}), 400
    price_inr, price_inr_error = _parse_optional_price(data, "price_inr")
    if price_inr_error:
        return jsonify({"error": price_inr_error}), 400

    tier = ServicePricingTier(
        service_type_id=service.id,
        tier_name=tier_name,
        description=(data.get("description") or "").strip() or None,
        duration_label=(data.get("duration_label") or "").strip() or None,
        price=price,
        price_inr=price_inr,
        icon=(data.get("icon") or "").strip() or None,
        display_order=int(data.get("display_order") or 0),
    )
    _seed_default_subservices(tier)
    db.session.add(tier)
    db.session.commit()
    return jsonify({"message": "Pricing tier added.", "tier": tier.to_dict()}), 201


@admin_services_bp.route("/pricing-tiers/<int:tier_id>", methods=["PUT"])
@permission_required("write")
def update_pricing_tier(customer, tier_id):
    tier = ServicePricingTier.query.get(tier_id)
    if not tier:
        return jsonify({"error": "Pricing tier not found."}), 404
    data = request.get_json(silent=True) or {}
    if "tier_name" in data:
        tier.tier_name = data["tier_name"].strip()
    if "description" in data:
        tier.description = (data["description"] or "").strip() or None
    if "duration_label" in data:
        tier.duration_label = (data["duration_label"] or "").strip() or None
    if "price" in data:
        try:
            tier.price = float(data["price"])
        except (TypeError, ValueError):
            return jsonify({"error": "A valid price is required."}), 400
        if not math.isfinite(tier.price) or tier.price < 0:
            return jsonify({"error": "Price must be a non-negative amount."}), 400
    if "price_inr" in data:
        price_inr, price_inr_error = _parse_optional_price(data, "price_inr")
        if price_inr_error:
            return jsonify({"error": price_inr_error}), 400
        tier.price_inr = price_inr
    if "icon" in data:
        tier.icon = (data["icon"] or "").strip() or None
    if "display_order" in data:
        tier.display_order = int(data["display_order"] or 0)
    db.session.commit()
    return jsonify({"message": "Pricing tier updated.", "tier": tier.to_dict()}), 200


@admin_services_bp.route("/pricing-tiers/<int:tier_id>", methods=["DELETE"])
@permission_required("write")
def delete_pricing_tier(customer, tier_id):
    tier = ServicePricingTier.query.get(tier_id)
    if not tier:
        return jsonify({"error": "Pricing tier not found."}), 404
    db.session.delete(tier)
    db.session.commit()
    return jsonify({"message": "Pricing tier removed."}), 200


# ── PRICING-TIER SUB-SERVICES ────────────────────────────────
@admin_services_bp.route("/pricing-tiers/<int:tier_id>/sub-services", methods=["POST"])
@permission_required("write")
def add_sub_service(customer, tier_id):
    tier = ServicePricingTier.query.get(tier_id)
    if not tier:
        return jsonify({"error": "Pricing tier not found."}), 404

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Sub-service name is required."}), 400
    try:
        price = float(data.get("price"))
    except (TypeError, ValueError):
        return jsonify({"error": "A valid sub-service price is required."}), 400
    if not math.isfinite(price) or price < 0:
        return jsonify({"error": "Sub-service price must be a non-negative amount."}), 400
    price_inr, price_inr_error = _parse_optional_price(data, "price_inr")
    if price_inr_error:
        return jsonify({"error": price_inr_error}), 400
    if any(item.name.casefold() == name.casefold() for item in tier.sub_services):
        return jsonify({"error": "A sub-service with this name already exists for this tier."}), 409

    sub_service = ServiceSubservice(
        pricing_tier=tier,
        name=name,
        price=price,
        price_inr=price_inr,
        icon=(data.get("icon") or "").strip() or None,
        display_order=int(data.get("display_order") or len(tier.sub_services)),
    )
    db.session.add(sub_service)
    db.session.commit()
    return jsonify({"message": "Sub-service added.", "sub_service": sub_service.to_dict()}), 201


@admin_services_bp.route("/sub-services/<int:sub_service_id>", methods=["PUT"])
@permission_required("write")
def update_sub_service(customer, sub_service_id):
    sub_service = ServiceSubservice.query.get(sub_service_id)
    if not sub_service:
        return jsonify({"error": "Sub-service not found."}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            return jsonify({"error": "Sub-service name is required."}), 400
        duplicates = ServiceSubservice.query.filter(
            ServiceSubservice.pricing_tier_id == sub_service.pricing_tier_id,
            db.func.lower(ServiceSubservice.name) == name.lower(),
            ServiceSubservice.id != sub_service.id,
        ).first()
        if duplicates:
            return jsonify({"error": "A sub-service with this name already exists for this tier."}), 409
        sub_service.name = name
    if "price" in data:
        try:
            price = float(data["price"])
        except (TypeError, ValueError):
            return jsonify({"error": "A valid sub-service price is required."}), 400
        if not math.isfinite(price) or price < 0:
            return jsonify({"error": "Sub-service price must be a non-negative amount."}), 400
        sub_service.price = price
    if "price_inr" in data:
        price_inr, price_inr_error = _parse_optional_price(data, "price_inr")
        if price_inr_error:
            return jsonify({"error": price_inr_error}), 400
        sub_service.price_inr = price_inr
    if "icon" in data:
        sub_service.icon = (data["icon"] or "").strip() or None
    if "display_order" in data:
        sub_service.display_order = int(data["display_order"] or 0)

    db.session.commit()
    return jsonify({"message": "Sub-service updated.", "sub_service": sub_service.to_dict()}), 200


@admin_services_bp.route("/sub-services/<int:sub_service_id>", methods=["DELETE"])
@permission_required("write")
def delete_sub_service(customer, sub_service_id):
    sub_service = ServiceSubservice.query.get(sub_service_id)
    if not sub_service:
        return jsonify({"error": "Sub-service not found."}), 404
    db.session.delete(sub_service)
    db.session.commit()
    return jsonify({"message": "Sub-service removed."}), 200


# ── INTAKE FIELDS ────────────────────────────────────────────
@admin_services_bp.route("/<int:service_id>/fields", methods=["POST"])
@permission_required("write")
def add_field(customer, service_id):
    service = ServiceType.query.get(service_id)
    if not service:
        return jsonify({"error": "Service not found."}), 404
    data = request.get_json(silent=True) or {}
    label = (data.get("label") or "").strip()
    field_key = (data.get("field_key") or "").strip() or _slugify(label)
    field_type = (data.get("field_type") or "").strip()

    if not label:
        return jsonify({"error": "Label is required."}), 400
    if field_type not in VALID_FIELD_TYPES:
        return jsonify({"error": f"field_type must be one of: {sorted(VALID_FIELD_TYPES)}"}), 400
    if field_type == "select" and not data.get("options"):
        return jsonify({"error": "'select' fields require a non-empty options list."}), 400

    field = ServiceField(
        service_type_id=service.id,
        label=label,
        field_key=field_key,
        field_type=field_type,
        options=data.get("options") if field_type == "select" else None,
        display_order=int(data.get("display_order") or 0),
    )
    db.session.add(field)
    db.session.commit()
    return jsonify({"message": "Field added.", "field": field.to_dict()}), 201


@admin_services_bp.route("/fields/<int:field_id>", methods=["PUT"])
@permission_required("write")
def update_field(customer, field_id):
    field = ServiceField.query.get(field_id)
    if not field:
        return jsonify({"error": "Field not found."}), 404
    data = request.get_json(silent=True) or {}
    if "label" in data:
        field.label = data["label"].strip()
    if "field_key" in data:
        field.field_key = data["field_key"].strip()
    if "field_type" in data:
        if data["field_type"] not in VALID_FIELD_TYPES:
            return jsonify({"error": f"field_type must be one of: {sorted(VALID_FIELD_TYPES)}"}), 400
        field.field_type = data["field_type"]
    if "options" in data:
        field.options = data["options"]
    if "display_order" in data:
        field.display_order = int(data["display_order"] or 0)
    db.session.commit()
    return jsonify({"message": "Field updated.", "field": field.to_dict()}), 200


@admin_services_bp.route("/fields/<int:field_id>", methods=["DELETE"])
@permission_required("write")
def delete_field(customer, field_id):
    field = ServiceField.query.get(field_id)
    if not field:
        return jsonify({"error": "Field not found."}), 404
    db.session.delete(field)
    db.session.commit()
    return jsonify({"message": "Field removed."}), 200
