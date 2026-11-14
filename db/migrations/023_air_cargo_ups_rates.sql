-- Migration 023: UPS rates (personal items, India -> USA, pan-India, INR, GST + free pickup and packing included)
-- for Air Cargo India -> USA.
--
--   0.5 - 5 kg   : fixed package prices from the UPS list
--   6 - 7.5 kg   : 1,175 per kg x weight        8 - 10.5 kg : 1,125 per kg x weight
--   11 - 20 kg   : 1,020 per kg x weight        21+ kg slabs: 920 per kg (quantity = kg)
-- UPS is removed from 1.5, 2.5, 3.5, 4.5 and 5.5 kg: the list has no price for them.
-- Also adds the UPS notes (not allowed items, electronics +50/kg, volumetric weight) as service restrictions.
-- Electronics +50/kg is shown as a note only; it is NOT added to the price automatically.
--
-- RUN:
--   docker compose exec -T postgres psql -U deliveryhub_user -d deliveryhub \
--       -v svc_slug=air-cargo-india-to-usa < db/migrations/023_air_cargo_ups_rates.sql
-- Safe to re-run. (Do not re-run 015 afterwards.)

\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE ups_rates (tier_name text, price_inr numeric(10, 2)) ON COMMIT DROP;
INSERT INTO ups_rates (tier_name, price_inr) VALUES
    ('0.5 kg', 3000),
    ('1 kg', 3500),
    ('2 kg', 4500),
    ('3 kg', 5700),
    ('4 kg', 6700),
    ('5 kg', 7700),
    ('6 kg', 7050),
    ('6.5 kg', 7637.5),
    ('7 kg', 8225),
    ('7.5 kg', 8812.5),
    ('8 kg', 9000),
    ('8.5 kg', 9562.5),
    ('9 kg', 10125),
    ('9.5 kg', 10687.5),
    ('10 kg', 11250),
    ('10.5 kg', 11812.5),
    ('11 kg', 11220),
    ('11.5 kg', 11730),
    ('12 kg', 12240),
    ('12.5 kg', 12750),
    ('13 kg', 13260),
    ('13.5 kg', 13770),
    ('14 kg', 14280),
    ('14.5 kg', 14790),
    ('15 kg', 15300),
    ('15.5 kg', 15810),
    ('16 kg', 16320),
    ('16.5 kg', 16830),
    ('17 kg', 17340),
    ('17.5 kg', 17850),
    ('18 kg', 18360),
    ('18.5 kg', 18870),
    ('19 kg', 19380),
    ('19.5 kg', 19890),
    ('20 kg', 20400),
    ('21-44 kg (per kg)', 920),
    ('45-70 kg (per kg)', 920),
    ('71-99 kg (per kg)', 920),
    ('100-299 kg (per kg)', 920);

-- UPS price on every listed weight option (add the UPS option where a tier does not have one yet)
INSERT INTO service_subservices (pricing_tier_id, name, price, price_inr, icon, display_order)
SELECT t.id, 'UPS', 0, r.price_inr, '✈️', 3
FROM service_pricing_tiers t
JOIN service_types s ON s.id = t.service_type_id
JOIN ups_rates r ON r.tier_name = t.tier_name
WHERE s.slug = :'svc_slug'
  AND NOT EXISTS (SELECT 1 FROM service_subservices x WHERE x.pricing_tier_id = t.id AND x.name = 'UPS');

UPDATE service_subservices x
SET price_inr = r.price_inr
FROM service_pricing_tiers t, service_types s, ups_rates r
WHERE x.pricing_tier_id = t.id AND s.id = t.service_type_id AND s.slug = :'svc_slug'
  AND x.name = 'UPS' AND r.tier_name = t.tier_name;

-- no UPS price in the list for the other weight options
DELETE FROM service_subservices x
USING service_pricing_tiers t, service_types s
WHERE x.pricing_tier_id = t.id AND s.id = t.service_type_id AND s.slug = :'svc_slug'
  AND x.name = 'UPS' AND t.tier_name NOT IN (SELECT tier_name FROM ups_rates);

-- UPS notes shown with the service
INSERT INTO service_restrictions (service_type_id, text, display_order)
SELECT s.id, n.text, COALESCE((SELECT max(display_order) FROM service_restrictions WHERE service_type_id = s.id), 0) + n.ord
FROM service_types s
CROSS JOIN (VALUES
    (1, 'UPS: cosmetics, ghee and medicine are not allowed.'),
    (2, 'UPS: electronics are charged Rs 50 extra per kg.'),
    (3, 'UPS rates are pan-India and include GST, free pickup and packing.'),
    (4, 'UPS charges the higher of actual weight and volumetric weight (length x height x width in cm / 5000).')
) AS n(ord, text)
WHERE s.slug = :'svc_slug'
  AND NOT EXISTS (SELECT 1 FROM service_restrictions q WHERE q.service_type_id = s.id AND q.text = n.text);

COMMIT;

-- Check: should be 39 UPS rows: 6 flat prices, 29 per-kg weights (6 to 20 kg) and 4 slabs
SELECT count(*) AS ups_prices
FROM service_subservices x
JOIN service_pricing_tiers t ON t.id = x.pricing_tier_id
JOIN service_types s ON s.id = t.service_type_id
WHERE s.slug = :'svc_slug' AND x.name = 'UPS';
