import { useState, useEffect } from "react";
import {
  getPendingStaff, getAllStaff,
  approveStaff, rejectStaff,
  changePermission, revokeStaff,
} from "../../api/staff";
import toast from "react-hot-toast";
import {
  FiUsers, FiShield, FiCheckCircle, FiXCircle,
  FiRefreshCw, FiLock, FiUnlock,
} from "react-icons/fi";

const PERMISSIONS = ["read", "write", "full"];

const PERMISSION_COLORS = {
  read:  "bg-blue-100 text-blue-700 border-blue-200",
  write: "bg-yellow-100 text-yellow-700 border-yellow-200",
  full:  "bg-purple-100 text-purple-700 border-purple-200",
};

const PERMISSION_DESC = {
  read:  "View customers, services, and shipments. No edits.",
  write: "Read + update shipments and manage service details.",
  full:  "Full access including staff approval and role management.",
};

const LANGUAGE_LABELS = {
  english: "🇺🇸 English",
  telugu:  "🇮🇳 Telugu",
  hindi:   "🇮🇳 Hindi",
  tamil:   "🇮🇳 Tamil",
};

const DIET_LABELS = {
  veg:    "🥗 Vegetarian",
  nonveg: "🍗 Non-Veg",
  both:   "🍽️ Both",
};

