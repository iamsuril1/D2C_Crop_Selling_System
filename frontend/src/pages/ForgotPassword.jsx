import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AlertModal from "../components/AlertModal";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step,            setStep]            = useState(1);
  const [email,           setEmail]           = useState("");
  const [otp,             setOtp]             = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading,         setLoading]         = useState(false);
  const [resendCooldown,  setResendCooldown]  = useState(0);

  const [alertModal, setAlertModal] = useState({ isOpen: false, type: "", title: "", message: "" });

  const showAlert = (title, message, type = "error") =>
    setAlertModal({ isOpen: true, title, message, type });

  const closeAlert = () =>
    setAlertModal((prev) => ({ ...prev, isOpen: false }));

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) { clearInterval(interval); return 0; }
        return v - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      showAlert("Validation Error", "Email is required.", "warning");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/forgot-password/send-otp", { email: email.trim() });
      setStep(2);
      startCooldown();
    } catch (err) {
      showAlert("Failed to Send OTP", err.response?.data?.message || "Failed to send OTP.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      showAlert("Validation Error", "Enter the OTP.", "warning");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/forgot-password/verify-otp", { email, code: otp.trim() });
      setStep(3);
    } catch (err) {
      showAlert("Invalid OTP", err.response?.data?.message || "Invalid or expired OTP.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      showAlert("Validation Error", "Both fields are required.", "warning");
      return;
    }
    if (newPassword.length < 6) {
      showAlert("Validation Error", "Password must be at least 6 characters.", "warning");
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert("Validation Error", "Passwords do not match.", "warning");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/forgot-password/reset", { email, code: otp, newPassword });
      navigate("/login", { state: { message: "Password reset! Please login." } });
    } catch (err) {
      showAlert("Reset Failed", err.response?.data?.message || "Failed to reset password.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.post("/api/forgot-password/send-otp", { email });
      startCooldown();
    } catch (err) {
      showAlert("Resend Failed", err.response?.data?.message || "Failed to resend OTP.", "error");
    }
  };

  const stepLabels = ["Email", "Verify OTP", "New Password"];

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8 font-[Poppins]">

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
      />

      <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-10 space-y-5 sm:space-y-6 border border-gray-100">

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-2">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center relative">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${
                  step > i + 1
                    ? "bg-green-600 text-white"
                    : step === i + 1
                    ? "bg-green-600 text-white ring-4 ring-green-100"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {step > i + 1 ? (
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {/* Label: always visible on sm+, hidden on xs to avoid overflow */}
              <span
                className={`hidden sm:block text-xs mt-1 ${
                  step === i + 1 ? "text-green-700 font-semibold" : "text-gray-400"
                }`}
              >
                {label}
              </span>
              {/* Condensed label on mobile */}
              <span
                className={`sm:hidden text-[10px] mt-1 text-center leading-tight ${
                  step === i + 1 ? "text-green-700 font-semibold" : "text-gray-400"
                }`}
              >
                {label.split(" ").map((w, wi) => (
                  <span key={wi} className="block">{w}</span>
                ))}
              </span>
              {i < stepLabels.length - 1 && (
                <div
                  className={`absolute top-3.5 sm:top-4 left-1/2 w-full h-0.5 ${
                    step > i + 1 ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Email */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4 sm:space-y-5">
            <div className="text-center space-y-1">
              <h2 className="font-[Montserrat] text-xl sm:text-2xl font-bold text-[#1E9C17]">
                Forgot Password
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                Enter your registered email to receive an OTP
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                /* text-base prevents iOS auto-zoom on focus */
                className="w-full border-2 border-green-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#1E9C17] to-[#27AE60] text-white py-3 rounded-2xl font-semibold shadow-lg active:scale-95 sm:hover:scale-105 transition disabled:opacity-60"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>

            <p className="text-center text-sm text-gray-600">
              Remember your password?{" "}
              <span
                onClick={() => navigate("/login")}
                className="text-[#1E9C17] cursor-pointer font-medium hover:underline"
              >
                Login
              </span>
            </p>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 sm:space-y-5">
            <div className="text-center space-y-1">
              <h2 className="font-[Montserrat] text-xl sm:text-2xl font-bold text-[#1E9C17]">
                Check Your Email
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                We sent a 6-digit code to{" "}
                <strong className="break-all">{email}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="w-full text-center text-2xl sm:text-3xl font-bold tracking-[0.3em] sm:tracking-[0.5em] border-2 border-green-200 rounded-xl py-3 sm:py-4 text-base focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#1E9C17] to-[#27AE60] text-white py-3 rounded-2xl font-semibold shadow-lg active:scale-95 sm:hover:scale-105 transition disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <div className="text-center text-sm text-gray-600">
              Didn't receive it?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="text-[#1E9C17] font-medium hover:underline disabled:text-gray-400"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => { setStep(1); setOtp(""); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
            >
              ← Back
            </button>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4 sm:space-y-5">
            <div className="text-center space-y-1">
              <h2 className="font-[Montserrat] text-xl sm:text-2xl font-bold text-[#1E9C17]">
                Set New Password
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                Choose a strong password for your account
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full border-2 border-green-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                className="w-full border-2 border-green-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#1E9C17] to-[#27AE60] text-white py-3 rounded-2xl font-semibold shadow-lg active:scale-95 sm:hover:scale-105 transition disabled:opacity-60"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default ForgotPassword;