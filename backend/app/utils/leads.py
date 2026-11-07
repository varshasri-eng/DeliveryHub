"""
Leads helper: every sender / receiver on a booking becomes (or updates) one lead,
matched by phone number.
"""
import re
from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError

from app import db
from app.models.lead import Lead

COUNTRY_CODES = {"United States": "1", "India": "91"}


def phone_key(phone, country=None):
    """Digits only, with the country code. '+91 99597 85999' and '9959785999' (India) match."""
    digits = re.sub(r"\D", "", phone or "")
    code = COUNTRY_CODES.get(country)
    if code and len(digits) == 10:
        digits = code + digits
    return digits[:20]


def _clip(value, size):
    value = (value or "").strip()
    return value[:size] or None


def upsert_lead(name, phone, country=None, city=None, province=None, postal_code=None, address=None):
    """Find the lead with this phone number (or create it) and refresh its details. Returns the Lead or None."""
    key = phone_key(phone, country)
    name = _clip(name, 255)
    if not key or not name:
        return None

    fields = {
        "name": name,
        "phone": _clip(phone, 30) or key,
        "country": _clip(country, 60),
        "city": _clip(city, 120),
        "province": _clip(province, 120),
        "postal_code": _clip(postal_code, 20),
        "address": (address or "").strip() or None,
    }
    now = datetime.now(timezone.utc)

    lead = Lead.query.filter_by(phone_key=key).first()
    if lead is None:
        try:
            with db.session.begin_nested():
                lead = Lead(phone_key=key, created_at=now, last_seen_at=now, **fields)
                db.session.add(lead)
        except IntegrityError:  # someone else created it a moment ago
            lead = Lead.query.filter_by(phone_key=key).first()
            if lead is None:
                return None
    # the most recent booking's details win
    for attr, value in fields.items():
        if value:
            setattr(lead, attr, value)
    lead.last_seen_at = now
    return lead
