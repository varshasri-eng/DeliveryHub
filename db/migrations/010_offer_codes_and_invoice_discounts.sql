BEGIN;

CREATE TABLE IF NOT EXISTS offer_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_percent NUMERIC(5, 2) NOT NULL
        CHECK (discount_percent > 0 AND discount_percent <= 100),
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
    times_used INTEGER NOT NULL DEFAULT 0 CHECK (times_used >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_until > valid_from)
);

ALTER TABLE shipments
    ADD COLUMN IF NOT EXISTS subtotal_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS offer_code_id INTEGER REFERENCES offer_codes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS offer_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS offer_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS offer_discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;

UPDATE shipments
SET subtotal_price = total_price
WHERE subtotal_price = 0 AND total_price > 0;

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS offer_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS offer_discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS manual_discount_type VARCHAR(20) NOT NULL DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS manual_discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS manual_discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;

UPDATE invoices
SET subtotal_amount = total_amount
WHERE subtotal_amount = 0 AND total_amount > 0;

COMMIT;
