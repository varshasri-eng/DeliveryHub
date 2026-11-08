-- Migration 020: separate payment QR + instructions per route direction.
--   US_TO_IN (USA -> India, customer pays in USD)  -> *_us_in
--   IN_TO_US (India -> USA, customer pays in INR)  -> *_in_us
-- The current QR / instructions are copied into both so invoices keep working
-- until the admin uploads a direction-specific QR. Safe to run more than once.
--
-- RUN BEFORE rebuilding the backend:
--   docker compose exec -T postgres psql -U deliveryhub_user -d deliveryhub < db/migrations/020_payment_settings_per_route.sql

BEGIN;

ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS qr_code_url_us_in   varchar(500);
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS instructions_us_in  text;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS qr_code_url_in_us   varchar(500);
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS instructions_in_us  text;

UPDATE payment_settings
SET qr_code_url_us_in  = COALESCE(qr_code_url_us_in,  qr_code_url),
    instructions_us_in = COALESCE(instructions_us_in, instructions),
    qr_code_url_in_us  = COALESCE(qr_code_url_in_us,  qr_code_url),
    instructions_in_us = COALESCE(instructions_in_us, instructions);

COMMIT;

SELECT id, qr_code_url, qr_code_url_us_in, qr_code_url_in_us FROM payment_settings;
