import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiArrowRight, FiCheck, FiPackage, FiSearch, FiShield } from "react-icons/fi";
import { submitTrackedPaymentProof, trackShipment } from "../api/shipments";
import { getPaymentSettings } from "../api/settings";
import { formatMoney } from "../utils/money";
import Reveal from "../components/Reveal";

const STATUS_LABELS = {
  requested: "Requested",
  picked_up: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const INVOICE_STATUS = {
  issued: { label: "Payment due", tone: "bg-amber-50 text-amber-800" },
  payment_submitted: { label: "Payment under review", tone: "bg-blue-50 text-blue-800" },
  payment_verified: { label: "Paid", tone: "bg-green-50 text-green-800" },
  payment_rejected: { label: "Payment not accepted", tone: "bg-red-50 text-red-800" },
};

function InvoiceSection({ shipment, onUpdated }) {
  const invoice = shipment.invoice;
  const currency = shipment.currency_code || "USD";
  const [payment, setPayment] = useState(null);
  const [file, setFile] = useState(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const canPay = invoice.status === "issued" || invoice.status === "payment_rejected";

  useEffect(() => {
    if (!canPay) return;
    getPaymentSettings().then((res) => setPayment(res.data)).catch(() => {});
  }, [canPay]);

  const send = async (event) => {
    event.preventDefault();
    if (!file && !note.trim()) {
      toast.error("Upload a payment screenshot or add a note.");
      return;
    }
    setSending(true);
    try {
      await submitTrackedPaymentProof(shipment.shipment_number, { file, note: note.trim() });
      toast.success("Payment proof submitted. We will verify it shortly.");
      setFile(null);
      setNote("");
      onUpdated();
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not submit your payment proof.");
    } finally {
      setSending(false);
    }
  };

  const status = INVOICE_STATUS[invoice.status] || { label: invoice.status, tone: "bg-gray-100 text-gray-700" };
  const discount = Number(invoice.offer_discount_amount || 0) + Number(invoice.manual_discount_amount || 0);

  return (
    <div className="mt-8 border-t border-gray-100 pt-6" id="invoice">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Invoice</p>
          <h3 className="mt-1 text-xl font-extrabold text-gray-950">{invoice.invoice_number}</h3>
          {invoice.issued_at && (
            <p className="mt-1 text-xs text-gray-400">Issued {new Date(invoice.issued_at).toLocaleDateString()}</p>
          )}
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-bold ${status.tone}`}>{status.label}</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-4 py-2 font-semibold">Item</th>
              <th className="px-4 py-2 text-right font-semibold">Qty</th>
              <th className="px-4 py-2 text-right font-semibold">Price</th>
              <th className="px-4 py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((item) => (
              <tr key={item.id} className="border-t border-gray-100">
                <td className="px-4 py-2 text-gray-900">{item.description}</td>
                <td className="px-4 py-2 text-right text-gray-600">{item.quantity}</td>
                <td className="px-4 py-2 text-right text-gray-600">{formatMoney(item.unit_price, currency)}</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">{formatMoney(item.line_total, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-1 border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span><span>{formatMoney(invoice.subtotal_amount, currency)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Discount{invoice.offer_code ? ` (${invoice.offer_code})` : ""}</span>
              <span>−{formatMoney(discount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-extrabold text-gray-950">
            <span>Total due</span><span>{formatMoney(invoice.total_amount, currency)}</span>
          </div>
        </div>
      </div>

      {invoice.status === "payment_rejected" && invoice.payment_rejection_reason && (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Your last payment proof was not accepted: {invoice.payment_rejection_reason}. Please pay and submit a new proof below.
        </p>
      )}
      {invoice.status === "payment_submitted" && (
        <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
          We received your payment proof and will confirm it shortly.
        </p>
      )}
      {invoice.status === "payment_verified" && (
        <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">
          Payment confirmed{invoice.paid_at ? ` on ${new Date(invoice.paid_at).toLocaleDateString()}` : ""}. Thank you!
        </p>
      )}

      {canPay && (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="mb-2 text-sm font-bold text-gray-900">How to pay</p>
            {payment?.qr_code_url && (
              <img src={payment.qr_code_url} alt="Payment QR code" className="mb-3 h-44 w-44 rounded-xl border border-gray-200 bg-white object-contain p-2" />
            )}
            {payment?.instructions
              ? <p className="whitespace-pre-line text-sm text-gray-600">{payment.instructions}</p>
              : <p className="text-sm text-gray-500">Payment details will be shared by our team.</p>}
          </div>
          <form onSubmit={send} className="space-y-3">
            <p className="text-sm font-bold text-gray-900">Submit payment proof</p>
            <div>
              <label htmlFor="proof-file" className="mb-1 block text-xs font-semibold text-gray-600">Screenshot (png, jpg, webp or pdf, max 5 MB)</label>
              <input id="proof-file" type="file" accept=".png,.jpg,.jpeg,.webp,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-800" />
            </div>
            <div>
              <label htmlFor="proof-note" className="mb-1 block text-xs font-semibold text-gray-600">Note (optional, e.g. transaction ID)</label>
              <textarea id="proof-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <button type="submit" disabled={sending} className="btn-primary w-full">
              {sending ? "Submitting…" : "Submit payment proof"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function TrackShipmentPage() {
  const [shipmentNumber, setShipmentNumber] = useState("");
  const [shipment, setShipment] = useState(null);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);

  const refresh = async () => {
    try {
      const response = await trackShipment(shipment.shipment_number);
      setShipment(response.data.shipment);
    } catch {
      /* keep the current view */
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const number = shipmentNumber.trim();
    if (!number) {
      setError("Enter your shipment number.");
      setShipment(null);
      return;
    }

    setSearching(true);
    setError("");
    setShipment(null);
    try {
      const response = await trackShipment(number);
      setShipment(response.data.shipment);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Could not look up this shipment.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-[70vh] overflow-hidden bg-[#f5f8f6]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <Reveal className="relative">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-brand-800 shadow-sm">
            <FiShield size={14} /> Shipment visibility
          </span>
          <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-gray-950 sm:text-5xl">
            Follow your shipment’s journey.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-7 text-gray-600">
            Enter the reference from your booking confirmation to see the latest available status.
          </p>
          <div className="mt-8 space-y-3">
            {["Find your shipment with its reference", "View the current fulfillment status", "Keep your booking details nearby"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm font-medium text-gray-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700"><FiCheck size={14} /></span>
                {item}
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="relative overflow-hidden rounded-[2rem] bg-gray-950 p-6 text-white shadow-2xl shadow-gray-900/15 sm:p-9">
            <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border-[34px] border-white/[0.04]" />
            <div className="absolute -bottom-24 -left-14 h-64 w-64 rounded-full bg-brand-700/30 blur-3xl" />
            <div className="relative">
              <div className="mb-7 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-200">
                  <FiPackage size={23} />
                </span>
                <div>
                  <p className="font-bold">Track a delivery</p>
                  <p className="text-sm text-white/55">Your latest shipment update</p>
                </div>
              </div>
              <form onSubmit={submit}>
                <label htmlFor="shipment-number" className="mb-2 block text-sm font-semibold text-white/80">
                  Shipment reference
                </label>
                <div className="flex flex-col gap-2 rounded-2xl bg-white p-2 sm:flex-row">
                  <input
                    id="shipment-number"
                    className="min-w-0 flex-1 rounded-xl border-0 px-3 py-3 text-sm text-gray-900 outline-none ring-0 placeholder:text-gray-400 focus:ring-2 focus:ring-brand-200"
                    placeholder="e.g. DH-XXXXXXXX"
                    autoComplete="off"
                    value={shipmentNumber}
                    onChange={(event) => setShipmentNumber(event.target.value)}
                  />
                  <button type="submit" disabled={searching}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-brand-800 disabled:opacity-60">
                    <FiSearch size={16} /> {searching ? "Searching…" : "Track shipment"} <FiArrowRight size={15} />
                  </button>
                </div>
                {error && <p role="alert" className="mt-3 rounded-xl border border-red-300/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
              </form>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        {shipment && (
          <Reveal>
            <section aria-live="polite" className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-900/[0.04] sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Shipment found</p>
                  <h2 className="mt-2 text-2xl font-extrabold text-gray-950">{shipment.shipment_number}</h2>
                  <p className="mt-1 text-sm text-gray-500">{shipment.service_name} · {shipment.tier_name}</p>
                </div>
                <span className="rounded-full bg-brand-50 px-4 py-2 text-sm font-bold capitalize text-brand-800">
                  {STATUS_LABELS[shipment.status] || shipment.status}
                </span>
              </div>
              <div className="mt-7 grid gap-3 border-t border-gray-100 pt-6 sm:grid-cols-3">
                {["requested", "picked_up", "in_transit", "delivered"].map((status, index) => {
                  const statuses = ["requested", "picked_up", "in_transit", "delivered"];
                  const activeIndex = statuses.indexOf(shipment.status);
                  const isComplete = activeIndex >= index && shipment.status !== "cancelled";
                  return (
                    <div key={status} className={`rounded-2xl border p-4 transition-colors ${
                      isComplete ? "border-brand-200 bg-brand-50" : "border-gray-100 bg-gray-50"
                    }`}>
                      <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-full ${
                        isComplete ? "bg-brand-700 text-white" : "bg-white text-gray-400"
                      }`}>{isComplete ? <FiCheck size={15} /> : <span className="text-xs font-bold">{index + 1}</span>}</div>
                      <p className={`text-sm font-bold capitalize ${isComplete ? "text-brand-900" : "text-gray-400"}`}>
                        {STATUS_LABELS[status]}
                      </p>
                    </div>
                  );
                })}
              </div>
              {shipment.created_at && (
                <p className="mt-4 text-xs text-gray-400">
                  Booked {new Date(shipment.created_at).toLocaleDateString()}
                  {shipment.sub_service_name ? ` · ${shipment.sub_service_name}` : ""}
                </p>
              )}
              {shipment.invoice && <InvoiceSection shipment={shipment} onUpdated={refresh} />}
            </section>
          </Reveal>
        )}
      </div>
    </div>
  );
}