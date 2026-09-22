import { useState, useEffect } from "react";
import {
  getAddresses, addAddress, updateAddress,
  deleteAddress, setDefaultAddress
} from "../../api/customers";
import toast from "react-hot-toast";
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiStar, FiX, FiSave } from "react-icons/fi";

const BLANK = {
  address_line1: "", address_line2: "", city: "",
  state: "CA", zip_code: "", delivery_notes: "", label: "Home",
};

export default function Addresses() {
  const [links, setLinks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(BLANK);
  const [saving, setSaving]     = useState(false);

  const load = () =>
    getAddresses()
      .then((res) => setLinks(res.data.addresses))
      .catch(() => toast.error("Failed to load addresses."))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const openAdd = () => { setForm(BLANK); setEditId(null); setShowForm(true); };
  const openEdit = (link) => {
    const a = link.address;
    setForm({
      address_line1: a.address_line1 || "",
      address_line2: a.address_line2 || "",
      city: a.city || "",
      state: a.state || "CA",
      zip_code: a.zip_code || "",
      delivery_notes: a.delivery_notes || "",
      label: link.label || "Home",
    });
    setEditId(link.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.address_line1.trim()) return toast.error("Address line 1 is required.");
    if (!form.city.trim())          return toast.error("City is required.");
    if (!form.zip_code.trim())      return toast.error("ZIP code is required.");
    setSaving(true);
    try {
      if (editId) {
        await updateAddress(editId, form);
        toast.success("Address updated.");
      } else {
        await addAddress(form);
        toast.success("Address added.");
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save address.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this address?")) return;
    try {
      await deleteAddress(id);
      toast.success("Address removed.");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete.");
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultAddress(id);
      toast.success("Default address updated.");
      load();
    } catch {
      toast.error("Failed to set default.");
    }
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading addresses…</div>;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Addresses</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Delivery zones are being updated — check back shortly or contact us to confirm your area
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openAdd}>
          <FiPlus size={14} /> Add Address
        </button>
      </div>

      {/* Address cards */}
      {links.length === 0 ? (
        <div className="card text-center py-12">
          <FiMapPin className="mx-auto text-gray-300 text-4xl mb-3" />
          <p className="text-gray-500 font-medium">No addresses yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your delivery address to get started</p>
          <button className="btn-primary mt-4" onClick={openAdd}>Add Address</button>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.id}
              className={`card flex items-start justify-between
                ${link.is_default ? "border-brand-300 ring-1 ring-brand-300" : ""}`}>
              <div className="flex gap-3">
                <FiMapPin className={`mt-0.5 flex-shrink-0
                  ${link.is_default ? "text-brand-500" : "text-gray-400"}`} />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-gray-800">{link.label}</span>
                    {link.is_default && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium
                                       text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                        <FiStar size={10} /> Default
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

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                {!link.is_default && (
                  <button title="Set as default"
                    onClick={() => handleSetDefault(link.id)}
                    className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50
                               rounded-lg transition-colors">
                    <FiStar size={14} />
                  </button>
                )}
                <button title="Edit"
                  onClick={() => openEdit(link)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50
                             rounded-lg transition-colors">
                  <FiEdit2 size={14} />
                </button>
                <button title="Delete"
                  onClick={() => handleDelete(link.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50
                             rounded-lg transition-colors">
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center
                        bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">
                {editId ? "Edit Address" : "Add New Address"}
              </h3>
              <button onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Label</label>
                  <select className="input" value={form.label} onChange={set("label")}>
                    {["Home", "Work", "Other"].map((l) =>
                      <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">ZIP Code *</label>
                  <input className="input" placeholder="95330 or 95391"
                    value={form.zip_code} onChange={set("zip_code")} maxLength={5} />
                </div>
              </div>

              <div>
                <label className="label">Address Line 1 *</label>
                <input className="input" placeholder="123 Main St"
                  value={form.address_line1} onChange={set("address_line1")} />
              </div>

              <div>
                <label className="label">Address Line 2</label>
                <input className="input" placeholder="Apt, Suite, Unit"
                  value={form.address_line2} onChange={set("address_line2")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">City *</label>
                  <input className="input" placeholder="Lathrop"
                    value={form.city} onChange={set("city")} />
                </div>
                <div>
                  <label className="label">State</label>
                  <input className="input" value={form.state} onChange={set("state")} />
                </div>
              </div>

              <div>
                <label className="label">Delivery Notes</label>
                <input className="input" placeholder="Gate code, ring bell, etc."
                  value={form.delivery_notes} onChange={set("delivery_notes")} />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button className="btn-primary flex-1 flex items-center justify-center gap-2"
                onClick={handleSave} disabled={saving}>
                <FiSave size={14} /> {saving ? "Saving…" : "Save Address"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
