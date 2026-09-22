import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiPlus, FiMinus, FiShoppingCart, FiSearch,
  FiX, FiCheckCircle, FiTruck as FiDelivery, FiPackage, FiCalendar, FiClock,
  FiEye, FiEyeOff,
} from "react-icons/fi";
import {
  getProducts,
  getCategories,
  getAvailability,
} from "../../api/products";
import { createOrder } from "../../api/orders";
import { getAddresses } from "../../api/customers";
import { useAuth } from "../../context/AuthContext";
import { useBranding } from "../../context/BrandingContext";
import { resolveMediaUrl } from "../../utils/media";

const TIME_SLOTS = ["Morning 9-12", "Afternoon 12-4", "Evening 4-7"];

const deliveryFeeFor = (zip) => {
  if (!zip) return 2.99;
  if (zip === "95330") return 2.99;
  if (zip === "95391") return 3.99;
  return 2.99;
};

const todayISO = () => new Date().toISOString().split("T")[0];

// null/undefined stock_quantity means "untracked" (always available)
// — same convention as ShopPage.jsx and the backend's own
// availability checks. Only an explicit value <= 0 counts as out of
// stock.
function isOutOfStock(p) {
  return p.stock_quantity != null && p.stock_quantity <= 0;
}
const LOW_STOCK_THRESHOLD = 5;

