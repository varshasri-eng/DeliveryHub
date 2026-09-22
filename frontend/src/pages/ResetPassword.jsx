import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth";
import toast from "react-hot-toast";
import { FiHome, FiLock, FiCheckCircle } from "react-icons/fi";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email)  return toast.error("Missing email. Open the link from your email again.");
    if (!token)  return toast.error("Missing reset token. Open the link from your email again.");
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setLoading(true);
    try {
      await resetPassword(email, token, password);
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not reset your password.");
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
        </div>

        <div className="card">
          {done ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14
                              rounded-2xl bg-green-50 text-green-600 mb-4">
                <FiCheckCircle size={28} />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Password updated!</h2>
              <p className="text-sm text-gray-500 mb-6">
                Your password has been changed. You can now sign in with your new password.
              </p>
              <button className="btn-primary w-full" onClick={() => navigate("/login")}>
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Set a new password</h2>
              <p className="text-sm text-gray-500 mb-6">
                Choose a new password for your TajaMeat account.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">New Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-2.5 text-gray-400" size={15} />
                    <input
                      type="password"
                      className="input pl-9"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-2.5 text-gray-400" size={15} />
                    <input
                      type="password"
                      className="input pl-9"
                      placeholder="Re-enter your password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? "Saving…" : "Reset Password"}
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
