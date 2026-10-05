import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { BrandingProvider } from "./context/BrandingContext";

// Public pages
import LandingPage from "./pages/LandingPage";

// Auth pages
import Login         from "./pages/Login";
import Register      from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminLogin    from "./pages/admin/AdminLogin";
import AdminRegister from "./pages/admin/AdminRegister";

// Customer account pages
import Home          from "./pages/account/Home";
import Profile       from "./pages/account/Profile";
import Addresses     from "./pages/account/Addresses";
import Shipments from "./pages/account/Shipments";
import FamilyGroup   from "./pages/account/FamilyGroup";
import Notifications from "./pages/account/Notifications";
import Settings      from "./pages/account/Settings";

// Admin pages
import CustomerList    from "./pages/admin/CustomerList";
import CustomerDetail  from "./pages/admin/CustomerDetail";
import StaffManagement from "./pages/admin/StaffManagement";
import AdminBrandingPage from "./pages/admin/AdminBrandingPage";
import PaymentSettingsPage from "./pages/admin/PaymentSettingsPage";

// Layouts
import CustomerLayout from "./components/CustomerLayout";
import AdminLayout    from "./components/AdminLayout";
import GuestLayout    from "./components/GuestLayout";
import PageView from "./pages/PageView";
import ServicesPage from "./pages/ServicesPage";
import ServiceDetailPage from "./pages/ServiceDetailPage";
import BookShipmentPage from "./pages/BookShipmentPage";
import AdminPages from "./pages/admin/AdminPages";
import AdminShipments from "./pages/admin/AdminShipments";
import AdminServices from "./pages/admin/AdminServices";

const Loader = () => (
  <div className="flex items-center justify-center h-screen text-gray-400">
    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
    Loading…
  </div>
);

// ── Customer route guard ─────────────────────────────────────
function ProtectedRoute({ children }) {
  const { customer, loading } = useAuth();
  if (loading) return <Loader />;
  return customer ? children : <Navigate to="/login" replace />;
}

// ── Admin route guard ────────────────────────────────────────
function AdminRoute({ children }) {
  const { customer, loading } = useAuth();
  if (loading) return <Loader />;
  if (!customer)                 return <Navigate to="/admin/login" replace />;
  if (customer.role !== "admin") return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrandingProvider>
      <Routes>

        {/* ── Public (no auth) ───────────────────────── */}
        <Route element={<GuestLayout />}>
          <Route path="/"          element={<LandingPage />} />
          <Route path="/pages/:slug" element={<PageView />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:slug" element={<ServiceDetailPage />} />
          <Route path="/services/:slug/book" element={<BookShipmentPage />} />
        </Route>

        {/* ── Customer auth ──────────────────────────── */}
        <Route path="/login"           element={<Login />} />
        <Route path="/register"        element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />

        {/* ── Customer protected ──────────────────────── */}
        <Route path="/account" element={
          <ProtectedRoute><CustomerLayout /></ProtectedRoute>
        }>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home"          element={<Home />} />
          <Route path="profile"       element={<Profile />} />
          <Route path="addresses"     element={<Addresses />} />
          <Route path="shipments" element={<Shipments />} />
          <Route path="family"        element={<FamilyGroup />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings"      element={<Settings />} />
        </Route>

        {/* ── Admin login — completely separate ───────── */}
        <Route path="/admin/login"    element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />

        {/* ── Admin protected ─────────────────────────── */}
        <Route path="/admin" element={
          <AdminRoute><AdminLayout /></AdminRoute>
        }>
          <Route index element={<Navigate to="customers" replace />} />
          <Route path="customers"     element={<CustomerList />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="staff"         element={<StaffManagement />} />
          <Route path="branding"      element={<AdminBrandingPage />} />
          <Route path="payment-settings" element={<PaymentSettingsPage />} />
          <Route path="shipments" element={<AdminShipments />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="pages" element={<AdminPages />} />
        </Route>

        {/* ── Defaults ────────────────────────────────── */}
        <Route path="*"  element={<Navigate to="/" replace />} />

      </Routes>
      </BrandingProvider>
    </AuthProvider>
  );
}
