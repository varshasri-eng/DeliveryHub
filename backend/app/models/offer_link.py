from datetime import datetime, timezone
from app import db


class OfferLink(db.Model):
    __tablename__ = "offer_links"

    id = db.Column(db.Integer, primary_key=True)
    offer_code_id = db.Column(
        db.Integer, db.ForeignKey("offer_codes.id", ondelete="CASCADE"), nullable=False
    )
    service_slug = db.Column(db.String(255), nullable=False)
    headline = db.Column(db.String(150))
    image_path = db.Column(db.String(255))
    show_popup = db.Column(db.Boolean, nullable=False, default=False)
    popup_start = db.Column(db.DateTime(timezone=True))
    popup_end = db.Column(db.DateTime(timezone=True))
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    offer_code = db.relationship("OfferCode", lazy=True)

    @property
    def link(self):
        return f"/services/{self.service_slug}/book?offer={self.offer_code.code}"

    def to_dict(self):
        return {
            "id": self.id,
            "offer_code_id": self.offer_code_id,
            "code": self.offer_code.code if self.offer_code else None,
            "discount_percent": float(self.offer_code.discount_percent) if self.offer_code else None,
            "service_slug": self.service_slug,
            "headline": self.headline,
            "image_url": self.image_path,
            "show_popup": self.show_popup,
            "popup_start": self.popup_start.isoformat() if self.popup_start else None,
            "popup_end": self.popup_end.isoformat() if self.popup_end else None,
            "is_active": self.is_active,
            "link": self.link if self.offer_code else None,
        }
