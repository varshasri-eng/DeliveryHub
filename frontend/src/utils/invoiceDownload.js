import { formatMoney } from "./money";

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

// Downloads the invoice as a self-contained HTML file (open it and Print -> Save as PDF if a PDF is needed).
export function downloadInvoice(shipment, siteName = "DeliveryHub") {
  const invoice = shipment.invoice;
  if (!invoice) return;
  const cur = shipment.currency_code || "USD";
  const date = invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : "";
  const items = (invoice.items?.length ? invoice.items : []).map((item) => `
    <tr><td>${esc(item.description)}</td><td class="c">${esc(item.quantity)}</td>
    <td class="r">${esc(formatMoney(item.unit_price, cur))}</td>
    <td class="r"><strong>${esc(formatMoney(item.line_total, cur))}</strong></td></tr>`).join("");
  const offer = Number(invoice.offer_discount_amount || 0);
  const manual = Number(invoice.manual_discount_amount || 0);

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${esc(invoice.invoice_number)}</title>
<style>
  body{margin:0;padding:32px 16px;background:#f3f4f6;color:#111827;font:15px Arial,sans-serif}
  main{max-width:780px;margin:auto;padding:36px;background:#fff;border:1px solid #e5e7eb;border-radius:16px}
  .head{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #e5e7eb;padding-bottom:22px;margin-bottom:22px}
  h1{margin:0;font-size:25px} h2{margin:0;font-size:20px;text-align:right}
  .muted{color:#6b7280;margin:4px 0 0} .right{text-align:right}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
  .party{background:#f9fafb;border-radius:10px;padding:14px}
  .party small{display:block;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  th{background:#f9fafb;border-bottom:2px solid #e5e7eb;padding:10px;font-size:12px;text-transform:uppercase;color:#6b7280;text-align:left}
  td{border-bottom:1px solid #f3f4f6;padding:10px;font-size:14px} .c{text-align:center} .r{text-align:right}
  th.c{text-align:center} th.r{text-align:right}
  .totals{margin-left:auto;width:290px} .totals div{display:flex;justify-content:space-between;padding:4px 0}
  .totals .grand{border-top:2px solid #e5e7eb;margin-top:8px;padding-top:10px;font-size:18px;font-weight:800}
  .green{color:#15803d} .foot{border-top:1px solid #e5e7eb;margin-top:26px;padding-top:14px;font-size:13px;color:#6b7280}
  @media print{body{background:#fff;padding:0}main{border:0}}
</style></head><body><main>
  <div class="head">
    <div><h1>${esc(siteName)}</h1><p class="muted">Shipment Invoice</p></div>
    <div><h2>INVOICE</h2>
      <p class="muted right">Invoice #: <strong>${esc(invoice.invoice_number)}</strong><br>
      Date: <strong>${esc(date)}</strong><br>Shipment #: <strong>${esc(shipment.shipment_number)}</strong></p></div>
  </div>
  <div class="parties">
    <div class="party"><small>Sender</small><strong>${esc(shipment.sender_name)}</strong><br>${esc(shipment.sender_phone)}<br>${esc(shipment.sender_address)}</div>
    <div class="party"><small>Receiver</small><strong>${esc(shipment.receiver_name)}</strong><br>${esc(shipment.receiver_phone)}<br>${esc(shipment.receiver_address)}</div>
  </div>
  <table><thead><tr><th>Service</th><th class="c">Qty</th><th class="r">Unit Price</th><th class="r">Total</th></tr></thead><tbody>${items}</tbody></table>
  <div class="totals">
    <div><span>Subtotal</span><span>${esc(formatMoney(invoice.subtotal_amount, cur))}</span></div>
    ${offer > 0 ? `<div class="green"><span>Offer code ${esc(invoice.offer_code || "")}</span><span>−${esc(formatMoney(offer, cur))}</span></div>` : ""}
    ${manual > 0 ? `<div class="green"><span>Additional discount</span><span>−${esc(formatMoney(manual, cur))}</span></div>` : ""}
    <div class="grand"><span>Total</span><span>${esc(formatMoney(invoice.total_amount, cur))}</span></div>
  </div>
  <p class="foot">Thank you for shipping with ${esc(siteName)}! Status: ${esc(String(invoice.status || "issued").replace(/_/g, " "))}</p>
</main></body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${String(invoice.invoice_number || "invoice").replace(/[^a-zA-Z0-9-]/g, "")}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
