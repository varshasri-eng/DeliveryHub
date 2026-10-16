import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiClock, FiGlobe, FiPackage, FiShield, FiTruck } from "react-icons/fi";
import { getServices } from "../api/services";
import api from "../api/client";
import StaticPageContent from "../components/StaticPageContent";
import Reveal from "../components/Reveal";
import { useBranding } from "../context/BrandingContext";

const DIRECTIONS = [
  { id: "US_TO_IN", label: "United States to India", summary: "Ship from the U.S. to India" },
  { id: "IN_TO_US", label: "India to United States", summary: "Ship from India to the U.S." },
];

const HOW_IT_WORKS = [
  { title: "Choose your route", description: "Pick United States to India or India to United States." },
  { title: "Select a service", description: "Compare the services and delivery options for that route, with prices shown." },
  { title: "Book and track", description: "Submit your details, then follow your shipment with its reference number." },
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
  const [servicesLoading, setServicesLoading] = useState(true);
  const [direction, setDirection] = useState("");
  const [staticPages, setStaticPages] = useState({ about: null, faq: null });
  const [staticPagesLoading, setStaticPagesLoading] = useState(true);

  useEffect(() => {
    getServices()
      .then((response) => setServices(response.data.services || []))
      .catch(() => setServiceLoadError(true))
      .finally(() => setServicesLoading(false));
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
  const routeLabel = direction === "IN_TO_US" ? "India → United States" : "United States → India";

  return (
    <div className="bg-white">
      <section className="relative isolate overflow-hidden bg-[#f5f8f6]">
        <div className="pointer-events-none absolute inset-0 opacity-60"
          style={{ backgroundImage: "radial-gradient(#b7d5c2 0.8px, transparent 0.8px)", backgroundSize: "22px 22px" }} />
        <div className="absolute -right-44 -top-56 h-[34rem] w-[34rem] rounded-full bg-brand-100/70 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div className="page-hero-copy">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-800 shadow-sm">
              <FiGlobe size={15} /> {settings.site_name} · U.S. ↔ India
            </div>
            <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-[-0.04em] text-gray-950 sm:text-5xl lg:text-6xl">
              {settings.hero_title || "Ship across borders. Stay close to what matters."}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-gray-600 sm:text-lg">
              {settings.hero_subtitle || "Choose your route, compare shipping options, and book your U.S.–India shipment with clear details at every step."}
            </p>

            <div className="mt-9 max-w-2xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-gray-900">Where are you shipping?</p>
                <span className="text-xs font-medium text-gray-400">01 / 03 · Choose a route</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {DIRECTIONS.map((option) => (
                  <button key={option.id} type="button"
                    onClick={() => setDirection(option.id)}
                    aria-pressed={direction === option.id}
                    className={`group rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                      direction === option.id
                        ? "border-brand-500 bg-white shadow-md shadow-brand-900/10 ring-2 ring-brand-500/10"
                        : "border-white bg-white/75 hover:border-brand-200"
                    }`}>
                    <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                      <FiArrowRight className={option.id === "IN_TO_US" ? "rotate-180" : ""} size={18} />
                    </span>
                    <span className="block font-bold text-gray-900">{option.label}</span>
                    <span className="mt-1 block text-sm text-gray-500">{option.summary}</span>
                  </button>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  disabled={!direction}
                  onClick={() => navigate(`/services?direction=${direction}`)}
                  className="btn-primary inline-flex items-center gap-2 rounded-full !px-6 !py-3 text-sm shadow-lg shadow-brand-800/15 transition-all hover:-translate-y-0.5 disabled:opacity-50 sm:text-base"
                >
                  {settings.hero_cta || "Explore shipping options"} <FiArrowRight size={18} />
                </button>
                <button
                  onClick={() => navigate("/track")}
                  className="rounded-full px-5 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-white hover:text-brand-800 sm:text-base"
                >
                  Track a shipment
                </button>
              </div>
              {direction && (
                <p aria-live="polite" className="mt-3 text-xs font-semibold text-brand-800">
                  Selected route: {routeLabel}
                </p>
              )}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl page-hero-art">
            {settings.hero_banner_url ? (
              <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] bg-brand-900 shadow-2xl shadow-brand-900/20 sm:min-h-[470px]">
                <img src={settings.hero_banner_url} alt="DeliveryHub international shipping"
                  className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/75 via-gray-950/10 to-transparent" />
                <div className="absolute bottom-7 left-7 right-7 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">From pickup to delivery</p>
                  <p className="mt-2 text-2xl font-bold">Your shipment, moving forward.</p>
                </div>
              </div>
            ) : (
              <div className="shipping-orbit relative min-h-[360px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-gray-950 via-brand-800 to-brand-600 p-6 shadow-2xl shadow-brand-900/25 sm:min-h-[470px] sm:p-9">
                <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/10" />
                <div className="absolute -right-9 -top-9 h-52 w-52 rounded-full border border-white/10" />
                <div className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl" />
                <div className="relative flex items-center justify-between">
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
                    Routes made clear
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-white/75">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> Booking open
                  </span>
                </div>
                <svg viewBox="0 0 520 330" role="img" aria-label="Illustration of a parcel travelling between the United States and India"
                  className="relative mt-7 w-full overflow-visible">
                  <defs>
                    <linearGradient id="routeGlow" x1="0" x2="1">
                      <stop offset="0%" stopColor="#bbf7d0" />
                      <stop offset="100%" stopColor="#fef3c7" />
                    </linearGradient>
                    <linearGradient id="parcelFill" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#fff7d6" />
                      <stop offset="100%" stopColor="#f2bf69" />
                    </linearGradient>
                  </defs>
                  <ellipse cx="260" cy="163" rx="208" ry="124" fill="none" stroke="white" strokeOpacity=".16" />
                  <ellipse cx="260" cy="163" rx="160" ry="95" fill="none" stroke="white" strokeOpacity=".1" transform="rotate(-22 260 163)" />
                  <path d="M92 177 C165 56 325 39 426 145" fill="none" stroke="url(#routeGlow)" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 12" className="shipping-route-dash" />
                  <circle cx="92" cy="177" r="10" fill="#bbf7d0" />
                  <circle cx="426" cy="145" r="10" fill="#fde68a" />
                  <circle cx="92" cy="177" r="22" fill="#bbf7d0" fillOpacity=".13" />
                  <circle cx="426" cy="145" r="22" fill="#fde68a" fillOpacity=".13" />
                  <g transform="translate(206 104)">
                    <path d="M54 4 101 28 54 52 7 28 54 4Z" fill="#f8d98b" />
                    <path d="M7 28v54l47 26V52L7 28Z" fill="#e5a64f" />
                    <path d="M101 28v54L54 108V52l47-24Z" fill="url(#parcelFill)" />
                    <path d="m34 18 47 25M54 52v56" fill="none" stroke="#9a672d" strokeOpacity=".56" strokeWidth="3" />
                    <path d="m45 9 47 24-14 7-47-24 14-7Z" fill="#fff9e9" />
                  </g>
                  <g fill="white" fontFamily="Inter, sans-serif">
                    <text x="53" y="225" fontSize="14" fontWeight="700">UNITED STATES</text>
                    <text x="392" y="193" fontSize="14" fontWeight="700">INDIA</text>
                    <text x="53" y="246" fontSize="11" fillOpacity=".66">Pickup confirmed</text>
                    <text x="392" y="214" fontSize="11" fillOpacity=".66">On the way</text>
                  </g>
                </svg>
                <div className="relative mt-5 grid grid-cols-3 gap-2">
                  {[
                    ["01", "Choose route"],
                    ["02", "Pick a service"],
                    ["03", "Book with ease"],
                  ].map(([number, title]) => (
                    <div key={number} className="rounded-xl border border-white/10 bg-white/[0.08] p-3 backdrop-blur-sm">
                      <p className="text-[10px] font-bold text-emerald-200">{number}</p>
                      <p className="mt-1 text-xs font-semibold text-white sm:text-sm">{title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="absolute -bottom-5 left-5 right-5 rounded-2xl border border-white/80 bg-white/95 p-4 shadow-xl backdrop-blur sm:left-10 sm:right-10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><FiPackage size={20} /></span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">A simpler way to send</p>
                    <p className="text-xs text-gray-500">Route-specific services and pricing</p>
                  </div>
                </div>
                <FiArrowRight className="text-brand-700" size={20} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Reveal as="section" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-brand-700">What you can ship with</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-950">Shipping services</h2>
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
        ) : servicesLoading ? (
          <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-52 animate-pulse rounded-3xl bg-gray-100" />
            ))}
          </div>
        ) : serviceLoadError ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            Shipping services could not be loaded. Please try again shortly.
          </div>
        ) : availableServices.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableServices.slice(0, 3).map((service, index) => (
              <Reveal as="button" delay={index * 90}
                key={service.id}
                onClick={() => navigate(`/services/${service.slug}`)}
                className="group rounded-3xl border border-gray-100 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-3xl transition-transform duration-300 group-hover:scale-110">{service.icon || "📦"}</span>
                <span className="mt-5 block font-bold text-gray-950">{service.name}</span>
                <span className="mt-2 block min-h-10 text-sm leading-6 text-gray-500">{service.tagline || "View service details and delivery options."}</span>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-700">
                  Explore service <FiArrowRight className="transition-transform group-hover:translate-x-1" />
                </span>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <p className="font-semibold text-gray-800">Shipping services are being set up.</p>
            <p className="mt-1 text-sm text-gray-500">Please check back soon.</p>
          </div>
        )}
      </Reveal>

      <Reveal as="section" className="bg-[#f6f8f7] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">Built around your shipment</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950">Shipping made straightforward</h2>
            <p className="mt-3 text-gray-500">Clear choices from the first click through your shipment updates.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 80} className="group rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-white">
                  {feature.icon}
                </div>
                <h3 className="mb-2 font-bold text-gray-950">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{feature.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">How it works</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950">Three steps to your booking</h2>
        </div>
        <ol className="grid gap-5 md:grid-cols-3">
          {HOW_IT_WORKS.map((step, index) => (
            <li key={step.title}
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition duration-200 ease-out hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none">
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-950 text-sm font-bold text-white">{index + 1}</span>
              <h3 className="font-bold text-gray-950">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">{step.description}</p>
            </li>
          ))}
        </ol>
      </Reveal>

      {staticPagesLoading ? (
        <div aria-busy="true" className="mx-auto max-w-6xl space-y-4 px-4 py-14 sm:px-6">
          <div className="h-7 w-48 animate-pulse rounded bg-gray-100" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-40 animate-pulse rounded-3xl bg-gray-100" />)}
          </div>
        </div>
      ) : (
        <>
          {staticPages.about ? (
            <Reveal><StaticPageContent page={staticPages.about} embedded /></Reveal>
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
            <Reveal><StaticPageContent page={staticPages.faq} embedded /></Reveal>
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