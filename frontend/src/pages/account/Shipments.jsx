import { useState, useEffect } from "react";
import {
  FiPackage, FiClock, FiTruck, FiCheckCircle, FiXCircle, FiMapPin,
} from "react-icons/fi";
import { getMyShipments, submitPaymentProof } from "../../api/shipments";
import { getPaymentSettings } from "../../api/settings";
import { useBranding } from "../../context/BrandingContext";
import { resolveMediaUrl } from "../../utils/media";
import toast from "react-hot-toast";

const STATUS_STYLE = {
  requested:  { icon: <FiClock size={14} />,       bg: "bg-yellow-50",  text: "text-yellow-700",  border: "border-yellow-200",  label: "Requested" },
  picked_up:  { icon: <FiPackage size={14} />,      bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    label: "Picked Up" },
  in_transit: { icon: <FiTruck size={14} />,        bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200",  label: "In Transit" },
  delivered:  { icon: <FiCheckCircle size={14} />,  bg: "bg-green-50",   text: "text-green-700",   border: "border-green-200",   label: "Delivered" },
  cancelled:  { icon: <FiXCircle size={14} />,      bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     label: "Cancelled" },
};

const PAYMENT_STATUS_STYLE = {
  issued:             { bg: "bg-gray-50",   text: "text-gray-600",   border: "border-gray-200",   label: "Awaiting payment" },
  payment_submitted:  { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", label: "Awaiting verification" },
  payment_verified:   { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  label: "Payment verified" },
  payment_rejected:   { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    label: "Payment rejected" },
};

export default function Shipments() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState(null);

  useEffect(() => {
    getMyShipments()
      .then((res) => setShipments(res.data.shipments || []))
      .catch(() => toast.error("Failed to load shipments."))
      .finally(() => setLoading(false));

    getPaymentSettings()
      .then((res) => setPaymentSettings(res.data))
      .catch(() => setPaymentSettings(null));
  }, []);

  const openInvoice = (shipment) => {
    if (!shipment.invoice) {
      toast.error("Invoice is not available for this shipment.");
      return;
    }
    setSelectedInvoice(shipment);
  };

  const closeInvoice = () => setSelectedInvoice(null);
  const printInvoice = () => window.print();

  const handlePaymentSubmitted = (shipmentId, updatedInvoice) => {
    setShipments((prev) =>
      prev.map((s) => (s.id === shipmentId ? { ...s, invoice: updatedInvoice } : s))
    );
    setSelectedInvoice((prev) =>
      prev && prev.id === shipmentId ? { ...prev, invoice: updatedInvoice } : prev
    );
  };

  if (loading) {
    return (
      <div className="max-w-2xl">
        <Header />
        <div className="card text-center py-16 text-gray-400">Loading shipments…</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Header />

      {shipments.length === 0 ? (
        <div className="card text-center py-16">
          <div className="inline-flex items-center justify-center w-14 h-14
                          bg-gray-100 rounded-2xl mb-4">
            <FiPackage className="text-gray-400 text-2xl" />
          </div>
          <h3 className="text-gray-700 font-semibold mb-1">No shipments yet</h3>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">
            Once you book your first shipment, you'll be able to track it here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shipments.map((shipment) => {
            const s = STATUS_STYLE[shipment.status] ?? STATUS_STYLE.requested;
            const paymentStatus = shipment.invoice
              ? PAYMENT_STATUS_STYLE[shipment.invoice.status] ?? PAYMENT_STATUS_STYLE.issued
              : null;
            return (
              <div key={shipment.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{shipment.shipment_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(shipment.created_at).toLocaleDateString("en-US", {
                        month: "long", day: "numeric", year: "numeric",
                      })}
                      {" · "}{shipment.service_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${Number(shipment.total_price).toFixed(2)}</p>
                    <span className={`inline-flex items-center gap-1 mt-1 text-xs font-medium
                                     px-2.5 py-0.5 rounded-full border
                                     ${s.bg} ${s.text} ${s.border}`}>
                      {s.icon} {s.label}
                    </span>
                  </div>
                </div>

                {/* Service / sender / receiver summary */}
                <div className="border-t border-gray-50 pt-3 space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">{shipment.tier_name}</span>
                    <span className="text-gray-600">
                      {shipment.quantity > 1 ? `× ${shipment.quantity} · ` : ""}
                      ${Number(shipment.total_price).toFixed(2)}
                    </span>
                  </div>
                  {shipment.sub_service_name && (
                    <p className="text-sm text-gray-500">{shipment.sub_service_name}</p>
                  )}
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <FiMapPin size={11} /> {shipment.sender_name} → {shipment.receiver_name}
                  </p>
                </div>

                {shipment.invoice && (
                  <div className="border-t border-gray-100 mt-3 pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Invoice</p>
                        <p className="text-xs text-gray-400 mt-0.5">{shipment.invoice.invoice_number}</p>
                        {paymentStatus && (
                          <span className={`inline-flex items-center mt-1.5 text-xs font-medium
                                           px-2 py-0.5 rounded-full border
                                           ${paymentStatus.bg} ${paymentStatus.text} ${paymentStatus.border}`}>
                            {paymentStatus.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-gray-900">
                          ${Number(shipment.invoice.total_amount).toFixed(2)}
                        </p>
                        <button
                          onClick={() => openInvoice(shipment)}
                          className="px-3 py-2 rounded-lg bg-gray-900 text-white
                                    text-xs font-semibold hover:bg-gray-700 transition-colors"
                        >
                          View Invoice
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedInvoice && (
        <InvoiceModal
          shipment={selectedInvoice}
          paymentSettings={paymentSettings}
          onClose={closeInvoice}
          onPrint={printInvoice}
          onPaymentSubmitted={handlePaymentSubmitted}
        />
      )}
    </div>
  );
}

function InvoiceModal({ shipment, paymentSettings, onClose, onPrint, onPaymentSubmitted }) {
  const { settings } = useBranding();
  const invoice = shipment.invoice;

  const [screenshotFile, setScreenshotFile] = useState(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const total = Number(invoice?.total_amount ?? shipment.total_price ?? 0);

  const canSubmitPayment =
    invoice && ["issued", "payment_rejected"].includes(invoice.status);

  const handleSubmitPayment = async () => {
    if (!screenshotFile && !note.trim()) {
      toast.error("Please upload a screenshot or add a note.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitPaymentProof(shipment.id, {
        file: screenshotFile,
        note: note.trim(),
      });
      toast.success("Payment proof submitted. Awaiting admin verification.");
      onPaymentSubmitted(shipment.id, res.data.invoice);
      setScreenshotFile(null);
      setNote("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not submit payment proof.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200
                        sticky top-0 bg-white z-10 print:hidden">
          <div>
            <h2 className="font-bold text-gray-900">Invoice Preview</h2>
            <p className="text-xs text-gray-400 mt-0.5">{invoice?.invoice_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onPrint}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700">
              Print / Download
            </button>
            <button onClick={onClose}
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              ✕
            </button>
          </div>
        </div>

        {invoice && (
          <div className="p-6 pb-0 print:hidden">
            <PaymentSection
              invoice={invoice}
              paymentSettings={paymentSettings}
              total={total}
              canSubmitPayment={canSubmitPayment}
              screenshotFile={screenshotFile}
              setScreenshotFile={setScreenshotFile}
              note={note}
              setNote={setNote}
              submitting={submitting}
              onSubmit={handleSubmitPayment}
            />
          </div>
        )}

        <div id="shipment-invoice" className="p-8 text-gray-900 bg-white">
          <div className="flex justify-between items-start pb-6 mb-6 border-b-2 border-gray-200">
            <div>
              <h1 className="text-2xl font-extrabold">{settings.site_name}</h1>
              <p className="text-sm text-gray-500 mt-1">Shipment Invoice</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-extrabold">INVOICE</h2>
              <p className="text-sm text-gray-500 mt-2">
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

          <div className="grid grid-cols-2 gap-6 mb-7">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Sender</p>
              <p className="font-semibold text-gray-900">{shipment.sender_name}</p>
              <p className="text-sm text-gray-500 mt-1">{shipment.sender_phone}</p>
              <p className="text-sm text-gray-500">{shipment.sender_address}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Receiver</p>
              <p className="font-semibold text-gray-900">{shipment.receiver_name}</p>
              <p className="text-sm text-gray-500 mt-1">{shipment.receiver_phone}</p>
              <p className="text-sm text-gray-500">{shipment.receiver_address}</p>
            </div>
          </div>

          <div className="mb-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-xs uppercase tracking-wide text-gray-500 font-semibold p-3 border-b-2 border-gray-200">Service</th>
                  <th className="text-center text-xs uppercase tracking-wide text-gray-500 font-semibold p-3 border-b-2 border-gray-200">Qty</th>
                  <th className="text-right text-xs uppercase tracking-wide text-gray-500 font-semibold p-3 border-b-2 border-gray-200">Unit Price</th>
                  <th className="text-right text-xs uppercase tracking-wide text-gray-500 font-semibold p-3 border-b-2 border-gray-200">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 text-sm font-medium border-b border-gray-100">
                    {shipment.service_name} — {shipment.tier_name}
                    {shipment.sub_service_name ? ` — ${shipment.sub_service_name}` : ""}
                  </td>
                  <td className="p-3 text-sm text-center border-b border-gray-100">{shipment.quantity}</td>
                  <td className="p-3 text-sm text-right border-b border-gray-100">
                    ${Number(shipment.unit_price).toFixed(2)}
                  </td>
                  <td className="p-3 text-sm text-right font-semibold border-b border-gray-100">
                    ${Number(shipment.total_price).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mb-8">
            <div className="w-72">
              <div className="flex justify-between pt-3 mt-2 border-t-2 border-gray-200 font-extrabold text-lg">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-5 flex justify-between items-end">
            <div>
              <p className="font-semibold text-sm">Thank you for shipping with {settings.site_name}!</p>
              <p className="text-xs text-gray-500 mt-1">
                Invoice status:{" "}
                <span className="text-green-700 font-semibold capitalize">
                  {invoice?.status || "issued"}
                </span>
              </p>
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>{settings.site_name}</p>
              <p>Shipment Invoice</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentSection({
  invoice, paymentSettings, total, canSubmitPayment,
  screenshotFile, setScreenshotFile, note, setNote, submitting, onSubmit,
}) {
  const [qrLoadFailed, setQrLoadFailed] = useState(false);
  const [screenshotLoadFailed, setScreenshotLoadFailed] = useState(false);
  const resolvedQrUrl = paymentSettings?.qr_code_url ? resolveMediaUrl(paymentSettings.qr_code_url) : null;
  const resolvedScreenshotUrl = invoice.payment_screenshot_path
    ? resolveMediaUrl(invoice.payment_screenshot_path) : null;

  useEffect(() => { setQrLoadFailed(false); }, [paymentSettings?.qr_code_url]);
  useEffect(() => { setScreenshotLoadFailed(false); }, [invoice.payment_screenshot_path]);

  if (invoice.status === "payment_verified") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 mb-2">
        <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
          <FiCheckCircle size={16} /> Payment verified
        </p>
        {invoice.paid_at && (
          <p className="text-xs text-green-700 mt-1">
            Verified on {new Date(invoice.paid_at).toLocaleString()}
          </p>
        )}
      </div>
    );
  }

  if (invoice.status === "payment_submitted") {
    return (
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 mb-2">
        <p className="text-sm font-semibold text-yellow-800">Payment proof submitted</p>
        <p className="text-xs text-yellow-700 mt-1">
          Awaiting admin verification
          {invoice.payment_submitted_at && ` — submitted ${new Date(invoice.payment_submitted_at).toLocaleString()}`}.
        </p>
        {resolvedScreenshotUrl && !screenshotLoadFailed && (
          <img src={resolvedScreenshotUrl} alt="Submitted payment screenshot"
            className="mt-3 max-h-48 rounded-lg border border-yellow-200"
            onError={() => setScreenshotLoadFailed(true)} />
        )}
        {resolvedScreenshotUrl && screenshotLoadFailed && (
          <p className="mt-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg p-2 break-all">
            Screenshot failed to load: {resolvedScreenshotUrl}
          </p>
        )}
        {invoice.payment_note && (
          <p className="text-xs text-gray-600 mt-2 bg-white rounded-lg p-2 border border-yellow-100">
            "{invoice.payment_note}"
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-2">
      {invoice.status === "payment_rejected" && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
            <FiXCircle size={15} /> Payment rejected
          </p>
          {invoice.payment_rejection_reason && (
            <p className="text-xs text-red-600 mt-1">{invoice.payment_rejection_reason}</p>
          )}
          <p className="text-xs text-red-500 mt-1">Please double-check your payment and resubmit below.</p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-5">
        <div className="flex-shrink-0 text-center">
          {resolvedQrUrl && !qrLoadFailed ? (
            <img src={resolvedQrUrl} alt="Payment QR code"
              className="w-36 h-36 object-contain rounded-lg border border-gray-200 bg-white p-2"
              onError={() => setQrLoadFailed(true)} />
          ) : (
            <div className={`w-36 h-36 rounded-lg border border-dashed p-2 flex flex-col
                            items-center justify-center text-xs text-center
                            ${resolvedQrUrl ? "border-red-300 bg-red-50 text-red-500" : "border-gray-300 bg-white text-gray-400"}`}>
              {resolvedQrUrl ? (
                <>
                  <span className="font-semibold">QR failed to load</span>
                  <span className="mt-1 break-all leading-tight opacity-75">{resolvedQrUrl}</span>
                </>
              ) : "QR not configured yet"}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">Scan to pay</p>
          <p className="text-sm font-bold text-gray-900">${total.toFixed(2)}</p>
        </div>
        <div className="flex-1 min-w-0">
          {paymentSettings?.instructions && (
            <p className="text-sm text-gray-700 mb-3">{paymentSettings.instructions}</p>
          )}
          <p className="text-xs text-gray-500 mb-3">
            Enter the amount yourself when paying — it isn't pre-filled.
            After paying, upload a screenshot and/or leave a note below.
          </p>
          {canSubmitPayment && (
            <div className="space-y-2">
              <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-gray-600
                           file:mr-3 file:py-1.5 file:px-3 file:rounded-lg
                           file:border-0 file:text-xs file:font-semibold
                           file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
              <textarea value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Optional: transaction ID, or anything else the admin should know…"
                className="w-full text-sm border border-gray-200 rounded-lg p-2 h-16 resize-none
                           outline-none focus:ring-2 focus:ring-brand-100" />
              <button onClick={onSubmit} disabled={submitting}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm
                           font-semibold hover:bg-brand-700 disabled:opacity-50">
                {submitting ? "Submitting…" : "Submit Payment Proof"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">My Shipments</h1>
      <p className="text-gray-500 text-sm mt-0.5">Track and manage your shipments</p>
    </div>
  );
}
