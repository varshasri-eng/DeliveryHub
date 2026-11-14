-- Migration 023: NEW service "Personal Items" (India -> USA, shipped with UPS, INR, pan-India).
-- It is a separate service from Air Cargo: Air Cargo and its FedEx / DHL / UPS prices are NOT touched.
--
--   0.5 - 5 kg   : fixed package prices
--   6 - 7.5 kg   : 1,175 per kg x weight        8 - 10.5 kg : 1,125 per kg x weight
--   11 - 20 kg   : 1,020 per kg x weight        21+ kg slabs: 920 per kg (customer enters the kg as quantity)
--   Prices include GST, free pickup and packing. UPS charges the higher of actual and volumetric weight.
--   Not allowed: cosmetics, ghee, medicine. Electronics: Rs 50 extra per kg (shown as a note, NOT added to the price).
--
-- The service copies its booking-form settings and fields from Air Cargo (slug air-cargo-india-to-usa),
-- so it behaves the same way. It is added right after Air Cargo in the services list.
--
-- Your existing service is "personal shipments" (slug personal-shipments). The file fills THAT service.
-- (If the slug does not exist yet, it creates a new "Personal Items" service with that slug.)
--
-- RUN:
--   docker compose exec -T postgres psql -U deliveryhub_user -d deliveryhub \
--       -v svc_slug=personal-shipments < db/migrations/023_personal_items_ups_service.sql
-- Safe to re-run: existing rows are updated, missing ones are added.

\set ON_ERROR_STOP on
BEGIN;

-- 1) The service
INSERT INTO service_types
    (name, slug, route_direction, badge_label, tagline, description, icon,
     enable_quantity, is_active, display_order, created_at, updated_at)
SELECT 'Personal Items', :'svc_slug', 'IN_TO_US', 'UPS',
       'Send personal items from India to the USA with UPS',
       'Ship personal items from anywhere in India to the USA with UPS. Rates are pan-India and include GST, free pickup and packing.',
       '🧳',
       COALESCE(a.enable_quantity, true), true, COALESCE(a.display_order, 0) + 1, now(), now()
FROM (SELECT 1) AS one
LEFT JOIN service_types a ON a.slug = 'air-cargo-india-to-usa'
ON CONFLICT (slug) DO NOTHING;

-- The per-kg slabs need "Enable quantity" turned on
UPDATE service_types SET enable_quantity = true WHERE slug = :'svc_slug';

-- 2) Booking-form fields, copied from Air Cargo
INSERT INTO service_fields (service_type_id, label, field_key, field_type, options, display_order)
SELECT n.id, f.label, f.field_key, f.field_type, f.options, f.display_order
FROM service_types n
JOIN service_types a ON a.slug = 'air-cargo-india-to-usa'
JOIN service_fields f ON f.service_type_id = a.id
WHERE n.slug = :'svc_slug'
  AND NOT EXISTS (SELECT 1 FROM service_fields x WHERE x.service_type_id = n.id AND x.field_key = f.field_key);

-- 3) Weight options and UPS prices
CREATE TEMP TABLE ups_rates (
    order_no integer, tier_name text, description text,
    price_inr numeric(10, 2), min_quantity integer, max_quantity integer
) ON COMMIT DROP;
INSERT INTO ups_rates (order_no, tier_name, description, price_inr, min_quantity, max_quantity) VALUES
    (1, '0.5 kg', 'Package rate up to 0.5 kg', 3000.00, NULL, NULL),
    (2, '1 kg', 'Package rate up to 1 kg', 3500.00, NULL, NULL),
    (3, '2 kg', 'Package rate up to 2 kg', 4500.00, NULL, NULL),
    (4, '3 kg', 'Package rate up to 3 kg', 5700.00, NULL, NULL),
    (5, '4 kg', 'Package rate up to 4 kg', 6700.00, NULL, NULL),
    (6, '5 kg', 'Package rate up to 5 kg', 7700.00, NULL, NULL),
    (7, '6 kg', 'Package rate up to 6 kg', 7050.00, NULL, NULL),
    (8, '6.5 kg', 'Package rate up to 6.5 kg', 7637.50, NULL, NULL),
    (9, '7 kg', 'Package rate up to 7 kg', 8225.00, NULL, NULL),
    (10, '7.5 kg', 'Package rate up to 7.5 kg', 8812.50, NULL, NULL),
    (11, '8 kg', 'Package rate up to 8 kg', 9000.00, NULL, NULL),
    (12, '8.5 kg', 'Package rate up to 8.5 kg', 9562.50, NULL, NULL),
    (13, '9 kg', 'Package rate up to 9 kg', 10125.00, NULL, NULL),
    (14, '9.5 kg', 'Package rate up to 9.5 kg', 10687.50, NULL, NULL),
    (15, '10 kg', 'Package rate up to 10 kg', 11250.00, NULL, NULL),
    (16, '10.5 kg', 'Package rate up to 10.5 kg', 11812.50, NULL, NULL),
    (17, '11 kg', 'Package rate up to 11 kg', 11220.00, NULL, NULL),
    (18, '11.5 kg', 'Package rate up to 11.5 kg', 11730.00, NULL, NULL),
    (19, '12 kg', 'Package rate up to 12 kg', 12240.00, NULL, NULL),
    (20, '12.5 kg', 'Package rate up to 12.5 kg', 12750.00, NULL, NULL),
    (21, '13 kg', 'Package rate up to 13 kg', 13260.00, NULL, NULL),
    (22, '13.5 kg', 'Package rate up to 13.5 kg', 13770.00, NULL, NULL),
    (23, '14 kg', 'Package rate up to 14 kg', 14280.00, NULL, NULL),
    (24, '14.5 kg', 'Package rate up to 14.5 kg', 14790.00, NULL, NULL),
    (25, '15 kg', 'Package rate up to 15 kg', 15300.00, NULL, NULL),
    (26, '15.5 kg', 'Package rate up to 15.5 kg', 15810.00, NULL, NULL),
    (27, '16 kg', 'Package rate up to 16 kg', 16320.00, NULL, NULL),
    (28, '16.5 kg', 'Package rate up to 16.5 kg', 16830.00, NULL, NULL),
    (29, '17 kg', 'Package rate up to 17 kg', 17340.00, NULL, NULL),
    (30, '17.5 kg', 'Package rate up to 17.5 kg', 17850.00, NULL, NULL),
    (31, '18 kg', 'Package rate up to 18 kg', 18360.00, NULL, NULL),
    (32, '18.5 kg', 'Package rate up to 18.5 kg', 18870.00, NULL, NULL),
    (33, '19 kg', 'Package rate up to 19 kg', 19380.00, NULL, NULL),
    (34, '19.5 kg', 'Package rate up to 19.5 kg', 19890.00, NULL, NULL),
    (35, '20 kg', 'Package rate up to 20 kg', 20400.00, NULL, NULL),
    (36, '21-44 kg (per kg)', 'Heavy weight slab: rate per kg. Enter the total number of kg as the quantity.', 920.00, 21, 44),
    (37, '45-70 kg (per kg)', 'Heavy weight slab: rate per kg. Enter the total number of kg as the quantity.', 920.00, 45, 70),
    (38, '71-99 kg (per kg)', 'Heavy weight slab: rate per kg. Enter the total number of kg as the quantity.', 920.00, 71, 99),
    (39, '100-299 kg (per kg)', 'Heavy weight slab: rate per kg. Enter the total number of kg as the quantity.', 920.00, 100, 299);

