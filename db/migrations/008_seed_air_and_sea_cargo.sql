BEGIN;

INSERT INTO service_types (
    name, slug, badge_label, tagline, description, icon,
    enable_quantity, is_active, display_order
)
VALUES
    (
        'Air Cargo',
        'air-cargo',
        'OFFICIAL CARRIER',
        'Fast & Scalable Business Logistics',
        'Professional air freight solutions for medium-to-large commercial shipments. Designed for speed, reliability, and compliance across international trade lanes.',
        '✈️',
        FALSE,
        TRUE,
        2
    ),
    (
        'Sea Cargo',
        'sea-cargo',
        'OFFICIAL CARRIER',
        'Cost-Effective Ocean Freight',
        'Affordable ocean freight solutions for large-volume shipments, household relocations, and heavy commercial cargo. Ideal when cost efficiency matters more than delivery speed.',
        '🚢',
        FALSE,
        TRUE,
        3
    )
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    badge_label = EXCLUDED.badge_label,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    enable_quantity = EXCLUDED.enable_quantity,
    is_active = EXCLUDED.is_active,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

DELETE FROM service_coverage_items
WHERE service_type_id IN (
    SELECT id FROM service_types WHERE slug IN ('air-cargo', 'sea-cargo')
);

INSERT INTO service_coverage_items (service_type_id, text, display_order)
SELECT services.id, items.text, items.display_order
FROM service_types AS services
JOIN (
    VALUES
        ('air-cargo', 'Commercial Inventory & Stock Replenishment', 1),
        ('air-cargo', 'Medium Cargo Boxes & Crates', 2),
        ('air-cargo', 'Palletized Shipments', 3),
        ('air-cargo', 'Industrial Components & Spare Parts', 4),
        ('air-cargo', 'Electronics & Manufacturing Supplies', 5),
        ('sea-cargo', 'Full Household Relocation Shipments', 1),
        ('sea-cargo', 'Bulk Commercial Goods & Inventory', 2),
        ('sea-cargo', 'Oversized Machinery & Equipment', 3),
        ('sea-cargo', 'Automobile & Two-Wheeler Shipping', 4),
        ('sea-cargo', 'Industrial Materials & Raw Goods', 5)
) AS items(service_slug, text, display_order)
    ON items.service_slug = services.slug;

DELETE FROM service_restrictions
WHERE service_type_id IN (
    SELECT id FROM service_types WHERE slug IN ('air-cargo', 'sea-cargo')
);

INSERT INTO service_restrictions (service_type_id, text, display_order)
SELECT services.id, items.text, items.display_order
FROM service_types AS services
JOIN (
    VALUES
        ('air-cargo', 'Hazardous or explosive materials', 1),
        ('air-cargo', 'Flammable liquids or gases', 2),
        ('air-cargo', 'Loose lithium batteries', 3),
        ('air-cargo', 'Perishable or temperature-sensitive goods', 4),
        ('air-cargo', 'Illegal or restricted items', 5),
        ('sea-cargo', 'Perishable or temperature-sensitive goods', 1),
        ('sea-cargo', 'Restricted or prohibited imports', 2),
        ('sea-cargo', 'Hazardous or flammable materials', 3),
        ('sea-cargo', 'Live animals or biological materials', 4)
) AS items(service_slug, text, display_order)
    ON items.service_slug = services.slug;

DELETE FROM service_pricing_tiers AS tiers
USING service_types AS services
WHERE tiers.service_type_id = services.id
  AND services.slug = 'air-cargo'
  AND tiers.tier_name IN ('Express', 'Economy', 'Group')
  AND NOT EXISTS (
      SELECT 1
      FROM shipments
      WHERE shipments.pricing_tier_id = tiers.id
  );

INSERT INTO service_pricing_tiers (
    service_type_id, tier_name, description, duration_label,
    price, price_inr, icon, display_order
)
SELECT services.id, options.tier_name, 'USA → India', NULL,
       options.price, NULL, options.icon, options.display_order
FROM service_types AS services
CROSS JOIN (
    VALUES
        ('15 lbs', 150.00, '✈️', 1),
        ('50 lbs', 400.00, '✈️', 2),
        ('100 lbs', 700.00, '✈️', 3)
) AS options(tier_name, price, icon, display_order)
WHERE services.slug = 'air-cargo'
  AND NOT EXISTS (
      SELECT 1
      FROM service_pricing_tiers AS existing
      WHERE existing.service_type_id = services.id
        AND existing.tier_name = options.tier_name
  );

INSERT INTO service_pricing_tiers (
    service_type_id, tier_name, description, duration_label,
    price, price_inr, icon, display_order
)
SELECT services.id, options.tier_name, 'USA → India', NULL,
       options.price, NULL, options.icon, options.display_order
FROM service_types AS services
CROSS JOIN (
    VALUES
        ('40 lbs', 150.00, '🚢', 1),
        ('50 lbs', 175.00, '🚢', 2)
) AS options(tier_name, price, icon, display_order)
WHERE services.slug = 'sea-cargo'
  AND NOT EXISTS (
      SELECT 1
      FROM service_pricing_tiers AS existing
      WHERE existing.service_type_id = services.id
        AND existing.tier_name = options.tier_name
  );

COMMIT;
