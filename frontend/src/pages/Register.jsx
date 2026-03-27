import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "",
    password: "", confirmPassword: "", role: "consumer",
  });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleChange = (e) => {
    setError("");
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
    if (loading) return;
    const { firstName, lastName, email, password, confirmPassword } = formData;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      return setError("All fields are required");
    }
    if (password !== confirmPassword) return setError("Passwords do not match");
    setLoading(true);
    setError("");
    try {
      await api.post("/api/otp/send", { email: email.trim() });
      setStep(2);
      startCooldown();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!otp.trim()) return setError("Enter the OTP");
    setLoading(true);
    setError("");
    try {
      await api.post("/api/otp/verify", { email: formData.email.trim(), code: otp.trim() });
      await api.post("/api/auth/register", {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
      });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    try {
      await api.post("/api/otp/send", { email: formData.email.trim() });
      startCooldown();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 font-[Poppins]">

      {/* LEFT IMAGE */}
      <div className="hidden md:block relative">
        <img src="Register.png" alt="Register" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 flex flex-col justify-center h-full px-16 text-white space-y-8 animate-fadeIn">
          <p className="uppercase tracking-[0.3em] text-sm text-[#FDB933]">Join the D2C Revolution</p>
          <h1 className="font-[Montserrat] text-5xl leading-tight font-extrabold">
            Empower Farmers. <br />
            <span className="text-[#FDB933]">Build a Transparent Food System</span>
          </h1>
          <p className="text-base text-gray-200 leading-relaxed max-w-2xl">
            Become part of a next-generation agricultural marketplace that ensures fair pricing,
            direct farmer access, and fresh produce delivered with accountability and trust.
          </p>
        </div>
      </div>

      {/* RIGHT FORM */}
      <div className="flex items-center justify-center px-6 py-16 bg-white">

        {/* Step 1: Registration Form */}
        {step === 1 && (
          <form onSubmit={handleSendOtp}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-10 space-y-6 border border-gray-100">
            <h2 className="font-[Montserrat] text-3xl font-bold text-center text-[#1E9C17]">
              Create Account
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <input name="firstName" value={formData.firstName} placeholder=" " onChange={handleChange}
                  className="peer auth-input bg-white border-green-200 focus:ring-green-300 focus:ring-2 transition" />
                <label className="floating-label text-green-700">First Name</label>
              </div>
              <div className="relative">
                <input name="lastName" value={formData.lastName} placeholder=" " onChange={handleChange}
                  className="peer auth-input bg-white border-green-200 focus:ring-green-300 focus:ring-2 transition" />
                <label className="floating-label text-green-700">Last Name</label>
              </div>
            </div>

            <div className="relative">
              <input type="email" name="email" value={formData.email} placeholder=" " onChange={handleChange}
                className="peer auth-input bg-white border-green-200 focus:ring-green-300 focus:ring-2 transition" />
              <label className="floating-label text-green-700">Email</label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <input type="password" name="password" value={formData.password} placeholder=" " onChange={handleChange}
                  className="peer auth-input bg-white border-green-200 focus:ring-green-300 focus:ring-2 transition" />
                <label className="floating-label text-green-700">Password</label>
              </div>
              <div className="relative">
                <input type="password" name="confirmPassword" value={formData.confirmPassword} placeholder=" " onChange={handleChange}
                  className="peer auth-input bg-white border-green-200 focus:ring-green-300 focus:ring-2 transition" />
                <label className="floating-label text-green-700">Confirm</label>
              </div>
            </div>

            <div className="flex justify-center gap-8 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="role" value="consumer"
                  checked={formData.role === "consumer"} onChange={handleChange} />
                Consumer
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="role" value="farmer"
                  checked={formData.role === "farmer"} onChange={handleChange} />
                Farmer
              </label>
            </div>

            {error && <p className="text-center text-red-500 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-[#1E9C17] to-[#27AE60] text-white py-3 rounded-2xl font-semibold tracking-wide shadow-lg hover:scale-105 transition disabled:opacity-60">
              {loading ? "Sending OTP..." : "Send Verification Code"}
            </button>

            <p className="text-center text-sm text-gray-700">
              Already have an account?{" "}
              <span className="text-[#1E9C17] cursor-pointer font-medium hover:underline"
                onClick={() => navigate("/login")}>
                Login
              </span>
            </p>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <form onSubmit={handleVerifyAndRegister}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 space-y-6 border border-gray-100">
            <div className="text-center space-y-2">
              <div className="text-5xl mb-2">📧</div>
              <h2 className="font-[Montserrat] text-2xl font-bold text-[#1E9C17]">Check Your Email</h2>
              <p className="text-sm text-gray-600">
                We sent a 6-digit code to <strong>{formData.email}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => { setOtp(e.target.value); setError(""); }}
                placeholder="000000"
                maxLength={6}
                className="w-full text-center text-3xl font-bold tracking-[0.5em] border-2 border-green-200 rounded-xl py-4 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            {error && <p className="text-center text-red-500 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-[#1E9C17] to-[#27AE60] text-white py-3 rounded-2xl font-semibold shadow-lg hover:scale-105 transition disabled:opacity-60">
              {loading ? "Verifying..." : "Verify & Create Account"}
            </button>

            <div className="text-center text-sm text-gray-600">
              Didn't receive it?{" "}
              <button type="button" onClick={handleResend} disabled={resendCooldown > 0}
                className="text-[#1E9C17] font-medium hover:underline disabled:text-gray-400 disabled:no-underline">
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
              </button>
            </div>

            <button type="button" onClick={() => { setStep(1); setOtp(""); setError(""); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700">
              ← Back to edit details
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default Register;