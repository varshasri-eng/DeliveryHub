import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { formatMoney } from "../../utils/money";
import { resolveMediaUrl } from "../../utils/media";
import { downloadInvoice } from "../../utils/invoiceDownload";
import { useBranding } from "../../context/BrandingContext";
import InvoiceDocument from "../../components/InvoiceDocument";
import { FiCheckCircle, FiDownload, FiExternalLink, FiPackage, FiPaperclip, FiX } from "react-icons/fi";
import {
  getAdminShipments, updateShipmentStatus,
  raiseShipmentInvoice, updateShipmentInvoice, verifyShipmentPayment, rejectShipmentPayment,
  setShipmentTracking, clearShipmentTracking,
} from "../../api/admin";

const STATUS_OPTIONS = ["requested", "picked_up", "in_transit", "delivered", "cancelled"];
const STATUS_LABELS = {
  requested: "Requested", picked_up: "Picked Up", in_transit: "In Transit",
  delivered: "Delivered", cancelled: "Cancelled",
};

// The order's journey: Requested -> (invoice raised, paid, verified) -> FedEx label -> Picked up -> In transit -> Delivered
const TABS = STATUS_OPTIONS.map((key) => ({ key, label: STATUS_LABELS[key] }));

const INVOICE_CHIP = {
  none:              { label: "Invoice: not raised",     cls: "bg-gray-100 text-gray-600" },
  issued:            { label: "Invoice: awaiting payment", cls: "bg-amber-50 text-amber-700" },
  payment_submitted: { label: "Payment submitted - verify", cls: "bg-blue-50 text-blue-700" },
  payment_rejected:  { label: "Payment rejected",        cls: "bg-red-50 text-red-700" },
  payment_verified:  { label: "Paid & verified",         cls: "bg-green-50 text-green-700" },
};

// ── Status moves ────────────────────────────────────────────
// A shipment can go one step back or forward, and can be cancelled from any step.
// Moving forward needs the previous step finished (invoice raised / payment verified).
const FLOW = ["requested", "picked_up", "in_transit", "delivered"];
const TRANSIT_DAYS = 3;

function statusChoices(s) {
  const cur = s.status || "requested";
  const choices = [{ value: cur, label: STATUS_LABELS[cur] }];
  if (cur === "cancelled") {
    choices.push({ value: "requested", label: "Reopen as Requested" });
    return choices;
  }
  const i = FLOW.indexOf(cur);
  if (i > 0) choices.push({ value: FLOW[i - 1], label: STATUS_LABELS[FLOW[i - 1]] });
  if (i < FLOW.length - 1) {
    const next = FLOW[i + 1];
    let blocked = "";
    if (next === "picked_up" && !s.invoice) blocked = "raise the invoice first";
    if (next === "in_transit" && s.invoice?.status !== "payment_verified") blocked = "verify the payment first";
    choices.push({ value: next, label: blocked ? `${STATUS_LABELS[next]} (${blocked})` : STATUS_LABELS[next], disabled: !!blocked });
  }
  choices.push({ value: "cancelled", label: "Cancel shipment" });
  return choices;
}

// Whole calendar days since the shipment went In Transit (10th -> 13th = 3)
function daysInTransit(s) {
  if (!s.in_transit_at) return null;
  const start = new Date(s.in_transit_at);
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const now = new Date();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((b - a) / 86400000);
}
const transitReady = (s) => (daysInTransit(s) ?? 0) >= TRANSIT_DAYS;

