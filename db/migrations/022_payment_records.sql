-- Migration 022: payment_records = the revenue list (one row per shipment whose payment was verified).
-- Existing verified invoices are copied in below. Safe to run more than once.
--
-- RUN BEFORE rebuilding the backend:
--   docker compose exec -T postgres psql -U deliveryhub_user -d deliveryhub < db/migrations/022_payment_records.sql

BEGIN;

CREATE TABLE IF NOT EXISTS payment_records (
    id              SERIAL PRIMARY KEY,
    shipment_id     integer,
    invoice_id      integer,
    shipment_number varchar(30) NOT NULL,
    route_direction varchar(10),
    service_name    varchar(500),
    sender_name     varchar(255),
    receiver_name   varchar(255),
    currency_code   varchar(3) NOT NULL DEFAULT 'USD',
    amount_paid     numeric(12,2) NOT NULL,
    paid_at         timestamptz NOT NULL DEFAULT now(),
    created_at      timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_records_shipment_id ON payment_records (shipment_id);
CREATE INDEX IF NOT EXISTS ix_payment_records_paid_at ON payment_records (paid_at);

-- Back-fill from invoices that are already verified
DO $$
BEGIN
  IF to_regclass('public.invoices') IS NULL THEN
    RAISE NOTICE 'table "invoices" not found - nothing back-filled';
  ELSE
    INSERT INTO payment_records
        (shipment_id, invoice_id, shipment_number, route_direction, service_name,
         sender_name, receiver_name, currency_code, amount_paid, paid_at)
    SELECT s.id, i.id, s.shipment_number, s.route_direction,
           concat_ws(' — ', st.name, t.tier_name, s.sub_service_name),
           s.sender_name, s.receiver_name, COALESCE(s.currency_code, 'USD'),
           i.total_amount, COALESCE(i.paid_at, s.updated_at, s.created_at)
    FROM invoices i
    JOIN shipments s ON s.id = i.shipment_id
    LEFT JOIN service_types st ON st.id = s.service_type_id
    LEFT JOIN service_pricing_tiers t ON t.id = s.pricing_tier_id
    WHERE i.status = 'payment_verified'
    ON CONFLICT (shipment_id) DO NOTHING;
  END IF;
END $$;

COMMIT;

SELECT currency_code, to_char(paid_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM') AS month,
       count(*) AS payments, sum(amount_paid) AS total
FROM payment_records GROUP BY 1, 2 ORDER BY 2 DESC, 1;
