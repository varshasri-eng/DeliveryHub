import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { staffRegister } from "../../api/staff";
import toast from "react-hot-toast";
import { FiShield, FiArrowRight, FiCheckCircle, FiLock } from "react-icons/fi";

export default function AdminRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    whatsapp_number: "", note: "", password: "", confirm_password: "",
  });

  const set = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())  return toast.error("Name is required.");
    if (!form.phone.trim()) return toast.error("Phone is required.");
    if (!form.email.trim()) return toast.error("Email is required.");
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (form.password !== form.confirm_password)
      return toast.error("Passwords do not match.");
    setLoading(true);
    try {
      await staffRegister(form);
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-900">

      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2
                      bg-gray-800 border-r border-gray-700 p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
            <FiShield className="text-white text-lg" />
          </div>
          <span className="text-white font-bold text-xl">DeliveryHub</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Join the Team
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Submit your staff access request. An administrator will review
            and approve your account before you can sign in.
          </p>
        </div>

        {/* How it works */}
        <div className="space-y-4">
          <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold">
            How it works
          </p>
          {[
            { step: "1", label: "Submit your details below" },
            { step: "2", label: "Admin reviews your request" },
            { step: "3", label: "You receive access & can sign in" },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center
                              justify-center text-xs font-bold text-brand-400">
                {s.step}
              </div>
              <span className="text-gray-400 text-sm">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
              <FiShield className="text-white" />
            </div>
            <span className="text-white font-bold text-lg">DeliveryHub Staff</span>
          </div>

          {submitted ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-900/40 border border-green-700
                              rounded-full flex items-center justify-center mx-auto mb-6">
                <FiCheckCircle className="text-green-400 text-3xl" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Request submitted
              </h2>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                Your staff access request has been received. An administrator
                will review it and you'll be able to sign in once approved.
              </p>
              <button
                onClick={() => navigate("/admin/login")}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white
                           font-semibold py-2.5 rounded-lg transition-colors">
                Go to Staff Login
              </button>
            </div>
          ) : (
            /* ── Form ── */
            <>
              <h2 className="text-2xl font-bold text-white mb-1">
                Staff Access Request
              </h2>
              <p className="text-gray-400 text-sm mb-8">
                Fill in your details. An admin will review your request.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg
                               px-4 py-2.5 text-white text-sm placeholder-gray-500
                               focus:outline-none focus:ring-2 focus:ring-brand-500
                               focus:border-transparent"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={set("name")}
                  />
                </div>

                {/* Phone + WhatsApp */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg
                                 px-4 py-2.5 text-white text-sm placeholder-gray-500
                                 focus:outline-none focus:ring-2 focus:ring-brand-500
                                 focus:border-transparent"
                      placeholder="5101234567"
                      value={form.phone}
                      onChange={set("phone")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      WhatsApp
                    </label>
                    <input
                      type="tel"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg
                                 px-4 py-2.5 text-white text-sm placeholder-gray-500
                                 focus:outline-none focus:ring-2 focus:ring-brand-500
                                 focus:border-transparent"
                      placeholder="Same as phone"
                      value={form.whatsapp_number}
                      onChange={set("whatsapp_number")}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg
                               px-4 py-2.5 text-white text-sm placeholder-gray-500
                               focus:outline-none focus:ring-2 focus:ring-brand-500
                               focus:border-transparent"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={set("email")}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-2.5 text-gray-500" />
                    <input
                      type="password"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg
                                 pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-500
                                 focus:outline-none focus:ring-2 focus:ring-brand-500
                                 focus:border-transparent"
                      placeholder="At least 8 characters"
                      value={form.password}
                      onChange={set("password")}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-2.5 text-gray-500" />
                    <input
                      type="password"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg
                                 pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-500
                                 focus:outline-none focus:ring-2 focus:ring-brand-500
                                 focus:border-transparent"
                      placeholder="Re-enter your password"
                      value={form.confirm_password}
                      onChange={set("confirm_password")}
                      autoComplete="new-password"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    You'll use this password to sign in once an admin approves you.
                  </p>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Why do you need access?
                    <span className="text-gray-500 font-normal ml-1">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg
                               px-4 py-2.5 text-white text-sm placeholder-gray-500
                               focus:outline-none focus:ring-2 focus:ring-brand-500
                               focus:border-transparent resize-none"
                    placeholder="e.g. I will be managing international shipment bookings"
                    value={form.note}
                    onChange={set("note")}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white
                             font-semibold py-2.5 rounded-lg transition-colors
                             flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={loading}>
                  {loading
                    ? "Submitting…"
                    : <><span>Submit Request</span><FiArrowRight size={14} /></>}
                </button>
              </form>

              <p className="text-center text-xs text-gray-600 mt-6">
                Already approved?{" "}
                <a href="/admin/login" className="text-brand-500 hover:text-brand-400">
                  Sign in here
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
