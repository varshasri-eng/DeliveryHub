from datetime import datetime, timezone
from app import db


def _now():
    return datetime.now(timezone.utc)


class Lead(db.Model):
    """
    A person who appears on either side of a shipment (sender or receiver).
    One row per unique phone number; shipments.sender_lead_id / receiver_lead_id point here,
    which is what connects the two sides (one-to-many and many-to-many).
    """
    __tablename__ = "leads"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(30), nullable=False)        # as last entered, e.g. "+91 9959785999"
    phone_key = db.Column(db.String(20), nullable=False, unique=True)  # digits only, with country code
    country = db.Column(db.String(60))
    city = db.Column(db.String(120))
    province = db.Column(db.String(120))
    postal_code = db.Column(db.String(20))
    address = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=_now)
    last_seen_at = db.Column(db.DateTime(timezone=True), default=_now)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "country": self.country,
            "city": self.city,
            "province": self.province,
            "postal_code": self.postal_code,
            "address": self.address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_seen_at": self.last_seen_at.isoformat() if self.last_seen_at else None,
        }
