ALTER TABLE service_pricing_tiers
    ADD COLUMN IF NOT EXISTS price_inr NUMERIC(10, 2);

ALTER TABLE service_subservices
    ADD COLUMN IF NOT EXISTS price_inr NUMERIC(10, 2);

ALTER TABLE shipments
    ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) NOT NULL DEFAULT 'USD';
