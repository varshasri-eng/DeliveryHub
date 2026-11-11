from datetime import datetime, timezone
from app import db


def _now():
    return datetime.now(timezone.utc)


class PaymentRecord(db.Model):
    """
    One row per shipment whose invoice payment has been verified: the revenue list.
    It is a snapshot taken at verification time (amount, names, service), so later edits to
    the shipment do not change past revenue. Monthly totals are calculated from these rows.
    """
    __tablename__ = "payment_records"

    id = db.Column(db.Integer, primary_key=True)
    shipment_id = db.Column(db.Integer, unique=True, index=True)   # one record per shipment
    invoice_id = db.Column(db.Integer)
    shipment_number = db.Column(db.String(30), nullable=False)
    route_direction = db.Column(db.String(10))
    service_name = db.Column(db.String(500))
    sender_name = db.Column(db.String(255))
    receiver_name = db.Column(db.String(255))
    currency_code = db.Column(db.String(3), nullable=False, default="USD")
    amount_paid = db.Column(db.Numeric(12, 2), nullable=False)
    paid_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_now, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=_now)

    def to_dict(self):
        return {
            "id": self.id,
            "shipment_id": self.shipment_id,
            "shipment_number": self.shipment_number,
            "route_direction": self.route_direction,
            "service_name": self.service_name,
            "sender_name": self.sender_name,
            "receiver_name": self.receiver_name,
            "currency_code": self.currency_code,
            "amount_paid": float(self.amount_paid or 0),
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
        }
