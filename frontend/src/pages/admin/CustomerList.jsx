import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  listCustomers, getCustomerStats,
  deactivateCustomer, activateCustomer,
} from "../../api/admin";
import { getPendingStaff } from "../../api/staff";
import toast from "react-hot-toast";
import {
  FiUsers, FiSearch, FiEye,
  FiUserX, FiUserCheck, FiRefreshCw, FiChevronDown,
  FiArrowUp, FiArrowDown,
  FiX,
} from "react-icons/fi";

const SEARCH_BY_OPTIONS = [
  { value: "name",       label: "Name" },
  { value: "phone",      label: "Phone / WhatsApp" },
  { value: "email",      label: "Email" },
  { value: "address",    label: "Address" },
  { value: "group",      label: "Family Group ID" },
  { value: "last_order", label: "Order Number / Status" },
];

const LANGUAGES  = ["english", "telugu", "hindi", "tamil"];

export default function CustomerList() {
  const navigate = useNavigate();

  const [customers, setCustomers]       = useState([]);
  const [stats, setStats]               = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [pagination, setPagination]     = useState({});

  // search_by state
  const [searchBy, setSearchBy]   = useState("name");
  const [searchQ, setSearchQ]     = useState("");
  const [showSByMenu, setShowSByMenu] = useState(false);

  // secondary filters
  const [filterRole, setFilterRole]         = useState("");
  const [filterStatus, setFilterStatus]     = useState("");
  const [filterLanguage, setFilterLanguage] = useState("");
  const [page, setPage]                     = useState(1);

  // sort
  const [sortBy, setSortBy]       = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // ── load stats once ──────────────────────────────────────
  useEffect(() => {
    getCustomerStats().then((r) => setStats(r.data)).catch(() => {});
    getPendingStaff().then((r) => setPendingCount(r.data.count)).catch(() => {});
  }, []);

  // ── load list ────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    const params = { page };

    // targeted search
    if (searchQ.trim()) {
      params.search_by = searchBy;
      params.search_q  = searchQ.trim();
    }

    if (filterRole)     params.role      = filterRole;
    if (filterStatus)   params.is_active = filterStatus;
    if (filterLanguage) params.language  = filterLanguage;

    params.sort_by    = sortBy;
    params.sort_order = sortOrder;

    listCustomers(params)
      .then((r) => {
        setCustomers(r.data.customers);
        setPagination(r.data.pagination);
      })
      .catch(() => toast.error("Failed to load customers."))
      .finally(() => setLoading(false));
  }, [searchBy, searchQ, filterRole, filterStatus, filterLanguage, page, sortBy, sortOrder]);

  useEffect(() => { load(); }, [load]);

  // reset page to 1 whenever any filter changes
  const resetPage = () => setPage(1);

  const clearSearch = () => { setSearchQ(""); resetPage(); };

  const activeFilterCount = [filterRole, filterStatus, filterLanguage]
    .filter(Boolean).length;

  // ── toggle active ────────────────────────────────────────
  const handleToggleActive = async (c) => {
    const action = c.is_active ? deactivateCustomer : activateCustomer;
    const label  = c.is_active ? "deactivated" : "activated";
    try {
      await action(c.id);
      toast.success(`${c.name} ${label}.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Action failed.");
    }
  };

  const selectedLabel = SEARCH_BY_OPTIONS.find((o) => o.value === searchBy)?.label ?? "Name";

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage all registered customers</p>
        </div>
        <button onClick={load}
          className="btn-secondary flex items-center gap-2 text-sm">
          <FiRefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total",    value: stats.total_customers, color: "text-gray-800" },
            { label: "Active",   value: stats.active,          color: "text-green-600" },
            { label: "Inactive", value: stats.inactive,        color: "text-red-500" },
            { label: "Admins",   value: stats.admins,          color: "text-purple-600" },
          ].map((s) => (
            <div key={s.label} className="card py-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pending staff alert */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between bg-yellow-50 border
                         border-yellow-200 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <p className="text-sm text-yellow-800 font-medium">
              {pendingCount} pending staff request{pendingCount > 1 ? "s" : ""} awaiting approval
            </p>
          </div>
          <a href="/admin/staff"
            className="text-xs font-semibold text-yellow-700 hover:text-yellow-900
                       bg-yellow-100 hover:bg-yellow-200 px-3 py-1.5 rounded-lg transition-colors">
            Review →
          </a>
        </div>
      )}

      {/* ── Search bar ───────────────────────────────────────── */}
      <div className="card mb-3">
        <div className="flex items-center gap-2">
          {/* Search-by dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSByMenu((v) => !v)}
              className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium
                         bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg
                         transition-colors whitespace-nowrap">
              Search by: <span className="text-brand-600">{selectedLabel}</span>
              <FiChevronDown size={13} className={`transition-transform ${showSByMenu ? "rotate-180" : ""}`} />
            </button>

            {showSByMenu && (
              <div className="absolute left-0 top-11 z-30 bg-white border border-gray-100
                              rounded-xl shadow-lg py-1 w-52 animate-fade-in">
                {SEARCH_BY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSearchBy(opt.value);
                      setSearchQ("");
                      setShowSByMenu(false);
                      resetPage();
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors
                      ${searchBy === opt.value
                        ? "bg-brand-50 text-brand-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search input */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={14} />
            <input
              className="input pl-8 pr-8 text-sm h-9 py-0"
              placeholder={`Search by ${selectedLabel.toLowerCase()}…`}
              value={searchQ}
              onChange={(e) => { setSearchQ(e.target.value); resetPage(); }}
              type={searchBy === "group" ? "number" : "text"}
            />
            {searchQ && (
              <button
                onClick={clearSearch}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600">
                <FiX size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Active chip summary */}
        {searchQ && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 bg-brand-50 text-brand-700
                             text-xs font-medium px-2.5 py-1 rounded-full">
              {selectedLabel}: <em className="not-italic font-semibold">{searchQ}</em>
              <button onClick={clearSearch} className="ml-1 hover:text-brand-900">
                <FiX size={11} />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* ── Secondary filters row ───────────────────────────── */}
      <div className="card mb-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide mr-1">
            Filter by
          </span>

          <select
            className="input text-sm w-36 h-8 py-0"
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); resetPage(); }}>
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
          </select>

          <select
            className="input text-sm w-36 h-8 py-0"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); resetPage(); }}>
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <select
            className="input text-sm w-36 h-8 py-0"
            value={filterLanguage}
            onChange={(e) => { setFilterLanguage(e.target.value); resetPage(); }}>
            <option value="">All Languages</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
            ))}
          </select>

          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setFilterRole(""); setFilterStatus("");
                setFilterLanguage(""); resetPage();
              }}
              className="text-xs text-red-500 hover:text-red-700 font-medium
                         flex items-center gap-1 ml-auto">
              <FiX size={12} /> Clear filters
              <span className="bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 text-xs">
                {activeFilterCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Sort row ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Sort by</span>
          <select
            className="input text-xs h-8 py-0 w-36"
            value={`${sortBy}_${sortOrder}`}
            onChange={(e) => {
              // IMPORTANT: split on the LAST underscore only, not
              // every underscore. sort_by values like "created_at" and
              // "orders_count" already contain an underscore
              // themselves, so a plain value.split("_") breaks
              // "created_at_asc" into ["created", "at", "asc"] instead
              // of ["created_at", "asc"] — "created" isn't a column
              // the backend recognizes, so it silently falls back to
              // its created_at/desc default, and "at" isn't "desc" so
              // the order was wrong too. Same problem for
              // "orders_count_desc"/"orders_count_asc". Only
              // "name_asc"/"name_desc" ever worked, purely because
              // "name" has no underscore in it.
              const value = e.target.value;
              const separatorIndex = value.lastIndexOf("_");
              const by = value.slice(0, separatorIndex);
              const order = value.slice(separatorIndex + 1);
              setSortBy(by);
              setSortOrder(order);
              resetPage();
            }}>
            <option value="created_at_desc">Newest first</option>
            <option value="created_at_asc">Oldest first</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="orders_count_desc">Most orders</option>
            <option value="orders_count_asc">Least orders</option>
          </select>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Name", "Contact", "Language", "Role", "Status", "Joined", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500
                                         uppercase tracking-wide px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Loading…
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14">
                    <FiUsers className="mx-auto text-gray-300 text-3xl mb-2" />
                    <p className="text-gray-400 font-medium">No customers found</p>
                    {(searchQ || activeFilterCount > 0) && (
                      <p className="text-gray-400 text-xs mt-1">Try adjusting your search or filters</p>
                    )}
                  </td>
                </tr>
              ) : customers.map((c) => (
                <tr key={c.id}
                  className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/customers/${c.id}`)}>

                  {/* Name */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">#{c.id}</p>
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-3">
                    <p className="text-gray-700 text-xs">{c.email || "—"}</p>
                    <p className="text-xs text-gray-400">{c.phone}</p>
                  </td>

                  {/* Language */}
                  <td className="px-4 py-3 capitalize text-gray-600 text-xs">
                    {c.preferred_language}
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    {c.role === "admin"
                      ? <span className="badge-admin">Admin</span>
                      : <span className="text-gray-400 text-xs">Customer</span>}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {c.is_active
                        ? <span className="badge-active">Active</span>
                        : <span className="badge-inactive">Inactive</span>}
                      {c.is_verified &&
                        <span className="badge-verified">Verified</span>}
                    </div>
                  </td>

                  {/* Joined */}
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(c.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>

                  {/* Actions — stop propagation so row click doesn't fire */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        title="View details"
                        onClick={() => navigate(`/admin/customers/${c.id}`)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50
                                   rounded-lg transition-colors">
                        <FiEye size={14} />
                      </button>
                      <button
                        title={c.is_active ? "Deactivate" : "Activate"}
                        onClick={() => handleToggleActive(c)}
                        className={`p-1.5 rounded-lg transition-colors
                          ${c.is_active
                            ? "text-gray-400 hover:text-red-500 hover:bg-red-50"
                            : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}>
                        {c.is_active ? <FiUserX size={14} /> : <FiUserCheck size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3
                          border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              {pagination.total} customers · Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                className="btn-secondary text-xs py-1 px-3 disabled:opacity-40"
                disabled={!pagination.has_prev}
                onClick={() => setPage((p) => p - 1)}>
                ← Prev
              </button>
              <button
                className="btn-secondary text-xs py-1 px-3 disabled:opacity-40"
                disabled={!pagination.has_next}
                onClick={() => setPage((p) => p + 1)}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}