-- Existing shipment rows keep a NULL route until reviewed. New bookings
-- are required by the API to provide US_TO_IN or IN_TO_US.
ALTER TABLE shipments
    ADD COLUMN IF NOT EXISTS route_direction VARCHAR(10);
