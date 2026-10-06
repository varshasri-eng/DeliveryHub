"""
Site Settings Routes
--------------------
GET  /api/settings          - public branding settings
PUT  /api/admin/settings    - update branding (admin only)
"""

from flask import Blueprint, request, jsonify
from app import db
from app.models.site_settings import SiteSettings
from app.utils.auth import admin_required

settings_bp = Blueprint("settings", __name__)


def _get_settings():
    """Get or create the singleton settings row."""
    s = SiteSettings.query.get(1)
    if not s:
        s = SiteSettings(id=1)
        db.session.add(s)
        db.session.commit()
    return s


@settings_bp.route("", methods=["GET"])
def get_settings():
    return jsonify(_get_settings().to_dict()), 200


# NOTE: decorator order matters here. @settings_bp.route(...) must be
# OUTERMOST (on top) and @admin_required INNERMOST (right above the
# function) — Flask registers whatever function object the route
# decorator receives at decoration time. With the previous order
# (@admin_required on top, @settings_bp.route(...) underneath), the
# route decorator ran FIRST and registered the raw, unprotected
# update_settings function in the URL map; @admin_required then wrapped
# a function reference that Flask was never actually going to call —
# so this endpoint was not actually enforcing admin auth. Same correct
# order already used everywhere in admin.py.
@settings_bp.route("", methods=["PUT"])
@admin_required
def update_settings(customer):
    data = request.get_json(silent=True) or {}
    s = _get_settings()

    # ── Identity ──────────────────────────────────────────
    if "site_name" in data:
        s.site_name = data["site_name"] or "DeliveryHub"
    if "tagline" in data:
        s.tagline = data["tagline"]
    if "logo_url" in data:
        s.logo_url = data["logo_url"] or None
    if "favicon_url" in data:
        s.favicon_url = data["favicon_url"] or None

    # ── Brand colors ──────────────────────────────────────
    if "primary_color" in data:
        s.primary_color = data["primary_color"] or "#4FA372"
    if "secondary_color" in data:
        s.secondary_color = data["secondary_color"] or "#2E3B33"
    if "accent_color" in data:
        s.accent_color = data["accent_color"] or "#7DD8A6"

    # ── Hero / Landing ────────────────────────────────────
    if "hero_title" in data:
        s.hero_title = data["hero_title"]
    if "hero_subtitle" in data:
        s.hero_subtitle = data["hero_subtitle"]
    if "hero_cta" in data:
        s.hero_cta = data["hero_cta"]
    if "hero_banner_url" in data:
        s.hero_banner_url = data["hero_banner_url"] or None

    # ── Contact ───────────────────────────────────────────
    if "contact_email" in data:
        s.contact_email = data["contact_email"] or None
    if "contact_phone" in data:
        s.contact_phone = data["contact_phone"] or None
    if "address" in data:
        s.address = data["address"] or None

    # ── Footer ────────────────────────────────────────────
    if "footer_text" in data:
        s.footer_text = data["footer_text"]

    # ── Social ────────────────────────────────────────────
    if "facebook_url" in data:
        s.facebook_url = data["facebook_url"] or None
    if "instagram_url" in data:
        s.instagram_url = data["instagram_url"] or None
    if "twitter_url" in data:
        s.twitter_url = data["twitter_url"] or None
    if "whatsapp_community_url" in data:
        s.whatsapp_community_url = data["whatsapp_community_url"] or None

    db.session.commit()
    return jsonify({"message": "Settings updated.", "settings": s.to_dict()}), 200