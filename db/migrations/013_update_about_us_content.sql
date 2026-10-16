-- Migration 013: rewrite the About Us page content for DeliveryHub.
--
-- The About Us page is a row in static_pages (slug 'about-us', page_type 'about').
-- The landing page renders it as "Why choose" cards plus a commitment band when the
-- Markdown uses this shape:
--     intro paragraph(s)
--     ## Section title       (followed by "### Card title" + text  => card grid)
--     ## Section title       (followed by a "- bullet" list         => commitment band)
-- Content that does not use "##" headings still renders as a plain text block.
--
-- Run once against the server database before restarting containers, like the other
-- migrations. Re-running is safe (the content is simply replaced again). The page
-- title and published flag are left alone if the row already exists. Admins can also
-- paste the same Markdown into Admin -> Pages instead of running this file.
--
-- created_at/updated_at are set explicitly because the app applies those defaults in
-- Python, not in the database.

INSERT INTO static_pages
    (slug, title, content, page_type, is_published, display_order, created_at, updated_at)
VALUES (
    'about-us',
    'About Us',
    $about$DeliveryHub is a shipment-booking service for parcels travelling between the United States and India. Choose your direction, enter pickup and delivery details, pick a delivery option, and see the price before you submit your request. After that, follow your shipment with its reference number.

## Why choose DeliveryHub

Everything you need to send a parcel across the border, in one place.

### Two routes, one site

Book United States to India or India to United States from the same website. Services, delivery options and prices are set for each direction, so what you see always applies to your route.

### Prices before you book

Every delivery option shows its price up front, in US dollars for shipments from the U.S. and in Indian rupees for shipments from India. If you have an offer code, you can apply it before you submit.

### Options for every schedule

Each service lists its delivery options with an estimated delivery time, so you can choose speed or savings and see what you are getting before you commit.

### Know what is allowed

Service pages show what each service covers and what is not allowed, so you can check your items before you pack and book.

### Guided, checked booking

The booking form checks phone numbers and confirms that the city and state match the postal code, so address mistakes are caught before your shipment is requested.

### Track with your reference

Every booking gets a reference number starting with DH-. Enter it on the tracking page to see whether your shipment has been requested, picked up, in transit or delivered.

## Our commitment

We keep shipping straightforward: you should know what you are booking, what it costs and where it stands at every step.

- Prices shown before you book
- Booking form with built-in address checks
- Status updates by reference number
- Invoices and payment verification in your account
$about$,
    'about',
    TRUE,
    0,
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO UPDATE
SET content    = EXCLUDED.content,
    page_type  = 'about',
    updated_at = NOW();