import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { BrandingProvider } from "./context/BrandingContext";
import WhatsAppPlaceholder from "./components/WhatsAppPlaceholder";

// Public pages: the home page loads at once, every other page loads only when it is opened
import LandingPage from "./pages/LandingPage";

// Auth pages
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminRegister = lazy(() => import("./pages/admin/AdminRegister"));

// Customer account pages
const Home = lazy(() => import("./pages/account/Home"));
const Profile = lazy(() => import("./pages/account/Profile"));
const Addresses = lazy(() => import("./pages/account/Addresses"));
const Shipments = lazy(() => import("./pages/account/Shipments"));
const FamilyGroup = lazy(() => import("./pages/account/FamilyGroup"));
const Notifications = lazy(() => import("./pages/account/Notifications"));
const Settings = lazy(() => import("./pages/account/Settings"));

// Admin pages
const CustomerList = lazy(() => import("./pages/admin/CustomerList"));
const CustomerDetail = lazy(() => import("./pages/admin/CustomerDetail"));
const StaffManagement = lazy(() => import("./pages/admin/StaffManagement"));
const AdminBrandingPage = lazy(() => import("./pages/admin/AdminBrandingPage"));
const PaymentSettingsPage = lazy(() => import("./pages/admin/PaymentSettingsPage"));

// Layouts
import CustomerLayout from "./components/CustomerLayout";
import AdminLayout    from "./components/AdminLayout";
import GuestLayout    from "./components/GuestLayout";
const PageView = lazy(() => import("./pages/PageView"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const ServiceDetailPage = lazy(() => import("./pages/ServiceDetailPage"));
const BookShipmentPage = lazy(() => import("./pages/BookShipmentPage"));
const AdminPages = lazy(() => import("./pages/admin/AdminPages"));
const AdminShipments = lazy(() => import("./pages/admin/AdminShipments"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads"));
const AdminRevenue = lazy(() => import("./pages/admin/AdminRevenue"));
const AdminServices = lazy(() => import("./pages/admin/AdminServices"));
const AdminOffers = lazy(() => import("./pages/admin/AdminOffers"));
const TrackShipmentPage = lazy(() => import("./pages/TrackShipmentPage"));

// The WhatsApp chat button is for visitors and customers, not the admin panel
function ChatButton() {
  const { pathname } = useLocation();
  return pathname.startsWith("/admin") ? null : <WhatsAppPlaceholder />;
}

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
      <>
      <Suspense fallback={<div className="min-h-[60vh]" />}>
      <Routes>

        {/* ── Public (no auth) ───────────────────────── */}
        <Route element={<GuestLayout />}>
          <Route path="/"          element={<LandingPage />} />
          <Route path="/pages/:slug" element={<PageView />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:slug" element={<ServiceDetailPage />} />
          <Route path="/services/:slug/book" element={<BookShipmentPage />} />
          <Route path="/track" element={<TrackShipmentPage />} />
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
          <Route path="leads" element={<AdminLeads />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="shipments" element={<AdminShipments />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="offer-codes" element={<AdminOffers />} />
          <Route path="pages" element={<AdminPages />} />
        </Route>

        {/* ── Defaults ────────────────────────────────── */}
        <Route path="*"  element={<Navigate to="/" replace />} />

      </Routes>
      </Suspense>
      <ChatButton />
      </>
      </BrandingProvider>
    </AuthProvider>
  );
}