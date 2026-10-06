import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { FiPackage, FiX } from "react-icons/fi";
import {
  getAdminShipments, updateShipmentStatus,
  raiseShipmentInvoice, verifyShipmentPayment, rejectShipmentPayment,
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
    try {
      const res = await raiseShipmentInvoice(shipment.id);
      refreshOne({ ...shipment, invoice: res.data.invoice });
      toast.success("Invoice raised.");
      setTab("pending_payment");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not raise invoice.");
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
                  <p className="font-bold text-gray-900">${Number(s.total_price).toFixed(2)}</p>
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
                    Raise Invoice
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
                  <span className="text-xs font-semibold text-gray-400 capitalize">
                    {s.invoice.status.replace("_", " ")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <ShipmentDetailModal shipment={selected} onClose={() => setSelected(null)} />
      )}
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
              Qty {shipment.quantity} · ${Number(shipment.total_price).toFixed(2)}
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
