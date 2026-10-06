UPDATE service_fields
SET label = 'Date of Booking'
WHERE service_type_id IN (
    SELECT id
    FROM service_types
    WHERE slug IN ('document-shipping', 'document-services')
)
  AND LOWER(field_type) = 'date';

DELETE FROM service_fields
WHERE service_type_id IN (
    SELECT id
    FROM service_types
    WHERE slug IN ('document-shipping', 'document-services')
)
  AND LOWER(field_type) <> 'date';
