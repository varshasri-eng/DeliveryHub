import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiPackage, FiSearch, FiArrowRight, FiClock } from "react-icons/fi";
import { getServices } from "../../api/services";
import { getMyShipments } from "../../api/shipments";
import { useBranding } from "../../context/BrandingContext";

const STATUS_LABELS = {
  requested: "Requested",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS = {
  requested: "bg-gray-100 text-gray-600",
  picked_up: "bg-blue-50 text-blue-600",
  in_transit: "bg-amber-50 text-amber-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

export default function Home() {
  const navigate = useNavigate();
  const { settings } = useBranding();
  const [services, setServices] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getServices().catch(() => ({ data: { services: [] } })),
      getMyShipments().catch(() => ({ data: { shipments: [] } })),
    ])
      .then(([servicesRes, shipmentsRes]) => {
        setServices(servicesRes.data.services || []);
        setShipments((shipmentsRes.data.shipments || []).slice(0, 5));
      })
      .catch(() => toast.error("Failed to load your dashboard."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Banner */}
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

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back 👋</h1>
      <p className="text-gray-500 text-sm mb-6">
        Book a shipment or check on one already on its way.
      </p>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => navigate("/services")}
          className="flex items-center justify-between bg-gray-900 hover:bg-gray-800
                     text-white rounded-2xl p-5 transition-colors text-left"
        >
          <div>
            <p className="font-semibold">Book a Shipment</p>
            <p className="text-sm text-white/70 mt-0.5">Browse our services</p>
          </div>
          <FiArrowRight size={20} />
        </button>
        <button
          onClick={() => navigate("/track")}
          className="flex items-center justify-between bg-white border border-gray-200
                     hover:border-gray-300 rounded-2xl p-5 transition-colors text-left"
        >
          <div>
            <p className="font-semibold text-gray-900">Track a Shipment</p>
            <p className="text-sm text-gray-500 mt-0.5">Check delivery status</p>
          </div>
          <FiSearch size={20} className="text-gray-400" />
        </button>
      </div>

      {/* Services grid */}
      {!loading && services.length > 0 && (
        <div className="mb-8">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Our Services
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/services/${s.slug}`)}
                className="bg-white border border-gray-100 rounded-xl p-4 text-center
                           hover:border-brand-300 hover:shadow-sm transition-all"
              >
                <span className="text-2xl block mb-2">{s.icon || "📦"}</span>
                <span className="text-sm font-medium text-gray-800">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent shipments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Recent Shipments
          </p>
          {shipments.length > 0 && (
            <button
              onClick={() => navigate("/account/shipments")}
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              View all
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : shipments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
            <FiPackage className="mx-auto text-gray-300 mb-3" size={32} />
            <p className="text-gray-600 font-semibold">No shipments yet</p>
            <p className="text-gray-400 text-sm mt-1">Book your first shipment to see it here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {shipments.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate("/account/shipments")}
                className="w-full flex items-center justify-between bg-white rounded-xl
                           border border-gray-100 p-4 hover:border-gray-200 transition-colors text-left"
              >
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{s.service_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <FiClock size={11} /> {s.shipment_number}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[s.status] || "bg-gray-100 text-gray-600"}`}>
                  {STATUS_LABELS[s.status] || s.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
