DELETE FROM service_fields
WHERE service_type_id IN (
    SELECT id
    FROM service_types
    WHERE slug IN ('document-shipping', 'document-services')
);
