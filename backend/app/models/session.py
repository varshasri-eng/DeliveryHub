from datetime import datetime, timezone
from app import db


class OTPVerification(db.Model):
    """
    Phase 1: email-based OTP (mock).
    Phase 2: swap delivery to WhatsApp/SMS.
    """
    __tablename__ = "otp_verifications"

    id = db.Column(db.Integer, primary_key=True)
    identifier = db.Column(db.String(255), nullable=False)    # email or phone
    otp_code = db.Column(db.String(10), nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True),
                           default=lambda: datetime.now(timezone.utc))


class Session(db.Model):
    __tablename__ = "sessions"

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"),
                            nullable=False)
    token = db.Column(db.String(255), nullable=False, unique=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True),
                           default=lambda: datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)

    def is_valid(self):
        if not self.is_active:
            return False
        expires_at = self.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return expires_at > datetime.now(timezone.utc)
