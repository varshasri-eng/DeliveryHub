-- Migration 017: FedEx tracking number + label file on shipments.
-- RUN: docker compose exec -T postgres psql -U deliveryhub_user -d deliveryhub < db/migrations/017_shipment_tracking.sql
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS tracking_number varchar(20);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS label_path varchar(500);