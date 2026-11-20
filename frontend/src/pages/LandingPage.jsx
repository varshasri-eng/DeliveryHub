import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiActivity, FiAnchor, FiArrowRight, FiCheckCircle, FiClipboard, FiFileText, FiGift,
  FiHeadphones, FiMapPin, FiMessageCircle, FiPackage, FiPhone, FiSend, FiTag,
} from "react-icons/fi";
import { getServices } from "../api/services";
import api from "../api/client";
import StaticPageContent from "../components/StaticPageContent";
import Reveal from "../components/Reveal";
import { useBranding } from "../context/BrandingContext";
import { formatMoney } from "../utils/money";
import usePageMeta from "../utils/pageMeta";

const WHATSAPP_URL = "https://wa.me/15107146946";
const PHONE_DISPLAY = "+1 510 714 6946";
const PHONE_TEL = "+15107146946";

// Heading font (Manrope is loaded in index.html; falls back to Inter).
const HEADING = "font-[family-name:Manrope,Inter,sans-serif]";

const DIRECTIONS = [
  { id: "US_TO_IN", from: "USA", to: "India", label: "United States to India", short: "USA → India", summary: "Documents and personal goods" },
  { id: "IN_TO_US", from: "India", to: "USA", label: "India to United States", short: "India → USA", summary: "Personal and medical shipping" },
];

// Which services are shown first for each direction, in this order.
const PRIORITY = {
  US_TO_IN: ["documents", "air", "sea"],
  IN_TO_US: ["personal", "medical"],
};

// Looks at a service's slug and name to decide what kind of service it is.
function categoryOf(service) {
  const text = `${service.slug || ""} ${service.name || ""}`.toLowerCase();
  if (text.includes("document")) return "documents";
  if (text.includes("medic")) return "medical";
  if (text.includes("personal")) return "personal";
  if (text.includes("sea")) return "sea";
  if (text.includes("air")) return "air";
  return "other";
}

// Look of each kind of service card. To use real photos later: add the images
// to frontend/public/images/services/ (documents.jpg, air.jpg, ...) and set USE_PHOTOS to true.
const USE_PHOTOS = false;
const VISUALS = {
  documents: {
    Icon: FiFileText,
    gradient: "from-[#102E27] via-brand-800 to-brand-600",
    blurb: "Send important papers with tracking and a price shown before you book.",
  },
  air: {
    Icon: FiSend,
    gradient: "from-[#0f3b4a] via-[#1b6a78] to-brand-500",
    blurb: "Speed-first shipping for personal goods and parcels.",
  },
  sea: {
    Icon: FiAnchor,
    gradient: "from-[#13304f] via-[#2a5d86] to-[#5fa3b8]",
    blurb: "An economical option for eligible shipments that are not urgent.",
  },
  personal: {
    Icon: FiGift,
    gradient: "from-[#102E27] via-brand-700 to-brand-400",
    blurb: "Send personal items and gifts from India to the USA.",
  },
  medical: {
    Icon: FiActivity,
    gradient: "from-[#173a3a] via-[#1f6f6a] to-[#7cc4b4]",
    blurb: "Check eligible items and required documents before you book.",
  },
  other: {
    Icon: FiPackage,
    gradient: "from-[#102E27] via-brand-800 to-brand-600",
    blurb: "View service details and delivery options.",
  },
};

const REASONS = [
  { Icon: FiTag, title: "Clear pricing", description: "See the price for your weight or option before you book." },
  { Icon: FiClipboard, title: "Guided booking", description: "A simple form for pickup, delivery and shipment details." },
  { Icon: FiMapPin, title: "Shipment tracking", description: "Follow your shipment with its reference number." },
  { Icon: FiHeadphones, title: "Customer support", description: "Talk to us on WhatsApp or by phone when you need help." },
];

const HOW_IT_WORKS = [
  { title: "Choose your route", description: "Pick United States to India or India to United States." },
  { title: "Select a service", description: "Choose the service you need and see the price for your weight or option." },
  { title: "Enter your details", description: "Tell us who is sending, who is receiving and where. We use the sender address for pickup." },
  { title: "Book and track", description: "We ship with our courier partners. Follow your shipment on the Track Shipment page." },
];

function RouteBadge({ direction }) {
  return (
    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
      {direction === "IN_TO_US" ? "India → USA" : "USA → India"}
    </span>
  );
}

