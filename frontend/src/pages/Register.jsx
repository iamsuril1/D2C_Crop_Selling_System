import { useState }    from "react";
import { useNavigate } from "react-router-dom";
import api             from "../api/axios";
import AlertModal      from "../components/AlertModal";

const GoogleButton = () => {
  const handleGoogle = () => {
    window.location.href =
      (import.meta.env.VITE_API_URL || "http://localhost:5000") +
      "/api/auth/google";
  };

  return (
    <>
      <div className="flex items-center gap-3 my-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">or sign up with</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-semibold py-3 rounded-2xl transition hover:bg-gray-50 active:scale-[0.98]"
      >
        <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="#4285F4" d="M46.145 24.503c0-1.59-.142-3.12-.406-4.594H24v8.697h12.43c-.536 2.888-2.162 5.334-4.606 6.977v5.805h7.453c4.36-4.014 6.868-9.926 6.868-16.885z"/>
          <path fill="#34A853" d="M24 47c6.24 0 11.476-2.07 15.277-5.612l-7.453-5.805c-2.069 1.386-4.716 2.205-7.824 2.205-6.015 0-11.107-4.063-12.929-9.527H3.376v5.995C7.163 41.88 15.003 47 24 47z"/>
          <path fill="#FBBC05" d="M11.071 28.261A14.917 14.917 0 0 1 10.25 24c0-1.479.254-2.915.821-4.261v-5.995H3.376A23.94 23.94 0 0 0 0 24c0 3.869.927 7.532 2.572 10.744l8.499-6.483z"/>
          <path fill="#EA4335" d="M24 9.213c3.39 0 6.432 1.166 8.823 3.455l6.613-6.613C35.464 2.283 30.228 0 24 0 15.003 0 7.163 5.12 3.376 13.744l8.495 6.483c1.822-5.464 6.914-11.014 12.129-11.014z"/>
        </svg>
        Continue with Google
      </button>
    </>
  );
};

