import { useState, useEffect } from "react";
import {
  FiShoppingBag, FiClock, FiTruck, FiCheckCircle, FiXCircle,
  FiMapPin, FiPackage,
} from "react-icons/fi";
import { getMyOrders, submitPaymentProof } from "../../api/orders";
import { getPaymentSettings } from "../../api/settings";
import { resolveMediaUrl } from "../../utils/media";
import toast from "react-hot-toast";

const STATUS_STYLE = {
  pending:   { icon: <FiClock size={14} />,       bg: "bg-yellow-50",  text: "text-yellow-700",  border: "border-yellow-200",  label: "Pending" },
  confirmed: { icon: <FiShoppingBag size={14} />, bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    label: "Confirmed" },
  processing:{ icon: <FiShoppingBag size={14} />, bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    label: "Processing" },
  out_for_delivery: { icon: <FiTruck size={14} />, bg: "bg-purple-50", text: "text-purple-700",  border: "border-purple-200",  label: "Out for Delivery" },
  delivered: { icon: <FiCheckCircle size={14} />, bg: "bg-green-50",   text: "text-green-700",   border: "border-green-200",   label: "Delivered" },
  cancelled: { icon: <FiXCircle size={14} />,     bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     label: "Cancelled" },
};

// Payment status pill shown next to the invoice, distinct from the
// order fulfillment status above — these track the QR-payment
// verification flow (Phase 3), not delivery/pickup progress.
const PAYMENT_STATUS_STYLE = {
  issued:             { bg: "bg-gray-50",   text: "text-gray-600",   border: "border-gray-200",   label: "Awaiting payment" },
  payment_submitted:  { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", label: "Awaiting verification" },
  payment_verified:   { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  label: "Payment verified" },
  payment_rejected:   { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    label: "Payment rejected" },
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState(null);

  useEffect(() => {
    getMyOrders()
      .then((res) => setOrders(res.data.orders || []))
      .catch(() => toast.error("Failed to load orders."))
      .finally(() => setLoading(false));

    getPaymentSettings()
      .then((res) => setPaymentSettings(res.data))
      .catch(() => setPaymentSettings(null));
  }, []);

    const openInvoice = (order) => {
      if (!order.invoice) {
        toast.error("Invoice is not available for this order.");
        return;
      }

      setSelectedInvoice(order);
    };

    const closeInvoice = () => {
      setSelectedInvoice(null);
    };

    const printInvoice = () => {
      window.print();
    };

    // Called after a successful payment-proof submission — updates
    // both the open modal and the underlying orders list so the
    // status pill on the order card also reflects the new state
    // without needing a full refetch.
    const handlePaymentSubmitted = (orderId, updatedInvoice) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, invoice: updatedInvoice } : o
        )
      );
      setSelectedInvoice((prev) =>
        prev && prev.id === orderId
          ? { ...prev, invoice: updatedInvoice }
          : prev
      );
    };

  if (loading) {
    return (
      <div className="max-w-2xl">
        <Header />
        <div className="card text-center py-16 text-gray-400">Loading orders…</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Header />

      {orders.length === 0 ? (
        <div className="card text-center py-16">
          <div className="inline-flex items-center justify-center w-14 h-14
                          bg-gray-100 rounded-2xl mb-4">
            <FiShoppingBag className="text-gray-400 text-2xl" />
          </div>
          <h3 className="text-gray-700 font-semibold mb-1">No orders yet</h3>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">
            Once you place your first order, you'll be able to track it here in real time.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-brand-50
                          text-brand-700 text-sm font-medium px-4 py-2 rounded-xl">
            <FiClock size={14} /> Head to Home to start shopping
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending;
            const paymentStatus = order.invoice
              ? PAYMENT_STATUS_STYLE[order.invoice.status] ?? PAYMENT_STATUS_STYLE.issued
              : null;
            return (
              <div key={order.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        month: "long", day: "numeric", year: "numeric",
                      })}
                      {" · "}
                      {order.order_type === "pickup"
                        ? <span className="inline-flex items-center gap-1"><FiPackage size={11} /> Pickup</span>
                        : <span className="inline-flex items-center gap-1"><FiMapPin size={11} /> Delivery</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${Number(order.total_amount).toFixed(2)}</p>
                    <span className={`inline-flex items-center gap-1 mt-1 text-xs font-medium
                                     px-2.5 py-0.5 rounded-full border
                                     ${s.bg} ${s.text} ${s.border}`}>
                      {s.icon} {s.label}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="border-t border-gray-50 pt-3 space-y-1.5">
                  {(order.items || []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {item.product_name}
                        <span className="text-gray-400 text-xs"> × {item.quantity}</span>
                      </span>
                      <span className="text-gray-600">${Number(item.line_total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {(order.delivery_fee > 0 || order.requested_time_slot) && (
                  <div className="border-t border-gray-50 mt-3 pt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                    {order.delivery_fee > 0 && (
                      <span>Delivery fee: ${Number(order.delivery_fee).toFixed(2)}</span>
                    )}
                    {order.requested_time_slot && (
                      <span>Slot: {order.requested_time_slot}</span>
                    )}
                  </div>
                )}
                {order.invoice && (
                  <div className="border-t border-gray-100 mt-3 pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          Invoice
                        </p>

                        <p className="text-xs text-gray-400 mt-0.5">
                          {order.invoice.invoice_number}
                        </p>

                        {paymentStatus && (
                          <span className={`inline-flex items-center mt-1.5 text-xs font-medium
                                           px-2 py-0.5 rounded-full border
                                           ${paymentStatus.bg} ${paymentStatus.text} ${paymentStatus.border}`}>
                            {paymentStatus.label}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            ${Number(order.invoice.total_amount).toFixed(2)}
                          </p>
                        </div>

                        <button
                          onClick={() => openInvoice(order)}
                          className="px-3 py-2 rounded-lg bg-gray-900 text-white
                                    text-xs font-semibold hover:bg-gray-700
                                    transition-colors"
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
        order={selectedInvoice}
        paymentSettings={paymentSettings}
        onClose={closeInvoice}
        onPrint={printInvoice}
        onPaymentSubmitted={handlePaymentSubmitted}
      />
    )}
    </div>

  );
}

function InvoiceModal({ order, paymentSettings, onClose, onPrint, onPaymentSubmitted }) {
  const invoice = order.invoice;

  const [screenshotFile, setScreenshotFile] = useState(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const subtotal = Number(invoice?.subtotal ?? order.subtotal ?? 0);
  const deliveryFee = Number(
    invoice?.delivery_fee ?? order.delivery_fee ?? 0
  );
  const discount = Number(
    invoice?.discount_amount ?? order.discount_amount ?? 0
  );
  const total = Number(
    invoice?.total_amount ?? order.total_amount ?? 0
  );

  // Only "issued" (first payment) and "payment_rejected" (resubmit
  // after rejection) show the QR + upload form — "payment_submitted"
  // is read-only pending admin review, "payment_verified" is done.
  const canSubmitPayment =
    invoice && ["issued", "payment_rejected"].includes(invoice.status);

  const handleSubmitPayment = async () => {
    if (!screenshotFile && !note.trim()) {
      toast.error("Please upload a screenshot or add a note.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitPaymentProof(order.id, {
        file: screenshotFile,
        note: note.trim(),
      });
      toast.success("Payment proof submitted. Awaiting admin verification.");
      onPaymentSubmitted(order.id, res.data.invoice);
      setScreenshotFile(null);
      setNote("");
    } catch (err) {
      toast.error(
        err.response?.data?.error || "Could not submit payment proof."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center
                 justify-center p-4"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl
                   max-h-[90vh] overflow-y-auto"
      >
        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-6 py-4
                     border-b border-gray-200 sticky top-0 bg-white z-10
                     print:hidden"
        >
          <div>
            <h2 className="font-bold text-gray-900">
              Invoice Preview
            </h2>

            <p className="text-xs text-gray-400 mt-0.5">
              {invoice?.invoice_number}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onPrint}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white
                         text-sm font-semibold hover:bg-gray-700"
            >
              Print / Download
            </button>

            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg border border-gray-200
                         text-gray-600 hover:bg-gray-50"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Payment section — QR + proof submission/status. Kept
            outside the printable invoice below so printing the
            invoice doesn't also print the QR/upload UI. */}
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

        {/* Invoice */}
        <div
          id="tajameat-invoice"
          className="p-8 text-gray-900 bg-white"
        >
          {/* Header */}
          <div
            className="flex justify-between items-start pb-6 mb-6
                       border-b-2 border-gray-200"
          >
            <div>
              <h1 className="text-2xl font-extrabold">
                Store<span className="text-brand-600">2Home</span>
              </h1>

              <p className="text-sm text-gray-500 mt-1">
                Grocery Order Invoice
              </p>
            </div>

            <div className="text-right">
              <h2 className="text-xl font-extrabold">
                INVOICE
              </h2>

              <p className="text-sm text-gray-500 mt-2">
                Invoice #:{" "}
                <strong className="text-gray-900">
                  {invoice?.invoice_number}
                </strong>
              </p>

              <p className="text-sm text-gray-500">
                Date:{" "}
                <strong className="text-gray-900">
                  {invoice?.issued_at
                    ? new Date(invoice.issued_at).toLocaleDateString()
                    : new Date(order.created_at).toLocaleDateString()}
                </strong>
              </p>

              <p className="text-sm text-gray-500">
                Order #:{" "}
                <strong className="text-gray-900">
                  {order.order_number}
                </strong>
              </p>
            </div>
          </div>

          {/* Customer / Order information */}
          <div className="grid grid-cols-2 gap-6 mb-7">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                Customer
              </p>

              <p className="font-semibold text-gray-900">
                Customer #{order.customer_id}
              </p>

              <p className="text-sm text-gray-500 mt-1">
                Order #{order.order_number}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                Order Information
              </p>

              <p className="text-sm">
                Type:{" "}
                <strong>
                  {order.order_type === "pickup"
                    ? "Pickup"
                    : "Delivery"}
                </strong>
              </p>

              <p className="text-sm mt-1">
                Status:{" "}
                <strong className="capitalize">
                  {order.status}
                </strong>
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="mb-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-xs uppercase tracking-wide
                                 text-gray-500 font-semibold p-3
                                 border-b-2 border-gray-200">
                    #
                  </th>

                  <th className="text-left text-xs uppercase tracking-wide
                                 text-gray-500 font-semibold p-3
                                 border-b-2 border-gray-200">
                    Product
                  </th>

                  <th className="text-center text-xs uppercase tracking-wide
                                 text-gray-500 font-semibold p-3
                                 border-b-2 border-gray-200">
                    Qty
                  </th>

                  <th className="text-right text-xs uppercase tracking-wide
                                 text-gray-500 font-semibold p-3
                                 border-b-2 border-gray-200">
                    Unit Price
                  </th>

                  <th className="text-right text-xs uppercase tracking-wide
                                 text-gray-500 font-semibold p-3
                                 border-b-2 border-gray-200">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {(order.items || []).map((item, index) => (
                  <tr key={item.id}>
                    <td className="p-3 text-sm border-b border-gray-100">
                      {index + 1}
                    </td>

                    <td className="p-3 text-sm font-medium
                                   border-b border-gray-100">
                      {item.product_name}
                    </td>

                    <td className="p-3 text-sm text-center
                                   border-b border-gray-100">
                      {item.quantity}
                    </td>

                    <td className="p-3 text-sm text-right
                                   border-b border-gray-100">
                      ${Number(item.unit_price).toFixed(2)}
                    </td>

                    <td className="p-3 text-sm text-right font-semibold
                                   border-b border-gray-100">
                      ${Number(item.line_total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-72">
              <div className="flex justify-between py-2 text-sm text-gray-500">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-2 text-sm text-gray-500">
                <span>Delivery Fee</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between py-2 text-sm text-gray-500">
                  <span>Discount</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}

              <div
                className="flex justify-between pt-3 mt-2
                           border-t-2 border-gray-200
                           font-extrabold text-lg"
              >
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="border-t border-gray-200 pt-5
                       flex justify-between items-end"
          >
            <div>
              <p className="font-semibold text-sm">
                Thank you for shopping with TajaMeat!
              </p>

              <p className="text-xs text-gray-500 mt-1">
                Invoice status:{" "}
                <span className="text-green-700 font-semibold capitalize">
                  {invoice?.status || "issued"}
                </span>
              </p>
            </div>

            <div className="text-right text-xs text-gray-400">
              <p>TajaMeat</p>
              <p>Grocery Order Invoice</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Handles all four invoice payment states: issued (pay now), 
// payment_submitted (read-only, awaiting admin), payment_verified
// (done), payment_rejected (show reason, allow resubmit — same form
// as "issued").
function PaymentSection({
  invoice,
  paymentSettings,
  total,
  canSubmitPayment,
  screenshotFile,
  setScreenshotFile,
  note,
  setNote,
  submitting,
  onSubmit,
}) {
  const [qrLoadFailed, setQrLoadFailed] = useState(false);
  const [screenshotLoadFailed, setScreenshotLoadFailed] = useState(false);
  const resolvedQrUrl = paymentSettings?.qr_code_url
    ? resolveMediaUrl(paymentSettings.qr_code_url)
    : null;
  const resolvedScreenshotUrl = invoice.payment_screenshot_path
    ? resolveMediaUrl(invoice.payment_screenshot_path)
    : null;

  // Reset failure flags if the underlying URLs change (e.g. admin
  // replaced the QR, or the customer resubmitted a new screenshot)
  // so a stale failure doesn't stick around.
  useEffect(() => {
    setQrLoadFailed(false);
  }, [paymentSettings?.qr_code_url]);

  useEffect(() => {
    setScreenshotLoadFailed(false);
  }, [invoice.payment_screenshot_path]);

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
        <p className="text-sm font-semibold text-yellow-800">
          Payment proof submitted
        </p>
        <p className="text-xs text-yellow-700 mt-1">
          Awaiting admin verification
          {invoice.payment_submitted_at &&
            ` — submitted ${new Date(invoice.payment_submitted_at).toLocaleString()}`}
          .
        </p>
        {resolvedScreenshotUrl && !screenshotLoadFailed && (
          <img
            src={resolvedScreenshotUrl}
            alt="Submitted payment screenshot"
            className="mt-3 max-h-48 rounded-lg border border-yellow-200"
            onError={() => setScreenshotLoadFailed(true)}
          />
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

  // "issued" or "payment_rejected" — QR + upload form
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-2">
      {invoice.status === "payment_rejected" && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
            <FiXCircle size={15} /> Payment rejected
          </p>
          {invoice.payment_rejection_reason && (
            <p className="text-xs text-red-600 mt-1">
              {invoice.payment_rejection_reason}
            </p>
          )}
          <p className="text-xs text-red-500 mt-1">
            Please double-check your payment and resubmit below.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-5">
        {/* QR */}
        <div className="flex-shrink-0 text-center">
          {resolvedQrUrl && !qrLoadFailed ? (
            <img
              src={resolvedQrUrl}
              alt="Payment QR code"
              className="w-36 h-36 object-contain rounded-lg border border-gray-200 bg-white p-2"
              onError={() => setQrLoadFailed(true)}
            />
          ) : (
            <div className={`w-36 h-36 rounded-lg border border-dashed p-2 flex flex-col
                            items-center justify-center text-xs text-center
                            ${resolvedQrUrl ? "border-red-300 bg-red-50 text-red-500" : "border-gray-300 bg-white text-gray-400"}`}>
              {resolvedQrUrl ? (
                <>
                  <span className="font-semibold">QR failed to load</span>
                  <span className="mt-1 break-all leading-tight opacity-75">
                    {resolvedQrUrl}
                  </span>
                </>
              ) : (
                "QR not configured yet"
              )}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">Scan to pay</p>
          <p className="text-sm font-bold text-gray-900">${total.toFixed(2)}</p>
        </div>

        {/* Instructions + upload form */}
        <div className="flex-1 min-w-0">
          {paymentSettings?.instructions && (
            <p className="text-sm text-gray-700 mb-3">
              {paymentSettings.instructions}
            </p>
          )}
          <p className="text-xs text-gray-500 mb-3">
            Enter the amount yourself when paying — it isn't pre-filled.
            After paying, upload a screenshot and/or leave a note below.
          </p>

          {canSubmitPayment && (
            <div className="space-y-2">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-gray-600
                           file:mr-3 file:py-1.5 file:px-3 file:rounded-lg
                           file:border-0 file:text-xs file:font-semibold
                           file:bg-brand-50 file:text-brand-700
                           hover:file:bg-brand-100"
              />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional: transaction ID, or anything else the admin should know…"
                className="w-full text-sm border border-gray-200 rounded-lg p-2 h-16 resize-none
                           outline-none focus:ring-2 focus:ring-brand-100"
              />
              <button
                onClick={onSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm
                           font-semibold hover:bg-brand-700 disabled:opacity-50"
              >
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
      <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
      <p className="text-gray-500 text-sm mt-0.5">Track and manage your grocery orders</p>
    </div>
  );
}