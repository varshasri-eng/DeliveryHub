import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiGlobe } from "react-icons/fi";
import { getServices } from "../api/services";
import { ServicesShowcase, HEADING } from "../components/ShippingShowcase";
import usePageMeta from "../utils/pageMeta";

const DIRECTION_IDS = ["US_TO_IN", "IN_TO_US"];

export default function ServicesPage() {
  usePageMeta("Shipping Services: USA to India and India to USA | DeliveryHub", "See DeliveryHub shipping services and prices between the USA and India.");
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("direction");
  const direction = DIRECTION_IDS.includes(requested) ? requested : "US_TO_IN";
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
    <div>
      <header className="relative isolate overflow-hidden bg-[#102E27] text-white">
        <div className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-[#E8B65C]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-200">
            <FiGlobe size={14} /> International shipping
          </span>
          <h1 className={`${HEADING} max-w-3xl text-3xl font-extrabold leading-tight tracking-[-0.03em] sm:text-5xl`}>
            Shipping services, <span className="text-brand-300">USA and India</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            Choose your route, pick the service you need and see the price before you book.
          </p>
        </div>
      </header>

      <ServicesShowcase
        services={services}
        loading={loading}
        error={failed}
        direction={direction}
        onDirectionChange={(id) => setSearchParams({ direction: id }, { replace: true })}
      />
    </div>
  );
}