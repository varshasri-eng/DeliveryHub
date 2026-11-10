-- Migration 021: remember when a shipment went In Transit (admin shows a green tick after 3 days),
-- and move orders that already have an invoice from Requested to Picked Up (the new flow).
--
-- RUN BEFORE rebuilding the backend:
--   docker compose exec -T postgres psql -U deliveryhub_user -d deliveryhub < db/migrations/021_shipment_in_transit_at.sql

BEGIN;

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS in_transit_at timestamptz;

-- Shipments already In Transit: count from their last update (best information available)
UPDATE shipments SET in_transit_at = updated_at
WHERE status = 'in_transit' AND in_transit_at IS NULL;

-- Orders with an invoice already raised now belong in Picked Up
DO $$
BEGIN
  IF to_regclass('public.invoices') IS NOT NULL THEN
    UPDATE shipments s SET status = 'picked_up'
    WHERE s.status = 'requested'
      AND EXISTS (SELECT 1 FROM invoices i WHERE i.shipment_id = s.id);
  ELSE
    RAISE NOTICE 'table "invoices" not found - skipped moving invoiced orders to Picked Up';
  END IF;
END $$;

COMMIT;

SELECT status, count(*) FROM shipments GROUP BY status ORDER BY status;
