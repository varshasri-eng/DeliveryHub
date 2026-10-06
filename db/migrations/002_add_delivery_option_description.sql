ALTER TABLE service_pricing_tiers
    ADD COLUMN IF NOT EXISTS description VARCHAR(255);
