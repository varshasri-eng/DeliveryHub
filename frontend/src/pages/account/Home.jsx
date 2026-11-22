import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiPackage, FiClock } from "react-icons/fi";
import { getServices } from "../../api/services";
import { getMyShipments } from "../../api/shipments";
import { ShippingHero, ServicesShowcase } from "../../components/ShippingShowcase";

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
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState("US_TO_IN");

  useEffect(() => {
    getServices()
      .then((res) => setServices(res.data.services || []))
      .catch(() => setServicesError(true))
      .finally(() => setServicesLoading(false));
    getMyShipments()
      .then((res) => setShipments((res.data.shipments || []).slice(0, 5)))
      .catch(() => setShipments([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <ShippingHero
        variant="account"
        direction={direction}
        onDirectionChange={setDirection}
        title={<>Welcome back. <span className="text-brand-300">Ready to ship?</span></>}
        subtitle="Book a shipment or check on one already on its way."
      />

      <ServicesShowcase
        variant="account"
        services={services}
        loading={servicesLoading}
        error={servicesError}
        direction={direction}
        onDirectionChange={setDirection}
      />

      <div className="mt-12">
        {/* Recent shipments */}
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