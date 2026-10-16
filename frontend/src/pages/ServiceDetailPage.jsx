import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FiMinus, FiPlus, FiArrowLeft, FiArrowRight, FiCheckCircle, FiGlobe } from "react-icons/fi";
import { getService } from "../api/services";
import { formatMoney } from "../utils/money";
import Reveal from "../components/Reveal";

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [tierId, setTierId] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setService(null);
    setNotFound(false);
    setLoadError("");
    getService(slug)
      .then((res) => {
        const svc = res.data.service;
        setService(svc);
        setTierId(svc.pricing_tiers?.[0]?.id ?? null);
        setQuantity(1);
      })
      .catch((error) => {
        if (error.response?.status === 404) {
          setNotFound(true);
          return;
        }
        setLoadError(
          error.response?.data?.error ||
          "Could not load this service. Please try again shortly."
        );
      });
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
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        {loadError ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Service temporarily unavailable</h1>
            <p role="alert" className="text-sm text-red-600">{loadError}</p>
            <Link to="/services" className="inline-block mt-4 text-brand-600 hover:underline">
              Back to services
            </Link>
          </>
        ) : (
          <p className="text-gray-400">Loading…</p>
        )}
      </div>
    );
  }

  const tiers = service.pricing_tiers || [];
  const tier = tiers.find((t) => t.id === tierId);
  const currencyCode = service.route_direction === "IN_TO_US" ? "INR" : "USD";
  const priceKey = currencyCode === "INR" ? "price_inr" : "price";
  const tierPrice = tier?.[priceKey];
  const total = tierPrice == null ? null : Number(tierPrice) * quantity;
  const directionLabel = service.route_direction === "IN_TO_US"
    ? "India → United States"
    : "United States → India";

  const goBook = () => {
    if (!tier) return;
    navigate(`/services/${service.slug}/book?tier=${tier.id}&qty=${quantity}`);
  };

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-[#f4f8f5] via-white to-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <Link to={`/services?direction=${service.route_direction}`}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-brand-200 hover:text-brand-800">
          <FiArrowLeft size={14} /> Back to Services
        </Link>

      <Reveal as="section" className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)]">
        {/* Left: admin-authored content */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gray-950 px-6 py-8 text-white shadow-xl shadow-gray-900/10 sm:px-9 sm:py-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[32px] border-white/[0.04]" />
          <div className="absolute -bottom-20 -right-5 h-48 w-48 rounded-full bg-brand-700/25 blur-3xl" />
          <div className="relative">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-emerald-100">
            <FiGlobe size={14} /> {directionLabel}
          </span>
          {service.badge_label && (
            <span className="mb-4 inline-block rounded-full bg-brand-400/15 px-3 py-1 text-[11px] font-bold tracking-wide text-emerald-100">
              {service.badge_label}
            </span>
          )}
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{service.name}</h1>
          {service.tagline && (
            <p className="mt-4 text-lg font-semibold text-emerald-200">{service.tagline}</p>
          )}
          {service.description && (
            <p className="mt-4 max-w-xl leading-7 text-white/70">{service.description}</p>
          )}

          {service.coverage_items?.length > 0 && (
            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-white/50">
                Included Coverage
              </p>
              <ul className="space-y-2.5">
                {service.coverage_items.map((c) => (
                  <li key={c.id} className="flex gap-2 text-sm text-white/85">
                    <FiCheckCircle className="mt-0.5 shrink-0 text-emerald-300" /> {c.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {service.restrictions?.length > 0 && (
            <div className="mt-7 border-t border-white/10 pt-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-white/50">
                Not Allowed
              </p>
              <ul className="space-y-2.5">
                {service.restrictions.map((r) => (
                  <li key={r.id} className="flex gap-2 text-sm text-rose-200">
                    <span aria-hidden="true">•</span> {r.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          </div>
        </div>

        {/* Right: tier picker */}
        <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-xl shadow-gray-900/[0.04] sm:p-7 lg:sticky lg:top-24">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Step 02 · choose</p>
              <h2 className="mt-2 text-xl font-extrabold text-gray-950">Shipping option</h2>
            </div>
            <span className="rounded-full bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500">
              {currencyCode}
            </span>
          </div>

          {tiers.length === 0 ? (
            <p className="text-sm text-gray-400 bg-white rounded-xl border border-gray-100 p-4">
              Pricing isn't available for this service yet.
            </p>
          ) : (
            <div className="space-y-3">
              {tiers.map((t) => (
                <div
                  key={t.id}
                  className={`rounded-2xl border-2 transition-all duration-300
                    ${t.id === tierId ? "border-brand-500 bg-brand-50 shadow-md shadow-brand-900/5" : "border-gray-100 bg-white hover:border-brand-200"}`}
                >
                  <button type="button" onClick={() => setTierId(t.id)}
                    className="w-full flex items-center justify-between gap-3 p-4 text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{t.icon || "📦"}</span>
                      <div>
                        <p className="font-semibold text-gray-900">{t.tier_name}</p>
                        {t.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                        )}
                        {t.duration_label && (
                          <p className="text-xs text-gray-500 mt-0.5">{t.duration_label}</p>
                        )}
                      </div>
                    </div>
                    {t.sub_services?.length ? (
                      <span className="text-xs font-semibold text-gray-500">Choose an option</span>
                    ) : (
                      <span className="text-right text-sm font-extrabold text-gray-900">
                        {formatMoney(t[priceKey], currencyCode)}
                      </span>
                    )}
                  </button>
                  {t.id === tierId && t.sub_services?.length > 0 && (
                    <div className="border-t border-gray-100 px-4 py-3">
                      <p className="text-xs font-semibold text-gray-500 mb-2">Prices by delivery option</p>
                      <div className="space-y-2">
                        {t.sub_services.map((option) => (
                          <div key={option.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-gray-700">{option.name}</span>
                            <span className="text-right text-xs font-semibold text-gray-900">
                              {formatMoney(option[priceKey], currencyCode)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {service.enable_quantity && tier && !tier.sub_services?.length && (
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
                <span className="text-2xl font-extrabold">
                  {total == null ? `${currencyCode} price not set` : formatMoney(total, currencyCode)}
                </span>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={goBook}
            disabled={!tier || (tier.sub_services?.length === 0 && tierPrice == null)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gray-950 py-4 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-800 hover:shadow-lg disabled:opacity-50"
          >
            Confirm Shipment Details <FiArrowRight size={16} />
          </button>
        </div>
      </Reveal>
      </div>
    </div>
  );
}
