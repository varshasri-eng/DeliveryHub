import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { FiArrowUpRight, FiMenu, FiX } from "react-icons/fi";
import { useBranding } from "../context/BrandingContext";
import BrandLogo from "./BrandLogo";
import Footer from "./Footer";

export default function GuestLayout() {
  const { settings } = useBranding();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="sticky top-0 z-40 border-b border-white/70 bg-white/90 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.4)] backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandLogo size="md" />
            <span className="text-lg font-bold text-gray-900 tracking-tight hidden sm:block">
              {settings.site_name}
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <Link
              to="/"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                location.pathname === "/" ? "bg-brand-50 text-brand-800" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              Home
            </Link>
            <Link
              to="/services"
              className="rounded-full px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              Shipping services
            </Link>
            <Link
              to="/track"
              className="rounded-full px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              Track Shipment
            </Link>
            <Link
              to="/#about-us"
              className="rounded-full px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              About
            </Link>
            <Link
              to="/#faqs"
              className="rounded-full px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              FAQs
            </Link>
            <Link
              to="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              Sign in
            </Link>
            <Link
              to="/services"
              className="ml-2 inline-flex items-center gap-2 rounded-full bg-gray-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-gray-900/10 transition hover:-translate-y-0.5 hover:bg-brand-800"
            >
              Book a shipment <FiArrowUpRight size={16} />
            </Link>
          </div>

          <button type="button" onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-700 md:hidden">
            {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 py-3 shadow-lg md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {[
                ["/", "Home"],
                ["/services", "Shipping services"],
                ["/track", "Track shipment"],
                ["/#about-us", "About"],
                ["/#faqs", "FAQs"],
                ["/login", "Sign in"],
              ].map(([to, label]) => (
                <Link key={to} to={to} onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-800">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1">
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}