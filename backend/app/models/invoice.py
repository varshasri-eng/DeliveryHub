from datetime import datetime, timezone
from app import db

VALID_INVOICE_STATUSES = {"issued", "payment_submitted", "payment_verified", "payment_rejected"}


class Invoice(db.Model):
    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(30), unique=True, nullable=False)
    shipment_id = db.Column(db.Integer, db.ForeignKey("shipments.id", ondelete="CASCADE"),
                            unique=True, nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    status = db.Column(db.String(20), nullable=False, default="issued")
    issued_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    paid_at = db.Column(db.DateTime(timezone=True))

    payment_screenshot_path = db.Column(db.String(500))
    payment_note = db.Column(db.Text)
    payment_submitted_at = db.Column(db.DateTime(timezone=True))
    payment_verified_by = db.Column(db.Integer, db.ForeignKey("customers.id"))
    payment_rejection_reason = db.Column(db.Text)

    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    shipment = db.relationship("Shipment", backref=db.backref("invoice", uselist=False))
    items = db.relationship("InvoiceItem", back_populates="invoice", lazy=True,
                            cascade="all, delete-orphan", order_by="InvoiceItem.id")

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_number": self.invoice_number,
            "shipment_id": self.shipment_id,
            "total_amount": float(self.total_amount or 0),
            "status": self.status,
            "issued_at": self.issued_at.isoformat() if self.issued_at else None,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "payment_screenshot_path": self.payment_screenshot_path,
            "payment_note": self.payment_note,
            "payment_submitted_at": self.payment_submitted_at.isoformat() if self.payment_submitted_at else None,
            "payment_verified_by": self.payment_verified_by,
            "payment_rejection_reason": self.payment_rejection_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "items": [item.to_dict() for item in self.items],
        }


class InvoiceItem(db.Model):
    __tablename__ = "invoice_items"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    line_total = db.Column(db.Numeric(10, 2), nullable=False)

    invoice = db.relationship("Invoice", back_populates="items")

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "description": self.description,
            "quantity": self.quantity,
            "unit_price": float(self.unit_price),
            "line_total": float(self.line_total),
        }
