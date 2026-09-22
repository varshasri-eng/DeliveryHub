import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { FiShield, FiMail, FiArrowRight, FiLock } from "react-icons/fi";

export default function AdminLogin() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();

  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Enter your email.");
    if (!password)     return toast.error("Enter your password.");
    setLoading(true);
    setAccessDenied(false);
    try {
      const res = await login(email.trim(), password);
      const customer = res.data.customer;

      // strict role check — only admins get through
      if (customer.role !== "admin") {
        setAccessDenied(true);
        setPassword("");
        setLoading(false);
        return;
      }

      signIn(res.data.token, customer);
      toast.success(`Welcome, ${customer.name}.`);
      navigate("/admin/customers");
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-900">

      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gray-800
                      border-r border-gray-700 p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
            <FiShield className="text-white text-lg" />
          </div>
          <span className="text-white font-bold text-xl">TajaMeat</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Staff Portal
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Manage customers, products, inventory and orders
            for our Dublin, San Ramon, Pleasanton, Livermore, Lathrop &amp; Manteca delivery operations.
          </p>
        </div>

        <div className="space-y-3">
          {[
            "Customer management",
            "Order tracking",
            "Inventory control",
            "Delivery zone management",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
              <span className="text-gray-400 text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
              <FiShield className="text-white" />
            </div>
            <span className="text-white font-bold text-lg">TajaMeat Staff</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Sign in</h2>
          <p className="text-gray-400 text-sm mb-8">
            Staff access only. Enter your registered email and password.
          </p>

          {/* Access denied banner */}
          {accessDenied && (
            <div className="flex items-start gap-3 bg-red-900/40 border border-red-700
                            rounded-xl px-4 py-3 mb-6">
              <FiLock className="text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-300 text-sm font-semibold">Access denied</p>
                <p className="text-red-400 text-xs mt-0.5">
                  This portal is restricted to staff accounts only.
                  Contact your administrator.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-2.5 text-gray-500" />
                <input
                  type="email"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg
                             pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-500
                             focus:outline-none focus:ring-2 focus:ring-brand-500
                             focus:border-transparent"
                  placeholder="staff@tajameat.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-2.5 text-gray-500" />
                <input
                  type="password"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg
                             pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-500
                             focus:outline-none focus:ring-2 focus:ring-brand-500
                             focus:border-transparent"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="mt-2 text-xs text-gray-500 hover:text-brand-400 transition-colors">
                Forgot password?
              </button>
            </div>

            <button type="submit"
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold
                         py-2.5 rounded-lg transition-colors flex items-center
                         justify-center gap-2 disabled:opacity-50"
              disabled={loading}>
              {loading
                ? "Signing in…"
                : <><span>Sign In</span><FiArrowRight size={14} /></>}
            </button>
          </form>

          <p className="text-center text-xs text-gray-600 mt-8">
            Customer portal?{" "}
            <a href="/login" className="text-brand-500 hover:text-brand-400">
              Sign in here
            </a>
            {" · "}
            <a href="/admin/register" className="text-brand-500 hover:text-brand-400">
              Request access
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
