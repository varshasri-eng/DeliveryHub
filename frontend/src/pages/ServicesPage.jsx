import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getServices } from "../api/services";

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getServices()
      .then((res) => setServices(res.data.services || []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-extrabold text-gray-900">Book a Shipment</h1>
      <p className="text-gray-500 mt-2 mb-8">Choose a service to view its details and delivery options.</p>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-36 animate-pulse" />
          ))}
        </div>
      ) : failed ? (
        <p className="text-red-500">We couldn't load our services. Please try again shortly.</p>
      ) : services.length === 0 ? (
        <p className="text-gray-400">No services are available right now.</p>
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
      )}
    </div>
  );
}
