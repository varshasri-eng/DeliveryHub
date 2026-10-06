import secrets
from datetime import datetime, timezone
from app import db

VALID_SHIPMENT_STATUSES = {"requested", "picked_up", "in_transit", "delivered", "cancelled"}


def generate_shipment_number():
    return "DH-" + secrets.token_hex(4).upper()


class Shipment(db.Model):
    __tablename__ = "shipments"

    id = db.Column(db.Integer, primary_key=True)
    shipment_number = db.Column(db.String(30), unique=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=True)
    route_direction = db.Column(db.String(10), nullable=True)
    service_type_id = db.Column(db.Integer, db.ForeignKey("service_types.id"), nullable=False)
    pricing_tier_id = db.Column(db.Integer, db.ForeignKey("service_pricing_tiers.id"), nullable=False)
    sub_service_id = db.Column(
        db.Integer,
        db.ForeignKey("service_subservices.id", ondelete="SET NULL"),
        nullable=True,
    )
    sub_service_name = db.Column(db.String(255))

    quantity = db.Column(db.Integer, default=1)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    total_price = db.Column(db.Numeric(10, 2), nullable=False)

    sender_name = db.Column(db.String(255), nullable=False)
    sender_phone = db.Column(db.String(20), nullable=False)
    sender_address = db.Column(db.Text, nullable=False)

    receiver_name = db.Column(db.String(255), nullable=False)
    receiver_phone = db.Column(db.String(20), nullable=False)
    receiver_address = db.Column(db.Text, nullable=False)

    field_values = db.Column(db.JSON)
    notes = db.Column(db.Text)

    status = db.Column(db.String(30), default="requested")

    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    service_type = db.relationship("ServiceType")
    pricing_tier = db.relationship("ServicePricingTier")
    sub_service = db.relationship("ServiceSubservice")

    def to_dict(self, include_invoice=True):
        data = {
            "id": self.id,
            "shipment_number": self.shipment_number,
            "customer_id": self.customer_id,
            "route_direction": self.route_direction,
            "service_type_id": self.service_type_id,
            "service_name": self.service_type.name if self.service_type else None,
            "pricing_tier_id": self.pricing_tier_id,
            "tier_name": self.pricing_tier.tier_name if self.pricing_tier else None,
            "sub_service_id": self.sub_service_id,
            "sub_service_name": self.sub_service_name,
            "quantity": self.quantity,
            "unit_price": float(self.unit_price),
            "total_price": float(self.total_price),
            "sender_name": self.sender_name,
            "sender_phone": self.sender_phone,
            "sender_address": self.sender_address,
            "receiver_name": self.receiver_name,
            "receiver_phone": self.receiver_phone,
            "receiver_address": self.receiver_address,
            "field_values": self.field_values,
            "notes": self.notes,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_invoice and self.invoice:
            data["invoice"] = self.invoice.to_dict()
        else:
            data["invoice"] = None
        return data
