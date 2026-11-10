import { formatMoney } from "../utils/money";
import { useBranding } from "../context/BrandingContext";
import BrandLogo from "./BrandLogo";

/**
 * The invoice paper, shared by the customer's "My Shipments" page and the admin screen.
 * Layout: header (brand, INVOICE, numbers) -> `children` (payment QR / proof, hidden when
 * printing) -> sender/receiver, line items and totals.
 */
export default function InvoiceDocument({ shipment, children }) {
  const { settings } = useBranding();
  const invoice = shipment.invoice;
  const currency = shipment.currency_code || "USD";
  const total = Number(invoice?.total_amount ?? shipment.total_price ?? 0);
  const items = invoice?.items?.length ? invoice.items : [{
    description: `${shipment.service_name} — ${shipment.tier_name}${
      shipment.sub_service_name ? ` — ${shipment.sub_service_name}` : ""
    }`,
    quantity: shipment.quantity,
    unit_price: shipment.unit_price,
    line_total: shipment.subtotal_price ?? shipment.total_price,
  }];

  return (
    <div id="shipment-invoice" className="bg-white p-8 text-gray-900">
      <div className="mb-6 flex items-start justify-between border-b-2 border-gray-200 pb-6">
        <div className="flex items-center gap-3">
          <BrandLogo size="lg" />
          <div>
            <h1 className="text-2xl font-extrabold">{settings.site_name}</h1>
            <p className="mt-1 text-sm text-gray-500">Shipment Invoice</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-extrabold">INVOICE</h2>
          <p className="mt-2 text-sm text-gray-500">
            Invoice #: <strong className="text-gray-900">{invoice?.invoice_number}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Date: <strong className="text-gray-900">
              {invoice?.issued_at
                ? new Date(invoice.issued_at).toLocaleDateString()
                : new Date(shipment.created_at).toLocaleDateString()}
            </strong>
          </p>
          <p className="text-sm text-gray-500">
            Shipment #: <strong className="text-gray-900">{shipment.shipment_number}</strong>
          </p>
        </div>
      </div>

      {children && <div className="mb-6 print:hidden">{children}</div>}

      <div className="mb-7 grid grid-cols-2 gap-6">
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Sender</p>
          <p className="font-semibold text-gray-900">{shipment.sender_name}</p>
          <p className="mt-1 text-sm text-gray-500">{shipment.sender_phone}</p>
          <p className="text-sm text-gray-500">{shipment.sender_address}</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Receiver</p>
          <p className="font-semibold text-gray-900">{shipment.receiver_name}</p>
          <p className="mt-1 text-sm text-gray-500">{shipment.receiver_phone}</p>
          <p className="text-sm text-gray-500">{shipment.receiver_address}</p>
        </div>
      </div>

      <div className="mb-6 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {[["Service", "left"], ["Qty", "center"], ["Unit Price", "right"], ["Total", "right"]].map(([label, align]) => (
                <th key={label} className={`border-b-2 border-gray-200 p-3 text-${align} text-xs font-semibold uppercase tracking-wide text-gray-500`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id || `${item.description}-${index}`}>
                <td className="border-b border-gray-100 p-3 text-sm font-medium">{item.description}</td>
                <td className="border-b border-gray-100 p-3 text-center text-sm">{item.quantity}</td>
                <td className="border-b border-gray-100 p-3 text-right text-sm">{formatMoney(item.unit_price, currency)}</td>
                <td className="border-b border-gray-100 p-3 text-right text-sm font-semibold">{formatMoney(item.line_total, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-8 flex justify-end">
        <div className="w-72 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatMoney(invoice?.subtotal_amount ?? shipment.subtotal_price ?? shipment.total_price, currency)}</span>
          </div>
          {Number(invoice?.offer_discount_amount || 0) > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Offer code {invoice.offer_code}</span>
              <span>−{formatMoney(invoice.offer_discount_amount, currency)}</span>
            </div>
          )}
          {Number(invoice?.manual_discount_amount || 0) > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Additional discount</span>
              <span>−{formatMoney(invoice.manual_discount_amount, currency)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t-2 border-gray-200 pt-3 text-lg font-extrabold">
            <span>Total</span>
            <span>{formatMoney(total, currency)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between border-t border-gray-200 pt-5">
        <div>
          <p className="text-sm font-semibold">Thank you for shipping with {settings.site_name}!</p>
          <p className="mt-1 text-xs text-gray-500">
            Invoice status:{" "}
            <span className="font-semibold capitalize text-green-700">
              {(invoice?.status || "issued").replace(/_/g, " ")}
            </span>
          </p>
        </div>
        <div className="text-right text-xs text-gray-400">
          <p>{settings.site_name}</p>
          <p>Shipment Invoice</p>
        </div>
      </div>
    </div>
  );
}