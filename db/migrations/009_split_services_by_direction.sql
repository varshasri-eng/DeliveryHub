BEGIN;

ALTER TABLE service_types
    ADD COLUMN IF NOT EXISTS route_direction VARCHAR(10) NOT NULL DEFAULT 'US_TO_IN';

UPDATE service_types
SET route_direction = 'US_TO_IN'
WHERE route_direction IS NULL OR route_direction NOT IN ('US_TO_IN', 'IN_TO_US');

INSERT INTO service_types (
    name, slug, route_direction, badge_label, tagline, description, icon,
    enable_quantity, is_active, display_order, created_at, updated_at
)
SELECT
    original_service.name,
    original_service.slug || '-india-to-usa',
    'IN_TO_US',
    original_service.badge_label,
    original_service.tagline,
    original_service.description,
    original_service.icon,
    original_service.enable_quantity,
    original_service.is_active,
    original_service.display_order,
    NOW(),
    NOW()
FROM service_types AS original_service
WHERE original_service.route_direction = 'US_TO_IN'
  AND NOT EXISTS (
      SELECT 1
      FROM service_types AS counterpart
      WHERE counterpart.slug = original_service.slug || '-india-to-usa'
        AND counterpart.route_direction = 'IN_TO_US'
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO service_coverage_items (service_type_id, text, display_order)
SELECT counterpart.id, source_item.text, source_item.display_order
FROM service_types AS original_service
JOIN service_types AS counterpart
  ON counterpart.slug = original_service.slug || '-india-to-usa'
 AND counterpart.route_direction = 'IN_TO_US'
JOIN service_coverage_items AS source_item
  ON source_item.service_type_id = original_service.id
WHERE original_service.route_direction = 'US_TO_IN'
  AND NOT EXISTS (
      SELECT 1
      FROM service_coverage_items AS existing
      WHERE existing.service_type_id = counterpart.id
  );

INSERT INTO service_restrictions (service_type_id, text, display_order)
SELECT counterpart.id, source_item.text, source_item.display_order
FROM service_types AS original_service
JOIN service_types AS counterpart
  ON counterpart.slug = original_service.slug || '-india-to-usa'
 AND counterpart.route_direction = 'IN_TO_US'
JOIN service_restrictions AS source_item
  ON source_item.service_type_id = original_service.id
WHERE original_service.route_direction = 'US_TO_IN'
  AND NOT EXISTS (
      SELECT 1
      FROM service_restrictions AS existing
      WHERE existing.service_type_id = counterpart.id
  );

INSERT INTO service_pricing_tiers (
    service_type_id, tier_name, description, duration_label,
    price, price_inr, icon, display_order
)
SELECT
    counterpart.id,
    source_tier.tier_name,
    source_tier.description,
    source_tier.duration_label,
    source_tier.price,
    source_tier.price_inr,
    source_tier.icon,
    source_tier.display_order
FROM service_types AS original_service
JOIN service_types AS counterpart
  ON counterpart.slug = original_service.slug || '-india-to-usa'
 AND counterpart.route_direction = 'IN_TO_US'
JOIN service_pricing_tiers AS source_tier
  ON source_tier.service_type_id = original_service.id
WHERE original_service.route_direction = 'US_TO_IN'
  AND NOT EXISTS (
      SELECT 1
      FROM service_pricing_tiers AS existing
      WHERE existing.service_type_id = counterpart.id
  );

INSERT INTO service_subservices (
    pricing_tier_id, name, price, price_inr, icon, display_order
)
SELECT
    counterpart_tier.id,
    source_subservice.name,
    source_subservice.price,
    source_subservice.price_inr,
    source_subservice.icon,
    source_subservice.display_order
FROM service_types AS original_service
JOIN service_types AS counterpart
  ON counterpart.slug = original_service.slug || '-india-to-usa'
 AND counterpart.route_direction = 'IN_TO_US'
JOIN service_pricing_tiers AS source_tier
  ON source_tier.service_type_id = original_service.id
JOIN service_pricing_tiers AS counterpart_tier
  ON counterpart_tier.service_type_id = counterpart.id
 AND counterpart_tier.tier_name = source_tier.tier_name
 AND counterpart_tier.display_order = source_tier.display_order
JOIN service_subservices AS source_subservice
  ON source_subservice.pricing_tier_id = source_tier.id
WHERE original_service.route_direction = 'US_TO_IN'
  AND NOT EXISTS (
      SELECT 1
      FROM service_subservices AS existing
      WHERE existing.pricing_tier_id = counterpart_tier.id
  );

INSERT INTO service_fields (
    service_type_id, label, field_key, field_type, options, display_order
)
SELECT
    counterpart.id,
    source_field.label,
    source_field.field_key,
    source_field.field_type,
    source_field.options,
    source_field.display_order
FROM service_types AS original_service
JOIN service_types AS counterpart
  ON counterpart.slug = original_service.slug || '-india-to-usa'
 AND counterpart.route_direction = 'IN_TO_US'
JOIN service_fields AS source_field
  ON source_field.service_type_id = original_service.id
WHERE original_service.route_direction = 'US_TO_IN'
  AND NOT EXISTS (
      SELECT 1
      FROM service_fields AS existing
      WHERE existing.service_type_id = counterpart.id
  );

COMMIT;
