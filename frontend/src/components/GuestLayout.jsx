import { Outlet, Link } from "react-router-dom";
import { useBranding } from "../context/BrandingContext";
import BrandLogo from "./BrandLogo";
import Footer from "./Footer";

export default function GuestLayout() {
  const { settings } = useBranding();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandLogo size="md" />
            <span className="text-lg font-bold text-gray-900 tracking-tight hidden sm:block">
              {settings.site_name}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors px-3 py-2"
            >
              Home
            </Link>
            <Link
              to="/services"
              className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold
                         px-4 py-2.5 rounded-full transition-colors"
            >
              Book Shipment
            </Link>
            <Link
              to="/track"
              className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold
                         px-4 py-2.5 rounded-full transition-colors"
            >
              Track Shipment
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
