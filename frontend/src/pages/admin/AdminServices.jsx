import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { FiPlus, FiTrash2, FiEdit2, FiArrowLeft } from "react-icons/fi";
import {
  listAdminServices, getAdminService, createService, updateService, deleteService,
  addCoverageItem, updateCoverageItem, deleteCoverageItem,
  addRestriction, updateRestriction, deleteRestriction,
  addPricingTier, updatePricingTier, deletePricingTier,
  addPricingSubservice, updatePricingSubservice, deletePricingSubservice,
  addField, updateField, deleteField,
} from "../../api/admin";
import { formatMoney } from "../../utils/money";

const FIELD_TYPES = ["text", "textarea", "number", "select", "checkbox", "date", "file"];

/* ── Generic inline list editor (used for Coverage + Restrictions) ── */
function BulletListEditor({ title, items, onAdd, onUpdate, onDelete }) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const submitAdd = async () => {
    if (!draft.trim()) return;
    await onAdd(draft.trim());
    setDraft("");
  };

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="space-y-2 mb-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            {editingId === item.id ? (
              <>
                <input className="input flex-1" value={editText}
                  onChange={(e) => setEditText(e.target.value)} />
                <button type="button" onClick={async () => {
                  await onUpdate(item.id, editText.trim());
                  setEditingId(null);
                }} className="text-xs font-semibold text-brand-600">Save</button>
                <button type="button" onClick={() => setEditingId(null)}
                  className="text-xs text-gray-400">Cancel</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-800">{item.text}</span>
                <button type="button" onClick={() => { setEditingId(item.id); setEditText(item.text); }}
                  className="text-gray-400 hover:text-gray-700"><FiEdit2 size={14} /></button>
                <button type="button" onClick={() => onDelete(item.id)}
                  className="text-gray-400 hover:text-red-600"><FiTrash2 size={14} /></button>
              </>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-400">None added yet.</p>}
      </div>
      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Add a line…" value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitAdd(); } }} />
        <button type="button" onClick={submitAdd}
          className="px-3 rounded-lg bg-brand-500 text-white hover:bg-brand-600"><FiPlus /></button>
      </div>
    </div>
  );
}

