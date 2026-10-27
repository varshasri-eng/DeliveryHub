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
import time
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from app import db
from app.models.shipment import Shipment, generate_shipment_number
from app.models.service_type import ServiceType, ServicePricingTier, ServiceSubservice
from app.models.offer_code import OfferCode
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


# India Post office names end with an office-type code, e.g. "Secunderabad H.O",
# "Banjara Hills S.O" or "Hyderabad G.P.O". People copy those names from search
# results, so the code is ignored when comparing a typed city with the postal data.
_OFFICE_SUFFIX = re.compile(
    r"\s+(?:h\s*\.?\s*o|s\s*\.?\s*o|b\s*\.?\s*o|g\s*\.?\s*p\s*\.?\s*o)\s*\.?$",
    re.IGNORECASE,
)


def _normalize_location(value):
    text = _OFFICE_SUFFIX.sub("", (value or "").casefold().strip())
    return re.sub(r"[^a-z0-9]", "", text)


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
            wrong = [
                label for label, ok in (("city", city_matches), ("state/province", state_matches))
                if not ok
            ]
            known_cities = sorted({c for loc in locations for c in loc["cities"] if c})[:5]
            known_states = sorted({s for loc in locations for s in loc["states"] if s and len(s) > 2})
            belongs_to = ", ".join(known_cities)
            if known_states:
                belongs_to += f" ({', '.join(known_states)})"
            return jsonify({
                "error": (
                    f"The {role} {' and '.join(wrong)} "
                    f"{'does' if len(wrong) == 1 else 'do'} not match postal code {postal_code}. "
                    f"This code belongs to: {belongs_to}."
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
    if data.get("route_direction") != service.route_direction:
        return None, None, None, None, None, None, None, (
            jsonify({"error": "This service is not available for the selected shipment direction."}), 400
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
    if service.enable_quantity or _tier_has_limits(tier):
        try:
            quantity = int(data.get("quantity", 1))
        except (TypeError, ValueError):
            quantity = 0
        if quantity <= 0:
            return None, None, None, None, None, None, None, (
                jsonify({"error": "Quantity must be a positive integer."}), 400
            )
        limit_error = _tier_limit_error(tier, quantity)
        if limit_error:
            return None, None, None, None, None, None, None, (
                jsonify({"error": limit_error}), 400
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
    is_document_service = (
        service.name.strip().casefold() == "document services"
        or service.slug == "document-shipping"
    )
    booking_fields = [] if is_document_service else [
        field for field in service.fields if field.field_key != "extra_notes"
    ]

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


def _tier_has_limits(tier):
    """Per-kg slabs carry a min/max quantity (kg)."""
    return tier is not None and tier.max_quantity is not None


def _tier_limit_error(tier, quantity):
    if not _tier_has_limits(tier):
        return None
    low = tier.min_quantity or 1
    if quantity < low or quantity > tier.max_quantity:
        return f"Enter a weight between {low} and {tier.max_quantity} kg for this option."
    return None


def _price_booking(tier, sub_service, quantity, currency_code):
    price = (
        sub_service.price_inr if currency_code == "INR" else sub_service.price
    ) if sub_service else (
        tier.price_inr if currency_code == "INR" else tier.price
    )
    unit_price = float(price)
    total_price = round(unit_price * quantity, 2)
    return unit_price, total_price


def _money_decimal(value):
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _offer_pricing_context(data):
    direction = data.get("route_direction")
    if direction not in VALID_ROUTE_DIRECTIONS:
        return None, "Choose a valid shipment direction."
    try:
        service_id = int(data.get("service_type_id"))
        tier_id = int(data.get("pricing_tier_id"))
        quantity = int(data.get("quantity", 1))
        sub_service_id = data.get("sub_service_id")
        sub_service_id = int(sub_service_id) if sub_service_id not in (None, "") else None
    except (TypeError, ValueError):
        return None, "Choose a valid shipping option."

    service = ServiceType.query.filter_by(id=service_id, is_active=True).first()
    if not service or service.route_direction != direction:
        return None, "This service is not available for the selected shipment direction."
    tier = ServicePricingTier.query.filter_by(
        id=tier_id, service_type_id=service.id,
    ).first()
    if not tier:
        return None, "Selected pricing tier does not belong to this service."
    if not (service.enable_quantity or _tier_has_limits(tier)):
        quantity = 1
    elif quantity < 1:
        return None, "Quantity must be a positive integer."
    elif _tier_limit_error(tier, quantity):
        return None, _tier_limit_error(tier, quantity)

    sub_service = None
    if tier.sub_services:
        if sub_service_id is None:
            return None, "Choose a sub-service for this delivery option."
        sub_service = ServiceSubservice.query.filter_by(
            id=sub_service_id,
            pricing_tier_id=tier.id,
        ).first()
        if not sub_service:
            return None, "Selected sub-service does not belong to this delivery option."
    elif sub_service_id is not None:
        return None, "Selected sub-service does not belong to this delivery option."

    currency_code = "INR" if direction == "IN_TO_US" else "USD"
    selected_price = (
        sub_service.price_inr if currency_code == "INR" else sub_service.price
    ) if sub_service else (
        tier.price_inr if currency_code == "INR" else tier.price
    )
    if selected_price is None:
        return None, f"{currency_code} pricing is not set for this option yet."
    unit_price, subtotal = _price_booking(tier, sub_service, quantity, currency_code)
    return {
        "currency_code": currency_code,
        "quantity": quantity,
        "unit_price": unit_price,
        "subtotal": _money_decimal(subtotal),
    }, None


def _get_offer_discount(code, subtotal, reserve=False):
    normalized_code = str(code or "").strip().upper()
    if not normalized_code:
        return None, Decimal("0.00"), Decimal("0.00"), None

    query = OfferCode.query.filter(db.func.upper(OfferCode.code) == normalized_code)
    if reserve:
        query = query.with_for_update()
    offer = query.first()
    if not offer or not offer.is_active:
        return None, None, None, "This offer code is invalid or inactive."

    now = datetime.now(timezone.utc)
    valid_from = offer.valid_from
    valid_until = offer.valid_until
    if valid_from and valid_from.tzinfo is None:
        valid_from = valid_from.replace(tzinfo=timezone.utc)
    if valid_until and valid_until.tzinfo is None:
        valid_until = valid_until.replace(tzinfo=timezone.utc)
    if valid_from and now < valid_from:
        return None, None, None, "This offer code is not active yet."
    if valid_until and now >= valid_until:
        return None, None, None, "This offer code has expired."
    if offer.max_uses is not None and offer.times_used >= offer.max_uses:
        return None, None, None, "This offer code has reached its usage limit."

    percent = Decimal(str(offer.discount_percent))
    discount = _money_decimal(subtotal * percent / Decimal("100"))
    discount = min(discount, subtotal)
    if reserve:
        offer.times_used += 1
    return offer, percent, discount, None


_POSTAL_CACHE = {}
_POSTAL_CACHE_TTL = 6 * 60 * 60   # seconds
_POSTAL_CACHE_MAX = 1000


def _unique(values):
    seen, result = set(), []
    for value in values:
        key = value.casefold()
        if value and key not in seen:
            seen.add(key)
            result.append(value)
    return result


@shipments_bp.route("/postal-lookup", methods=["GET"])
def postal_lookup():
    """
    Public helper for the booking form: given a ZIP / postal code, return the
    city names and state it belongs to so the form can fill them in.
    GET /api/shipments/postal-lookup?country=India&postal_code=500003
    """
    country = (request.args.get("country") or "").strip()
    postal_code = (request.args.get("postal_code") or "").strip()
    if country == "India":
        valid = re.fullmatch(r"\d{6}", postal_code)
    elif country == "United States":
        valid = re.fullmatch(r"\d{5}(?:-\d{4})?", postal_code)
    else:
        valid = None
    if not valid:
        return jsonify({"error": "Enter a valid country and postal code."}), 400

    key = (country, postal_code[:5] if country == "United States" else postal_code)
    now = time.time()
    cached = _POSTAL_CACHE.get(key)
    if cached and now - cached[0] < _POSTAL_CACHE_TTL:
        return jsonify(cached[1])

    try:
        locations = _lookup_postal_locations(country, postal_code)
    except RuntimeError as error:
        return jsonify({"error": str(error)}), 503

    names, districts, states, abbreviations = [], [], [], []
    for location in locations:
        cities = location["cities"]
        if cities:
            names.append(_OFFICE_SUFFIX.sub("", (cities[0] or "").strip()))
        districts.extend((c or "").strip() for c in cities[1:])
        states.extend(s for s in location["states"] if s and len(s) > 2)
        abbreviations.extend(s for s in location["states"] if s and len(s) == 2)
    result = {
        "found": bool(locations),
        "cities": _unique(names + districts),
        "state": states[0] if states else "",
        "state_abbr": abbreviations[0] if abbreviations else "",
    }
    if len(_POSTAL_CACHE) >= _POSTAL_CACHE_MAX:
        _POSTAL_CACHE.clear()
    _POSTAL_CACHE[key] = (now, result)
    return jsonify(result)


@shipments_bp.route("/offer-codes/validate", methods=["POST"])
def validate_offer_code():
    data = request.get_json(silent=True) or {}
    if not str(data.get("offer_code") or "").strip():
        return jsonify({"error": "Enter an offer code."}), 400
    context, error = _offer_pricing_context(data)
    if error:
        return jsonify({"error": error}), 400
    offer, percent, discount, error = _get_offer_discount(
        data.get("offer_code"),
        context["subtotal"],
    )
    if error:
        return jsonify({"error": error}), 400
    total = context["subtotal"] - discount
    return jsonify({
        "code": offer.code,
        "discount_percent": float(percent),
        "discount_amount": float(discount),
        "subtotal_amount": float(context["subtotal"]),
        "total_amount": float(total),
        "currency_code": context["currency_code"],
    }), 200


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
    subtotal_price = _money_decimal(total_price)
    offer, offer_percent, offer_discount, offer_error = _get_offer_discount(
        data.get("offer_code"), subtotal_price, reserve=True,
    )
    if offer_error:
        return jsonify({"error": offer_error}), 400

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
        subtotal_price=subtotal_price,
        offer_code_id=offer.id if offer else None,
        offer_code=offer.code if offer else None,
        offer_discount_percent=offer_percent or Decimal("0.00"),
        offer_discount_amount=offer_discount,
        total_price=subtotal_price - offer_discount,
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

    currency_code = "INR" if route_direction == "IN_TO_US" else "USD"
    unit_price, total_price = _price_booking(tier, sub_service, quantity, currency_code)
    subtotal_price = _money_decimal(total_price)
    offer, offer_percent, offer_discount, offer_error = _get_offer_discount(
        data.get("offer_code"), subtotal_price, reserve=True,
    )
    if offer_error:
        return jsonify({"error": offer_error}), 400

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
        subtotal_price=subtotal_price,
        offer_code_id=offer.id if offer else None,
        offer_code=offer.code if offer else None,
        offer_discount_percent=offer_percent or Decimal("0.00"),
        offer_discount_amount=offer_discount,
        total_price=subtotal_price - offer_discount,
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