function ServiceCard({ service, featured, wide, index }) {
  const category = categoryOf(service);
  const visual = VISUALS[category];
  const { Icon } = visual;
  return (
    <Reveal delay={index * 90} className={wide ? "lg:col-span-2" : ""}>
      <Link
        to={`/services/${service.slug}`}
        className={`group flex h-full overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-brand-900/10 motion-reduce:transform-none ${wide ? "flex-col md:flex-row" : "flex-col"}`}
      >
        <div className={`relative overflow-hidden bg-gradient-to-br ${visual.gradient} ${wide ? "min-h-[190px] md:min-h-full md:w-2/5" : "h-44"}`}>
          {USE_PHOTOS && (
            <img src={`/images/services/${category}.jpg`} alt="" loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
          )}
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full border-[26px] border-white/[0.07]" />
          <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute left-5 top-5 flex items-center gap-2">
            <RouteBadge direction={service.route_direction} />
            {featured && (
              <span className="rounded-full bg-[#E8B65C] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#3b2a07]">Featured</span>
            )}
          </div>
          <span className="absolute bottom-5 right-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-sm transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
            <Icon size={30} />
          </span>
        </div>
        <div className="flex flex-1 flex-col p-6">
          <h3 className={`${HEADING} text-xl font-extrabold tracking-tight text-gray-950`}>{service.name}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">{service.tagline || visual.blurb}</p>
          <div className="mt-auto flex items-center justify-between gap-3 pt-5">
            {service.starting_price != null ? (
              <span className="text-sm text-gray-500">From <strong className="text-lg text-gray-950">{formatMoney(service.starting_price, service.currency_code)}</strong></span>
            ) : <span />}
            <span className="inline-flex items-center gap-2 rounded-full bg-gray-950 px-4 py-2 text-xs font-bold text-white transition-colors group-hover:bg-brand-700">
              {featured ? "Book now" : "Explore"} <FiArrowRight className="transition-transform group-hover:translate-x-1" size={14} />
            </span>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}

export default function LandingPage() {
  usePageMeta(
    "DeliveryHub | Shipping Between the USA and India: Air Cargo, Documents and Courier",
    "Ship parcels, documents and personal items between the USA and India with DeliveryHub. Air cargo and courier with FedEx, DHL and UPS, clear prices, online booking and shipment tracking."
  );
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { settings } = useBranding();
  const [services, setServices] = useState([]);
  const [serviceLoadError, setServiceLoadError] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [direction, setDirection] = useState("US_TO_IN");
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

  const phoneText = settings.contact_phone || PHONE_DISPLAY;
  const phoneTel = settings.contact_phone ? settings.contact_phone.replace(/[^\d+]/g, "") : PHONE_TEL;
  const routeLabel = DIRECTIONS.find((option) => option.id === direction)?.label;

  // Services for the chosen direction, in the order the business wants them shown.
  const order = PRIORITY[direction] || [];
  const rank = (service) => {
    const index = order.indexOf(categoryOf(service));
    return index === -1 ? 99 : index;
  };
  const routeServices = services
    .filter((service) => service.route_direction === direction)
    .map((service, position) => ({ service, position }))
    .sort((a, b) => rank(a.service) - rank(b.service) || a.position - b.position)
    .map((entry) => entry.service);
  const mainServices = routeServices.filter((service) => rank(service) < 99);
  const moreServices = routeServices.filter((service) => rank(service) === 99);
  const wideFirst = mainServices.length >= 3;
  const medicalService = routeServices.find((service) => categoryOf(service) === "medical");
  const airService = services.find((service) => service.route_direction === "US_TO_IN" && categoryOf(service) === "air");
  const seaService = services.find((service) => service.route_direction === "US_TO_IN" && categoryOf(service) === "sea");

  return (
    <div className="bg-white">
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden bg-[#102E27] text-white">
        <div className="pointer-events-none absolute -right-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-brand-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-56 -left-40 h-[30rem] w-[30rem] rounded-full bg-[#E8B65C]/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-24 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-28 lg:pt-24">
          <div className="page-hero-copy">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-200">
              <FiSend size={14} /> {settings.site_name} · USA ↔ India
            </div>
            <h1 className={`${HEADING} max-w-2xl text-4xl font-extrabold leading-[1.06] tracking-[-0.035em] sm:text-5xl lg:text-6xl`}>
              Send with confidence. <span className="text-brand-300">Across borders, with ease.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
              Reliable shipping between the United States and India. Find the right service, compare prices and book your shipment online.
            </p>

            <div className="mt-9 max-w-2xl">
              <p className="mb-3 text-sm font-bold text-white">Where are you shipping?</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {DIRECTIONS.map((option) => {
                  const selected = direction === option.id;
                  return (
                    <button key={option.id} type="button"
                      onClick={() => setDirection(option.id)}
                      aria-pressed={selected}
                      className={`group rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-1 motion-reduce:transform-none ${
                        selected
                          ? "border-white bg-white text-gray-950 shadow-xl shadow-black/20"
                          : "border-white/15 bg-white/5 text-white hover:border-white/40 hover:bg-white/10"
                      }`}>
                      <span className="flex items-center gap-2 text-lg font-extrabold">
                        {option.from}
                        <FiArrowRight className={selected ? "text-brand-700" : "text-brand-300"} size={18} />
                        {option.to}
                      </span>
                      <span className={`mt-1 block text-sm ${selected ? "text-gray-500" : "text-white/60"}`}>{option.summary}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a href="#services"
                  className="inline-flex items-center gap-2 rounded-full bg-[#E8B65C] px-6 py-3 text-sm font-extrabold text-[#2c1f05] shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-[#f0c577] sm:text-base">
                  Explore shipping services <FiArrowRight size={18} />
                </a>
                <button onClick={() => navigate("/track")}
                  className="rounded-full border border-white/30 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 sm:text-base">
                  Track shipment
                </button>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
                {["Transparent pricing", "Guided booking", "Shipment tracking"].map((item) => (
                  <li key={item} className="inline-flex items-center gap-2"><FiCheckCircle className="text-brand-300" size={16} /> {item}</li>
                ))}
              </ul>
              {routeLabel && (
                <p aria-live="polite" className="sr-only">Selected route: {routeLabel}</p>
              )}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl page-hero-art">
            {settings.hero_banner_url ? (
              <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] bg-brand-900 shadow-2xl shadow-black/30 sm:min-h-[460px]">
                <img src={settings.hero_banner_url} alt="DeliveryHub international shipping"
                  className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/75 via-gray-950/10 to-transparent" />
                <div className="absolute bottom-7 left-7 right-7 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">From pickup to delivery</p>
                  <p className="mt-2 text-2xl font-bold">Your shipment, moving forward.</p>
                </div>
              </div>
            ) : (
              <div className="shipping-orbit relative min-h-[360px] overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-6 shadow-2xl shadow-black/30 backdrop-blur-sm sm:min-h-[460px] sm:p-9">
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
                  {[["01", "Choose route"], ["02", "Pick a service"], ["03", "Book with ease"]].map(([number, title]) => (
                    <div key={number} className="rounded-xl border border-white/10 bg-white/[0.08] p-3">
                      <p className="text-[10px] font-bold text-brand-300">{number}</p>
                      <p className="mt-1 text-xs font-semibold text-white sm:text-sm">{title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <svg className="absolute bottom-0 left-0 w-full text-[#f5f8f6]" viewBox="0 0 1440 48" preserveAspectRatio="none" aria-hidden="true">
          <path fill="currentColor" d="M0 48V20C240 0 480 0 720 14s480 20 720 0v34H0Z" />
        </svg>
      </section>

      {/* ---------- Featured services ---------- */}
      <section id="services" className="scroll-mt-20 bg-[#f5f8f6] pb-20 pt-10 sm:pt-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">Shipping services</p>
              <h2 className={`${HEADING} mt-3 text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl`}>
                {direction === "US_TO_IN" ? "Send documents and goods to India" : "Send from India to the USA"}
              </h2>
              <p className="mt-3 text-gray-600">
                {direction === "US_TO_IN"
                  ? "Start with document shipping, or send personal goods by air or sea."
                  : "Personal shipping and medical shipping, all in one place."}
              </p>
            </div>
            <div role="group" aria-label="Shipping direction" className="inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
              {DIRECTIONS.map((option) => (
                <button key={option.id} type="button" onClick={() => setDirection(option.id)}
                  aria-pressed={direction === option.id}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                    direction === option.id ? "bg-gray-950 text-white" : "text-gray-600 hover:text-gray-950"
                  }`}>
                  {option.short}
                </button>
              ))}
            </div>
          </Reveal>

          {servicesLoading ? (
            <div aria-busy="true" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((item) => <div key={item} className="h-72 animate-pulse rounded-3xl bg-white" />)}
            </div>
          ) : serviceLoadError ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
              Shipping services could not be loaded. Please try again shortly.
            </div>
          ) : routeServices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="font-semibold text-gray-800">Shipping services for this route are being set up.</p>
              <p className="mt-1 text-sm text-gray-500">Please check back soon.</p>
            </div>
          ) : (
            <>
              <div key={direction} className={`grid gap-5 ${wideFirst ? "sm:grid-cols-2 lg:grid-cols-2" : "sm:grid-cols-2"}`}>
                {mainServices.map((service, index) => (
                  <ServiceCard key={service.id} service={service} index={index}
                    featured={index === 0} wide={wideFirst && index === 0} />
                ))}
              </div>

              {direction === "IN_TO_US" && medicalService && (
                <Reveal className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#E8B65C]/40 bg-[#fff8e8] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <FiActivity className="mt-0.5 shrink-0 text-[#a8741a]" size={20} />
                    <p className="text-sm leading-6 text-gray-700">
                      <strong className="text-gray-950">Before you ship medicines:</strong> not every medicine can be shipped internationally.
                      Eligible items, required documents and restrictions are listed on the service page.
                    </p>
                  </div>
                  <Link to={`/services/${medicalService.slug}`} className="shrink-0 text-sm font-bold text-brand-800 hover:underline">
                    Read the requirements
                  </Link>
                </Reveal>
              )}

              {moreServices.length > 0 && (
                <div className="mt-8">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Also on this route</p>
                  <div className="flex flex-wrap gap-3">
                    {moreServices.map((service) => (
                      <Link key={service.id} to={`/services/${service.slug}`}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:border-brand-400 hover:text-brand-800">
                        {service.name}
                        {service.starting_price != null && (
                          <span className="text-xs font-medium text-gray-500">from {formatMoney(service.starting_price, service.currency_code)}</span>
                        )}
                        <FiArrowRight size={14} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ---------- Air or sea ---------- */}
      <Reveal as="section" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">Personal goods, USA to India</p>
          <h2 className={`${HEADING} mt-3 text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl`}>Choose your shipping method</h2>
          <p className="mt-3 text-gray-600">Delivery options and estimates are shown for each service before you book.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { key: "air", Icon: FiSend, title: "Air shipping", tag: "Faster", text: "For customers prioritizing speed.", gradient: VISUALS.air.gradient, service: airService },
            { key: "sea", Icon: FiAnchor, title: "Sea shipping", tag: "Economical", text: "For eligible shipments where economy matters.", gradient: VISUALS.sea.gradient, service: seaService },
          ].map((method) => (
            <div key={method.key} className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${method.gradient} p-8 text-white shadow-xl shadow-brand-900/10`}>
              <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full border-[28px] border-white/[0.07] transition-transform duration-700 group-hover:scale-125" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm"><method.Icon size={26} /></span>
              <span className="relative mt-6 inline-block rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">{method.tag}</span>
              <h3 className={`${HEADING} relative mt-3 text-2xl font-extrabold`}>{method.title}</h3>
              <p className="relative mt-2 max-w-sm text-white/80">{method.text}</p>
              <Link to={method.service ? `/services/${method.service.slug}` : "/services?direction=US_TO_IN"}
                className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-gray-950 transition-transform hover:-translate-y-0.5">
                View {method.title.toLowerCase()} <FiArrowRight size={15} />
              </Link>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ---------- Why DeliveryHub ---------- */}
      <section className="bg-[#102E27] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-300">Why {settings.site_name}</p>
            <h2 className={`${HEADING} mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl`}>Shipping made straightforward</h2>
            <p className="mt-3 text-white/65">Clear choices from the first click to your shipment updates.</p>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {REASONS.map(({ Icon, title, description }, index) => (
              <Reveal key={title} delay={index * 80}
                className="group rounded-3xl border border-white/10 bg-white/[0.05] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.09] motion-reduce:transform-none">
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-400/20 text-brand-300 transition-colors group-hover:bg-[#E8B65C] group-hover:text-[#2c1f05]">
                  <Icon size={22} />
                </span>
                <h3 className={`${HEADING} font-bold`}>{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <Reveal as="section" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">How it works</p>
          <h2 className={`${HEADING} mt-3 text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl`}>From quote to delivery in four steps</h2>
        </div>
        <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <div className="absolute left-[12%] right-[12%] top-6 hidden border-t-2 border-dashed border-brand-200 lg:block" aria-hidden="true" />
          {HOW_IT_WORKS.map((step, index) => (
            <li key={step.title} className="relative">
              <span className={`${HEADING} relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand-700 text-lg font-extrabold text-white shadow-lg shadow-brand-900/20 ring-4 ring-white`}>{index + 1}</span>
              <h3 className={`${HEADING} font-bold text-gray-950`}>{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{step.description}</p>
            </li>
          ))}
        </ol>
      </Reveal>

      {/* ---------- Talk to us ---------- */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <Reveal className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#102E27] via-brand-800 to-brand-600 px-6 py-12 text-white sm:px-12">
          <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[36px] border-white/[0.06]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className={`${HEADING} text-3xl font-extrabold tracking-tight`}>Not sure which service fits?</h2>
              <p className="mt-3 text-white/75">Message or call us and we will help you choose the right way to ship.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-gray-950 transition-transform hover:-translate-y-0.5">
                <FiMessageCircle size={17} /> Chat on WhatsApp
              </a>
              <a href={`tel:${phoneTel}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-bold transition-colors hover:bg-white/10">
                <FiPhone size={16} /> {phoneText}
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- About and FAQ (unchanged) ---------- */}
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