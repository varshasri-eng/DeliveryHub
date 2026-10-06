import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/auth";
import toast from "react-hot-toast";
import { FiHome, FiMail, FiArrowRight, FiCheckCircle } from "react-icons/fi";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Enter your email address.");
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "Something went wrong. Try again.");
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
          <h1 className="text-2xl font-bold text-gray-900">DeliveryHub</h1>
        </div>

        <div className="card">
          {sent ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14
                              rounded-2xl bg-green-50 text-green-600 mb-4">
                <FiCheckCircle size={28} />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Check your email</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                If an account exists for <span className="font-semibold text-gray-700">{email.trim()}</span>,
                we've sent a password-reset link to it. The link expires in 60 minutes.
              </p>
              <p className="text-xs text-gray-400 mt-3">
                (Dev mode: the link is printed in the backend console)
              </p>
              <Link to="/login" className="block text-sm text-brand-600 font-semibold hover:underline mt-6">
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Forgot your password?</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter the email on your account and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email Address</label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="email"
                      className="input pl-9"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                      autoComplete="email"
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                  {loading ? "Sending…" : <><span>Send Reset Link</span><FiArrowRight /></>}
                </button>
              </form>
              <Link to="/login" className="block text-center text-sm text-brand-600 font-semibold hover:underline mt-4">
                ← Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
