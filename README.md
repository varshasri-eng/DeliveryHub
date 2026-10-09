# DeliveryHub

DeliveryHub is a shipment-booking application for services between the
United States and India. Customers choose a shipping direction, enter sender
and recipient details, select a delivery option, and submit a shipment
request. Admins manage shipping services, delivery options, custom booking
fields, shipment status, and invoices.

## Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Python 3.12, Flask, SQLAlchemy
- **Database:** PostgreSQL in the Docker deployment; SQLite can be used for
  isolated local development
- **Deployment:** Docker Compose on the SSH server

## Local development

Run the Flask API and Vite frontend separately. Docker is not required for
local development.

In one PowerShell window:

```powershell
cd backend
$env:DATABASE_URL = "sqlite:///deliveryhub-local.db"
$env:FLASK_SECRET_KEY = "local-development-only"
python wsgi.py
```

In another PowerShell window:

```powershell
cd frontend
npm ci
$env:VITE_API_PROXY_TARGET = "http://127.0.0.1:5000"
npm run dev
```

The frontend is available at `http://localhost:3000`; the API health endpoint
is `http://localhost:5000/api/health`. The Vite proxy defaults to the Compose
backend hostname, so set `VITE_API_PROXY_TARGET` when running Flask locally.

## Docker deployment

Docker Compose is intended for deployment on the SSH server after the local
flow and database changes have been verified. The compose file reads database,
Flask, frontend, and SMTP settings from the environment. Configure those
values on the server, apply the applicable database migrations, and then run:

```sh
docker compose up -d --build
```

SQL files in `db/migrations/` are not run automatically by `docker compose up`.
Apply the migrations explicitly before restarting containers. Migration
`006_remove_document_service_booking_fields.sql` removes all dynamic booking
questions configured for Document Services; without applying it, fields saved
in the server database (such as Package size or Pickup date) remain visible and
required.

Do not use the current legacy `db/schema.sql` as a DeliveryHub schema: it still
contains the previous order-based invoice design. The SQL migration scripts in `db/migrations/` add the current shipment and
delivery-option fields and update legacy default branding; they do not convert
the old order-based invoice schema. Migration `004_add_pricing_tier_subservices.sql`
adds editable sub-services under Express and Standard tiers and stores the
selected sub-service on new shipment bookings. Migration
`005_remove_document_service_booking_fields.sql` removes the old Package size
and admin-note questions from Document Services. Migration
`006_remove_document_service_booking_fields.sql` removes all remaining dynamic
booking questions from Document Services except the configured date field,
which it relabels as Date of Booking. The booking API also ignores legacy
non-date Document Services questions so existing database rows do not block
bookings before that migration is applied. Migration
`007_add_directional_pricing.sql` adds separate USD and INR prices for delivery
tiers and sub-services, and snapshots the booking currency on shipments. INR
prices remain unset until an admin configures them. Migration
`008_seed_air_and_sea_cargo.sql` adds the Air Cargo and Sea Cargo descriptions,
coverage and restrictions, and USA → India weight options. Those prices are
stored in USD; no INR values are inferred.

## Project structure

```text
backend/
  app/models/       SQLAlchemy models
  app/routes/       Flask API routes
  app/utils/        Authentication and bootstrap helpers
  wsgi.py           Local Flask entry point
frontend/
  src/api/          API client wrappers
  src/pages/        Public, customer, and admin screens
db/
  migrations/       Incremental SQL changes for existing databases
  schema.sql        Legacy Store2Home schema; not the DeliveryHub schema
```

New services created in the admin portal start with Express, Economy, and
Group delivery options. Admins can change their names, descriptions, delivery
estimates, icons, and fixed prices. Booking supports both United States → India
and India → United States; country, phone code, and ZIP/PIN validation adapt to
the selected direction. Booking also validates Indian mobile numbers, rejects
U.S. toll-free contacts, and checks city/state against the ZIP/PIN using public
postal-code lookup services. Only the postal code is sent to those services. If
postal verification is unavailable, booking returns an explicit retryable error.
