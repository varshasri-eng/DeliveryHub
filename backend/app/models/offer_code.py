from datetime import datetime, timezone
from app import db


class OfferCode(db.Model):
    __tablename__ = "offer_codes"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    discount_percent = db.Column(db.Numeric(5, 2), nullable=False)
    valid_from = db.Column(db.DateTime(timezone=True))
    valid_until = db.Column(db.DateTime(timezone=True))
    max_uses = db.Column(db.Integer)
    times_used = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "discount_percent": float(self.discount_percent),
            "valid_from": self.valid_from.isoformat() if self.valid_from else None,
            "valid_until": self.valid_until.isoformat() if self.valid_until else None,
            "max_uses": self.max_uses,
            "times_used": self.times_used,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