/* ── Pricing tiers editor ── */
function SubservicesEditor({ tier, onAdd, onUpdate, onDelete }) {
  const empty = { name: "", price: "", price_inr: "", icon: "" };
  const [draft, setDraft] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(empty);
  const subservices = tier.sub_services || [];

  const submitAdd = async () => {
    if (!draft.name.trim() || draft.price === "") {
      toast.error("Sub-service name and price are required.");
      return;
    }
    await onAdd(tier.id, {
      ...draft,
      price: Number(draft.price),
      price_inr: draft.price_inr === "" ? null : Number(draft.price_inr),
      display_order: subservices.length,
    });
    setDraft(empty);
  };

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        Sub-services for {tier.tier_name}
      </p>
      <p className="text-xs text-gray-400 mb-2">
        US → India prices are in USD; India → US prices are in INR.
      </p>
      <div className="space-y-2 mb-3">
        {subservices.map((subservice) => (
          <div key={subservice.id} className="flex items-center gap-2">
            {editingId === subservice.id ? (
              <>
                <input className="input flex-1" placeholder="Name" value={editDraft.name}
                  onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} />
                <input className="input w-24" type="number" min="0" step="0.01" placeholder="US → India (USD)"
                  value={editDraft.price}
                  onChange={(e) => setEditDraft({ ...editDraft, price: e.target.value })} />
                <input className="input w-24" type="number" min="0" step="0.01" placeholder="India → US (INR)"
                  value={editDraft.price_inr}
                  onChange={(e) => setEditDraft({ ...editDraft, price_inr: e.target.value })} />
                <input className="input w-20" placeholder="Icon" value={editDraft.icon}
                  onChange={(e) => setEditDraft({ ...editDraft, icon: e.target.value })} />
                <button type="button" onClick={async () => {
                  await onUpdate(subservice.id, {
                    ...editDraft,
                    price: Number(editDraft.price),
                    price_inr: editDraft.price_inr === "" ? null : Number(editDraft.price_inr),
                  });
                  setEditingId(null);
                }} className="text-xs font-semibold text-brand-600">Save</button>
                <button type="button" onClick={() => setEditingId(null)}
                  className="text-xs text-gray-400">Cancel</button>
              </>
            ) : (
              <>
                <span className="text-lg">{subservice.icon || "📦"}</span>
                <span className="flex-1 text-sm text-gray-800">{subservice.name}</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatMoney(subservice.price, "USD")} / {formatMoney(subservice.price_inr, "INR")}
                </span>
                <button type="button" onClick={() => {
                  setEditingId(subservice.id);
                  setEditDraft({
                    name: subservice.name,
                    price: subservice.price,
                    price_inr: subservice.price_inr ?? "",
                    icon: subservice.icon || "",
                  });
                }} className="text-gray-400 hover:text-gray-700"><FiEdit2 size={14} /></button>
                <button type="button" onClick={() => onDelete(subservice.id)}
                  className="text-gray-400 hover:text-red-600"><FiTrash2 size={14} /></button>
              </>
            )}
          </div>
        ))}
        {subservices.length === 0 && (
          <p className="text-sm text-gray-400">No sub-services added.</p>
        )}
      </div>
      <div className="grid grid-cols-[1fr_100px_100px_80px_auto] gap-2">
        <input className="input" placeholder="Sub-service name" value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <input className="input" type="number" min="0" step="0.01" placeholder="US → India (USD) *"
          value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
        <input className="input" type="number" min="0" step="0.01" placeholder="India → US (INR)"
          value={draft.price_inr} onChange={(e) => setDraft({ ...draft, price_inr: e.target.value })} />
        <input className="input" placeholder="Icon" value={draft.icon}
          onChange={(e) => setDraft({ ...draft, icon: e.target.value })} />
        <button type="button" onClick={submitAdd}
          className="px-3 rounded-lg bg-brand-500 text-white hover:bg-brand-600"><FiPlus /></button>
      </div>
    </div>
  );
}