UPDATE service_pricing_tiers t
SET price_inr = r.price_inr, description = r.description, display_order = r.order_no,
    min_quantity = r.min_quantity, max_quantity = r.max_quantity
FROM ups_rates r, service_types s
WHERE s.id = t.service_type_id AND s.slug = :'svc_slug' AND t.tier_name = r.tier_name;

INSERT INTO service_pricing_tiers
    (service_type_id, tier_name, description, price, price_inr, display_order, min_quantity, max_quantity)
SELECT s.id, r.tier_name, r.description, 0, r.price_inr, r.order_no, r.min_quantity, r.max_quantity
FROM ups_rates r
CROSS JOIN service_types s
WHERE s.slug = :'svc_slug'
  AND NOT EXISTS (SELECT 1 FROM service_pricing_tiers t WHERE t.service_type_id = s.id AND t.tier_name = r.tier_name);

-- UPS as the carrier on every weight option
UPDATE service_subservices x
SET price_inr = r.price_inr
FROM service_pricing_tiers t, service_types s, ups_rates r
WHERE x.pricing_tier_id = t.id AND s.id = t.service_type_id AND s.slug = :'svc_slug'
  AND x.name = 'UPS' AND r.tier_name = t.tier_name;

INSERT INTO service_subservices (pricing_tier_id, name, price, price_inr, icon, display_order)
SELECT t.id, 'UPS', 0, r.price_inr, '✈️', 1
FROM service_pricing_tiers t
JOIN service_types s ON s.id = t.service_type_id
JOIN ups_rates r ON r.tier_name = t.tier_name
WHERE s.slug = :'svc_slug'
  AND NOT EXISTS (SELECT 1 FROM service_subservices x WHERE x.pricing_tier_id = t.id AND x.name = 'UPS');

-- 4) What is included, and what is not allowed
INSERT INTO service_coverage_items (service_type_id, text, display_order)
SELECT s.id, n.text, n.ord
FROM service_types s
CROSS JOIN (VALUES
    (1, 'Pan-India rate: pickup from anywhere in India'),
    (2, 'GST, free pickup and packing included'),
    (3, 'Shipped with UPS')
) AS n(ord, text)
WHERE s.slug = :'svc_slug'
  AND NOT EXISTS (SELECT 1 FROM service_coverage_items q WHERE q.service_type_id = s.id AND q.text = n.text);

INSERT INTO service_restrictions (service_type_id, text, display_order)
SELECT s.id, n.text, n.ord
FROM service_types s
CROSS JOIN (VALUES
    (1, 'Not allowed: cosmetics, ghee and medicine.'),
    (2, 'Electronics are charged Rs 50 extra per kg.'),
    (3, 'The higher of actual weight and volumetric weight is charged. Volumetric weight = length x height x width (cm) / 5000.')
) AS n(ord, text)
WHERE s.slug = :'svc_slug'
  AND NOT EXISTS (SELECT 1 FROM service_restrictions q WHERE q.service_type_id = s.id AND q.text = n.text);

COMMIT;

-- Check: 39 weight options with one UPS price each (more weight options = tiers that were already on the service)
SELECT s.name, s.slug, s.enable_quantity, count(DISTINCT t.id) AS weight_options, count(x.id) AS ups_prices
FROM service_types s
LEFT JOIN service_pricing_tiers t ON t.service_type_id = s.id
LEFT JOIN service_subservices x ON x.pricing_tier_id = t.id AND x.name = 'UPS'
WHERE s.slug = :'svc_slug'
GROUP BY s.name, s.slug, s.enable_quantity;