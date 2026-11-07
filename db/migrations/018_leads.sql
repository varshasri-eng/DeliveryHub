-- Migration 018: Leads (every unique sender / receiver) + links from shipments.
--
-- * leads: one row per unique phone number (digits with country code, e.g. 919959785999).
-- * shipments.sender_lead_id / receiver_lead_id: connect the two sides of every shipment.
--   One lead can appear on many shipments (one-to-many) and be connected to many other
--   leads through them (many-to-many).
-- * Existing shipments are back-filled below. Safe to run more than once.
--
-- RUN BEFORE restarting the backend:
--   docker compose exec -T postgres psql -U deliveryhub_user -d deliveryhub < db/migrations/018_leads.sql

BEGIN;

CREATE TABLE IF NOT EXISTS leads (
    id           SERIAL PRIMARY KEY,
    name         varchar(255) NOT NULL,
    phone        varchar(30)  NOT NULL,
    phone_key    varchar(20)  NOT NULL,
    country      varchar(60),
    city         varchar(120),
    province     varchar(120),
    postal_code  varchar(20),
    address      text,
    created_at   timestamptz DEFAULT now(),
    last_seen_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_leads_phone_key ON leads (phone_key);

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_lead_id   integer REFERENCES leads (id) ON DELETE SET NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_lead_id integer REFERENCES leads (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_shipments_sender_lead_id   ON shipments (sender_lead_id);
CREATE INDEX IF NOT EXISTS ix_shipments_receiver_lead_id ON shipments (receiver_lead_id);

-- ── Back-fill from existing shipments ─────────────────────────
-- Country comes from the route: US_TO_IN = sender in the U.S., receiver in India (IN_TO_US the other way).
-- A bare 10-digit number gets that country's calling code so "9959785999" and "+91 9959785999" match.
CREATE TEMP TABLE tmp_lead_sides ON COMMIT DROP AS
WITH sides AS (
    SELECT id AS shipment_id, 'sender' AS role, created_at,
           sender_name AS name, sender_phone AS phone, sender_address AS address,
           CASE route_direction WHEN 'US_TO_IN' THEN 'United States' WHEN 'IN_TO_US' THEN 'India' END AS country
    FROM shipments
    UNION ALL
    SELECT id, 'receiver', created_at, receiver_name, receiver_phone, receiver_address,
           CASE route_direction WHEN 'US_TO_IN' THEN 'India' WHEN 'IN_TO_US' THEN 'United States' END
    FROM shipments
), digits AS (
    SELECT *, regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') AS d FROM sides
)
SELECT shipment_id, role, created_at, name, phone, address, country,
       left(CASE
              WHEN length(d) = 10 AND country = 'United States' THEN '1'  || d
              WHEN length(d) = 10 AND country = 'India'         THEN '91' || d
              ELSE d
            END, 20) AS phone_key
FROM digits;

-- one lead per phone number; the most recent booking's name / address wins
INSERT INTO leads (name, phone, phone_key, country, address, created_at, last_seen_at)
SELECT DISTINCT ON (phone_key)
       left(name, 255), left(phone, 30), phone_key, country, address,
       min(created_at) OVER (PARTITION BY phone_key),
       max(created_at) OVER (PARTITION BY phone_key)
FROM tmp_lead_sides
WHERE phone_key <> '' AND coalesce(trim(name), '') <> ''
ORDER BY phone_key, created_at DESC
ON CONFLICT (phone_key) DO NOTHING;

UPDATE shipments s SET sender_lead_id = l.id
FROM tmp_lead_sides t JOIN leads l ON l.phone_key = t.phone_key
WHERE t.role = 'sender' AND s.id = t.shipment_id AND s.sender_lead_id IS NULL;

UPDATE shipments s SET receiver_lead_id = l.id
FROM tmp_lead_sides t JOIN leads l ON l.phone_key = t.phone_key
WHERE t.role = 'receiver' AND s.id = t.shipment_id AND s.receiver_lead_id IS NULL;

COMMIT;

-- Quick check (read-only)
SELECT (SELECT count(*) FROM leads)                                   AS leads,
       (SELECT count(*) FROM shipments)                               AS shipments,
       (SELECT count(*) FROM shipments WHERE sender_lead_id IS NULL)   AS shipments_without_sender_lead,
       (SELECT count(*) FROM shipments WHERE receiver_lead_id IS NULL) AS shipments_without_receiver_lead;
