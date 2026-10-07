import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getCustomer, editCustomer, deactivateCustomer,
  activateCustomer,
  getCustomerAddresses, getCustomerShipments,
} from "../../api/admin";
import toast from "react-hot-toast";
import { formatMoney } from "../../utils/money";
import {
  FiArrowLeft, FiEdit2, FiSave, FiX, FiUserX, FiUserCheck,
  FiUser, FiPhone, FiMail, FiMessageCircle,
  FiMapPin, FiShoppingBag, FiCheckCircle,
} from "react-icons/fi";

const LANGUAGES   = ["english", "telugu", "hindi", "tamil"];
const ORDER_TYPES = ["delivery", "pickup"];

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer]   = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({});
  const [tab, setTab]             = useState("profile"); // profile | addresses | shipments

  const loadCustomer = () =>
    getCustomer(id)
      .then((r) => { setCustomer(r.data.customer); setForm(r.data.customer); })
      .catch(() => toast.error("Customer not found."));

  useEffect(() => {
    Promise.all([
      loadCustomer(),
      getCustomerAddresses(id).then((r) => setAddresses(r.data.addresses)).catch(() => {}),
      getCustomerShipments(id).then((r) => setShipments(r.data.shipments)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [id]);

  const set = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await editCustomer(id, {
        name: form.name, phone: form.phone,
        whatsapp_number: form.whatsapp_number, email: form.email,
        preferred_language: form.preferred_language,
        default_order_type: form.default_order_type,
      });
      toast.success("Customer updated.");
      setEditing(false);
      loadCustomer();
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    const action = customer.is_active ? deactivateCustomer : activateCustomer;
    const label  = customer.is_active ? "deactivated" : "activated";
    try {
      await action(id);
      toast.success(`Customer ${label}.`);
      loadCustomer();
    } catch (err) {
      toast.error(err.response?.data?.error || "Action failed.");
    }
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading…</div>;
  if (!customer) return null;

  return (
    <div className="max-w-3xl">
      {/* Back + header */}
      <button onClick={() => navigate("/admin/customers")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <FiArrowLeft size={14} /> Back to Customers
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Customer ID #{customer.id}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {!editing ? (
            <>
              <button className="btn-secondary flex items-center gap-1 text-sm"
                onClick={() => setEditing(true)}>
                <FiEdit2 size={13} /> Edit
              </button>
              <button
                onClick={handleToggleActive}
                className={`flex items-center gap-1 text-sm px-3 py-2 rounded-lg
                            font-semibold transition-colors
                  ${customer.is_active
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
                {customer.is_active
                  ? <><FiUserX size={13} /> Deactivate</>
                  : <><FiUserCheck size={13} /> Activate</>}
              </button>
            </>
          ) : (
            <>
              <button className="btn-secondary flex items-center gap-1 text-sm"
                onClick={() => { setEditing(false); setForm(customer); }} disabled={saving}>
                <FiX size={13} /> Cancel
              </button>
              <button className="btn-primary flex items-center gap-1 text-sm"
                onClick={handleSave} disabled={saving}>
                <FiSave size={13} /> {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex gap-2 mb-6">
        {customer.is_active
          ? <span className="badge-active">Active</span>
          : <span className="badge-inactive">Inactive</span>}
        {customer.is_verified &&
          <span className="badge-verified flex items-center gap-1">
            <FiCheckCircle size={10} /> Verified
          </span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[
          { key: "profile",   label: "Profile",   icon: <FiUser size={13} /> },
          { key: "addresses", label: `Addresses (${addresses.length})`, icon: <FiMapPin size={13} /> },
          { key: "shipments", label: `Shipments (${shipments.length})`, icon: <FiShoppingBag size={13} /> },
        ].map((t) => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium
                        border-b-2 transition-colors -mb-px
              ${tab === t.key
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ─────────────────────────────── */}
      {tab === "profile" && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AdminField icon={<FiUser />} label="Full Name">
                {editing
                  ? <input className="input" value={form.name} onChange={set("name")} />
                  : customer.name}
              </AdminField>
              <AdminField icon={<FiPhone />} label="Phone">
                {editing
                  ? <input className="input" value={form.phone || ""} onChange={set("phone")} />
                  : customer.phone}
              </AdminField>
              <AdminField icon={<FiMessageCircle />} label="WhatsApp">
                {editing
                  ? <input className="input" value={form.whatsapp_number || ""} onChange={set("whatsapp_number")} />
                  : customer.whatsapp_number || <em className="text-gray-400 text-sm">Not set</em>}
              </AdminField>
              <AdminField icon={<FiMail />} label="Email">
                {editing
                  ? <input className="input" value={form.email || ""} onChange={set("email")} type="email" />
                  : customer.email || <em className="text-gray-400 text-sm">Not set</em>}
              </AdminField>
            </div>
          </div>

          <div className="card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Preferences
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AdminField label="Language">
                {editing
                  ? <select className="input" value={form.preferred_language} onChange={set("preferred_language")}>
                      {LANGUAGES.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase()+l.slice(1)}</option>)}
                    </select>
                  : <span className="capitalize">{customer.preferred_language}</span>}
              </AdminField>
              <AdminField label="Order Type">
                {editing
                  ? <select className="input" value={form.default_order_type} onChange={set("default_order_type")}>
                      {ORDER_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                    </select>
                  : <span className="capitalize">{customer.default_order_type}</span>}
              </AdminField>
            </div>
          </div>

          <div className="card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Account Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Joined</p>
                <p className="text-gray-700">{new Date(customer.created_at).toLocaleDateString("en-US", {
                  year:"numeric", month:"long", day:"numeric"
                })}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Last Updated</p>
                <p className="text-gray-700">{new Date(customer.updated_at).toLocaleDateString("en-US", {
                  year:"numeric", month:"long", day:"numeric"
                })}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Addresses tab ────────────────────────────── */}
      {tab === "addresses" && (
        <div className="space-y-3">
          {addresses.length === 0 ? (
            <div className="card text-center py-10">
              <FiMapPin className="mx-auto text-gray-300 text-3xl mb-2" />
              <p className="text-gray-400">No addresses on file</p>
            </div>
          ) : addresses.map((link) => (
            <div key={link.id}
              className={`card ${link.is_default ? "border-brand-300 ring-1 ring-brand-300" : ""}`}>
              <div className="flex items-start gap-3">
                <FiMapPin className={`mt-0.5 flex-shrink-0
                  ${link.is_default ? "text-brand-500" : "text-gray-400"}`} />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-gray-800">{link.label}</span>
                    {link.is_default && (
                      <span className="text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full font-medium">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    {link.address?.address_line1}
                    {link.address?.address_line2 && `, ${link.address.address_line2}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    {link.address?.city}, {link.address?.state} {link.address?.zip_code}
                  </p>
                  {link.address?.delivery_notes && (
                    <p className="text-xs text-gray-400 mt-1 italic">
                      Note: {link.address.delivery_notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Shipments tab ────────────────────────────── */}
      {tab === "shipments" && (
        <div>
          {shipments.length === 0 ? (
            <div className="card text-center py-10">
              <FiShoppingBag className="mx-auto text-gray-300 text-3xl mb-2" />
              <p className="text-gray-400">No shipments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shipments.map((s) => (
                <div key={s.id} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{s.shipment_number}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(s.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatMoney(s.total_price, s.currency_code)}
                      </p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize
                        ${s.status === "delivered"  ? "bg-green-100 text-green-700" :
                          s.status === "cancelled"  ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"}`}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminField({ icon, label, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-gray-400 text-xs">{icon}</span>}
        <p className="text-xs text-gray-400">{label}</p>
      </div>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  );
}
