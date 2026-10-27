-- Migration 015: Air Cargo India -> USA = carrier (FedEx / DHL / UPS) x weight.
--
-- 1) Adds min_quantity / max_quantity to service_pricing_tiers (kg limits for per-kg slabs).
-- 2) Sets the limits for the four heavy slabs.
-- 3) Gives every priced Air Cargo weight option three sub-services: FedEx, DHL, UPS.
--    !! Their INR prices are PLACEHOLDERS copied from the weight price. Replace them with
--    the real per-carrier prices (template at the bottom) before going live. !!
--
-- RUN BEFORE restarting the backend:
--   docker compose exec -T postgres psql -U deliveryhub_user -d deliveryhub \
--       -v svc_slug=air-cargo-india-to-usa < db/migrations/015_air_cargo_carriers_and_weight_limits.sql
-- Safe to re-run.

\set ON_ERROR_STOP on
BEGIN;

ALTER TABLE service_pricing_tiers ADD COLUMN IF NOT EXISTS min_quantity integer;
ALTER TABLE service_pricing_tiers ADD COLUMN IF NOT EXISTS max_quantity integer;

UPDATE service_pricing_tiers t SET min_quantity = 21,  max_quantity = 44  FROM service_types s
 WHERE s.id = t.service_type_id AND s.slug = :'svc_slug' AND t.tier_name = '21-44 kg (per kg)';
UPDATE service_pricing_tiers t SET min_quantity = 45,  max_quantity = 70  FROM service_types s
 WHERE s.id = t.service_type_id AND s.slug = :'svc_slug' AND t.tier_name = '45-70 kg (per kg)';
UPDATE service_pricing_tiers t SET min_quantity = 71,  max_quantity = 99  FROM service_types s
 WHERE s.id = t.service_type_id AND s.slug = :'svc_slug' AND t.tier_name = '71-99 kg (per kg)';
UPDATE service_pricing_tiers t SET min_quantity = 100, max_quantity = 299 FROM service_types s
 WHERE s.id = t.service_type_id AND s.slug = :'svc_slug' AND t.tier_name = '100-299 kg (per kg)';

-- Carrier sub-services (price_inr placeholder = tier price_inr). Only for priced tiers.
INSERT INTO service_subservices (pricing_tier_id, name, price, price_inr, icon, display_order)
SELECT t.id, c.name, 0, t.price_inr, c.icon, c.ord
FROM service_pricing_tiers t
JOIN service_types s ON s.id = t.service_type_id
CROSS JOIN (VALUES ('FedEx', '✈️', 1), ('DHL', '✈️', 2), ('UPS', '✈️', 3)) AS c(name, icon, ord)
WHERE s.slug = :'svc_slug' AND t.price_inr IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM service_subservices x WHERE x.pricing_tier_id = t.id AND x.name = c.name);

COMMIT;

-- Per-carrier price template (run once you have the lists), e.g.:
-- UPDATE service_subservices x SET price_inr = 2300
--   FROM service_pricing_tiers t JOIN service_types s ON s.id = t.service_type_id
--  WHERE x.pricing_tier_id = t.id AND s.slug = 'air-cargo-india-to-usa'
--    AND t.tier_name = '0.5 kg' AND x.name = 'DHL';
