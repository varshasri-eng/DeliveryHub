// Picks the payment QR + instructions for a shipment's direction.
//   US_TO_IN  (USA -> India)  -> *_us_in
//   IN_TO_US  (India -> USA)  -> *_in_us
// Falls back to the shared values when a direction has none of its own.
export function paymentForRoute(settings, routeDirection) {
  if (!settings) return null;
  const suffix = routeDirection === "IN_TO_US" ? "in_us" : routeDirection === "US_TO_IN" ? "us_in" : null;
  return {
    qr_code_url: (suffix && settings[`qr_code_url_${suffix}`]) || settings.qr_code_url || null,
    instructions: (suffix && settings[`instructions_${suffix}`]) || settings.instructions || null,
  };
}
