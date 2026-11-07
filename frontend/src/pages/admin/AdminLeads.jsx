import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiArrowLeft, FiArrowRight, FiMapPin, FiPhone, FiSearch, FiUsers, FiX } from "react-icons/fi";
import { getAdminLead, getAdminLeads } from "../../api/admin";
import { formatMoney } from "../../utils/money";

const FILTERS = [
  { key: "", label: "All" },
  { key: "sender", label: "Senders" },
  { key: "receiver", label: "Receivers" },
  { key: "both", label: "Both" },
];
const STATUS_LABEL = {
  requested: "Requested", picked_up: "Picked up", in_transit: "In transit",
  delivered: "Delivered", cancelled: "Cancelled",
};
const PER_PAGE = 25;

const place = (lead) =>
  [lead.city, lead.province, lead.country].filter(Boolean).join(", ") || lead.address || "No location";
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);

  // wait for a pause in typing before searching
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAdminLeads({ search, role, page, per_page: PER_PAGE })
      .then((res) => {
        if (!active) return;
        setLeads(res.data.leads || []);
        setTotal(res.data.total || 0);
        setCounts(res.data.counts || {});
      })
      .catch(() => active && toast.error("Could not load leads."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [search, role, page]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Leads</h1>
      <p className="text-gray-500 text-sm mb-6">
        Everyone who has sent or received a shipment, one entry per phone number, with who they are connected to.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, phone, city or address"
            aria-label="Search leads"
            className="input !pl-9 w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f.key || "all"} onClick={() => { setRole(f.key); setPage(1); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors
                ${role === f.key ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {f.label}
              <span className={`rounded-full px-1.5 text-xs ${role === f.key ? "bg-white/20" : "bg-gray-100"}`}>
                {counts[f.key || "all"] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card py-16 text-center text-gray-400">Loading…</div>
      ) : leads.length === 0 ? (
        <div className="card py-16 text-center">
          <FiUsers className="mx-auto mb-3 text-gray-300" size={32} />
          <p className="font-semibold text-gray-700">No leads found</p>
          <p className="mt-1 text-sm text-gray-400">
            {search || role ? "Try a different search or filter." : "Leads appear here once shipments are booked."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <button key={lead.id} onClick={() => setOpenId(lead.id)}
              className="card w-full text-left transition-colors hover:bg-gray-50">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{lead.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-600"><FiPhone size={12} /> {lead.phone}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400"><FiMapPin size={12} /> {place(lead)}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  {lead.sent_shipments > 0 && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                      Sends: {plural(lead.sent_shipments, "shipment")} to {plural(lead.sends_to_people, "person").replace("persons", "people")}
                    </span>
                  )}
                  {lead.received_shipments > 0 && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                      Receives: {plural(lead.received_shipments, "shipment")} from {plural(lead.receives_from_people, "person").replace("persons", "people")}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {total > PER_PAGE && (
        <div className="mt-5 flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {pages} · {total} leads</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary disabled:opacity-40">Previous</button>
            <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="btn-secondary disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {openId && <LeadDetail startId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function PeopleList({ title, tone, people, empty, onOpen }) {
  return (
    <div>
      <p className={`mb-2 text-xs font-bold uppercase tracking-wide ${tone}`}>{title}</p>
      {people.length === 0 ? (
        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-400">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.id}>
              <button onClick={() => onOpen(p.id)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 text-left hover:bg-gray-50">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-gray-900">{p.name || `Lead #${p.id}`}</span>
                  <span className="block text-xs text-gray-400">{p.phone}</span>
                </span>
                <span className="flex-shrink-0 text-xs text-gray-500">{plural(p.shipments, "shipment")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LeadDetail({ startId, onClose }) {
  const [trail, setTrail] = useState([startId]);       // lets you step back after jumping to a connection
  const currentId = trail[trail.length - 1];
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAdminLead(currentId)
      .then((res) => active && setData(res.data))
      .catch(() => { if (active) { toast.error("Could not load this lead."); onClose(); } })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (id) => setTrail((t) => [...t, id]);
  const lead = data?.lead;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            {trail.length > 1 && (
              <button onClick={() => setTrail((t) => t.slice(0, -1))} aria-label="Back"
                className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"><FiArrowLeft size={14} /></button>
            )}
            <h2 className="font-bold text-gray-900">{lead?.name || "Lead"}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
        </div>

        {loading || !lead ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : (
          <div className="space-y-6 p-6 text-sm">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="flex items-center gap-2 text-gray-900"><FiPhone size={14} /> {lead.phone}</p>
              <p className="mt-1 flex items-start gap-2 text-gray-600"><FiMapPin size={14} className="mt-0.5 flex-shrink-0" /> {place(lead)}</p>
              {lead.address && <p className="mt-1 pl-6 text-xs text-gray-400">{lead.address}</p>}
              <p className="mt-2 text-xs text-gray-400">
                First seen {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "—"} ·
                last seen {lead.last_seen_at ? new Date(lead.last_seen_at).toLocaleDateString() : "—"}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <PeopleList title={`Sends to (${data.sends_to.length})`} tone="text-blue-700" people={data.sends_to}
                empty="Has not sent a shipment." onOpen={open} />
              <PeopleList title={`Receives from (${data.receives_from.length})`} tone="text-emerald-700" people={data.receives_from}
                empty="Has not received a shipment." onOpen={open} />
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Shipments ({data.shipments.length})</p>
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                {data.shipments.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{s.shipment_number}</p>
                      <p className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
                        {s.role === "sender" ? "Sent to" : "Received from"}
                        <FiArrowRight size={11} className={s.role === "sender" ? "" : "rotate-180"} />
                        {s.counterpart ? (
                          <button onClick={() => open(s.counterpart.id)} className="font-semibold text-brand-700 hover:underline">
                            {s.counterpart.name}
                          </button>
                        ) : "unknown"}
                        · {s.service_name} · {s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatMoney(s.total_price, s.currency_code)}</p>
                      <p className="text-xs text-gray-500">{STATUS_LABEL[s.status] || s.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
