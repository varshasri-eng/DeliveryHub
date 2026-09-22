import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import { logout } from "../api/auth";
import toast from "react-hot-toast";
import {
  FiUsers,
  FiLogOut,
  FiHome,
  FiShield,
  FiSearch,
  FiDroplet,
  FiPackage,
  FiTruck,
  FiCreditCard,
} from "react-icons/fi";
import BrandLogo from "./BrandLogo";

export default function AdminLayout() {
  const { customer, signOut } = useAuth();
  const { settings } = useBranding();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await logout(); } catch (_) {}
    signOut();
    navigate("/admin/login");
    toast.success("Logged out.");
  };

  const navClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
     ${isActive
       ? "bg-brand-50 text-brand-700 shadow-sm"
       : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col p-4">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-1 px-1">
          <BrandLogo size="sm" />
          <span className="font-bold text-lg text-gray-900">{settings.site_name}</span>
        </div>
        <span className="inline-flex self-start mx-1.5 mb-6 px-2 py-0.5 rounded-full
                         bg-purple-50 text-purple-600 text-xs font-semibold">
          Admin Panel
        </span>

        {/* Admin info */}
        <div className="mb-6 p-3 bg-gray-50 rounded-xl flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center
                          text-purple-700 font-bold text-sm flex-shrink-0">
            {(customer?.name || "A")[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{customer?.name}</p>
            <p className="text-xs text-gray-400 truncate">{customer?.email}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          <NavLink to="/admin/customers" className={navClass}>
            <FiUsers /> Customers
          </NavLink>
          <NavLink to="/admin/orders" className={navClass}>
            <FiPackage /> Orders
          </NavLink>
          <NavLink to="/admin/delivery-rules" className={navClass}>
            <FiTruck /> Delivery Rules
          </NavLink>
          <NavLink to="/admin/staff" className={navClass}>
            <FiShield /> Staff
          </NavLink>
          <NavLink to="/admin/search" className={navClass}>
            <FiSearch /> Search Insights
          </NavLink>
          <NavLink to="/admin/branding" className={navClass}>
            <FiDroplet /> Branding
          </NavLink>
          <NavLink to="/admin/payment-settings" className={navClass}>
            <FiCreditCard /> Payment Settings
          </NavLink>
          <NavLink to="/admin/pages" className={navClass}>
            Pages
          </NavLink>
        </nav>

        {/* Logout */}
        <button onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-500
                     hover:bg-red-50 rounded-xl transition-colors mt-4">
          <FiLogOut /> Logout
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}