export default function Home() {
  const navigate = useNavigate();
  const { settings } = useBranding();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cart") || "{}"); } catch { return {}; }
  });
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  // Default OFF, same reasoning as ShopPage.jsx: hides out-of-stock
  // items unless explicitly toggled on.
  const [showOutOfStock, setShowOutOfStock] = useState(false);

  useEffect(() => {
    getCategories()
      .then((r) => setCategories(r.data.categories))
      .catch(() => toast.error("Failed to load categories."));
    getProducts()
      .then((r) => setProducts(r.data.products))
      .catch(() => toast.error("Failed to load products."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // Debounced multilingual server search (name + Telugu/Hindi/Tamil aliases).
  // Enter also force-triggers an immediate search (see handleSearchKeyDown
  // below) — without it, Enter did nothing at all (no <form>, no submit),
  // so typing fast and hitting Enter could look like "nothing happened"
  // while the 250ms debounce (plus network latency) was still catching up.
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

  const updateQty = (id, delta) =>
    setCart((prev) => {
      const next = (prev[id] || 0) + delta;
      const copy = { ...prev };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Banner — same settings.hero_banner_url as the guest shop/
          landing pages, so setting it once in Admin → Branding
          applies everywhere. Rounded card here rather than edge-to-
          edge, since this page lives inside CustomerLayout's padded
          content area, not full-bleed like the guest pages. */}
      {settings.hero_banner_url && (
        <div className="relative rounded-2xl overflow-hidden mb-6">
          <img
            src={settings.hero_banner_url}
            alt=""
            className="w-full h-auto object-contain"
            onError={(e) => { e.currentTarget.parentElement.style.display = "none"; }}
          />
          {(settings.hero_title || settings.hero_subtitle) && (
            <div className="absolute inset-0 bg-black/30 flex flex-col items-center
                            justify-center text-center px-4">
              {settings.hero_title && (
                <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-sm">
                  {settings.hero_title}
                </h2>
              )}
              {settings.hero_subtitle && (
                <p className="text-sm text-white/90 mt-1.5 max-w-md drop-shadow-sm">
                  {settings.hero_subtitle}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back 👋</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Fresh cuts, delivered in Dublin, San Ramon, Pleasanton, Livermore, Lathrop &amp; Manteca
          </p>
        </div>
        <button
          onClick={() => setShowCheckout(true)}
          className="relative flex items-center gap-2 bg-white border border-gray-200
                     hover:border-brand-400 hover:bg-brand-50 text-gray-700 font-semibold
                     px-4 py-2.5 rounded-xl transition-all shadow-sm"
          disabled={cartCount === 0}>
          <FiShoppingCart size={16} className={cartCount > 0 ? "text-brand-600" : "text-gray-400"} />
          {cartCount > 0 ? `View cart (${cartCount})` : "My cart"}
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-brand-500 text-white text-[10px] font-bold
                             w-5 h-5 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
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
        /* Category pills */
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3 -mx-1 px-1">
          {catNames.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${category === c
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-gray-900"}`}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Stock filter toggle */}
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

      {/* Product grid */}
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
              !outOfStock && p.stock_quantity != null && p.stock_quantity <= LOW_STOCK_THRESHOLD;

            return (
              <div key={p.id} className={`bg-white rounded-2xl border shadow-sm
                                         hover:shadow-md hover:-translate-y-0.5 transition-all
                                         p-4 flex flex-col
                                         ${outOfStock ? "border-gray-100 opacity-60" : "border-gray-100"}`}>
                <div
                  className="cursor-pointer flex-1"
                  onClick={() => navigate(`/account/products/${p.id}`)}>
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
                    {/* Veg / non-veg mark */}
                    <span
                      className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center flex-shrink-0
                        ${p.diet === "veg" ? "border-green-500" : "border-red-500"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full
                        ${p.diet === "veg" ? "bg-green-500" : "bg-red-500"}`} />
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-gray-900 leading-snug">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.category} · {p.unit}</p>

                  {search.trim() && p.matched_term && (
                    <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-gray-500">
                      Matched
                      <span className="font-semibold text-brand-600">"{p.matched_term}"</span>
                    </p>
                  )}

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
                    ${Number(p.discounted_price ?? p.price).toFixed(2)}
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

      {showCheckout && (
        <CheckoutModal
          cart={cart}
          products={products}
          onClose={() => setShowCheckout(false)}
          onClearCart={() => setCart({})}
          onUpdateQty={updateQty}
        />
      )}
    </div>
  );
}

/* ── Checkout modal ─────────────────────────────────────────── */
function CheckoutModal({ cart, products, onClose, onClearCart, onUpdateQty}) {
  const { customer } = useAuth();
  const navigate = useNavigate();

  const [orderType, setOrderType] = useState(customer?.default_order_type || "delivery");
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);

  // getAvailability() is passed orderType, and the backend computes
  // earliest_delivery_date correctly per fulfillment type (pickup skips
  // min_lead_days entirely). Re-fetches whenever orderType changes —
  // see the effect below.
  const [availabilityByProduct, setAvailabilityByProduct] = useState({});

  const items = Object.entries(cart)
    .map(([id, qty]) => {
      const p = products.find((x) => x.id === Number(id));
      return p ? { ...p, quantity: qty, line_total: Number(p.discounted_price ?? p.price) * qty } : null;
    })
    .filter(Boolean);

  const cartAvailabilityKey = Object.entries(cart)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([id, qty]) => `${id}:${qty}`)
    .join(",");

  useEffect(() => {
    if (!items.length) {
      setAvailabilityByProduct({});
      return;
    }

    let cancelled = false;

    const loadAvailability = async () => {
      const next = {};

      await Promise.all(
        items.map(async (item) => {
          next[item.id] = {
            status: "loading",
            data: null,
          };

          try {
            // IMPORTANT:
            // Send both the actual quantity requested AND the
            // current orderType, so the backend computes
            // earliest_delivery_date with the correct lead-time
            // rule (pickup skips min_lead_days entirely).
            const res = await getAvailability(
              item.id,
              item.quantity,
              orderType
            );

            if (cancelled) return;

            const data = res.data;

            next[item.id] = {
              status: data.earliest_delivery_date
                ? "ready"
                : "unavailable",
              data,
            };
          } catch (error) {
            if (cancelled) return;

            const status = error.response?.status;

            if (status === 409) {
              next[item.id] = {
                status: "unavailable",
                data: error.response?.data || null,
              };
            } else {
              next[item.id] = {
                status: "error",
                data: null,
              };
            }
          }
        })
      );

      if (cancelled) return;

      setAvailabilityByProduct(next);
    };

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [cartAvailabilityKey, orderType]);

  useEffect(() => {
    getAddresses()
      .then((res) => {
        const list = res.data.addresses || [];
        setAddresses(list);
        const def = list.find((a) => a.is_default) || list[0];
        if (def) setAddressId(def.id);
      })
      .catch(() => setAddresses([]));
  }, []);

  const availabilityBlockedItems = items.filter((item) => {
    const availability = availabilityByProduct[item.id];

    return (
      !availability ||
      availability.status !== "ready" ||
      !availability.data?.earliest_delivery_date
    );
  });

  // Whole-cart earliest deliverable/pickup-able date: the LATEST of
  // each item's earliest date, since every item must be
  // available on the chosen date.
  const earliestCartDeliveryDate = Object.values(
    availabilityByProduct
  )
    .map((a) => a.data?.earliest_delivery_date)
    .filter(Boolean)
    .sort()
    .at(-1) || "";

  // Whenever the cart's earliest date moves forward (new item added,
  // or orderType switched and pickup/delivery dates differ), snap the
  // selected date up to it if it's now earlier than what's achievable.
  useEffect(() => {
    if (
      earliestCartDeliveryDate &&
      (!date || date < earliestCartDeliveryDate)
    ) {
      setDate(earliestCartDeliveryDate);
    }
  }, [earliestCartDeliveryDate, date]);

  const selectedAddress = addresses.find((a) => a.id === Number(addressId));
  const deliveryFee = orderType === "delivery"
    ? deliveryFeeFor(selectedAddress?.address?.zip_code)
    : 0;
  const subtotal = items.reduce((s, i) => s + i.line_total, 0);
  const total = subtotal + deliveryFee;

  const placeOrder = async () => {
    if (orderType === "delivery" && !addressId) {
      return toast.error("Please choose a delivery address.");
    }

    if (availabilityBlockedItems.length > 0) {
      return toast.error(
        "Please resolve product availability before placing the order."
      );
    }

    if (
      date &&
      earliestCartDeliveryDate &&
      date < earliestCartDeliveryDate
    ) {
      return toast.error(
        `The earliest available date is ${earliestCartDeliveryDate}.`
      );
    }

    setPlacing(true);

    try {
      const res = await createOrder({
        items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
        order_type: orderType,
        address_id: orderType === "delivery" ? addressId : null,
        requested_date: date || null,
        requested_time_slot: slot || null,
      });
      setPlaced(res.data.order);
      onClearCart();
      toast.success(`Order ${res.data.order.order_number} placed!`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not place order.");
    } finally {
      setPlacing(false);
    }
  };

  if (placed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
                          bg-green-50 text-green-600 mb-4">
            <FiCheckCircle size={28} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Order placed!</h3>
          <p className="text-gray-500 text-sm">
            Your order <span className="font-semibold text-gray-800">{placed.order_number}</span> is
            {placed.order_type === "delivery" ? " being prepared for delivery." : " ready for pickup."}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button className="btn-primary" onClick={() => navigate("/account/orders")}>
              View My Orders
            </button>
            <button className="btn-secondary" onClick={onClose}>
              Keep Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">Checkout</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Items */}
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Your Items ({items.length})
                </p>

                <div className="space-y-2">
                  {items.map((i) => {
                    const availability = availabilityByProduct[i.id];

                    return (
                      <div
                        key={i.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="flex items-center gap-2 text-gray-800">
                            <span className="text-lg">{i.emoji || "🛒"}</span>
                            <span className="truncate">{i.name}</span>
                          </span>

                          {/* Availability status */}
                          {availability?.status === "loading" && (
                            <span className="text-xs text-gray-400 ml-7 mt-0.5">
                              Checking availability…
                            </span>
                          )}

                          {availability?.status === "ready" && (
                            <span className="text-xs text-gray-500 ml-7 mt-0.5">
                              {availability.data.in_stock_for_quantity !== false ? (
                                <>
                                  Available for {i.quantity}
                                </>
                              ) : (
                                <>
                                  Only {availability.data.stock_quantity ?? 0} in stock
                                </>
                              )}

                              {" · "}
                              {orderType === "pickup" ? "Earliest pickup: " : "Earliest: "}
                              {availability.data.earliest_delivery_date}
                            </span>
                          )}

                          {availability?.status === "unavailable" && (
                            <span className="text-xs text-red-500 ml-7 mt-0.5">
                              Currently unavailable — no restock scheduled
                            </span>
                          )}

                          {availability?.status === "error" && (
                            <span className="text-xs text-red-500 ml-7 mt-0.5">
                              Could not check availability
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 ml-3">
                          <div className="flex items-center gap-1 bg-brand-500 text-white rounded-full px-1.5 py-1">
                            <button
                              onClick={() => onUpdateQty(i.id, -1)}
                              className="p-1 hover:bg-brand-600 rounded-full"
                            >
                              <FiMinus size={12} />
                            </button>

                            <span className="text-xs font-bold w-4 text-center">
                              {i.quantity}
                            </span>

                            <button
                              onClick={() => onUpdateQty(i.id, 1)}
                              className="p-1 hover:bg-brand-600 rounded-full"
                            >
                              <FiPlus size={12} />
                            </button>
                          </div>

                          <span className="font-semibold text-gray-900">
                            ${i.line_total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
          {/* Order type */}
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Fulfillment
            </p>
            <div className="flex gap-3">
              {[
                { key: "delivery", label: "Delivery", icon: <FiDelivery size={15} /> },
                { key: "pickup", label: "Pickup", icon: <FiPackage size={15} /> },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setOrderType(t.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium capitalize transition-colors
                    ${orderType === t.key
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Address (delivery only) */}
          {orderType === "delivery" && (
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Delivery Address
              </p>
              {addresses.length === 0 ? (
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-500">
                  No saved addresses.{" "}
                  <button
                    className="text-brand-600 font-semibold hover:underline"
                    onClick={() => { onClose(); navigate("/account/addresses"); }}>
                    Add one →
                  </button>
                </div>
              ) : (
                <select
                  className="input"
                  value={addressId}
                  onChange={(e) => setAddressId(e.target.value)}>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} — {a.address?.address_line1}, {a.address?.city} {a.address?.zip_code}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Scheduling (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1.5">
                <FiCalendar size={13} className="text-gray-400" />
                {orderType === "delivery" ? "Delivery date" : "Pickup date"}
              </label>
              <input
                type="date"
                className="input"
                min={earliestCartDeliveryDate || todayISO()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label flex items-center gap-1.5">
                <FiClock size={13} className="text-gray-400" /> Time slot
              </label>
              <select className="input" value={slot} onChange={(e) => setSlot(e.target.value)}>
                <option value="">Any time</option>
                {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{orderType === "delivery" ? "Delivery fee" : "Pickup"}</span>
              <span>{orderType === "delivery" ? `$${deliveryFee.toFixed(2)}` : "Free"}</span>
            </div>
            <div className="flex justify-between text-gray-900 font-bold pt-1.5 border-t border-gray-200">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <button
              className="btn-primary w-full flex items-center justify-center gap-2"
              onClick={placeOrder}
              disabled={
                placing ||
                (orderType === "delivery" && !addressId) ||
                availabilityBlockedItems.length > 0
              }
            >
              <FiShoppingCart size={15} />
              {placing ? "Placing order…" : `Place order · $${total.toFixed(2)}`}
            </button>
        </div>
      </div>
    </div>
  );
}