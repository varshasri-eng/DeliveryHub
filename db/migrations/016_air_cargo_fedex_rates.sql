-- Migration 016: FedEx rates (USA list) for Air Cargo India -> USA.
-- 1-10 kg: as per the FedEx USA list. 11-20 kg: 910 per kg x whole kg. 21+ kg slabs: 866 per kg.
-- FedEx is removed from the half-kg options (0.5, 1.5 ... 19.5 kg) because the list has no price for them.
-- Canada column is intentionally not imported. DHL and UPS are untouched (still placeholders).
--
-- RUN:
--   docker compose exec -T postgres psql -U deliveryhub_user -d deliveryhub \
--       -v svc_slug=air-cargo-india-to-usa < db/migrations/016_air_cargo_fedex_rates.sql
-- Safe to re-run. (Do not re-run 015 afterwards, it would re-add FedEx on the half-kg options.)

\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE fedex_rates (tier_name text, price_inr numeric(10, 2)) ON COMMIT DROP;
INSERT INTO fedex_rates (tier_name, price_inr) VALUES
    ('1 kg', 3272),
    ('2 kg', 3905),
    ('3 kg', 4967),
    ('4 kg', 5571),
    ('5 kg', 6264),
    ('6 kg', 7049),
    ('7 kg', 7578),
    ('8 kg', 8202),
    ('9 kg', 8733),
    ('10 kg', 9300),
    ('11 kg', 10010),
    ('12 kg', 10920),
    ('13 kg', 11830),
    ('14 kg', 12740),
    ('15 kg', 13650),
    ('16 kg', 14560),
    ('17 kg', 15470),
    ('18 kg', 16380),
    ('19 kg', 17290),
    ('20 kg', 18200),
    ('21-44 kg (per kg)', 866),
    ('45-70 kg (per kg)', 866),
    ('71-99 kg (per kg)', 866),
    ('100-299 kg (per kg)', 866);

UPDATE service_subservices x
SET price_inr = r.price_inr
FROM service_pricing_tiers t, service_types s, fedex_rates r
WHERE x.pricing_tier_id = t.id AND s.id = t.service_type_id AND s.slug = :'svc_slug'
  AND x.name = 'FedEx' AND r.tier_name = t.tier_name;

DELETE FROM service_subservices x
USING service_pricing_tiers t, service_types s
WHERE x.pricing_tier_id = t.id AND s.id = t.service_type_id AND s.slug = :'svc_slug'
  AND x.name = 'FedEx' AND t.tier_name NOT IN (SELECT tier_name FROM fedex_rates);

COMMIT;
