BEGIN;

DELETE FROM service_fields
WHERE field_key = 'extra_notes'
   OR LOWER(REGEXP_REPLACE(TRIM(label), '\s+', ' ', 'g'))
      = 'anything else the admin should know?';

COMMIT;
