import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FiMinus, FiPlus, FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { getService } from "../api/services";

const money = (n) => `$${Number(n).toFixed(2).replace(/\.00$/, "")}`;

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [tierId, setTierId] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setService(null);
    setNotFound(false);
    getService(slug)
      .then((res) => {
        const svc = res.data.service;
        setService(svc);
        setTierId(svc.pricing_tiers?.[0]?.id ?? null);
        setQuantity(1);
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Service not found</h1>
        <Link to="/services" className="text-brand-600 hover:underline">Back to services</Link>
      </div>
    );
  }

  if (!service) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-gray-400">Loading…</div>;
  }

  const tiers = service.pricing_tiers || [];
  const tier = tiers.find((t) => t.id === tierId);
  const total = tier ? Number(tier.price) * quantity : 0;

  const goBook = () => {
    if (!tier) return;
    navigate(`/services/${service.slug}/book?tier=${tier.id}&qty=${quantity}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/services"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <FiArrowLeft size={14} /> Back to Services
      </Link>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Left: admin-authored content */}
        <div>
          {service.badge_label && (
            <span className="inline-block text-[11px] font-bold tracking-wide bg-brand-50
                             text-brand-700 px-3 py-1 rounded-full mb-4">
              {service.badge_label}
            </span>
          )}
          <h1 className="text-4xl font-extrabold text-gray-900">{service.name}</h1>
          {service.tagline && (
            <p className="text-lg font-semibold text-brand-600 mt-3">{service.tagline}</p>
          )}
          {service.description && (
            <p className="text-gray-700 mt-4 leading-relaxed">{service.description}</p>
          )}

          {service.coverage_items?.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">
                Included Coverage
              </p>
              <ul className="space-y-2.5">
                {service.coverage_items.map((c) => (
                  <li key={c.id} className="text-sm text-gray-800 flex gap-2">
                    <span className="text-brand-600">✦</span> {c.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {service.restrictions?.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">
                Not Allowed
              </p>
              <ul className="space-y-2.5">
                {service.restrictions.map((r) => (
                  <li key={r.id} className="text-sm text-red-700 flex gap-2">
                    <span>•</span> {r.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: tier picker */}
        <div className="lg:pt-24">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">
            Select Shipping Tier
          </p>

          {tiers.length === 0 ? (
            <p className="text-sm text-gray-400 bg-white rounded-xl border border-gray-100 p-4">
              Pricing isn't available for this service yet.
            </p>
          ) : (
            <div className="space-y-3">
              {tiers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTierId(t.id)}
                  className={`w-full flex items-center justify-between rounded-xl border-2 p-4
                              text-left transition-colors
                              ${t.id === tierId
                                ? "border-brand-500 bg-brand-50"
                                : "border-gray-200 bg-white hover:border-gray-300"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{t.icon || "📦"}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{t.tier_name}</p>
                      {t.duration_label && (
                        <p className="text-xs text-gray-500 mt-0.5">{t.duration_label}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xl font-extrabold text-gray-900">{money(t.price)}</span>
                </button>
              ))}
            </div>
          )}

          {service.enable_quantity && tier && (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mt-6 mb-3">
                Quantity
              </p>
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-2">
                <button type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
                  <FiMinus size={16} />
                </button>
                <span className="font-bold text-gray-900">{quantity}</span>
                <button type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
                  <FiPlus size={16} />
                </button>
              </div>

              <div className="mt-4 bg-gray-900 text-white rounded-xl px-5 py-4 flex items-center justify-between">
                <span className="text-sm">Total Amount:</span>
                <span className="text-2xl font-extrabold">{money(total)}</span>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={goBook}
            disabled={!tier}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-brand-600
                       hover:bg-brand-700 disabled:opacity-50 text-white font-semibold
                       py-4 rounded-xl transition-colors"
          >
            Confirm Shipment Details <FiArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
