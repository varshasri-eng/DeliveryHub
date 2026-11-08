"""
PaymentSettings — singleton row holding the payment QR codes and instructions
shown to customers on their invoice. There is one set per route direction
(US_TO_IN: customer pays in USD, IN_TO_US: customer pays in INR); the original
qr_code_url / instructions columns are kept as a fallback when a direction has
nothing of its own yet.
"""

from datetime import datetime, timezone
from app import db


class PaymentSettings(db.Model):
    __tablename__ = "payment_settings"

    id = db.Column(db.Integer, primary_key=True)

    # Fallback (used when a direction has no QR / instructions of its own)
    qr_code_url = db.Column(db.String(500), nullable=True)
    instructions = db.Column(db.Text, nullable=True)

    # USA -> India shipments
    qr_code_url_us_in = db.Column(db.String(500), nullable=True)
    instructions_us_in = db.Column(db.Text, nullable=True)

    # India -> USA shipments
    qr_code_url_in_us = db.Column(db.String(500), nullable=True)
    instructions_in_us = db.Column(db.Text, nullable=True)

    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "qr_code_url": self.qr_code_url,
            "instructions": self.instructions,
            "qr_code_url_us_in": self.qr_code_url_us_in,
            "instructions_us_in": self.instructions_us_in,
            "qr_code_url_in_us": self.qr_code_url_in_us,
            "instructions_in_us": self.instructions_in_us,
            "updated_at": (
                self.updated_at.isoformat() if self.updated_at else None
            ),
        }