export default function StaffManagement() {
  const [pending, setPending]   = useState([]);
  const [staff, setStaff]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("pending"); // pending | active

  // Approve modal state
  const [approveTarget, setApproveTarget] = useState(null);
  const [selectedPerm, setSelectedPerm]   = useState("read");
  const [approving, setApproving]         = useState(false);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting]       = useState(false);

  // Change permission modal
  const [permTarget, setPermTarget] = useState(null);
  const [newPerm, setNewPerm]       = useState("read");
  const [changingPerm, setChangingPerm] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      getPendingStaff().then((r) => setPending(r.data.pending)).catch(() => {}),
      getAllStaff().then((r) => setStaff(r.data.staff)).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // ── Approve ─────────────────────────────────────────────
  const handleApprove = async () => {
    setApproving(true);
    try {
      await approveStaff(approveTarget.id, selectedPerm);
      toast.success(`${approveTarget.name} approved with '${selectedPerm}' access.`);
      setApproveTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Approval failed.");
    } finally {
      setApproving(false);
    }
  };

  // ── Reject ──────────────────────────────────────────────
  const handleReject = async () => {
    setRejecting(true);
    try {
      await rejectStaff(rejectTarget.id, rejectReason);
      toast.success(`${rejectTarget.name}'s request rejected.`);
      setRejectTarget(null);
      setRejectReason("");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Rejection failed.");
    } finally {
      setRejecting(false);
    }
  };

  // ── Change permission ────────────────────────────────────
  const handleChangePerm = async () => {
    setChangingPerm(true);
    try {
      await changePermission(permTarget.id, newPerm);
      toast.success(`Permission updated to '${newPerm}'.`);
      setPermTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed.");
    } finally {
      setChangingPerm(false);
    }
  };

  // ── Revoke ───────────────────────────────────────────────
  const handleRevoke = async (member) => {
    if (!window.confirm(`Revoke ${member.name}'s admin access?`)) return;
    try {
      await revokeStaff(member.id);
      toast.success(`${member.name}'s access revoked.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed.");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Review requests and manage team permissions
          </p>
        </div>
        <button onClick={load}
          className="btn-secondary flex items-center gap-2 text-sm">
          <FiRefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card py-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{pending.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Pending Requests</p>
        </div>
        <div className="card py-4 text-center">
          <p className="text-2xl font-bold text-green-600">{staff.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Active Staff</p>
        </div>
        <div className="card py-4 text-center">
          <p className="text-2xl font-bold text-purple-600">
            {staff.filter((s) => s.admin_role === "full").length}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Full Access</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[
          { key: "pending", label: `Pending (${pending.length})` },
          { key: "active",  label: `Active Staff (${staff.length})` },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
              ${tab === t.key
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading…</div>
      ) : tab === "pending" ? (

        /* ── Pending requests tab ─────────────────────── */
        pending.length === 0 ? (
          <div className="card text-center py-12">
            <FiCheckCircle className="mx-auto text-gray-300 text-3xl mb-2" />
            <p className="text-gray-400 font-medium">No pending requests</p>
            <p className="text-gray-400 text-sm mt-1">
              All staff requests have been reviewed
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((s) => (
              <div key={s.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center
                                    justify-center text-yellow-700 font-bold text-sm flex-shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      <p className="text-sm text-gray-500">{s.email}</p>
                      <p className="text-xs text-gray-400">{s.phone}</p>
                      {s.admin_request_note && (
                        <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 max-w-sm">
                          <p className="text-xs text-gray-500 font-medium mb-0.5">Reason:</p>
                          <p className="text-xs text-gray-600 italic">
                            "{s.admin_request_note}"
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Requested {new Date(s.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric"
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0 ml-4">
                    <button
                      onClick={() => { setApproveTarget(s); setSelectedPerm("read"); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                                 bg-green-50 text-green-700 hover:bg-green-100
                                 rounded-lg transition-colors">
                      <FiCheckCircle size={13} /> Approve
                    </button>
                    <button
                      onClick={() => { setRejectTarget(s); setRejectReason(""); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                                 bg-red-50 text-red-600 hover:bg-red-100
                                 rounded-lg transition-colors">
                      <FiXCircle size={13} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (

        /* ── Active staff cards ───────────────────────── */
        staff.length === 0 ? (
          <div className="card text-center py-12">
            <FiUsers className="mx-auto text-gray-300 text-3xl mb-2" />
            <p className="text-gray-400">No active staff members</p>
          </div>
        ) : (
          <div className="space-y-4">
            {staff.map((s) => (
              <div key={s.id} className="card">
                <div className="flex items-start justify-between flex-wrap gap-4">

                  {/* Left — identity */}
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center
                                    justify-center text-purple-700 font-bold text-base flex-shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-base">{s.name}</p>
                      <p className="text-sm text-gray-500">{s.email}</p>
                      <p className="text-xs text-gray-400">{s.phone}</p>
                    </div>
                  </div>

                  {/* Right — permission badge + actions */}
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5
                                      rounded-full text-xs font-semibold border capitalize
                                      ${PERMISSION_COLORS[s.admin_role] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      <FiShield size={10} /> {s.admin_role} access
                    </span>
                    <button
                      onClick={() => { setPermTarget(s); setNewPerm(s.admin_role); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                                 bg-purple-50 text-purple-700 hover:bg-purple-100
                                 rounded-lg transition-colors border border-purple-200">
                      <FiLock size={11} /> Edit Access
                    </button>
                    <button title="Revoke access"
                      onClick={() => handleRevoke(s)}
                      className="p-2 text-gray-400 hover:text-red-500
                                 hover:bg-red-50 rounded-lg transition-colors">
                      <FiUnlock size={13} />
                    </button>
                  </div>
                </div>

                {/* Preferences section */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase
                                tracking-wide mb-3">
                    Preferences & Details
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <PrefCell label="Access Level">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1
                                        rounded-full text-xs font-semibold border capitalize
                                        ${PERMISSION_COLORS[s.admin_role] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        <FiShield size={10} />
                        {s.admin_role === "read"  && "Read Only"}
                        {s.admin_role === "write" && "Read & Write"}
                        {s.admin_role === "full"  && "Full Access"}
                      </span>
                    </PrefCell>
                    <PrefCell label="What they can do">
                      <span className="text-xs text-gray-600">
                        {PERMISSION_DESC[s.admin_role]}
                      </span>
                    </PrefCell>
                    <PrefCell label="Language">
                      {LANGUAGE_LABELS[s.preferred_language] || s.preferred_language}
                    </PrefCell>
                    <PrefCell label="Dietary">
                      {DIET_LABELS[s.dietary_preference] || s.dietary_preference}
                    </PrefCell>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Approve modal ──────────────────────────────── */}
      {approveTarget && (
        <Modal onClose={() => setApproveTarget(null)}>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Approve Staff Request
          </h3>
          <p className="text-gray-500 text-sm mb-5">
            Approving <span className="font-semibold text-gray-800">
            {approveTarget.name}</span>. Select their access level.
          </p>

          <div className="space-y-2 mb-5">
            {PERMISSIONS.map((p) => (
              <label key={p}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer
                            transition-colors ${selectedPerm === p
                              ? "border-brand-400 bg-brand-50"
                              : "border-gray-200 hover:border-gray-300"}`}>
                <input type="radio" name="perm" value={p}
                  checked={selectedPerm === p}
                  onChange={() => setSelectedPerm(p)}
                  className="mt-0.5 accent-brand-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-800 capitalize">{p}</p>
                  <p className="text-xs text-gray-500">{PERMISSION_DESC[p]}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <button className="btn-secondary flex-1"
              onClick={() => setApproveTarget(null)}>Cancel</button>
            <button className="btn-primary flex-1 flex items-center justify-center gap-2"
              onClick={handleApprove} disabled={approving}>
              <FiCheckCircle size={14} />
              {approving ? "Approving…" : `Approve as ${selectedPerm}`}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Reject modal ───────────────────────────────── */}
      {rejectTarget && (
        <Modal onClose={() => setRejectTarget(null)}>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Reject Request
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            Rejecting <span className="font-semibold text-gray-800">
            {rejectTarget.name}</span>'s staff access request.
          </p>
          <div className="mb-5">
            <label className="label">Reason (optional)</label>
            <textarea rows={3}
              className="input resize-none"
              placeholder="e.g. Position not available at this time"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary flex-1"
              onClick={() => setRejectTarget(null)}>Cancel</button>
            <button className="btn-danger flex-1 flex items-center justify-center gap-2"
              onClick={handleReject} disabled={rejecting}>
              <FiXCircle size={14} />
              {rejecting ? "Rejecting…" : "Reject Request"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Change permission modal ────────────────────── */}
      {permTarget && (
        <Modal onClose={() => setPermTarget(null)}>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Change Permission
          </h3>
          <p className="text-gray-500 text-sm mb-5">
            Update access level for{" "}
            <span className="font-semibold text-gray-800">{permTarget.name}</span>.
          </p>
          <div className="space-y-2 mb-5">
            {PERMISSIONS.map((p) => (
              <label key={p}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer
                            transition-colors ${newPerm === p
                              ? "border-brand-400 bg-brand-50"
                              : "border-gray-200 hover:border-gray-300"}`}>
                <input type="radio" name="newperm" value={p}
                  checked={newPerm === p}
                  onChange={() => setNewPerm(p)}
                  className="mt-0.5 accent-brand-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-800 capitalize">{p}</p>
                  <p className="text-xs text-gray-500">{PERMISSION_DESC[p]}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary flex-1"
              onClick={() => setPermTarget(null)}>Cancel</button>
            <button className="btn-primary flex-1"
              onClick={handleChangePerm} disabled={changingPerm}>
              {changingPerm ? "Saving…" : "Update Permission"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Preference cell ──────────────────────────────────────── */
function PrefCell({ label, children }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-700 font-medium">{children}</p>
    </div>
  );
}

/* ── Reusable modal wrapper ───────────────────────────────── */
function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        {children}
      </div>
    </div>
  );
}
