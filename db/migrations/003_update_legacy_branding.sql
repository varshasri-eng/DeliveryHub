UPDATE site_settings SET site_name = 'DeliveryHub'
WHERE site_name IN ('Store2Home', 'TajaMeat');

UPDATE site_settings SET tagline = 'International shipping between the U.S. and India'
WHERE tagline IN ('Fresh cuts, delivered to your door', 'Fresh groceries, delivered to your door');

UPDATE site_settings SET hero_title = 'Send your shipment with confidence.'
WHERE hero_title IN ('Fresh. Cut to order.', 'Fresh groceries, delivered to your door');

UPDATE site_settings SET hero_subtitle =
    'Choose a shipping service and delivery option for shipments between the U.S. and India.'
WHERE hero_subtitle IN (
    'Chicken, Goat, Lamb & Seafood — pre-order online, pickup or delivery.',
    'Shop your favourite Indian groceries in your own language.'
);

UPDATE site_settings SET hero_cta = 'Explore shipping services'
WHERE hero_cta = 'Start shopping';

UPDATE site_settings SET footer_text =
    '© DeliveryHub. International shipping made straightforward.'
WHERE footer_text IN (
    '© TajaMeat. Fresh cuts, delivered.',
    '© Store2Home. Fresh groceries, delivered.'
);
