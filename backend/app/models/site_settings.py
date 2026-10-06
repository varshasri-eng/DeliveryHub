from datetime import datetime, timezone
from app import db


class SiteSettings(db.Model):
    """
    Single-row table storing site-wide branding & configuration.
    Accessed via GET /api/settings (public) and PUT /api/admin/settings (admin).
    """
    __tablename__ = "site_settings"

    id = db.Column(db.Integer, primary_key=True, default=1)

    # ── Identity ──────────────────────────────────────────
    site_name    = db.Column(db.String(100), default="DeliveryHub")
    tagline      = db.Column(db.String(255), default="International shipping between the U.S. and India")
    logo_url     = db.Column(db.Text, default=None)   # uploaded logo URL
    favicon_url  = db.Column(db.Text, default=None)   # favicon URL

    # ── Brand colors (hex) ────────────────────────────────
    # Pastel green palette. primary_color is the anchor color the
    # frontend generates its full brand-50..brand-900 Tailwind scale
    # from (see BrandingContext.jsx) — changing this here changes
    # nearly every branded element site-wide (buttons, badges,
    # highlights, focus rings), not just a couple of accent spots.
    primary_color   = db.Column(db.String(7), default="#4FA372")  # pastel green
    secondary_color = db.Column(db.String(7), default="#2E3B33")  # muted sage-charcoal
    accent_color    = db.Column(db.String(7), default="#7DD8A6")  # soft mint highlight

    # ── Hero / Landing ────────────────────────────────────
    hero_title    = db.Column(db.String(255), default="Send your shipment with confidence.")
    hero_subtitle = db.Column(db.String(500), default="Choose a shipping service and delivery option for shipments between the U.S. and India.")
    hero_cta      = db.Column(db.String(100), default="Explore shipping services")
    # Banner image shown above the shop page search/category area.
    # Same "admin provides a URL" pattern as logo_url/favicon_url,
    # not a file-upload field — consistent with how the rest of
    # branding already works in this codebase.
    hero_banner_url = db.Column(db.Text, default=None)

    # ── Contact ───────────────────────────────────────────
    contact_email = db.Column(db.String(255), default=None)
    contact_phone = db.Column(db.String(30), default=None)
    address       = db.Column(db.Text, default=None)

    # ── Footer ────────────────────────────────────────────
    footer_text   = db.Column(db.String(500), default="© DeliveryHub. International shipping made straightforward.")

    # ── Social ────────────────────────────────────────────
    facebook_url  = db.Column(db.Text, default=None)
    instagram_url = db.Column(db.Text, default=None)
    twitter_url   = db.Column(db.Text, default=None)
    # Invite link to a WhatsApp group/community (e.g. a chat.whatsapp.com
    # invite link) — shown as a "Join our WhatsApp community" callout
    # in the footer. Kept separate from contact_phone since that's a
    # direct dial/message number, not a group invite.
    whatsapp_community_url = db.Column(db.Text, default=None)

    updated_at = db.Column(db.DateTime(timezone=True),
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "site_name": self.site_name,
            "tagline": self.tagline,
            "logo_url": self.logo_url,
            "favicon_url": self.favicon_url,
            "primary_color": self.primary_color,
            "secondary_color": self.secondary_color,
            "accent_color": self.accent_color,
            "hero_title": self.hero_title,
            "hero_subtitle": self.hero_subtitle,
            "hero_cta": self.hero_cta,
            "hero_banner_url": self.hero_banner_url,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "address": self.address,
            "footer_text": self.footer_text,
            "facebook_url": self.facebook_url,
            "instagram_url": self.instagram_url,
            "twitter_url": self.twitter_url,
            "whatsapp_community_url": self.whatsapp_community_url,
        }