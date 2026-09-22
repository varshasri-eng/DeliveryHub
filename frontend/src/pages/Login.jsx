import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { FiHome, FiMail, FiLock, FiArrowRight } from "react-icons/fi";

export default function Login() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [loading, setLoading]       = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier.trim())  return toast.error("Enter your email or phone.");
    if (!password)           return toast.error("Enter your password.");
    setLoading(true);
    try {
      const res = await login(identifier.trim(), password);
      signIn(res.data.token, res.data.customer);
      toast.success(`Welcome back, ${res.data.customer.name}!`);
      navigate(res.data.customer.role === "admin" ? "/admin/customers" : "/account/profile");
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid email/phone or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14
                          bg-brand-500 rounded-2xl mb-4 shadow-lg">
            <FiHome className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">TajaMeat</h1>
          <p className="text-gray-500 text-sm mt-1">
            Local delivery for Dublin, San Ramon, Pleasanton, Livermore, Lathrop &amp; Manteca
          </p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">
            Sign in to your account
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email or Phone</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  className="input pl-9"
                  placeholder="your@email.com or phone"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label !mb-0">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-brand-600 font-semibold hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <FiLock className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="password"
                  className="input pl-9"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              {loading ? "Signing in…" : <><span>Sign In</span><FiArrowRight /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-brand-600 font-semibold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
