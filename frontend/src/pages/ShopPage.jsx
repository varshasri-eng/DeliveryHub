import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiPlus, FiMinus, FiShoppingCart, FiSearch, FiX, FiEye, FiEyeOff,
} from "react-icons/fi";
import { getProducts, getCategories } from "../api/products";
import { useBranding } from "../context/BrandingContext";
import { resolveMediaUrl } from "../utils/media";

// Dispatched after every cart mutation so GuestLayout's header badge
// (which lives outside this component) stays in sync — see
// GuestLayout.jsx's "s2h-cart-updated" listener.
function notifyCartUpdated() {
  window.dispatchEvent(new Event("s2h-cart-updated"));
}

// null/undefined stock_quantity means "untracked" (always available)
// — same convention used throughout the backend (delivery.py,
// orders.py's availability checks, etc.). Only an explicit value
// <= 0 counts as out of stock.
function isOutOfStock(p) {
  return p.stock_quantity != null && p.stock_quantity <= 0;
}
const LOW_STOCK_THRESHOLD = 5;

export default function ShopPage() {
  const navigate = useNavigate();
  const { settings } = useBranding();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("s2h_guest_cart") || "{}"); } catch { return {}; }
  });
  const [category, setCategory] = useState(searchParams.get("category") || "All");
  const [search, setSearch] = useState("");
  // Default OFF — hides out-of-stock items unless explicitly toggled
  // on, since "a lot of items have no stock" was the actual complaint;
  // showing them by default would keep surfacing the same problem.
  const [showOutOfStock, setShowOutOfStock] = useState(false);

  useEffect(() => {
    getCategories()
      .then((r) => setCategories(r.data.categories))
      .catch(() => {});
    getProducts()
      .then((r) => setProducts(r.data.products))
      .catch(() => toast.error("Failed to load products."))
      .finally(() => setLoading(false));
  }, []);

  // Picks up ?category= from GuestLayout's category nav links (or a
  // direct URL) whenever it changes, e.g. clicking a category link
  // while already on /shop.
  useEffect(() => {
    const fromUrl = searchParams.get("category");
    if (fromUrl && fromUrl !== category) setCategory(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem("s2h_guest_cart", JSON.stringify(cart));
  }, [cart]);

  // Debounced multilingual server search. Enter also force-triggers an
  // immediate search (see handleSearchKeyDown below) — without it,
  // Enter did nothing at all (no <form>, no submit), so typing fast
  // and hitting Enter could look like "nothing happened" while the
  // 250ms debounce (plus network latency) was still catching up.
  const [searchResults, setSearchResults] = useState(null);
  const searchTimeoutRef = useRef(null);

  const runSearch = (q) => {
    if (!q) { setSearchResults(null); return; }
    getProducts({ search: q })
      .then((r) => setSearchResults(r.data.products))
      .catch(() => setSearchResults([]));
  };

  useEffect(() => {
    const q = search.trim();
    if (!q) { setSearchResults(null); return; }
    searchTimeoutRef.current = setTimeout(() => runSearch(q), 250);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [search]);

  const handleSearchKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    clearTimeout(searchTimeoutRef.current);
    runSearch(search.trim());
  };

  const catNames = useMemo(
    () => ["All", ...categories.map((c) => c.name)],
    [categories]
  );

  const list = search.trim() ? (searchResults ?? []) : products;
  const filtered = list.filter((p) => {
    if (category !== "All" && p.category !== category) return false;
    if (!showOutOfStock && isOutOfStock(p)) return false;
    return true;
  });

  const outOfStockCount = list.filter(
    (p) => (category === "All" || p.category === category) && isOutOfStock(p)
  ).length;

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = products.find((x) => x.id === Number(id));
    return sum + (p ? Number(p.price) * qty : 0);
  }, 0);

  const updateQty = (id, delta) =>
    setCart((prev) => {
      const next = (prev[id] || 0) + delta;
      const copy = { ...prev };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      notifyCartUpdated();
      return copy;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero banner ──────────────────────────────────
          Only rendered when an admin has actually set one via
          Branding settings — no banner, no empty gap. */}
      {settings.hero_banner_url && (
        <div className="relative">
          <img
            src={settings.hero_banner_url}
            alt=""
            className="w-full h-48 sm:h-64 object-cover"
            onError={(e) => { e.currentTarget.parentElement.style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-black/30 flex flex-col items-center
                          justify-center text-center px-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm">
              {settings.hero_title}
            </h1>
            {settings.hero_subtitle && (
              <p className="text-sm sm:text-base text-white/90 mt-2 max-w-xl drop-shadow-sm">
                {settings.hero_subtitle}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Search ────────────────────────────────────── */}
        <div className="relative mb-3">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl border border-gray-200 bg-white
                       shadow-sm text-sm placeholder-gray-400
                       focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500
                       transition-all"
            placeholder="Search in English, Telugu, Hindi or Tamil…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full
                         bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center
                         justify-center transition-colors"
              aria-label="Clear search">
              <FiX size={14} />
            </button>
          )}
        </div>

        {search.trim() ? (
          <p className="text-xs text-gray-400 mb-4">
            Showing results for <span className="text-gray-600 font-semibold">"{search}"</span> —
            try <span className="text-brand-600 font-medium">పసుపు</span>,{" "}
            <span className="text-brand-600 font-medium">हल्दी</span> or{" "}
            <span className="text-brand-600 font-medium">மஞ்சள்</span>
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3 -mx-1 px-1">
            {catNames.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCategory(c);
                  setSearchParams(c === "All" ? {} : { category: c });
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${category === c
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-gray-900"}`}>
                {c}
              </button>
            ))}
          </div>
        )}

        {/* ── Stock filter toggle ──────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setShowOutOfStock((v) => !v)}
            className="flex items-center gap-2 text-xs font-medium text-gray-500
                       hover:text-gray-700 transition-colors">
            {showOutOfStock ? <FiEyeOff size={14} /> : <FiEye size={14} />}
            {showOutOfStock ? "Hide out-of-stock items" : "Show out-of-stock items"}
            {!showOutOfStock && outOfStockCount > 0 && (
              <span className="bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">
                {outOfStockCount} hidden
              </span>
            )}
          </button>
        </div>

        {/* ── Products ──────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                <div className="w-14 h-14 rounded-xl bg-gray-100 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
                <div className="h-5 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-gray-600 font-semibold">No products found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search.trim()
                ? "Try a different search — maybe in another language?"
                : !showOutOfStock && outOfStockCount > 0
                ? "Everything in this category is currently out of stock."
                : "Try a different category"}
            </p>
            {!showOutOfStock && outOfStockCount > 0 && (
              <button
                onClick={() => setShowOutOfStock(true)}
                className="mt-3 text-sm font-semibold text-brand-600 hover:underline">
                Show out-of-stock items anyway
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => {
              const qty = cart[p.id] || 0;
              const outOfStock = isOutOfStock(p);
              const lowStock =
                !outOfStock &&
                p.stock_quantity != null &&
                p.stock_quantity <= LOW_STOCK_THRESHOLD;

              return (
                <div key={p.id} className={`bg-white rounded-2xl border shadow-sm
                                           hover:shadow-md hover:-translate-y-0.5 transition-all
                                           p-4 flex flex-col
                                           ${outOfStock ? "border-gray-100 opacity-60" : "border-gray-100"}`}>
                  <div
                    className="cursor-pointer flex-1"
                    onClick={() => navigate(`/shop/${p.id}`)}>
                    <div className="flex items-start justify-between mb-3">
                      <span className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100
                                       flex items-center justify-center text-3xl overflow-hidden">
                        {p.image_url ? (
                          <img
                            src={resolveMediaUrl(p.image_url)}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          p.emoji || "🛒"
                        )}
                      </span>
                      <span
                        className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center flex-shrink-0
                          ${p.diet === "veg" ? "border-green-500" : "border-red-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full
                          ${p.diet === "veg" ? "bg-green-500" : "bg-red-500"}`} />
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.category} · {p.unit}</p>
                    {outOfStock ? (
                      <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5
                                       rounded-full bg-red-50 text-red-600">
                        Out of stock
                      </span>
                    ) : lowStock && (
                      <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5
                                       rounded-full bg-amber-50 text-amber-700">
                        Only {p.stock_quantity} left
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <p className="font-bold text-gray-900">
                      ${Number(p.price).toFixed(2)}
                    </p>
                    {outOfStock ? (
                      <span className="text-xs font-semibold text-gray-400 px-3 py-1.5">
                        Unavailable
                      </span>
                    ) : qty === 0 ? (
                      <button
                        onClick={() => updateQty(p.id, 1)}
                        className="flex items-center gap-1 text-xs font-semibold text-brand-600
                                   bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-full transition-colors">
                        <FiPlus size={13} /> Add
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-brand-500 text-white rounded-full px-1.5 py-1">
                        <button onClick={() => updateQty(p.id, -1)}
                          className="p-1 hover:bg-brand-600 rounded-full transition-colors">
                          <FiMinus size={12} />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{qty}</span>
                        <button onClick={() => updateQty(p.id, 1)}
                          className="p-1 hover:bg-brand-600 rounded-full transition-colors">
                          <FiPlus size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sticky cart bar ─────────────────────────────── */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200
                        shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 sm:px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{cartCount} item{cartCount !== 1 ? "s" : ""} in cart</p>
              <p className="text-xs text-gray-500">Subtotal: <span className="font-semibold">${cartTotal.toFixed(2)}</span></p>
            </div>
            <button
              onClick={() => navigate("/checkout")}
              className="btn-primary !px-6 !py-2.5 rounded-full flex items-center gap-2 text-sm">
              <FiShoppingCart size={15} />
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}