// Picked Up: verified first, then waiting for verification, then not paid yet.
// In Transit: the ones past 3 days (green tick) first.
function sortForTab(list, tab) {
  const byAge = (a, b) => new Date(a.created_at) - new Date(b.created_at);
  const copy = [...list];
  if (tab === "picked_up") {
    const rank = (s) => {
      const st = s.invoice?.status;
      return st === "payment_verified" ? 0 : st === "payment_submitted" ? 1 : 2;
    };
    return copy.sort((a, b) => rank(a) - rank(b) || byAge(a, b));
  }
  if (tab === "in_transit") {
    return copy.sort((a, b) =>
      Number(transitReady(b)) - Number(transitReady(a)) ||
      new Date(a.in_transit_at || a.created_at) - new Date(b.in_transit_at || b.created_at));
  }
  return copy.sort((a, b) => byAge(b, a)); // other tabs: newest first
}

function nextStep(s) {
  const inv = s.invoice?.status;
  if (s.status === "cancelled") return "";
  if (s.status === "delivered") return "Completed.";
  if (!s.invoice) return "Next: review the order, add any discount and raise the invoice.";
  if (inv === "issued") return "Waiting for the customer to pay the invoice.";
  if (inv === "payment_submitted") return "Next: check the payment proof and verify (or reject) it.";
  if (inv === "payment_rejected") return "Waiting for the customer to submit payment again.";
  if (!s.tracking_number) return "Next: upload the FedEx label (the tracking number is read from it).";
  if (s.status === "in_transit") return "On its way - mark Delivered when FedEx confirms delivery.";
  return "Next: set the status to In Transit so the customer sees the FedEx tracking link.";
}

