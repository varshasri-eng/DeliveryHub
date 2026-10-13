BEGIN;

ALTER TABLE static_pages
    ADD COLUMN IF NOT EXISTS page_type VARCHAR(20) NOT NULL DEFAULT 'standard';

INSERT INTO static_pages (
    slug, title, content, page_type, is_published, display_order, created_at, updated_at
)
VALUES
    (
        'about-us',
        'About DeliveryHub',
        '## Shipping between the United States and India

DeliveryHub brings the key steps of an international shipment booking into one place. Choose the direction of travel, compare the available service options, and submit pickup and delivery details online.

## Services for different shipment needs

Our service catalog can include document shipping, air cargo, and sea cargo. Each service has its own details and pricing for the selected direction, so review the service page before booking.

## A clearer booking experience

The booking flow collects sender and recipient contact details, validates address information, and provides a shipment reference after a booking request is submitted. Keep the downloaded confirmation so you can refer to the tracking number.

## Need help?

For questions about a service or a shipment, use the contact information shown on this site. Service availability, pricing, and delivery arrangements are confirmed through the details presented for each service.',
        'about',
        TRUE,
        10,
        NOW(),
        NOW()
    ),
    (
        'faqs',
        'Frequently Asked Questions',
        'Use these answers to prepare for a booking. Available services and prices are shown after you choose a shipping direction.

### Which shipping directions can I book?

DeliveryHub currently separates bookings for shipments from the United States to India and from India to the United States. Choose a direction first to see the services offered for it.

### What service types are available?

The service catalog may include document shipping, air cargo, and sea cargo. The available options can differ by direction; check the service list and its details before proceeding.

### How do I compare prices?

Select a direction and open a service to review its delivery options and displayed price. The currency and pricing are specific to the selected direction and service.

### What details do I need to book?

Provide the sender and recipient names, phone numbers, pickup and delivery addresses, and any service-specific information requested on the form. Valid contact and postal details are required.

### How can I find my tracking number later?

After submitting a booking request, save the downloaded booking confirmation. It contains the tracking number and shipment details. You can also use the tracking page to check shipment progress.

### Can I use an offer code?

If you have an active offer code, enter it in the offer-code box on the booking form and select Apply. The discount is shown in the price summary when the code is valid.

### Can I change my booking after submitting it?

Contact DeliveryHub using the contact details on this site if you need help with a submitted request. Changes depend on the shipment status and service arrangements.',
        'faq',
        TRUE,
        20,
        NOW(),
        NOW()
    )
ON CONFLICT (slug) DO NOTHING;

UPDATE static_pages
SET page_type = 'about'
WHERE slug = 'about-us' AND page_type = 'standard';

UPDATE static_pages
SET page_type = 'faq'
WHERE slug = 'faqs' AND page_type = 'standard';

COMMIT;
