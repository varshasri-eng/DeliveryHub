DELETE FROM service_fields
USING service_types
WHERE service_fields.service_type_id = service_types.id
  AND service_types.slug IN ('document-shipping', 'document-services')
  AND LOWER(REGEXP_REPLACE(TRIM(service_fields.label), '\s+', ' ', 'g'))
      IN ('package size', 'anything else the admin should know');
