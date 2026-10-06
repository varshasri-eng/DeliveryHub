from datetime import datetime, timezone
from app import db


class DeliveryZone(db.Model):
    __tablename__ = "delivery_zones"

    id = db.Column(db.Integer, primary_key=True)
    city = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(50), default="CA")
    zip_code = db.Column(db.String(10), unique=True, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    delivery_fee = db.Column(db.Numeric(6, 2), default=0)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
