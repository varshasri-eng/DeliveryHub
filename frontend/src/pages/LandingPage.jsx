import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiClock, FiPackage, FiShield, FiTruck } from "react-icons/fi";
import { getServices } from "../api/services";
import api from "../api/client";
import StaticPageContent from "../components/StaticPageContent";
import { useBranding } from "../context/BrandingContext";

const DIRECTIONS = [
  { id: "US_TO_IN", label: "United States to India", summary: "Ship from the U.S. to India" },
  { id: "IN_TO_US", label: "India to United States", summary: "Ship from India to the U.S." },
];

const FEATURES = [
  {
    icon: <FiCheckCircle size={22} />,
    title: "A guided booking form",
    description: "Enter pickup and delivery details in a form tailored to your shipment.",
  },
  {
    icon: <FiTruck size={22} />,
    title: "Options for your schedule",
    description: "Choose a delivery option and estimate that fits your shipment.",
  },
  {
    icon: <FiShield size={22} />,
    title: "Shipment visibility",
    description: "Review your booking and follow its status through your account.",
  },
  {
    icon: <FiClock size={22} />,
    title: "Clear pricing",
    description: "See the service options and prices before you submit a shipment.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { settings } = useBranding();
  const [services, setServices] = useState([]);
  const [serviceLoadError, setServiceLoadError] = useState(false);
  const [direction, setDirection] = useState("");
  const [staticPages, setStaticPages] = useState({ about: null, faq: null });
  const [staticPagesLoading, setStaticPagesLoading] = useState(true);

  useEffect(() => {
    getServices()
      .then((response) => setServices(response.data.services || []))
      .catch(() => setServiceLoadError(true));
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.get("/pages/about-us"),
      api.get("/pages/faqs"),
    ]).then(([aboutResult, faqResult]) => {
      if (!active) return;
      setStaticPages({
        about: aboutResult.status === "fulfilled" ? aboutResult.value.data.page : null,
        faq: faqResult.status === "fulfilled" ? faqResult.value.data.page : null,
      });
      setStaticPagesLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (staticPagesLoading || !hash) return;
    const sectionId = decodeURIComponent(hash.slice(1));
    if (sectionId !== "about-us" && sectionId !== "faqs") return;
    requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    });
  }, [hash, staticPagesLoading]);

  const availableServices = services.filter((service) => service.route_direction === direction);

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-100">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-brand-700">
              <FiPackage size={14} />
              International shipping between the U.S. and India
            </div>
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-brand-700">
              {settings.site_name}
            </p>
            <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl">
              Send your shipment with confidence.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-600">
              Choose a shipping service, enter pickup and delivery details, and
              compare delivery options before booking.
            </p>
            <div className="mt-8">
              <p className="mb-3 text-sm font-semibold text-gray-700">First, choose your shipping direction</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {DIRECTIONS.map((option) => (
                  <button key={option.id} type="button"
                    onClick={() => setDirection(option.id)}
                    aria-pressed={direction === option.id}
                    className={`rounded-xl border-2 p-4 text-left transition-colors ${
                      direction === option.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-gray-200 bg-white hover:border-brand-300"
                    }`}>
                    <span className="block font-semibold text-gray-900">{option.label}</span>
                    <span className="mt-1 block text-sm text-gray-500">{option.summary}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
              <button
                disabled={!direction}
                onClick={() => navigate(`/services?direction=${direction}`)}
                className="btn-primary flex items-center gap-2 rounded-full !px-7 !py-3 text-base disabled:opacity-50"
              >
                Explore shipping services <FiArrowRight size={18} />
              </button>
              <button
                onClick={() => navigate("/login")}
                className="btn-secondary rounded-full !px-7 !py-3 text-base"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate("/track")}
                className="rounded-full px-7 py-3 text-base font-semibold text-gray-700 transition-colors hover:bg-white/70"
              >
                Track a shipment
              </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-brand-900/5 sm:p-8">
            <p className="text-sm font-bold uppercase tracking-wide text-gray-400">How it works</p>
            <div className="mt-5 space-y-4">
              {[
                ["1", "Choose your shipping direction"],
                ["2", "Choose a service for that direction"],
                ["3", "Select an option and enter shipment details"],
              ].map(([step, title]) => (
                <div key={step} className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 font-bold text-brand-700">
                    {step}
                  </span>
                  <span className="font-semibold text-gray-900">{title}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-gray-500">
              Each direction has its own service list, pricing, and booking form.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-brand-700">What you can ship with</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">Shipping services</h2>
          </div>
          {direction && (
            <button onClick={() => navigate(`/services?direction=${direction}`)}
              className="text-sm font-semibold text-brand-700 hover:underline">
              View services for this direction
            </button>
          )}
        </div>

        {!direction ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
            Choose a shipping direction above to see its services.
          </p>
        ) : serviceLoadError ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            Shipping services could not be loaded. Please try again shortly.
          </div>
        ) : availableServices.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableServices.slice(0, 3).map((service) => (
              <button
                key={service.id}
                onClick={() => navigate(`/services/${service.slug}`)}
                className="rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="text-3xl">{service.icon || "📦"}</span>
                <span className="mt-3 block font-bold text-gray-900">{service.name}</span>
                <span className="mt-1 block text-sm text-gray-500">{service.tagline || "View service details and delivery options."}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <p className="font-semibold text-gray-800">Shipping services are being set up.</p>
            <p className="mt-1 text-sm text-gray-500">Please check back soon.</p>
          </div>
        )}
      </section>

      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">Shipping made straightforward</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  {feature.icon}
                </div>
                <h3 className="mb-1 font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {staticPagesLoading ? (
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-14 sm:px-6">
          <div className="h-7 w-48 animate-pulse rounded bg-gray-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-gray-50" />
        </div>
      ) : (
        <>
          {staticPages.about ? (
            <StaticPageContent page={staticPages.about} embedded />
          ) : (
            <section id="about-us" className="scroll-mt-24 py-14 sm:py-16">
              <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  About information is temporarily unavailable.
                </p>
              </div>
            </section>
          )}
          {staticPages.faq ? (
            <StaticPageContent page={staticPages.faq} embedded />
          ) : (
            <section id="faqs" className="scroll-mt-24 bg-gray-50 py-14 sm:py-16">
              <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Frequently asked questions are temporarily unavailable.
                </p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
