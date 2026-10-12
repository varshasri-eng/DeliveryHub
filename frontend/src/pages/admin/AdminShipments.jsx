import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { formatMoney } from "../../utils/money";
import { FiPackage, FiX } from "react-icons/fi";
import {
  getAdminShipments, updateShipmentStatus,
  raiseShipmentInvoice, updateShipmentInvoice, verifyShipmentPayment, rejectShipmentPayment,
} from "../../api/admin";

const STATUS_OPTIONS = ["requested", "picked_up", "in_transit", "delivered", "cancelled"];
const STATUS_LABELS = {
  requested: "Requested", picked_up: "Picked Up", in_transit: "In Transit",
  delivered: "Delivered", cancelled: "Cancelled",
};

const TABS = [
  { key: "needs_invoice", label: "Needs Invoice" },
  { key: "pending_payment", label: "Pending Payment" },
  { key: "verified", label: "Verified" },
];

function invoiceBucket(shipment) {
  const status = shipment.invoice?.status;
  if (!shipment.invoice) return "needs_invoice";
  if (status === "payment_verified") return "verified";
  return "pending_payment"; // issued | payment_submitted | payment_rejected
}

export default function AdminShipments() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("needs_invoice");
  const [selected, setSelected] = useState(null);
  const [invoiceEditorShipment, setInvoiceEditorShipment] = useState(null);

  const load = () => {
    setLoading(true);
    getAdminShipments()
      .then((res) => setShipments(res.data.shipments || []))
      .catch(() => toast.error("Could not load shipments."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const counts = TABS.reduce((acc, t) => {
    acc[t.key] = shipments.filter((s) => invoiceBucket(s) === t.key).length;
    return acc;
  }, {});

  const filtered = shipments.filter((s) => invoiceBucket(s) === tab);

  const refreshOne = (updated) => {
    setShipments((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSelected((prev) => (prev && prev.id === updated.id ? updated : prev));
  };

  const handleStatusChange = async (shipment, status) => {
    try {
      const res = await updateShipmentStatus(shipment.id, status);
      refreshOne(res.data.shipment);
      toast.success("Status updated.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not update status.");
    }
  };

  const handleRaiseInvoice = async (shipment) => {
    setInvoiceEditorShipment({ shipment, invoice: null });
  };

  const handleSaveInvoice = async (shipment, invoice, draft) => {
    try {
      const res = invoice
        ? await updateShipmentInvoice(invoice.id, draft)
        : await raiseShipmentInvoice(shipment.id, draft);
      refreshOne({ ...shipment, invoice: res.data.invoice });
      toast.success(invoice ? "Invoice updated." : "Invoice raised.");
      setTab("pending_payment");
      setInvoiceEditorShipment(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save invoice.");
    }
  };

  const handleVerify = async (shipment) => {
    try {
      const res = await verifyShipmentPayment(shipment.invoice.id);
      refreshOne({ ...shipment, invoice: res.data.invoice });
      toast.success("Payment verified.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not verify payment.");
    }
  };

  const handleReject = async (shipment) => {
    const reason = window.prompt("Reason for rejecting this payment?") || "";
    try {
      const res = await rejectShipmentPayment(shipment.invoice.id, reason);
      refreshOne({ ...shipment, invoice: res.data.invoice });
      toast.success("Payment rejected.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not reject payment.");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Shipments</h1>
      <p className="text-gray-500 text-sm mb-6">Manage bookings, fulfillment status, and billing.</p>

      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors
                       ${tab === t.key ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {t.label}
            <span className={`text-xs rounded-full px-1.5 ${tab === t.key ? "bg-white/20" : "bg-gray-100"}`}>
              {counts[t.key] || 0}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card text-center py-16 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <FiPackage className="mx-auto text-gray-300 mb-3" size={32} />
          <p className="font-semibold text-gray-700">Nothing here</p>
          <p className="text-gray-400 text-sm mt-1">
            {tab === "needs_invoice" ? "New shipments without an invoice yet will show up here."
              : tab === "pending_payment" ? "Shipments awaiting payment or verification show up here."
              : "Fully paid shipments show up here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 cursor-pointer" onClick={() => setSelected(s)}>
                  <p className="font-semibold text-gray-900">{s.shipment_number}</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {s.service_name} — {s.tier_name}
                    {s.sub_service_name ? ` — ${s.sub_service_name}` : ""}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {s.sender_name} → {s.receiver_name}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">
                    {formatMoney(s.total_price, s.currency_code)}
                  </p>
                  <select
                    value={s.status}
                    onChange={(e) => handleStatusChange(s, e.target.value)}
                    className="mt-1.5 text-xs font-semibold border border-gray-200 rounded-full px-2 py-1 capitalize"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>{STATUS_LABELS[st]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-50 mt-3 pt-3 flex items-center justify-between">
                <button onClick={() => setSelected(s)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-900">
                  View details
                </button>

                {!s.invoice ? (
                  <button onClick={() => handleRaiseInvoice(s)}
                    className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700">
                    Preview & Raise Invoice
                  </button>
                ) : s.invoice.status === "payment_submitted" ? (
                  <div className="flex gap-2">
                    <button onClick={() => handleReject(s)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50">
                      Reject
                    </button>
                    <button onClick={() => handleVerify(s)}
                      className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700">
                      Verify Payment
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {s.invoice.status === "issued" && (
                      <button onClick={() => setInvoiceEditorShipment({ shipment: s, invoice: s.invoice })}
                        className="text-xs font-semibold text-brand-700 hover:underline">
                        Preview / Edit Invoice
                      </button>
                    )}
                    <span className="text-xs font-semibold text-gray-400 capitalize">
                      {s.invoice.status.replace("_", " ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <ShipmentDetailModal shipment={selected} onClose={() => setSelected(null)} />
      )}
      {invoiceEditorShipment && (
        <InvoiceEditorModal
          shipment={invoiceEditorShipment.shipment}
          invoice={invoiceEditorShipment.invoice}
          onClose={() => setInvoiceEditorShipment(null)}
          onSave={handleSaveInvoice}
        />
      )}
    </div>
  );
}

function InvoiceEditorModal({ shipment, invoice, onClose, onSave }) {
  const existingItems = invoice?.items?.length
    ? invoice.items
    : [{
        description: `${shipment.service_name} — ${shipment.tier_name}${
          shipment.sub_service_name ? ` — ${shipment.sub_service_name}` : ""
        }`,
        quantity: shipment.quantity,
        unit_price: shipment.unit_price,
      }];
  const [items, setItems] = useState(existingItems.map((item) => ({
    description: item.description,
    quantity: String(item.quantity),
    unit_price: String(item.unit_price),
  })));
  const [discountType, setDiscountType] = useState(invoice?.manual_discount_type || "none");
  const [discountValue, setDiscountValue] = useState(
    invoice?.manual_discount_value ? String(invoice.manual_discount_value) : "",
  );
  const [saving, setSaving] = useState(false);
  const currencyCode = shipment.currency_code || "USD";
  const subtotal = items.reduce(
    (sum, item) => sum + Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.unit_price) || 0),
    0,
  );
  const offerDiscount = Number(invoice?.offer_discount_amount ?? shipment.offer_discount_amount ?? 0);
  const afterOffer = Math.max(0, subtotal - offerDiscount);
  const parsedDiscount = Math.max(0, Number(discountValue) || 0);
  const manualDiscount = discountType === "percentage"
    ? Math.round(afterOffer * Math.min(parsedDiscount, 100)) / 100
    : discountType === "fixed"
      ? parsedDiscount
      : 0;
  const total = afterOffer - manualDiscount;
  const invalid = !items.length || items.some((item) => (
    !item.description.trim() || Number(item.quantity) < 1 ||
    !Number.isInteger(Number(item.quantity)) || Number(item.unit_price) < 0
  )) || offerDiscount > subtotal || manualDiscount > afterOffer ||
    (discountType === "percentage" && parsedDiscount > 100);

  const save = async (event) => {
    event.preventDefault();
    if (invalid) {
      toast.error("Check the invoice lines and discount amounts.");
      return;
    }
    setSaving(true);
    try {
      await onSave(shipment, invoice, {
        items: items.map((item) => ({
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })),
        manual_discount_type: discountType,
        manual_discount_value: discountType === "none" ? 0 : parsedDiscount,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={save}
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <h2 className="font-bold text-gray-900">
              {invoice ? "Preview / Edit Invoice" : "Invoice Preview"}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {shipment.shipment_number}{invoice ? ` · ${invoice.invoice_number}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Close
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Invoice line items</h3>
                <button type="button"
                  disabled={items.length >= 10}
                  onClick={() => setItems((current) => [...current, {
                    description: "", quantity: "1", unit_price: "0.00",
                  }])}
                  className="text-xs font-semibold text-brand-700 hover:underline disabled:opacity-40">
                  + Add line
                </button>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="grid gap-2 rounded-xl border border-gray-100 p-3 sm:grid-cols-[minmax(0,1fr)_80px_120px_auto]">
                    <input aria-label="Line description" required maxLength={255}
                      className="input" placeholder="Description" value={item.description}
                      onChange={(event) => setItems((current) => current.map((line, i) => (
                        i === index ? { ...line, description: event.target.value } : line
                      )))} />
                    <input aria-label="Quantity" required type="number" min="1" step="1"
                      className="input" value={item.quantity}
                      onChange={(event) => setItems((current) => current.map((line, i) => (
                        i === index ? { ...line, quantity: event.target.value } : line
                      )))} />
                    <input aria-label="Unit price" required type="number" min="0" step="0.01"
                      className="input" value={item.unit_price}
                      onChange={(event) => setItems((current) => current.map((line, i) => (
                        i === index ? { ...line, unit_price: event.target.value } : line
                      )))} />
                    <button type="button" disabled={items.length === 1}
                      aria-label="Remove invoice line"
                      onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                      className="px-2 text-sm text-red-500 disabled:opacity-30">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900">Additional admin discount</h3>
              <p className="mb-3 mt-1 text-xs text-gray-500">
                Separate from any customer offer code. Applied after the offer-code discount.
              </p>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                <select className="input" value={discountType}
                  onChange={(event) => {
                    setDiscountType(event.target.value);
                    if (event.target.value === "none") setDiscountValue("");
                  }}>
                  <option value="none">No additional discount</option>
                  <option value="percentage">Percentage discount</option>
                  <option value="fixed">Fixed amount discount</option>
                </select>
                {discountType !== "none" && (
                  <input aria-label="Manual discount value" required type="number" min="0"
                    max={discountType === "percentage" ? "100" : undefined} step="0.01"
                    className="input"
                    placeholder={discountType === "percentage" ? "Percent" : `Amount (${currencyCode})`}
                    value={discountValue}
                    onChange={(event) => setDiscountValue(event.target.value)} />
                )}
              </div>
            </div>
          </div>

          <div className="h-fit rounded-xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Invoice preview</p>
            <p className="mt-1 font-bold text-gray-900">{shipment.service_name}</p>
            <p className="text-xs text-gray-500">{shipment.sender_name} → {shipment.receiver_name}</p>
            <div className="mt-5 space-y-2 border-t border-gray-200 pt-4 text-sm">
              {items.map((item, index) => (
                <div key={index} className="flex justify-between gap-3">
                  <span className="text-gray-600">{item.description || "Invoice line"} × {item.quantity || 0}</span>
                  <span className="font-medium text-gray-900">
                    {formatMoney((Number(item.quantity) || 0) * (Number(item.unit_price) || 0), currencyCode)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span>Subtotal</span><span>{formatMoney(subtotal, currencyCode)}</span>
              </div>
              {offerDiscount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Offer code {invoice?.offer_code || shipment.offer_code || ""}</span>
                  <span>−{formatMoney(offerDiscount, currencyCode)}</span>
                </div>
              )}
              {manualDiscount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Admin discount</span><span>−{formatMoney(manualDiscount, currencyCode)}</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-gray-300 pt-3 text-lg font-extrabold">
                <span>Total</span><span>{formatMoney(total, currencyCode)}</span>
              </div>
            </div>
            {invalid && (
              <p role="alert" className="mt-3 text-xs text-red-600">
                Discount must not exceed the invoice amount, and all lines need valid values.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button disabled={saving || invalid} className="btn-primary disabled:opacity-50">
            {saving ? "Saving…" : invoice ? "Save Invoice" : "Raise Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ShipmentDetailModal({ shipment, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-bold text-gray-900">{shipment.shipment_number}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
        </div>
        <div className="p-6 space-y-5 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Service</p>
            <p className="text-gray-900 font-medium">
              {shipment.service_name} — {shipment.tier_name}
              {shipment.sub_service_name ? ` — ${shipment.sub_service_name}` : ""}
            </p>
            <p className="text-gray-500 mt-0.5">
              Qty {shipment.quantity} · {formatMoney(shipment.total_price, shipment.currency_code)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Sender</p>
              <p className="text-gray-900 font-medium">{shipment.sender_name}</p>
              <p className="text-gray-500">{shipment.sender_phone}</p>
              <p className="text-gray-500">{shipment.sender_address}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Receiver</p>
              <p className="text-gray-900 font-medium">{shipment.receiver_name}</p>
              <p className="text-gray-500">{shipment.receiver_phone}</p>
              <p className="text-gray-500">{shipment.receiver_address}</p>
            </div>
          </div>
          {shipment.field_values && Object.keys(shipment.field_values).length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Details</p>
              {Object.entries(shipment.field_values).map(([k, v]) => (
                <p key={k} className="text-gray-700">
                  <span className="text-gray-400">{k}:</span> {String(v)}
                </p>
              ))}
            </div>
          )}
          {shipment.notes && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Notes</p>
              <p className="text-gray-700">{shipment.notes}</p>
            </div>
          )}
          {shipment.invoice?.payment_screenshot_path && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Payment proof</p>
              <img src={shipment.invoice.payment_screenshot_path} alt="Payment proof"
                className="max-h-56 rounded-lg border border-gray-200" />
              {shipment.invoice.payment_note && (
                <p className="text-gray-600 mt-2">"{shipment.invoice.payment_note}"</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