function TiersEditor({
  tiers, onAdd, onUpdate, onDelete,
  onAddSubservice, onUpdateSubservice, onDeleteSubservice,
}) {
  const empty = { tier_name: "", description: "", duration_label: "", price: "", price_inr: "", icon: "" };
  const [draft, setDraft] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(empty);

  const submitAdd = async () => {
    if (!draft.tier_name.trim() || !draft.price) {
      toast.error("Tier name and price are required.");
      return;
    }
    await onAdd({
      ...draft,
      price: Number(draft.price),
      price_inr: draft.price_inr === "" ? null : Number(draft.price_inr),
    });
    setDraft(empty);
  };

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-3">Delivery Options</h3>
      <p className="text-xs text-gray-400 mb-3">
        Set separate prices for US → India (USD) and India → US (INR).
      </p>
      <div className="space-y-2 mb-4">
        {tiers.map((t) => (
          <div key={t.id} className="border border-gray-100 rounded-lg p-3">
            {editingId === t.id ? (
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="Icon" value={editDraft.icon}
                  onChange={(e) => setEditDraft({ ...editDraft, icon: e.target.value })} />
                <input className="input" placeholder="Option name" value={editDraft.tier_name}
                  onChange={(e) => setEditDraft({ ...editDraft, tier_name: e.target.value })} />
                <input className="input" placeholder="Short description" value={editDraft.description}
                  onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} />
                <input className="input" placeholder="Duration label" value={editDraft.duration_label}
                  onChange={(e) => setEditDraft({ ...editDraft, duration_label: e.target.value })} />
                <input className="input" type="number" min="0" step="0.01" placeholder="US → India (USD)" value={editDraft.price}
                  onChange={(e) => setEditDraft({ ...editDraft, price: e.target.value })} />
                <input className="input" type="number" min="0" step="0.01" placeholder="India → US (INR)" value={editDraft.price_inr}
                  onChange={(e) => setEditDraft({ ...editDraft, price_inr: e.target.value })} />
                <div className="col-span-2 flex gap-3">
                  <button type="button" onClick={async () => {
                    await onUpdate(t.id, {
                      ...editDraft,
                      price: Number(editDraft.price),
                      price_inr: editDraft.price_inr === "" ? null : Number(editDraft.price_inr),
                    });
                    setEditingId(null);
                  }} className="text-xs font-semibold text-brand-600">Save</button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-xs text-gray-400">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{t.icon || "📦"}</span>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{t.tier_name}</p>
                    {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                    <p className="text-xs text-gray-400">{t.duration_label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900">
                    {formatMoney(t.price, "USD")} / {formatMoney(t.price_inr, "INR")}
                  </span>
                  <button type="button" onClick={() => { setEditingId(t.id); setEditDraft({ tier_name: t.tier_name, description: t.description || "", duration_label: t.duration_label || "", price: t.price, price_inr: t.price_inr ?? "", icon: t.icon || "" }); }}
                    className="text-gray-400 hover:text-gray-700"><FiEdit2 size={14} /></button>
                  <button type="button" onClick={() => onDelete(t.id)}
                    className="text-gray-400 hover:text-red-600"><FiTrash2 size={14} /></button>
                </div>
              </div>
            )}
            <SubservicesEditor tier={t}
              onAdd={onAddSubservice}
              onUpdate={onUpdateSubservice}
              onDelete={onDeleteSubservice} />
          </div>
        ))}
        {tiers.length === 0 && <p className="text-sm text-gray-400">No delivery options yet — add at least one option to make this service bookable.</p>}
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add a delivery option</p>
      <div className="grid grid-cols-2 gap-2">
        <input className="input" placeholder="Icon (emoji, optional)" value={draft.icon}
          onChange={(e) => setDraft({ ...draft, icon: e.target.value })} />
        <input className="input" placeholder="Option name *" value={draft.tier_name}
          onChange={(e) => setDraft({ ...draft, tier_name: e.target.value })} />
        <input className="input" placeholder="Short description" value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <input className="input" placeholder="Duration label (e.g. 3-5 Business Days)" value={draft.duration_label}
          onChange={(e) => setDraft({ ...draft, duration_label: e.target.value })} />
        <input className="input" type="number" min="0" step="0.01" placeholder="US → India (USD) *" value={draft.price}
          onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
        <input className="input" type="number" min="0" step="0.01" placeholder="India → US (INR, optional)" value={draft.price_inr}
          onChange={(e) => setDraft({ ...draft, price_inr: e.target.value })} />
      </div>
      <button type="button" onClick={submitAdd}
        className="mt-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600">
        + Add Delivery Option
      </button>
    </div>
  );
}

/* ── Intake fields editor ── */
function slugify(v) { return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); }

