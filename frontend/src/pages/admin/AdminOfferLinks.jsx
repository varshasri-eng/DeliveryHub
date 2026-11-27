import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiCopy, FiEdit2, FiTrash2 } from "react-icons/fi";
import { listOfferCodes } from "../../api/admin";
import { getServices } from "../../api/services";
import { createOfferLink, deleteOfferLink, listOfferLinks, updateOfferLink } from "../../api/offerLinks";
import { resolveMediaUrl } from "../../utils/media";

const EMPTY = {
  offer_code_id: "", service_slug: "", headline: "", show_popup: false,
  popup_start: "", popup_end: "", is_active: true,
};

// ISO (UTC) -> value for <input type="datetime-local"> in the browser's zone
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const toIso = (local) => (local ? new Date(local).toISOString() : "");

export default function AdminOfferLinks() {
  const [links, setLinks] = useState([]);
  const [codes, setCodes] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [file, setFile] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => listOfferLinks().then((r) => setLinks(r.data.offer_links || [])).catch(() => toast.error("Could not load offer links."));

  useEffect(() => {
    load();
    listOfferCodes().then((r) => setCodes(r.data.offer_codes || [])).catch(() => {});
    getServices().then((r) => setServices(r.data.services || [])).catch(() => {});
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const reset = () => {
    setForm(EMPTY); setEditingId(null); setFile(null); setExistingImage(null); setRemoveImage(false);
  };

  const edit = (link) => {
    setEditingId(link.id);
    setForm({
      offer_code_id: String(link.offer_code_id), service_slug: link.service_slug,
      headline: link.headline || "", show_popup: link.show_popup,
      popup_start: toLocalInput(link.popup_start), popup_end: toLocalInput(link.popup_end),
      is_active: link.is_active,
    });
    setExistingImage(link.image_url); setFile(null); setRemoveImage(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (event) => {
    event.preventDefault();
    const data = new FormData();
    data.append("offer_code_id", form.offer_code_id);
    data.append("service_slug", form.service_slug);
    data.append("headline", form.headline);
    data.append("show_popup", form.show_popup ? "true" : "false");
    data.append("is_active", form.is_active ? "true" : "false");
    data.append("popup_start", toIso(form.popup_start));
    data.append("popup_end", toIso(form.popup_end));
    if (file) data.append("image", file);
    if (removeImage && !file) data.append("remove_image", "true");
    setSaving(true);
    try {
      if (editingId) await updateOfferLink(editingId, data);
      else await createOfferLink(data);
      toast.success(editingId ? "Offer link updated." : "Offer link created.");
      reset();
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not save the offer link.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (link) => {
    if (!window.confirm(`Delete the link for ${link.code}?`)) return;
    try { await deleteOfferLink(link.id); toast.success("Deleted."); load(); }
    catch { toast.error("Could not delete."); }
  };

  const copy = async (link) => {
    const url = `${window.location.origin}${link.link}`;
    try { await navigator.clipboard.writeText(url); toast.success("Link copied."); }
    catch { window.prompt("Copy this link:", url); }
  };

  const preview = file ? URL.createObjectURL(file) : (!removeImage && existingImage ? resolveMediaUrl(existingImage) : null);
  const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm";

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-extrabold text-gray-900">Offer links and banner</h1>
      <p className="mt-1 text-sm text-gray-500">
        A link opens one service with the offer code already applied. Add an image to also show it as a banner under the hero on the landing page and customer home.
        Only the newest active banner is shown at a time. Clicking the image opens the link.
      </p>

      <form onSubmit={save} className="mt-6 grid gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:grid-cols-2">
        <label className="text-sm font-semibold text-gray-700">Offer code
          <select required value={form.offer_code_id} onChange={set("offer_code_id")} className={`${input} mt-1`}>
            <option value="">Choose…</option>
            {codes.map((c) => <option key={c.id} value={c.id}>{c.code} ({c.discount_percent}% off){c.is_active ? "" : " – inactive"}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-gray-700">Service
          <select required value={form.service_slug} onChange={set("service_slug")} className={`${input} mt-1`}>
            <option value="">Choose…</option>
            {services.map((s) => <option key={s.slug} value={s.slug}>{s.name} ({s.route_direction === "IN_TO_US" ? "India → USA" : "USA → India"})</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-gray-700 md:col-span-2">Banner headline (optional)
          <input value={form.headline} onChange={set("headline")} maxLength={150} placeholder="e.g. Diwali special: 10% off document shipping" className={`${input} mt-1`} />
        </label>

        <div className="md:col-span-2">
          <p className="text-sm font-semibold text-gray-700">Banner image</p>
          <div className="mt-1 flex flex-wrap items-center gap-4">
            <input type="file" accept="image/png,image/jpeg,image/webp"
              onChange={(e) => { setFile(e.target.files?.[0] || null); setRemoveImage(false); }}
              className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-800" />
            {existingImage && !file && (
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} /> Remove current image
              </label>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-400">PNG, JPG or WebP, up to 5 MB. A wide image around 1600×500 px works best.</p>
          {preview && <img src={preview} alt="" className="mt-3 max-h-48 rounded-xl border border-gray-100" />}
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <input type="checkbox" checked={form.show_popup} onChange={set("show_popup")} /> Show as banner on landing page and customer home
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <input type="checkbox" checked={form.is_active} onChange={set("is_active")} /> Link active
        </label>
        <label className="text-sm font-semibold text-gray-700">Banner starts (optional)
          <input type="datetime-local" value={form.popup_start} onChange={set("popup_start")} className={`${input} mt-1`} />
        </label>
        <label className="text-sm font-semibold text-gray-700">Banner ends (optional)
          <input type="datetime-local" value={form.popup_end} onChange={set("popup_end")} className={`${input} mt-1`} />
        </label>

        <div className="flex gap-3 md:col-span-2">
          <button disabled={saving} className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60">
            {saving ? "Saving…" : editingId ? "Update link" : "Create link"}
          </button>
          {editingId && <button type="button" onClick={reset} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700">Cancel</button>}
        </div>
      </form>

      <div className="mt-8 space-y-3">
        {links.length === 0 && <p className="text-sm text-gray-400">No offer links yet.</p>}
        {links.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            {l.image_url
              ? <img src={resolveMediaUrl(l.image_url)} alt="" className="h-16 w-16 rounded-lg object-cover" />
              : <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-50 text-xs text-gray-400">No image</div>}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900">{l.code} · {l.discount_percent}% off → {l.service_slug}</p>
              <p className="truncate text-xs text-gray-500">{window.location.origin}{l.link}</p>
              <p className="mt-1 text-xs text-gray-500">
                {l.is_active ? "Active" : "Inactive"} · {l.show_popup ? "Banner on" : "No banner"}
                {l.popup_start || l.popup_end ? ` · ${l.popup_start ? new Date(l.popup_start).toLocaleDateString() : "now"} to ${l.popup_end ? new Date(l.popup_end).toLocaleDateString() : "no end"}` : ""}
              </p>
            </div>
            <button onClick={() => copy(l)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold"><FiCopy /> Copy link</button>
            <button onClick={() => edit(l)} className="rounded-lg border border-gray-200 p-2 text-gray-600" aria-label="Edit"><FiEdit2 /></button>
            <button onClick={() => remove(l)} className="rounded-lg border border-red-100 p-2 text-red-600" aria-label="Delete"><FiTrash2 /></button>
          </div>
        ))}
      </div>
    </div>
  );
}