export default function AdminShipments() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("requested");
  const [selected, setSelected] = useState(null);
  const [invoiceEditorShipment, setInvoiceEditorShipment] = useState(null);
  const [invoiceViewShipment, setInvoiceViewShipment] = useState(null);
  const [trackingShipment, setTrackingShipment] = useState(null);

  const load = () => {
    setLoading(true);
    getAdminShipments()
      .then((res) => setShipments(res.data.shipments || []))
      .catch(() => toast.error("Could not load shipments."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const counts = TABS.reduce((acc, t) => {
    acc[t.key] = shipments.filter((s) => (s.status || "requested") === t.key).length;
    return acc;
  }, {});

  const filtered = sortForTab(shipments.filter((s) => (s.status || "requested") === tab), tab);

  const refreshOne = (updated) => {
    setShipments((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSelected((prev) => (prev && prev.id === updated.id ? updated : prev));
    setInvoiceViewShipment((prev) => (prev && prev.id === updated.id ? updated : prev));
    setTrackingShipment((prev) => (prev && prev.id === updated.id ? updated : prev));
  };

  const handleStatusChange = async (shipment, status) => {
    if (status === shipment.status) return;
    if (status === "cancelled" && !window.confirm(`Cancel ${shipment.shipment_number}?`)) return;
    if (status === "in_transit" && !shipment.tracking_number &&
        !window.confirm("No FedEx tracking number has been added yet, so the customer will not see a tracking link. Continue anyway?")) {
      return;
    }
    try {
      const res = await updateShipmentStatus(shipment.id, status);
      refreshOne(res.data.shipment);
      setTab(status); // follow the order to its new tab
      toast.success(`Moved to ${STATUS_LABELS[status]}.`);
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
      <p className="text-gray-500 text-sm mb-6">
        Follow each order from request to delivery: invoice, payment, FedEx label and status.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
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
            {tab === "requested" ? "New customer orders show up here."
              : `No shipments are marked ${STATUS_LABELS[tab]} right now.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const chip = INVOICE_CHIP[s.invoice ? s.invoice.status : "none"] || INVOICE_CHIP.none;
            const hint = nextStep(s);
            return (
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
                    aria-label="Shipment status"
                    className="mt-1.5 text-xs font-semibold border border-gray-200 rounded-full px-2 py-1 capitalize"
                  >
                    {statusChoices(s).map((c) => (
                      <option key={c.value} value={c.value} disabled={c.disabled}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${chip.cls}`}>{chip.label}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.tracking_number ? "bg-purple-50 text-purple-700" : "bg-gray-100 text-gray-500"}`}>
                  {s.tracking_number ? `FedEx ${s.tracking_number}` : "FedEx label: not added"}
                </span>
              </div>
              {s.status === "in_transit" && s.in_transit_at && (
                transitReady(s) ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                    <FiCheckCircle size={13} /> {daysInTransit(s)} days in transit - check delivery and mark Delivered
                  </p>
                ) : (
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    In transit since {new Date(s.in_transit_at).toLocaleDateString()} - day {Math.max(daysInTransit(s), 0)} of {TRANSIT_DAYS}
                  </p>
                )
              )}
              {hint && <p className="mt-2 text-xs text-gray-500">{hint}</p>}

              <div className="border-t border-gray-50 mt-3 pt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={() => setSelected(s)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900">
                    View details
                  </button>
                  {s.invoice && (
                    <button onClick={() => setInvoiceViewShipment(s)}
                      className="text-xs font-semibold text-brand-700 hover:underline">
                      View / Download invoice
                    </button>
                  )}
                  {s.status !== "cancelled" && (
                    <button onClick={() => setTrackingShipment(s)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:underline">
                      <FiPaperclip size={12} /> {s.tracking_number ? "FedEx label" : "Upload FedEx label"}
                    </button>
                  )}
                </div>

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
                ) : s.invoice.status === "issued" ? (
                  <button onClick={() => setInvoiceEditorShipment({ shipment: s, invoice: s.invoice })}
                    className="text-xs font-semibold text-brand-700 hover:underline">
                    Preview / Edit Invoice
                  </button>
                ) : null}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {selected && (
        <ShipmentDetailModal shipment={selected} onClose={() => setSelected(null)} />
      )}
      {invoiceViewShipment && (
        <AdminInvoiceModal shipment={invoiceViewShipment} onClose={() => setInvoiceViewShipment(null)} />
      )}
      {trackingShipment && (
        <TrackingModal shipment={trackingShipment} onClose={() => setTrackingShipment(null)}
          onSaved={refreshOne} />
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

function ProofBlock({ invoice }) {
  const url = invoice?.payment_screenshot_path ? resolveMediaUrl(invoice.payment_screenshot_path) : null;
  const isPdf = url && /\.pdf(\?|$)/i.test(url);
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Payment</p>
      <p className="mt-1 text-sm font-semibold capitalize text-gray-900">
        {(invoice?.status || "issued").replace(/_/g, " ")}
        {invoice?.paid_at ? ` · verified ${new Date(invoice.paid_at).toLocaleDateString()}` : ""}
      </p>
      {invoice?.payment_submitted_at && (
        <p className="text-xs text-gray-500">Proof submitted {new Date(invoice.payment_submitted_at).toLocaleString()}</p>
      )}
      {url && (isPdf
        ? <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 underline">
            <FiExternalLink size={13} /> Open payment proof (PDF)
          </a>
        : <a href={url} target="_blank" rel="noopener noreferrer">
            <img src={url} alt="Payment proof" className="mt-3 max-h-56 rounded-lg border border-gray-200" />
          </a>)}
      {invoice?.payment_note && <p className="mt-2 text-sm text-gray-600">"{invoice.payment_note}"</p>}
      {invoice?.payment_rejection_reason && (
        <p className="mt-2 text-sm text-red-600">Rejected: {invoice.payment_rejection_reason}</p>
      )}
      {!url && !invoice?.payment_note && invoice?.status === "issued" && (
        <p className="mt-2 text-sm text-gray-500">The customer has not submitted payment yet.</p>
      )}
    </div>
  );
}

function AdminInvoiceModal({ shipment, onClose }) {
  const { settings } = useBranding();
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10 print:hidden">
          <div>
            <h2 className="font-bold text-gray-900">Invoice</h2>
            <p className="text-xs text-gray-400 mt-0.5">{shipment.invoice?.invoice_number} · {shipment.shipment_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => downloadInvoice(shipment, settings.site_name, settings.logo_url)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700">
              <FiDownload size={14} /> Download
            </button>
            <button onClick={() => window.print()}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50">
              Print
            </button>
            <button onClick={onClose} aria-label="Close"
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">✕</button>
          </div>
        </div>
        <InvoiceDocument shipment={shipment}>
          <ProofBlock invoice={shipment.invoice} />
        </InvoiceDocument>
      </div>
    </div>
  );
}

function TrackingModal({ shipment, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [number, setNumber] = useState("");
  const [needsNumber, setNeedsNumber] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    if (!file && !number.trim()) {
      toast.error("Choose the FedEx label file or type the tracking number.");
      return;
    }
    setSaving(true);
    try {
      const res = await setShipmentTracking(shipment.id, { file, trackingNumber: number });
      onSaved(res.data.shipment);
      toast.success(res.data.detected_from_file
        ? `Tracking number ${res.data.shipment.tracking_number} read from the label.`
        : "Tracking saved.");
      setFile(null);
      setNumber("");
      setNeedsNumber(false);
    } catch (err) {
      if (err.response?.data?.needs_number) setNeedsNumber(true);
      toast.error(err.response?.data?.error || "Could not save tracking.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove the tracking number and label from this shipment?")) return;
    try {
      const res = await clearShipmentTracking(shipment.id);
      onSaved(res.data.shipment);
      toast.success("Tracking removed.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not remove tracking.");
    }
  };

  const labelUrl = shipment.label_path ? resolveMediaUrl(shipment.label_path) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">FedEx label</h2>
            <p className="text-xs text-gray-400 mt-0.5">{shipment.shipment_number}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
        </div>
        <div className="p-6 space-y-5 text-sm">
          {shipment.tracking_number ? (
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-purple-700">Current tracking number</p>
              <p className="mt-1 text-lg font-extrabold text-gray-900">{shipment.tracking_number}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-purple-700 underline">
                  <FiExternalLink size={13} /> Open on FedEx
                </a>
                {labelUrl && (
                  <a href={labelUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-purple-700 underline">
                    <FiPaperclip size={13} /> View uploaded label
                  </a>
                )}
                <button type="button" onClick={remove} className="font-semibold text-red-600 hover:underline">Remove</button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                The customer sees this link on the Track page only while the status is In Transit.
              </p>
            </div>
          ) : (
            <p className="text-gray-500">
              Upload the FedEx label (PDF or image). For a PDF the 12-digit tracking number next to “TRK#” is read automatically.
            </p>
          )}

          <form onSubmit={save} className="space-y-3">
            <div>
              <label htmlFor="label-file" className="mb-1 block text-xs font-semibold text-gray-600">
                {shipment.tracking_number ? "Replace label (PDF, PNG, JPG, WEBP, max 8 MB)" : "Label file (PDF, PNG, JPG, WEBP, max 8 MB)"}
              </label>
              <input id="label-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700" />
            </div>
            <div>
              <label htmlFor="label-number" className="mb-1 block text-xs font-semibold text-gray-600">
                Tracking number {needsNumber ? "(required for this file)" : "(optional for PDFs, needed for images)"}
              </label>
              <input id="label-number" inputMode="numeric" maxLength={20} value={number}
                onChange={(e) => setNumber(e.target.value)} placeholder="e.g. 879507453190"
                className={`input ${needsNumber ? "border-red-300" : ""}`} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary">Close</button>
              <button disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? "Saving…" : "Save tracking"}
              </button>
            </div>
          </form>
        </div>
      </div>
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
          {shipment.tracking_number && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">FedEx tracking</p>
              <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer"
                className="font-semibold text-purple-700 underline">{shipment.tracking_number}</a>
            </div>
          )}
          {shipment.invoice && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
                Invoice {shipment.invoice.invoice_number}
              </p>
              <ProofBlock invoice={shipment.invoice} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}