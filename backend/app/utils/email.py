"""
Email utility — password reset links.

Phase 1 (dev): print the reset link to the console (the token is also
stored in the password_reset_tokens table, so it can be fetched from DB).
Phase 2: set SMTP_HOST/PORT/USERNAME/PASSWORD/FROM in the environment and
the same function sends a real email.
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from flask import current_app


def build_reset_url(token: str) -> str:
    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:3000")
    return f"{frontend_url.rstrip('/')}/reset-password?token={token}"


def send_reset_email(customer, token: str) -> bool:
    """Deliver a password-reset link. Returns True if delivered via SMTP,
    False if logged to console (dev mode)."""
    url = build_reset_url(token)
    subject = "Reset your DeliveryHub password"
    body = (
        f"Hi {customer.name or 'there'},\n\n"
        f"We received a request to reset your DeliveryHub password.\n\n"
        f"Click the link below to choose a new password. It expires in "
        f"{current_app.config.get('RESET_TOKEN_EXPIRY_MINUTES', 60)} minutes:\n\n"
        f"{url}\n\n"
        f"If you didn't request this, you can safely ignore this email.\n\n"
        f"— DeliveryHub"
    )

    host = os.getenv("SMTP_HOST")
    if host:
        try:
            port = int(os.getenv("SMTP_PORT", "587"))
            username = os.getenv("SMTP_USERNAME")
            password = os.getenv("SMTP_PASSWORD")
            from_addr = os.getenv("SMTP_FROM", username or "noreply@example.com")

            msg = MIMEMultipart()
            msg["From"] = from_addr
            msg["To"] = customer.email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(host, port, timeout=20) as server:
                server.starttls()
                if username:
                    server.login(username, password)
                server.sendmail(from_addr, [customer.email], msg.as_string())
            return True
        except Exception as exc:  # fall back to console if SMTP fails
            print(f"[email] SMTP send failed for {customer.email}: {exc}")

    # Phase 1 mock — log to console so the link is easy to grab in dev
    print(f"\n{'='*60}", flush=True)
    print(f"  PASSWORD RESET for {customer.email}", flush=True)
    print(f"  {url}", flush=True)
    print(f"{'='*60}\n", flush=True)
    return False
