CREATE TABLE IF NOT EXISTS service_subservices (
    id SERIAL PRIMARY KEY,
    pricing_tier_id INTEGER NOT NULL
        REFERENCES service_pricing_tiers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    icon VARCHAR(20),
    display_order INTEGER DEFAULT 0,
    CONSTRAINT uq_service_subservice_name_per_tier UNIQUE (pricing_tier_id, name)
);

ALTER TABLE shipments
    ADD COLUMN IF NOT EXISTS sub_service_id INTEGER
        REFERENCES service_subservices(id) ON DELETE SET NULL;

ALTER TABLE shipments
    ADD COLUMN IF NOT EXISTS sub_service_name VARCHAR(255);

INSERT INTO service_subservices
    (pricing_tier_id, name, price, icon, display_order)
SELECT tiers.id, options.name, options.price, options.icon, options.display_order
FROM service_pricing_tiers AS tiers
CROSS JOIN (
    VALUES
        ('Same Day Label', 80.00, '⚡', 0),
        ('Next Day Label', 75.00, '🚚', 1),
        ('Non Metros → 2 Hop Shipping', 80.00, '📦', 2)
) AS options(name, price, icon, display_order)
WHERE LOWER(REGEXP_REPLACE(TRIM(tiers.tier_name), '\s+', ' ', 'g'))
    IN ('express', 'express shipping', 'standard', 'standard shipping')
ON CONFLICT (pricing_tier_id, name) DO NOTHING;
