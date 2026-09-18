import { useNavigate } from "react-router-dom";
import {
  FiShoppingCart, FiTruck, FiShield, FiClock,
  FiSearch, FiPackage, FiStar,
} from "react-icons/fi";
import { useBranding } from "../context/BrandingContext";

const FEATURES = [
  { icon: <FiTruck size={22} />, title: "Fast Delivery", desc: "Same-day delivery in Lathrop & Mountain House" },
  { icon: <FiSearch size={22} />, title: "Multilingual Search", desc: "Search in English, Telugu, Hindi or Tamil" },
  { icon: <FiShield size={22} />, title: "Fresh Guarantee", desc: "Farm-fresh groceries, quality checked" },
  { icon: <FiClock size={22} />, title: "Flexible Slots", desc: "Choose morning, afternoon or evening delivery" },
];

const CATEGORIES = [
  { emoji: "🐐", name: "Goat" },
  { emoji: "🍗", name: "Chicken" },
  { emoji: "🥩", name: "Lamb" },
  { emoji: "🐟", name: "Seafood" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { settings } = useBranding();

  return (
    <div className="bg-white">
      {/* ── Hero ────────────────────────────────────────── */}
      {settings.hero_banner_url ? (
        /* Banner-image hero — matches the reference site's layout
           (full-width promo image with title/subtitle/CTA overlaid).
           Only rendered when an admin has actually set one via
           Branding settings; falls back to the gradient/text hero
           below otherwise. */
        <section className="relative">
          <img
            src={settings.hero_banner_url}
            alt=""
            className="w-full h-92 sm:h-96 object-cover"
            onError={(e) => { e.currentTarget.parentElement.style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-black/35 flex flex-col items-center
                          justify-center text-center px-4">
            <div className="inline-flex items-center gap-2 bg-white/90 text-brand-700
                            text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <FiPackage size={13} />
              Serving Lathrop & Mountain House
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white drop-shadow-sm
                           leading-[1.1] tracking-tight max-w-3xl">
              {settings.hero_title}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-white/90 leading-relaxed max-w-xl drop-shadow-sm">
              {settings.hero_subtitle}
            </p>
            <div className="mt-7 flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => navigate("/shop")}
                className="btn-primary text-base !px-7 !py-3 rounded-full flex items-center gap-2 shadow-lg">
                <FiShoppingCart size={18} />
                {settings.hero_cta || "Start shopping"}
              </button>
              <button
                onClick={() => navigate("/login")}
                className="bg-white/90 hover:bg-white text-gray-900 font-semibold
                           text-base px-7 py-3 rounded-full transition-colors">
                Sign in to your account
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-brand-100" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-brand-100/70 text-brand-700
                            text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <FiPackage size={13} />
              Serving Lathrop & Mountain House
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900
                           leading-[1.1] tracking-tight">
              {settings.hero_title}
            </h1>
            <p className="mt-5 text-lg text-gray-500 leading-relaxed max-w-lg">
              {settings.hero_subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/shop")}
                className="btn-primary text-base !px-7 !py-3 rounded-full flex items-center gap-2 shadow-lg shadow-brand-500/20">
                <FiShoppingCart size={18} />
                {settings.hero_cta || "Start shopping"}
              </button>
              <button
                onClick={() => navigate("/login")}
                className="btn-secondary text-base !px-7 !py-3 rounded-full">
                Sign in to your account
              </button>
            </div>
          </div>

          {/* floating emoji cards */}
          <div className="hidden lg:block absolute right-8 top-12 w-80 h-80">
            <div className="absolute top-0 right-12 w-20 h-20 bg-white rounded-2xl shadow-lg
                            flex items-center justify-center text-4xl rotate-6 animate-bounce
                            [animation-duration:3s]">
              🥬
            </div>
            <div className="absolute top-24 right-0 w-18 h-18 bg-white rounded-2xl shadow-lg
                            flex items-center justify-center text-3xl -rotate-3 animate-bounce
                            [animation-duration:4s] [animation-delay:0.5s]">
              🌶️
            </div>
            <div className="absolute top-48 right-16 w-16 h-16 bg-white rounded-2xl shadow-lg
                            flex items-center justify-center text-3xl rotate-12 animate-bounce
                            [animation-duration:3.5s] [animation-delay:1s]">
              🍎
            </div>
            <div className="absolute bottom-4 right-8 w-14 h-14 bg-white rounded-2xl shadow-lg
                            flex items-center justify-center text-2xl -rotate-6 animate-bounce
                            [animation-duration:4s] [animation-delay:0.3s]">
              🫙
            </div>
          </div>
        </div>
        </section>
      )}

      {/* ── Categories ──────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
          Shop by category
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.name}
              onClick={() => navigate("/shop")}
              className="flex flex-col items-center gap-2.5 p-4 bg-white rounded-2xl border border-gray-100
                         shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
              <span className="text-4xl">{c.emoji}</span>
              <span className="text-sm font-semibold text-gray-700">{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            Why Store2Home?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600
                                flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 sm:p-12 text-center
                        shadow-xl">
          <FiStar size={28} className="text-brand-400 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Ready to shop?
          </h2>
          <p className="text-gray-400 max-w-md mx-auto mb-8">
            No account needed — just browse, add to cart, and check out.
            We'll handle the rest.
          </p>
          <button
            onClick={() => navigate("/shop")}
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold
                       px-8 py-3.5 rounded-full text-base transition-colors shadow-lg shadow-brand-500/25
                       flex items-center gap-2 mx-auto">
            <FiShoppingCart size={18} />
            Browse products
          </button>
        </div>
      </section>
    </div>
  );
}