import { formatMoney } from "./money";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export function downloadShipmentSummary(shipment) {
  const bookedAt = shipment.created_at
    ? new Date(shipment.created_at).toLocaleString()
    : new Date().toLocaleString();
  const service = [
    shipment.service_name,
    shipment.tier_name,
    shipment.sub_service_name,
  ].filter(Boolean).join(" — ");
  const rows = [
    ["Booking date", bookedAt],
    ["Status", shipment.status || "Requested"],
    ["Service", service],
    ["Quantity", shipment.quantity || 1],
    ["Route", shipment.route_direction === "IN_TO_US"
      ? "India → United States"
      : "United States → India"],
    ["Total", formatMoney(shipment.total_price, shipment.currency_code || "USD")],
  ];
  const details = rows.map(([label, value]) =>
    `<div class="row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
  ).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Shipment ${escapeHtml(shipment.shipment_number)}</title>
  <style>
    body { margin: 0; padding: 32px 16px; background: #f3f4f6; color: #111827; font: 16px Arial, sans-serif; }
    main { max-width: 760px; margin: auto; padding: 32px; background: white; border: 1px solid #e5e7eb; border-radius: 16px; }
    h1 { margin: 0; font-size: 25px; } h2 { margin: 26px 0 12px; font-size: 17px; }
    .muted { color: #6b7280; } .number { margin: 8px 0 24px; color: #2563eb; font-size: 24px; font-weight: 700; }
    .row { display: flex; justify-content: space-between; gap: 20px; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    .row span { color: #6b7280; } .row strong { text-align: right; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .party { padding: 16px; background: #f9fafb; border-radius: 10px; }
    .party p { margin: 6px 0 0; line-height: 1.5; }
    @media (max-width: 560px) { main { padding: 22px; } .parties { grid-template-columns: 1fr; } }
    @media print { body { padding: 0; background: white; } main { border: 0; } }
  </style>
</head>
<body>
  <main>
    <p class="muted">DeliveryHub · Shipment booking confirmation</p>
    <h1>Shipment details</h1>
    <p class="number">${escapeHtml(shipment.shipment_number)}</p>
    ${details}
    <h2>Sender and recipient</h2>
    <div class="parties">
      <section class="party"><strong>From · ${escapeHtml(shipment.sender_name)}</strong>
        <p>${escapeHtml(shipment.sender_phone)}<br>${escapeHtml(shipment.sender_address)}</p>
      </section>
      <section class="party"><strong>To · ${escapeHtml(shipment.receiver_name)}</strong>
        <p>${escapeHtml(shipment.receiver_phone)}<br>${escapeHtml(shipment.receiver_address)}</p>
      </section>
    </div>
    <p class="muted">Keep this file to recall your tracking number. Track the shipment at the DeliveryHub tracking page.</p>
  </main>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `DeliveryHub-${String(shipment.shipment_number || "shipment").replace(/[^a-zA-Z0-9-]/g, "")}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
