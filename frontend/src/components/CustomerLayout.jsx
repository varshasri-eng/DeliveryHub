import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import { logout } from "../api/auth";
import toast from "react-hot-toast";
import {
  FiUser, FiMapPin, FiLogOut, FiHome,
  FiShoppingBag, FiUsers, FiBell, FiSettings,
  FiChevronRight, FiChevronLeft, FiTruck,
} from "react-icons/fi";
import { useState } from "react";
import BrandLogo from "./BrandLogo";
import Footer from "./Footer";

const NAV_ITEMS = [
  {
    section: "My Account",
    links: [
      { to: "/account/profile",   icon: <FiUser size={15} />,        label: "Profile" },
      { to: "/account/addresses", icon: <FiMapPin size={15} />,      label: "Addresses" },
      { to: "/account/shipments", icon: <FiShoppingBag size={15} />, label: "Shipments" },
    ],
  },
  {
    section: "Household",
    links: [
      { to: "/account/family",    icon: <FiUsers size={15} />,  label: "Family Group" },
    ],
  },
  {
    section: "Preferences",
    links: [
      { to: "/account/notifications", icon: <FiBell size={15} />,     label: "Notifications" },
      { to: "/account/settings",      icon: <FiSettings size={15} />, label: "Settings" },
    ],
  },
];

export default function CustomerLayout() {
  const { customer, signOut } = useAuth();
  const { settings } = useBranding();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try { await logout(); } catch (_) {}
    signOut();
    navigate("/login");
    toast.success("Logged out.");
  };

  const navClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
     group relative justify-start
     ${isActive
       ? "bg-brand-50 text-brand-700"
       : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`;

  const iconBox = "flex-shrink-0";

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className={`${collapsed ? "w-16" : "w-60"}
                        bg-white border-r border-gray-100 flex flex-col py-5 px-2
                        sticky top-0 h-screen overflow-y-auto transition-all duration-300`}>

        {/* Logo */}
        <div className={`flex items-center gap-2 mb-6 px-2 ${collapsed ? "justify-center px-0" : ""}`}>
          <BrandLogo size="sm" />
          {!collapsed && <span className="font-bold text-gray-900 whitespace-nowrap">{settings.site_name}</span>}
        </div>

        {/* Home (above My Account) */}
        <div className="mb-4">
          <NavLink to="/account/home" className={navClass}>
            {({ isActive }) => (
              <>
                <span className={`${iconBox} ${isActive ? "text-brand-500" : "text-gray-400 group-hover:text-gray-600"}`}>
                  <FiHome size={16} />
                </span>
                {!collapsed && <span className="flex-1">Home</span>}
                {!collapsed && isActive && (
                  <FiChevronRight size={12} className="text-brand-400 flex-shrink-0" />
                )}
              </>
            )}
          </NavLink>
        </div>

        {/* Customer avatar + info */}
        <div className={`mb-6 ${collapsed ? "mx-0" : "mx-2"} p-3 bg-gray-50 rounded-xl`}>
          <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center px-0" : ""}`}>
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center
                            flex-shrink-0 text-brand-600 font-bold text-sm">
              {(customer?.name || customer?.phone || "?")[0].toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {customer?.name && customer.name !== customer?.phone
                    ? customer.name
                    : "My Account"}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {customer?.email || customer?.phone}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 space-y-5">
          {NAV_ITEMS.map((section) => (
            <div key={section.section}>
              {!collapsed && (
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider
                              px-3 mb-1">
                  {section.section}
                </p>
              )}
              {collapsed && <div className="border-t border-gray-100 mb-2 mx-2" />}
              <div className="space-y-0.5">
                {section.links.map((link) => (
                  <NavLink key={link.to} to={link.to} className={navClass}>
                    {({ isActive }) => (
                      <>
                        <span className={`${iconBox} ${isActive ? "text-brand-500" : "text-gray-400 group-hover:text-gray-600"}`}>
                          {link.icon}
                        </span>
                        {!collapsed && <span className="flex-1">{link.label}</span>}
                        {!collapsed && isActive && (
                          <FiChevronRight size={12} className="text-brand-400 flex-shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-gray-400
                     hover:bg-gray-50 hover:text-gray-600 rounded-lg transition-colors mb-1">
          {collapsed
            ? <FiChevronRight size={15} className="flex-shrink-0 mx-auto" />
            : <><FiChevronLeft size={15} className="flex-shrink-0" /> Collapse</>}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-500
                     hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
          <FiLogOut size={15} className="flex-shrink-0" />
          {!collapsed && "Sign out"}
        </button>
      </aside>

      {/* ── Main column: slim top bar + content + footer ─── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Slim top bar — sidebar already handles account navigation,
            so this stays minimal: quick way back to shipping services,
            and a notifications shortcut, rather than duplicating the
            sidebar's own links. */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="flex items-center justify-end gap-2 px-8 h-14">
            <Link
              to="/services"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500
                         hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg
                         hover:bg-gray-50">
              <FiTruck size={14} />
              Book a shipment
            </Link>
            <Link
              to="/account/notifications"
              className="text-gray-400 hover:text-gray-700 transition-colors p-2 rounded-lg
                         hover:bg-gray-50"
              aria-label="Notifications">
              <FiBell size={16} />
            </Link>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}