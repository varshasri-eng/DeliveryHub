import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiDownload } from "react-icons/fi";
import { getRevenue } from "../../api/admin";
import { formatMoney } from "../../utils/money";

const ROUTE_LABEL = { US_TO_IN: "USA → India", IN_TO_US: "India → USA" };
const monthName = (m) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
};
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function AdminRevenue() {
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRevenue(month)
      .then((res) => setData(res.data))
      .catch(() => toast.error("Could not load revenue."))
      .finally(() => setLoading(false));
  }, [month]);

  // every month that has payments, plus the one being viewed
  const monthOptions = useMemo(() => {
    const set = new Set((data?.months || []).map((m) => m.month));
    set.add(month);
    return [...set].sort().reverse();
  }, [data, month]);

  const downloadCsv = () => {
    const rows = [["Paid on", "Shipment #", "Route", "Service", "Sender", "Receiver", "Currency", "Amount paid"]];
    (data?.entries || []).forEach((e) => rows.push([
      new Date(e.paid_at).toLocaleDateString(), e.shipment_number, ROUTE_LABEL[e.route_direction] || "",
      e.service_name, e.sender_name, e.receiver_name, e.currency_code, e.amount_paid.toFixed(2),
    ]));
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `revenue-${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const entries = data?.entries || [];
  const totals = data?.totals || [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Every shipment whose payment you verified, with the amount paid and the monthly total.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold bg-white">
            {monthOptions.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
          </select>
          <button onClick={downloadCsv} disabled={!entries.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
            <FiDownload size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Month total, one card per currency (USD and INR are never added together) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {totals.length === 0 ? (
          <div className="card"><p className="text-sm text-gray-400">No verified payments in {monthName(month)}.</p></div>
        ) : totals.map((t) => (
          <div key={t.currency_code} className="card">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{monthName(month)} · {t.currency_code}</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-1">{formatMoney(t.total, t.currency_code)}</p>
            <p className="text-sm text-gray-500 mt-1">{t.count} paid shipment{t.count === 1 ? "" : "s"}</p>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-x-auto">
        {loading ? (
          <p className="p-6 text-sm text-gray-400">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">Nothing to show for this month.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3">Paid on</th>
                <th className="px-4 py-3">Shipment #</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Sender → Receiver</th>
                <th className="px-4 py-3 text-right">Amount paid</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(e.paid_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{e.shipment_number}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{ROUTE_LABEL[e.route_direction] || "-"}</td>
                  <td className="px-4 py-3">{e.service_name}</td>
                  <td className="px-4 py-3 text-gray-600">{e.sender_name} → {e.receiver_name}</td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{formatMoney(e.amount_paid, e.currency_code)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {totals.map((t) => (
                <tr key={t.currency_code} className="bg-gray-50 font-bold">
                  <td className="px-4 py-3" colSpan={5}>Total {t.currency_code} · {monthName(month)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(t.total, t.currency_code)}</td>
                </tr>
              ))}
            </tfoot>
          </table>
        )}
      </div>

      {/* All months at a glance */}
      {(data?.months || []).length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-gray-700 mb-2">All months</h2>
          <div className="card p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Currency</th>
                  <th className="px-4 py-3 text-right">Paid shipments</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((m) => (
                  <tr key={`${m.month}-${m.currency_code}`} onClick={() => setMonth(m.month)}
                    className="border-b border-gray-50 cursor-pointer hover:bg-gray-50">
                    <td className="px-4 py-3">{monthName(m.month)}</td>
                    <td className="px-4 py-3">{m.currency_code}</td>
                    <td className="px-4 py-3 text-right">{m.count}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoney(m.total, m.currency_code)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
