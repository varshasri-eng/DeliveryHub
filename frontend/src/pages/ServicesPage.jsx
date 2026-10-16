import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiArrowRight, FiGlobe, FiPackage, FiTruck } from "react-icons/fi";
import { getServices } from "../api/services";
import Reveal from "../components/Reveal";

const DIRECTIONS = [
  { id: "US_TO_IN", label: "United States to India" },
  { id: "IN_TO_US", label: "India to United States" },
];

export default function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedDirection = searchParams.get("direction") || "";
  const direction = DIRECTIONS.some((option) => option.id === requestedDirection)
    ? requestedDirection
    : "";
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
    if (!direction) {
      setServices([]);
      setLoading(false);
      return;
    }
    getServices(direction)
      .then((res) => setServices(res.data.services || []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [direction]);

  const selectedDirection = DIRECTIONS.find((option) => option.id === direction);

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-[#f4f8f5] via-white to-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <Reveal as="header" className="relative overflow-hidden rounded-[2rem] bg-gray-950 px-6 py-9 text-white shadow-2xl shadow-gray-900/10 sm:px-10 sm:py-12">
          <div className="absolute -right-14 -top-24 h-72 w-72 rounded-full border-[36px] border-white/[0.04]" />
          <div className="absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-brand-700/30 blur-3xl" />
          <div className="relative max-w-3xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">
              <FiGlobe size={14} /> International shipping
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {selectedDirection ? `Shipping from ${selectedDirection.label}` : "Find the right way to send"}
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-white/70">
              {selectedDirection
                ? "Compare services and delivery options for your selected route."
                : "Choose a direction first. We’ll show the services and prices available for that route."}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-white/75">
              <span className="rounded-full bg-white/10 px-3 py-1.5">Route-specific options</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">Clear pricing</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">Guided booking</span>
            </div>
          </div>
        </Reveal>

        <div className="my-10 grid gap-4 sm:grid-cols-2">
          {DIRECTIONS.map((option, index) => (
            <Reveal key={option.id} delay={index * 80}>
              <button type="button"
                onClick={() => setSearchParams({ direction: option.id })}
                aria-pressed={direction === option.id}
                className={`group flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                  direction === option.id
                    ? "border-brand-400 bg-brand-50 shadow-md shadow-brand-900/5"
                    : "border-gray-100 bg-white hover:border-brand-200"
                }`}>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-800 transition-colors group-hover:bg-brand-700 group-hover:text-white">
                  <FiTruck size={21} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-gray-900">{option.label}</span>
                  <span className="mt-1 block text-sm text-gray-500">Browse services and rates for this direction</span>
                </span>
                <FiArrowRight className="shrink-0 text-brand-700 transition-transform group-hover:translate-x-1" />
              </button>
            </Reveal>
          ))}
        </div>

        {!direction ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
            <FiPackage className="mx-auto text-brand-600" size={28} />
            <p className="mt-3 font-semibold text-gray-800">Your service options will appear here</p>
            <p className="mt-1 text-sm text-gray-500">Select a direction above to get started.</p>
          </div>
        ) : (
          loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-3xl border border-gray-100 bg-white" />
              ))}
            </div>
          ) : failed ? (
            <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700">
              We couldn't load our services. Please try again shortly.
            </p>
          ) : services.length === 0 ? (
            <p className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-500">
              No services are available for this direction right now.
            </p>
          ) : (
            <>
              <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Available for this route</p>
                  <h2 className="mt-2 text-2xl font-extrabold text-gray-950">Choose a service</h2>
                </div>
                <p className="text-sm text-gray-400">{services.length} options</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((service, index) => (
                  <Reveal key={service.id} delay={index * 90}>
                    <Link
                      to={`/services/${service.slug}`}
                      className="group block h-full rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5"
                    >
                      <div className="flex items-start justify-between">
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-3xl transition-transform duration-300 group-hover:scale-110">
                          {service.icon || "📦"}
                        </span>
                        <FiArrowRight className="mt-2 text-gray-300 transition-all group-hover:translate-x-1 group-hover:text-brand-700" size={20} />
                      </div>
                      {service.badge_label && (
                        <span className="mt-5 inline-flex rounded-full bg-brand-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                          {service.badge_label}
                        </span>
                      )}
                      <h3 className="mt-4 text-lg font-bold text-gray-950">{service.name}</h3>
                      <p className="mt-2 min-h-12 text-sm leading-6 text-gray-500">
                        {service.tagline || "View service details and delivery options."}
                      </p>
                      <span className="mt-5 block border-t border-gray-100 pt-4 text-xs font-bold uppercase tracking-wide text-brand-700">
                        View service details
                      </span>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
