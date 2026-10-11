import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getServices } from "../api/services";

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-extrabold text-gray-900">
        {selectedDirection ? `Shipping from ${selectedDirection.label}` : "Choose a shipping direction"}
      </h1>
      <p className="text-gray-500 mt-2 mb-8">
        {selectedDirection
          ? "Choose a service for this direction to view its details and delivery options."
          : "Services, prices, and booking forms are shown separately for each direction."}
      </p>

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {DIRECTIONS.map((option) => (
          <button key={option.id} type="button"
            onClick={() => setSearchParams({ direction: option.id })}
            aria-pressed={direction === option.id}
            className={`rounded-xl border-2 p-4 text-left font-semibold transition-colors ${
              direction === option.id
                ? "border-brand-500 bg-brand-50 text-brand-800"
                : "border-gray-200 bg-white text-gray-800 hover:border-brand-300"
            }`}>
            {option.label}
          </button>
        ))}
      </div>

      {!direction ? (
        <p className="text-sm text-gray-500">Select a direction to view its available services.</p>
      ) : (
        loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-36 animate-pulse" />
            ))}
          </div>
        ) : failed ? (
          <p className="text-red-500">We couldn't load our services. Please try again shortly.</p>
        ) : services.length === 0 ? (
          <p className="text-gray-400">No services are available for this direction right now.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {services.map((s) => (
              <Link
                key={s.id}
                to={`/services/${s.slug}`}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-brand-300
                           hover:shadow-md transition-all block"
              >
                <span className="text-3xl block mb-3">{s.icon || "📦"}</span>
                {s.badge_label && (
                  <span className="inline-block text-[10px] font-bold tracking-wide bg-brand-50
                                   text-brand-700 px-2.5 py-0.5 rounded-full mb-2">
                    {s.badge_label}
                  </span>
                )}
                <h2 className="text-lg font-bold text-gray-900">{s.name}</h2>
                {s.tagline && <p className="text-sm text-gray-500 mt-1">{s.tagline}</p>}
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
