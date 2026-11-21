import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FiAnchor, FiArrowRight, FiClipboard, FiHeadphones, FiMapPin, FiMessageCircle, FiPhone, FiSend, FiTag,
} from "react-icons/fi";
import { getServices } from "../api/services";
import api from "../api/client";
import StaticPageContent from "../components/StaticPageContent";
import Reveal from "../components/Reveal";
import { ShippingHero, ServicesShowcase, HEADING, PHOTOS, VISUALS, categoryOf } from "../components/ShippingShowcase";
import { useBranding } from "../context/BrandingContext";
import usePageMeta from "../utils/pageMeta";

const WHATSAPP_URL = "https://wa.me/15107146946";
const PHONE_DISPLAY = "+1 510 714 6946";
const PHONE_TEL = "+15107146946";

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

export default function LandingPage() {
  usePageMeta(
    "DeliveryHub | Shipping Between the USA and India: Air Cargo, Documents and Courier",
    "Ship parcels, documents and personal items between the USA and India with DeliveryHub. Air cargo and courier with FedEx, DHL and UPS, clear prices, online booking and shipment tracking."
  );
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
  const airService = services.find((service) => service.route_direction === "US_TO_IN" && categoryOf(service) === "air");
  const seaService = services.find((service) => service.route_direction === "US_TO_IN" && categoryOf(service) === "sea");

  return (
    <div className="bg-white">
      <ShippingHero direction={direction} onDirectionChange={setDirection} />
      <ServicesShowcase services={services} loading={servicesLoading} error={serviceLoadError}
        direction={direction} onDirectionChange={setDirection} />

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
            <div key={method.key} className={`group relative min-h-[340px] overflow-hidden rounded-3xl bg-gradient-to-br ${method.gradient} p-8 text-white shadow-xl shadow-brand-900/10`}>
              {PHOTOS[method.key] && (
                <>
                  <img src={`/images/services/${method.key}.jpg`} alt="" loading="lazy"
                    onError={(event) => { event.currentTarget.style.display = "none"; }}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/55 to-black/15" />
                </>
              )}
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