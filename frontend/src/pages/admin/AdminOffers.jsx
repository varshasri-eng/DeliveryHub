import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import {
  createOfferCode, deleteOfferCode, listOfferCodes, updateOfferCode,
} from "../../api/admin";

const EMPTY_FORM = {
  code: "",
  discount_percent: "",
  valid_from: "",
  valid_until: "",
  max_uses: "",
  is_active: true,
};

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function requestDateTime(value) {
  return value ? new Date(value).toISOString() : null;
}

export default function AdminOffers() {
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listOfferCodes()
      .then((response) => setOffers(response.data.offer_codes || []))
      .catch(() => toast.error("Could not load offer codes."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const beginCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const beginEdit = (offer) => {
    setEditingId(offer.id);
    setForm({
      code: offer.code,
      discount_percent: String(offer.discount_percent),
      valid_from: localDateTime(offer.valid_from),
      valid_until: localDateTime(offer.valid_until),
      max_uses: offer.max_uses == null ? "" : String(offer.max_uses),
      is_active: offer.is_active,
    });
    setShowForm(true);
  };

  const save = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      discount_percent: Number(form.discount_percent),
      valid_from: requestDateTime(form.valid_from),
      valid_until: requestDateTime(form.valid_until),
      max_uses: form.max_uses === "" ? null : Number(form.max_uses),
    };
    setSaving(true);
    try {
      if (editingId) {
        await updateOfferCode(editingId, payload);
        toast.success("Offer code updated.");
      } else {
        await createOfferCode(payload);
        toast.success("Offer code created.");
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not save offer code.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (offer) => {
    if (!window.confirm(`Delete offer code "${offer.code}"?`)) return;
    try {
      await deleteOfferCode(offer.id);
      toast.success("Offer code deleted.");
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not delete offer code.");
    }
  };

  const toggleActive = async (offer) => {
    try {
      await updateOfferCode(offer.id, { ...offer, is_active: !offer.is_active });
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not update offer code.");
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offer Codes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create percentage-off codes customers can apply when booking a shipment.
          </p>
        </div>
        <button type="button" onClick={beginCreate}
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 font-medium text-white hover:bg-brand-600">
          <FiPlus /> New offer
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="card mb-5 space-y-4">
          <h2 className="font-semibold text-gray-900">
            {editingId ? "Edit offer code" : "Create offer code"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Offer code</label>
              <input required maxLength={50} className="input uppercase"
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })} />
            </div>
            <div>
              <label className="label">Percentage discount</label>
              <div className="flex gap-2">
                <input required type="number" min="0.01" max="100" step="0.01"
                  className="input" value={form.discount_percent}
                  onChange={(event) => setForm({ ...form, discount_percent: event.target.value })} />
                <span className="input flex w-12 items-center justify-center">%</span>
              </div>
            </div>
            <div>
              <label className="label">Starts at (optional)</label>
              <input type="datetime-local" className="input" value={form.valid_from}
                onChange={(event) => setForm({ ...form, valid_from: event.target.value })} />
            </div>
            <div>
              <label className="label">Expires at (optional)</label>
              <input type="datetime-local" className="input" value={form.valid_until}
                onChange={(event) => setForm({ ...form, valid_until: event.target.value })} />
            </div>
            <div>
              <label className="label">Maximum uses (optional)</label>
              <input type="number" min="1" step="1" className="input" placeholder="Unlimited"
                value={form.max_uses}
                onChange={(event) => setForm({ ...form, max_uses: event.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.is_active}
              onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
            Active and available to customers
          </label>
          <div className="flex gap-2">
            <button disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? "Saving…" : editingId ? "Save changes" : "Create code"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="card text-gray-400">Loading offer codes…</div>
      ) : offers.length === 0 ? (
        <div className="card text-center text-sm text-gray-500">No offer codes have been created.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="p-4">Code</th>
                <th className="p-4">Discount</th>
                <th className="p-4">Uses</th>
                <th className="p-4">Validity</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {offers.map((offer) => (
                <tr key={offer.id}>
                  <td className="p-4 font-bold text-gray-900">{offer.code}</td>
                  <td className="p-4">{offer.discount_percent}% off</td>
                  <td className="p-4">
                    {offer.times_used} / {offer.max_uses ?? "Unlimited"}
                  </td>
                  <td className="p-4 text-xs text-gray-500">
                    <span className="block">From: {offer.valid_from ? new Date(offer.valid_from).toLocaleString() : "Any time"}</span>
                    <span className="block">Until: {offer.valid_until ? new Date(offer.valid_until).toLocaleString() : "No expiry"}</span>
                  </td>
                  <td className="p-4">
                    <button type="button" onClick={() => toggleActive(offer)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        offer.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                      {offer.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-3">
                      <button type="button" aria-label={`Edit ${offer.code}`}
                        onClick={() => beginEdit(offer)} className="text-gray-500 hover:text-gray-900">
                        <FiEdit2 />
                      </button>
                      <button type="button" aria-label={`Delete ${offer.code}`}
                        onClick={() => remove(offer)} className="text-gray-500 hover:text-red-600">
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
