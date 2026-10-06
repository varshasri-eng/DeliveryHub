import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/auth";
import toast from "react-hot-toast";
import { FiHome, FiArrowRight, FiUser, FiPhone, FiMail, FiLock, FiMessageCircle } from "react-icons/fi";

export default function Register() {
  const navigate   = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    whatsapp_number: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const [sameAsPhone, setSameAsPhone] = useState(false);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSameAsPhone = (e) => {
    const checked = e.target.checked;
    setSameAsPhone(checked);
    if (checked) {
      setForm((prev) => ({ ...prev, whatsapp_number: prev.phone }));
    }
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setForm((prev) => ({
      ...prev,
      phone: val,
      whatsapp_number: sameAsPhone ? val : prev.whatsapp_number,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name.trim())        return toast.error("Full name is required.");
    if (!form.phone.trim())       return toast.error("Phone number is required.");
    if (!form.email.trim())       return toast.error("Email is required.");
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (form.password !== form.confirm_password)
      return toast.error("Passwords do not match.");
    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        whatsapp_number: form.whatsapp_number.trim() || form.phone.trim(),
        password: form.password,
      });
      toast.success("Account created! Sign in with your new password.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14
                          bg-brand-500 rounded-2xl mb-4 shadow-lg shadow-brand-200">
            <FiHome className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">Create an account to book and manage your international shipments.</p>
        </div>

        <form onSubmit={handleRegister} className="card space-y-5">

          {/* Name */}
          <div>
            <label className="label">
              Full Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-2.5 text-gray-400" size={15} />
              <input
                className="input pl-9"
                placeholder="Jane Doe"
                type="text"
                value={form.name}
                onChange={set("name")}
                autoComplete="name"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="label">
              Phone Number <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <FiPhone className="absolute left-3 top-2.5 text-gray-400" size={15} />
              <input
                className="input pl-9"
                placeholder="5101234567"
                type="tel"
                value={form.phone}
                onChange={handlePhoneChange}
                autoComplete="tel"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="label">WhatsApp Number</label>
            <div className="relative">
              <FiMessageCircle className="absolute left-3 top-2.5 text-gray-400" size={15} />
              <input
                className="input pl-9 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="5101234567"
                type="tel"
                value={form.whatsapp_number}
                onChange={set("whatsapp_number")}
                disabled={sameAsPhone}
                autoComplete="tel"
              />
            </div>
            <label className="flex items-center gap-2 mt-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={sameAsPhone}
                onChange={handleSameAsPhone}
                className="w-4 h-4 rounded border-gray-300 text-brand-500
                           focus:ring-brand-400 accent-brand-500"
              />
              <span className="text-sm text-gray-500">Same as phone number</span>
            </label>
          </div>

          {/* Email */}
          <div>
            <label className="label">
              Email Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-2.5 text-gray-400" size={15} />
              <input
                className="input pl-9"
                placeholder="you@example.com"
                type="email"
                value={form.email}
                onChange={set("email")}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="label">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-2.5 text-gray-400" size={15} />
              <input
                className="input pl-9"
                placeholder="At least 8 characters"
                type="password"
                value={form.password}
                onChange={set("password")}
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="label">
              Confirm Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-2.5 text-gray-400" size={15} />
              <input
                className="input pl-9"
                placeholder="Re-enter your password"
                type="password"
                value={form.confirm_password}
                onChange={set("confirm_password")}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            disabled={loading}>
            {loading
              ? <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating account…
                </span>
              : <><span>Create Account</span><FiArrowRight size={15} /></>}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}