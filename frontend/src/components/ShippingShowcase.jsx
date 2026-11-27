import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiActivity, FiAnchor, FiArrowRight, FiCheckCircle, FiFileText, FiGift, FiPackage, FiSend,
} from "react-icons/fi";
import Reveal from "./Reveal";
import OfferBanner from "./OfferBanner";
import { useBranding } from "../context/BrandingContext";
import { formatMoney } from "../utils/money";

// Shared by the public home page and the signed-in customer home, so both always look alike.


// Heading font (Manrope is loaded in index.html; falls back to Inter).
export const HEADING = "font-[family-name:Manrope,Inter,sans-serif]";

export const DIRECTIONS = [
  { id: "US_TO_IN", from: "USA", to: "India", label: "United States to India", short: "USA → India", summary: "Documents and personal goods" },
  { id: "IN_TO_US", from: "India", to: "USA", label: "India to United States", short: "India → USA", summary: "Personal and medical shipping" },
];

// Which services are shown first for each direction, in this order.
const PRIORITY = {
  US_TO_IN: ["documents", "air", "sea"],
  IN_TO_US: ["personal", "medical"],
};

// Looks at a service's slug and name to decide what kind of service it is.
export function categoryOf(service) {
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
// Turn each one on (true) after its photo is in frontend/public/images/services/.
export const PHOTOS = { documents: true, air: true, sea: true, personal: true, medical: false, other: false };
// Hero photo, used when no hero banner is uploaded in Admin > Branding. Set to "" to show the illustration.
export const HERO_PHOTO = "/images/hero.jpg";
export const VISUALS = {
  documents: {
    Icon: FiFileText,
    pos: "65% 60%",
    gradient: "from-[#102E27] via-brand-800 to-brand-600",
    blurb: "Send important papers with tracking and a price shown before you book.",
  },
  air: {
    Icon: FiSend,
    pos: "center 45%",
    gradient: "from-[#0f3b4a] via-[#1b6a78] to-brand-500",
    blurb: "Speed-first shipping for personal goods and parcels.",
  },
  sea: {
    Icon: FiAnchor,
    pos: "center 55%",
    gradient: "from-[#13304f] via-[#2a5d86] to-[#5fa3b8]",
    blurb: "An economical option for eligible shipments that are not urgent.",
  },
  personal: {
    Icon: FiGift,
    pos: "center 30%",
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
        <div className={`relative overflow-hidden bg-gradient-to-br ${visual.gradient} ${wide ? "min-h-[220px] md:min-h-full md:w-2/5" : "h-52"}`}>
          {PHOTOS[category] && (
            <>
              <img src={`/images/services/${category}.jpg`} alt="" loading="lazy"
                style={{ objectPosition: visual.pos || "center" }}
                onError={(event) => { event.currentTarget.style.display = "none"; }}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-black/25" />
            </>
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

// The dark green hero with the route buttons.
// variant "landing" = full-width page hero; "account" = rounded card for the signed-in home.
export function ShippingHero({ direction, onDirectionChange, variant = "landing", title, subtitle }) {
  const navigate = useNavigate();
  const { settings } = useBranding();
  const compact = variant === "account";
  const heroImage = settings.hero_banner_url || HERO_PHOTO;
  const routeLabel = DIRECTIONS.find((option) => option.id === direction)?.label;

  return (
    <>
    <section className={`relative isolate overflow-hidden bg-[#102E27] text-white ${compact ? "rounded-[2rem] shadow-xl shadow-brand-900/15" : ""}`}>
      <div className="pointer-events-none absolute -right-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-brand-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-56 -left-40 h-[30rem] w-[30rem] rounded-full bg-[#E8B65C]/10 blur-3xl" />
      <div className={compact
        ? "relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"
        : "relative mx-auto grid max-w-7xl gap-12 px-4 pb-24 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-28 lg:pt-24"}>
        <div className="page-hero-copy">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-200">
            <FiSend size={14} /> {settings.site_name} · USA ↔ India
          </div>
          <h1 className={`${HEADING} max-w-2xl font-extrabold leading-[1.08] tracking-[-0.035em] ${compact ? "text-3xl sm:text-4xl" : "text-4xl leading-[1.06] sm:text-5xl lg:text-6xl"}`}>
            {title || (<>Send with confidence. <span className="text-brand-300">Across borders, with ease.</span></>)}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
            {subtitle || "Reliable shipping between the United States and India. Find the right service, compare prices and book your shipment online."}
          </p>

          <div className="mt-9 max-w-2xl">
            <p className="mb-3 text-sm font-bold text-white">Where are you shipping?</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {DIRECTIONS.map((option) => {
                const selected = direction === option.id;
                return (
                  <button key={option.id} type="button"
                    onClick={() => onDirectionChange(option.id)}
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

        <div className={`relative mx-auto w-full max-w-xl page-hero-art ${compact ? "hidden lg:block" : ""}`}>
          {heroImage ? (
            <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] bg-brand-900 shadow-2xl shadow-black/30 sm:min-h-[460px]">
              <img src={heroImage} alt="DeliveryHub international shipping"
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
      {!compact && (
        <svg className="absolute bottom-0 left-0 w-full text-[#f5f8f6]" viewBox="0 0 1440 48" preserveAspectRatio="none" aria-hidden="true">
        <path fill="currentColor" d="M0 48V20C240 0 480 0 720 14s480 20 720 0v34H0Z" />
      </svg>
      )}
    </section>
    <OfferBanner compact={compact} />
    </>
  );
}

// Service cards for the chosen route: documents first for USA to India, personal then medical for India to USA.
export function ServicesShowcase({ services, loading, error, direction, onDirectionChange, variant = "landing" }) {
  const compact = variant === "account";
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

  return (
    <section id="services" className={compact ? "mt-10 scroll-mt-24" : "scroll-mt-20 bg-[#f5f8f6] pb-20 pt-10 sm:pt-14"}>
      <div className={compact ? "" : "mx-auto max-w-7xl px-4 sm:px-6"}>
        <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">Shipping services</p>
            <h2 className={`${HEADING} mt-3 font-extrabold tracking-tight text-gray-950 ${compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"}`}>
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
              <button key={option.id} type="button" onClick={() => onDirectionChange(option.id)}
                aria-pressed={direction === option.id}
                className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                  direction === option.id ? "bg-gray-950 text-white" : "text-gray-600 hover:text-gray-950"
                }`}>
                {option.short}
              </button>
            ))}
          </div>
        </Reveal>

        {loading ? (
          <div aria-busy="true" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-72 animate-pulse rounded-3xl bg-white" />)}
          </div>
        ) : error ? (
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
  );
}