function FieldsEditor({ fields, onAdd, onUpdate, onDelete }) {
  const empty = { label: "", field_key: "", field_type: "text", optionsText: "" };
  const [draft, setDraft] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(empty);

  const buildPayload = (d) => ({
    label: d.label.trim(),
    field_key: d.field_key.trim() || slugify(d.label),
    field_type: d.field_type,
    options: d.field_type === "select"
      ? d.optionsText.split(",").map((s) => s.trim()).filter(Boolean)
      : null,
  });

  const submitAdd = async () => {
    if (!draft.label.trim()) { toast.error("Label is required."); return; }
    if (draft.field_type === "select" && !draft.optionsText.trim()) {
      toast.error("Select fields need at least one option (comma-separated)."); return;
    }
    await onAdd(buildPayload(draft));
    setDraft(empty);
  };

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-1">Shipment Details Form</h3>
      <p className="text-xs text-gray-400 mb-3">
        Questions the customer must answer for this service. "Select" with 4 or fewer options shows as clickable cards.
      </p>
      <div className="space-y-2 mb-4">
        {fields.map((f) => (
          <div key={f.id} className="border border-gray-100 rounded-lg p-3">
            {editingId === f.id ? (
              <div className="space-y-2">
                <input className="input" placeholder="Label" value={editDraft.label}
                  onChange={(e) => setEditDraft({ ...editDraft, label: e.target.value })} />
                <select className="input" value={editDraft.field_type}
                  onChange={(e) => setEditDraft({ ...editDraft, field_type: e.target.value })}>
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {editDraft.field_type === "select" && (
                  <input className="input" placeholder="Options, comma-separated"
                    value={editDraft.optionsText}
                    onChange={(e) => setEditDraft({ ...editDraft, optionsText: e.target.value })} />
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={async () => {
                    await onUpdate(f.id, buildPayload(editDraft));
                    setEditingId(null);
                  }} className="text-xs font-semibold text-brand-600">Save</button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-xs text-gray-400">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-gray-900">{f.label}</p>
                  <p className="text-xs text-gray-400">
                    {f.field_type}{f.options ? ` — ${f.options.join(", ")}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setEditingId(f.id) || setEditDraft({
                    label: f.label, field_key: f.field_key, field_type: f.field_type,
                    optionsText: (f.options || []).join(", "),
                  })} className="text-gray-400 hover:text-gray-700"><FiEdit2 size={14} /></button>
                  <button type="button" onClick={() => onDelete(f.id)}
                    className="text-gray-400 hover:text-red-600"><FiTrash2 size={14} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
        {fields.length === 0 && <p className="text-sm text-gray-400">No extra questions yet — sender/receiver details are always collected.</p>}
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add a question</p>
      <div className="space-y-2">
        <input className="input" placeholder="Label (e.g. Package size) *" value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        <select className="input" value={draft.field_type}
          onChange={(e) => setDraft({ ...draft, field_type: e.target.value })}>
          {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {draft.field_type === "select" && (
          <input className="input" placeholder="Options, comma-separated"
            value={draft.optionsText} onChange={(e) => setDraft({ ...draft, optionsText: e.target.value })} />
        )}
        {draft.field_type === "file" && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            File uploads aren't supported by the booking form yet.
          </p>
        )}
      </div>
      <button type="button" onClick={submitAdd}
        className="mt-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600">
        + Add Question
      </button>
    </div>
  );
}

/* ── Service editor (basic info + the four sub-editors) ── */
function ServiceEditor({ serviceId, onBack, onDeleted }) {
  const [service, setService] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    getAdminService(serviceId)
      .then((res) => {
        setService(res.data.service);
        setForm({
          name: res.data.service.name,
          slug: res.data.service.slug,
          badge_label: res.data.service.badge_label || "",
          tagline: res.data.service.tagline || "",
          description: res.data.service.description || "",
          icon: res.data.service.icon || "",
          enable_quantity: res.data.service.enable_quantity,
          is_active: res.data.service.is_active,
          display_order: res.data.service.display_order,
        });
      })
      .catch(() => toast.error("Could not load this service."));
  };

  useEffect(load, [serviceId]);

  if (!service || !form) return <div className="text-gray-400">Loading…</div>;

  const saveBasic = async () => {
    setSaving(true);
    try {
      await updateService(service.id, form);
      toast.success("Saved.");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${service.name}"? This removes all its coverage, restrictions, tiers and fields.`)) return;
    try {
      await deleteService(service.id);
      toast.success("Service deleted.");
      onDeleted();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not delete.");
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
        <FiArrowLeft size={14} /> Back to Services
      </button>

      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-900">Basic Info</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Icon (emoji)</label>
            <input className="input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          </div>
          <div>
            <label className="label">Badge label (optional)</label>
            <input className="input" placeholder="e.g. OFFICIAL CARRIER" value={form.badge_label}
              onChange={(e) => setForm({ ...form, badge_label: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Slug (URL)</label>
          <input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        </div>
        <div>
          <label className="label">Tagline (optional)</label>
          <input className="input" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <textarea className="input" rows={3} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-800">
          <input type="checkbox" checked={form.enable_quantity}
            onChange={(e) => setForm({ ...form, enable_quantity: e.target.checked })} />
          Let customers choose a quantity (e.g. number of boxes) — shows a stepper and multiplies the price
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-800">
          <input type="checkbox" checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          Published (visible to customers)
        </label>
        <div className="flex gap-3 pt-2">
          <button onClick={saveBasic} disabled={saving}
            className="px-4 py-2 rounded-full bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={remove} className="px-4 py-2 rounded-full border border-red-200 text-red-600 hover:bg-red-50">
            Delete Service
          </button>
        </div>
      </div>

      <BulletListEditor title="Included Coverage"
        items={service.coverage_items}
        onAdd={async (text) => { await addCoverageItem(service.id, { text, display_order: service.coverage_items.length }); load(); }}
        onUpdate={async (id, text) => { await updateCoverageItem(id, { text }); load(); }}
        onDelete={async (id) => { await deleteCoverageItem(id); load(); }} />

      <BulletListEditor title="Not Allowed"
        items={service.restrictions}
        onAdd={async (text) => { await addRestriction(service.id, { text, display_order: service.restrictions.length }); load(); }}
        onUpdate={async (id, text) => { await updateRestriction(id, { text }); load(); }}
        onDelete={async (id) => { await deleteRestriction(id); load(); }} />

      <TiersEditor tiers={service.pricing_tiers}
        onAdd={async (data) => { await addPricingTier(service.id, { ...data, display_order: service.pricing_tiers.length }); load(); }}
        onUpdate={async (id, data) => { await updatePricingTier(id, data); load(); }}
        onDelete={async (id) => { await deletePricingTier(id); load(); }}
        onAddSubservice={async (id, data) => { await addPricingSubservice(id, data); load(); }}
        onUpdateSubservice={async (id, data) => { await updatePricingSubservice(id, data); load(); }}
        onDeleteSubservice={async (id) => { await deletePricingSubservice(id); load(); }} />

      <FieldsEditor fields={service.fields}
        onAdd={async (data) => { await addField(service.id, { ...data, display_order: service.fields.length }); load(); }}
        onUpdate={async (id, data) => { await updateField(id, data); load(); }}
        onDelete={async (id) => { await deleteField(id); load(); }} />
    </div>
  );
}

/* ── Top-level list + create ── */
export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const load = () => {
    setLoading(true);
    listAdminServices()
      .then((res) => setServices(res.data.services))
      .catch(() => toast.error("Could not load services."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submitCreate = async () => {
    if (!newName.trim()) { toast.error("Name is required."); return; }
    try {
      const res = await createService({ name: newName.trim(), display_order: services.length });
      toast.success("Service created — now add its details below.");
      setCreating(false);
      setNewName("");
      load();
      setOpenId(res.data.service.id);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not create service.");
    }
  };

  if (openId) {
    return (
      <ServiceEditor serviceId={openId}
        onBack={() => { setOpenId(null); load(); }}
        onDeleted={() => { setOpenId(null); load(); }} />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500 text-sm mt-0.5">What customers can book, and what each service needs from them.</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="px-4 py-2 rounded-full bg-brand-500 text-white font-medium hover:bg-brand-600">
          + New Service
        </button>
      </div>

      {creating && (
        <div className="card mb-4 flex items-center gap-3">
          <input className="input flex-1" placeholder="Service name (e.g. Air Cargo)"
            value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitCreate(); }} autoFocus />
          <button onClick={submitCreate} className="px-4 py-2 rounded-lg bg-brand-500 text-white font-semibold">Create</button>
          <button onClick={() => { setCreating(false); setNewName(""); }} className="text-gray-400">Cancel</button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : services.length === 0 ? (
        <p className="text-gray-400">No services yet. Create one to get started.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {services.map((s) => (
            <button key={s.id} onClick={() => setOpenId(s.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{s.icon || "📦"}</span>
                <div>
                  <p className="font-medium text-gray-900">
                    {s.name}
                    {!s.is_active && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Draft</span>}
                  </p>
                  <p className="text-sm text-gray-400">/services/{s.slug}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
