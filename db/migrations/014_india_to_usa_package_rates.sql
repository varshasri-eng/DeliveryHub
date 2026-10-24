-- Migration 014: India -> USA package rates (INR).
--
-- 0.5 kg to 20 kg are fixed package prices (price_inr is the full price).
-- The four heavy-weight slabs are priced PER KG; the customer enters the number
-- of kg as the quantity, so the service needs "Enable quantity" turned on.
--
-- NOTE: 6 kg is entered exactly as supplied (5,598), which is lower than 5.5 kg
-- (5,673). It may be a typo for 5,958 - confirm and correct if needed (see the
-- last lines of this file).
--
-- HOW TO RUN (psql variable holds the slug of the India -> USA service):
--   docker compose exec -T postgres psql -U deliveryhub_user -d deliveryhub \
--       -v svc_slug=YOUR-SERVICE-SLUG < db/migrations/014_india_to_usa_package_rates.sql
--
-- Safe to re-run: existing tiers with the same name are updated, missing ones are added.
-- price (USD) is NOT NULL in the table, so it is set to 0 - India -> USA bookings use price_inr.

\set ON_ERROR_STOP on
BEGIN;

-- Stop early if the slug does not match an India -> USA service.
SELECT id AS service_id, name, enable_quantity
FROM service_types
WHERE slug = :'svc_slug' AND route_direction = 'IN_TO_US';

CREATE TEMP TABLE rate_import (
    order_no integer,
    tier_name text,
    description text,
    price_inr numeric(10, 2)
) ON COMMIT DROP;

INSERT INTO rate_import (order_no, tier_name, description, price_inr) VALUES
    (1, '0.5 kg', 'Package rate up to 0.5 kg', 2122),
    (2, '1 kg', 'Package rate up to 1 kg', 2197),
    (3, '1.5 kg', 'Package rate up to 1.5 kg', 2554),
    (4, '2 kg', 'Package rate up to 2 kg', 2906),
    (5, '2.5 kg', 'Package rate up to 2.5 kg', 3260),
    (6, '3 kg', 'Package rate up to 3 kg', 3686),
    (7, '3.5 kg', 'Package rate up to 3.5 kg', 4112),
    (8, '4 kg', 'Package rate up to 4 kg', 4537),
    (9, '4.5 kg', 'Package rate up to 4.5 kg', 4963),
    (10, '5 kg', 'Package rate up to 5 kg', 5389),
    (11, '5.5 kg', 'Package rate up to 5.5 kg', 5673),
    (12, '6 kg', 'Package rate up to 6 kg', 5598),
    (13, '6.5 kg', 'Package rate up to 6.5 kg', 6243),
    (14, '7 kg', 'Package rate up to 7 kg', 6525),
    (15, '7.5 kg', 'Package rate up to 7.5 kg', 6808),
    (16, '8 kg', 'Package rate up to 8 kg', 7092),
    (17, '8.5 kg', 'Package rate up to 8.5 kg', 7376),
    (18, '9 kg', 'Package rate up to 9 kg', 7663),
    (19, '9.5 kg', 'Package rate up to 9.5 kg', 8027),
    (20, '10 kg', 'Package rate up to 10 kg', 8203),
    (21, '10.5 kg', 'Package rate up to 10.5 kg', 8704),
    (22, '11 kg', 'Package rate up to 11 kg', 9109),
    (23, '11.5 kg', 'Package rate up to 11.5 kg', 9512),
    (24, '12 kg', 'Package rate up to 12 kg', 9920),
    (25, '12.5 kg', 'Package rate up to 12.5 kg', 10320),
    (26, '13 kg', 'Package rate up to 13 kg', 10727),
    (27, '13.5 kg', 'Package rate up to 13.5 kg', 11131),
    (28, '14 kg', 'Package rate up to 14 kg', 11534),
    (29, '14.5 kg', 'Package rate up to 14.5 kg', 11944),
    (30, '15 kg', 'Package rate up to 15 kg', 12346),
    (31, '15.5 kg', 'Package rate up to 15.5 kg', 12762),
    (32, '16 kg', 'Package rate up to 16 kg', 13160),
    (33, '16.5 kg', 'Package rate up to 16.5 kg', 13574),
    (34, '17 kg', 'Package rate up to 17 kg', 13983),
    (35, '17.5 kg', 'Package rate up to 17.5 kg', 14388),
    (36, '18 kg', 'Package rate up to 18 kg', 14803),
    (37, '18.5 kg', 'Package rate up to 18.5 kg', 15207),
    (38, '19 kg', 'Package rate up to 19 kg', 15611),
    (39, '19.5 kg', 'Package rate up to 19.5 kg', 16016),
    (40, '20 kg', 'Package rate up to 20 kg', 16424),
    (41, '21-44 kg (per kg)', 'Heavy weight slab: rate per kg. Enter the total number of kg as the quantity.', 775),
    (42, '45-70 kg (per kg)', 'Heavy weight slab: rate per kg. Enter the total number of kg as the quantity.', 781),
    (43, '71-99 kg (per kg)', 'Heavy weight slab: rate per kg. Enter the total number of kg as the quantity.', 732),
    (44, '100-299 kg (per kg)', 'Heavy weight slab: rate per kg. Enter the total number of kg as the quantity.', 734);

UPDATE service_pricing_tiers t
SET price_inr = r.price_inr,
    description = r.description,
    display_order = r.order_no
FROM rate_import r, service_types s
WHERE s.id = t.service_type_id
  AND s.slug = :'svc_slug' AND s.route_direction = 'IN_TO_US'
  AND t.tier_name = r.tier_name;

INSERT INTO service_pricing_tiers
    (service_type_id, tier_name, description, price, price_inr, display_order)
SELECT s.id, r.tier_name, r.description, 0, r.price_inr, r.order_no
FROM rate_import r
CROSS JOIN service_types s
WHERE s.slug = :'svc_slug' AND s.route_direction = 'IN_TO_US'
  AND NOT EXISTS (
      SELECT 1 FROM service_pricing_tiers t
      WHERE t.service_type_id = s.id AND t.tier_name = r.tier_name
  );

-- Should show 44 for the 44 rates below (more if the service already had other tiers).
SELECT count(*) AS tiers_on_service
FROM service_pricing_tiers t JOIN service_types s ON s.id = t.service_type_id
WHERE s.slug = :'svc_slug';

COMMIT;

-- If 6 kg should be 5,958, run this once:
-- UPDATE service_pricing_tiers SET price_inr = 5958
-- WHERE tier_name = '6 kg' AND service_type_id = (SELECT id FROM service_types WHERE slug = 'YOUR-SERVICE-SLUG');