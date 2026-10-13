import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../../api/client";
import StaticPageContent from "../../components/StaticPageContent";

const emptyForm = {
  id: null,
  title: "",
  slug: "",
  content: "",
  page_type: "standard",
  is_published: true,
  display_order: 0,
};

const PAGE_TYPE_LABELS = {
  standard: "Information",
  about: "About Us",
  faq: "FAQ",
};

export default function AdminPages() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // null = list view; object = editor
  const [form, setForm] = useState(emptyForm);
  const [editorTab, setEditorTab] = useState("edit");

  const loadPages = () => {
    setLoading(true);
    api
      .get("/admin/pages")
      .then((res) => setPages(res.data.pages))
      .catch(() => toast.error("Failed to load pages."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPages();
  }, []);

  const startCreate = () => {
    setForm(emptyForm);
    setEditorTab("edit");
    setEditing("new");
  };

  const startEdit = (page) => {
    setForm({
      id: page.id,
      title: page.title,
      slug: page.slug,
      content: page.content || "",
      page_type: page.page_type || "standard",
      is_published: page.is_published,
      display_order: page.display_order,
    });
    setEditorTab("edit");
    setEditing(page.id);
  };

  const cancel = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      if (editing === "new") {
        await api.post("/admin/pages", form);
        toast.success("Page created.");
      } else {
        await api.put(`/admin/pages/${form.id}`, form);
        toast.success("Page updated.");
      }
      cancel();
      loadPages();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save page.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (page) => {
    if (!window.confirm(`Delete "${page.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/pages/${page.id}`);
      toast.success("Page deleted.");
      loadPages();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete page.");
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-400">Loading…</div>;
  }

  if (editing) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {editing === "new" ? "New Page" : "Edit Page"}
        </h1>

        <div className="space-y-4 bg-white rounded-xl border border-gray-100 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="About Us"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug (URL path — leave blank to auto-generate)
            </label>
            <input
              className="input"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="about-us"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Page layout</label>
            <select className="input" value={form.page_type}
              onChange={(e) => setForm({ ...form, page_type: e.target.value })}>
              <option value="standard">Information page</option>
              <option value="about">About Us</option>
              <option value="faq">FAQ (expandable questions)</option>
            </select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700">
                Page content (Markdown)
              </label>
              <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
                {["edit", "preview"].map((tab) => (
                  <button key={tab} type="button" onClick={() => setEditorTab(tab)}
                    className={`rounded-md px-3 py-1.5 font-semibold capitalize ${
                      editorTab === tab ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900"
                    }`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            {editorTab === "edit" ? (
              <>
                <textarea
                  className="input min-h-[300px] font-mono text-sm"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder={form.page_type === "faq"
                    ? "### How do I book a shipment?\n\nChoose a direction, service, and delivery option..."
                    : "Write original page content here..."}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {form.page_type === "faq"
                    ? "Use ### before each question. Text below it becomes the expandable answer."
                    : "Use ## for section headings, **bold** for emphasis, and - for lists."}
                </p>
              </>
            ) : (
              <div className="max-h-[560px] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50">
                <StaticPageContent page={form} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              />
              Published (visible to customers)
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display order (lower shows first)
            </label>
            <input
              type="number"
              className="input w-32"
              value={form.display_order}
              onChange={(e) => setForm({ ...form, display_order: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-full bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={cancel}
              className="px-4 py-2 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
        <button
          onClick={startCreate}
          className="px-4 py-2 rounded-full bg-brand-500 text-white font-medium hover:bg-brand-600"
        >
          + New Page
        </button>
      </div>

      {pages.length === 0 ? (
        <p className="text-gray-400">No pages yet. Create one to get started.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {pages.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium text-gray-900">
                  {p.title}
                  <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    {PAGE_TYPE_LABELS[p.page_type] || PAGE_TYPE_LABELS.standard}
                  </span>
                  {!p.is_published && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      Draft
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400">/pages/{p.slug}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(p)}
                  className="px-3 py-1.5 rounded-full border border-gray-200 text-sm hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(p)}
                  className="px-3 py-1.5 rounded-full border border-red-200 text-red-600 text-sm hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