const Register = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName:       "",
    lastName:        "",
    email:           "",
    phone:           "",
    password:        "",
    confirmPassword: "",
    role:            "consumer",
  });
  const [otp,            setOtp]            = useState("");
  const [loading,        setLoading]        = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [alertModal, setAlertModal] = useState({
    isOpen: false, type: "", title: "", message: "",
  });

  const showAlert  = (title, message, type = "error") =>
    setAlertModal({ isOpen: true, title, message, type });
  const closeAlert = () =>
    setAlertModal((p) => ({ ...p, isOpen: false }));

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

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

    const { firstName, lastName, email, phone, password, confirmPassword } = formData;

    if (!firstName.trim() || !lastName.trim() || !email.trim() ||
        !phone.trim() || !password.trim() || !confirmPassword.trim()) {
      showAlert("Validation Error", "All fields are required.", "warning");
      return;
    }

    if (!/^[0-9]{10}$/.test(phone.trim())) {
      showAlert("Validation Error", "Phone number must be exactly 10 digits.", "warning");
      return;
    }

    if (password !== confirmPassword) {
      showAlert("Validation Error", "Passwords do not match.", "warning");
      return;
    }

    if (password.length < 6) {
      showAlert("Validation Error", "Password must be at least 6 characters.", "warning");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/otp/send", { email: email.trim() });
      setStep(2);
      startCooldown();
    } catch (err) {
      showAlert("Failed to Send OTP", err.response?.data?.message || "Failed to send OTP.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!otp.trim()) {
      showAlert("Validation Error", "Enter the OTP.", "warning");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/otp/verify", { email: formData.email.trim(), code: otp.trim() });
      await api.post("/api/auth/register", {
        firstName: formData.firstName.trim(),
        lastName:  formData.lastName.trim(),
        email:     formData.email.trim(),
        phone:     formData.phone.trim(),
        password:  formData.password,
        role:      formData.role,
      });
      navigate("/login");
    } catch (err) {
      showAlert("Verification Failed", err.response?.data?.message || "Verification failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.post("/api/otp/send", { email: formData.email.trim() });
      startCooldown();
    } catch (err) {
      showAlert("Resend Failed", err.response?.data?.message || "Failed to resend OTP.", "error");
    }
  };

  return (
    <div className="min-h-screen md:grid md:grid-cols-2 font-[Poppins]">

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
      />

      {/* ── Left: Image — hidden on mobile ── */}
      <div className="hidden md:block relative">
        <img
          src="Register.png"
          alt="Register"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 flex flex-col justify-center h-full px-10 lg:px-16 text-white space-y-6 lg:space-y-8 animate-fadeIn">
          <p className="uppercase tracking-[0.3em] text-xs lg:text-sm text-[#FDB933]">
            Join the D2C Revolution
          </p>
          <h1 className="font-[Montserrat] text-3xl lg:text-5xl leading-tight font-extrabold">
            Empower Farmers. <br />
            <span className="text-[#FDB933]">Build a Transparent Food System</span>
          </h1>
          <p className="text-sm lg:text-base text-gray-200 leading-relaxed max-w-2xl">
            Become part of a next-generation agricultural marketplace that ensures fair pricing,
            direct farmer access, and fresh produce delivered with accountability and trust.
          </p>
        </div>
      </div>

      {/* ── Right: Form ── */}
      <div className="flex items-center justify-center min-h-screen md:min-h-0 px-4 sm:px-6 py-10 sm:py-16 bg-white overflow-y-auto">

        {/* Step 1: Registration form */}
        {step === 1 && (
          <form
            onSubmit={handleSendOtp}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 space-y-4 sm:space-y-5 border border-gray-100"
          >
            <h2 className="font-[Montserrat] text-2xl sm:text-3xl font-bold text-center text-[#1E9C17]">
              Create Account
            </h2>

            {/* Name row — stacks to single column on very small screens */}
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="relative">
                <input
                  name="firstName"
                  value={formData.firstName}
                  placeholder=" "
                  onChange={handleChange}
                  className="peer auth-input bg-white border-green-200 focus:ring-green-300 focus:ring-2 transition"
                />
                <label className="floating-label text-green-700">First Name</label>
              </div>
              <div className="relative">
                <input
                  name="lastName"
                  value={formData.lastName}
                  placeholder=" "
                  onChange={handleChange}
                  className="peer auth-input bg-white border-green-200 focus:ring-green-300 focus:ring-2 transition"
                />
                <label className="floating-label text-green-700">Last Name</label>
              </div>
            </div>

            {/* Email */}
            <div className="relative">
              <input
                type="email"
                name="email"
                value={formData.email}
                placeholder=" "
                onChange={handleChange}
                className="peer auth-input bg-white border-green-200 focus:ring-green-300 focus:ring-2 transition"
              />
              <label className="floating-label text-green-700">Email</label>
            </div>

            {/* Phone */}
            <div className="relative">
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                placeholder=" "
                onChange={handleChange}
                maxLength={10}
                className="peer auth-input bg-white border-green-200 focus:ring-green-300 focus:ring-2 transition"
              />
              <label className="floating-label text-green-700">Mobile Number (10 digits)</label>
            </div>

            {/* Password row — stacks on very small screens */}
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  placeholder=" "
                  onChange={handleChange}
                  className="peer auth-input bg-white border-green-200 focus:ring-green-300 focus:ring-2 transition"
                />
                <label className="floating-label text-green-700">Password</label>
              </div>
              <div className="relative">
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  placeholder=" "
                  onChange={handleChange}
                  className="peer auth-input bg-white border-green-200 focus:ring-green-300 focus:ring-2 transition"
                />
                <label className="floating-label text-green-700">Confirm</label>
              </div>
            </div>

            {/* Role */}
            <div className="flex justify-center gap-6 sm:gap-8 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                <input
                  type="radio"
                  name="role"
                  value="consumer"
                  checked={formData.role === "consumer"}
                  onChange={handleChange}
                  className="accent-green-600"
                />
                Consumer
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                <input
                  type="radio"
                  name="role"
                  value="farmer"
                  checked={formData.role === "farmer"}
                  onChange={handleChange}
                  className="accent-green-600"
                />
                Farmer
              </label>
            </div>

            {/* Send OTP button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#1E9C17] to-[#27AE60] text-white py-3 rounded-2xl font-semibold tracking-wide shadow-lg hover:scale-105 transition disabled:opacity-60 text-sm sm:text-base"
            >
              {loading ? "Sending OTP..." : "Send Verification Code"}
            </button>

            {/* Google button — after Send Verification Code */}
            <GoogleButton />

            <p className="text-center text-sm text-gray-700">
              Already have an account?{" "}
              <span
                className="text-[#1E9C17] cursor-pointer font-medium hover:underline"
                onClick={() => navigate("/login")}
              >
                Login
              </span>
            </p>
          </form>
        )}

        {/* Step 2: OTP verification */}
        {step === 2 && (
          <form
            onSubmit={handleVerifyAndRegister}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 space-y-5 sm:space-y-6 border border-gray-100"
          >
            <div className="text-center space-y-2">
              <h2 className="font-[Montserrat] text-xl sm:text-2xl font-bold text-[#1E9C17]">
                Check Your Email
              </h2>
              <p className="text-sm text-gray-600 break-words">
                We sent a 6-digit code to{" "}
                <strong className="break-all">{formData.email}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="w-full text-center text-2xl sm:text-3xl font-bold tracking-[0.4em] sm:tracking-[0.5em] border-2 border-green-200 rounded-xl py-4 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#1E9C17] to-[#27AE60] text-white py-3 rounded-2xl font-semibold shadow-lg hover:scale-105 transition disabled:opacity-60 text-sm sm:text-base"
            >
              {loading ? "Verifying..." : "Verify and Create Account"}
            </button>

            <div className="text-center text-sm text-gray-600">
              Didn't receive it?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="text-[#1E9C17] font-medium hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => { setStep(1); setOtp(""); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
            >
              Back to edit details
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register;