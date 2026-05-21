import { useState, useContext } from "react";
import { useNavigate }          from "react-router-dom";
import { AuthContext }          from "../context/AuthContext";
import api                      from "../api/axios";
import AlertModal               from "../components/AlertModal";

/* ── Google sign-in button ── */
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
        <span className="text-xs text-gray-400 font-medium">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-semibold py-3 rounded-2xl transition hover:bg-gray-50 active:scale-[0.98]"
      >
        <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
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

const Login = () => {
  const navigate          = useNavigate();
  const { login, getRoleRoute } = useContext(AuthContext);

  const [loginMethod, setLoginMethod] = useState("email");
  const [formData,    setFormData]    = useState({ email: "", phone: "", password: "" });
  const [loading,     setLoading]     = useState(false);

  const [alertModal, setAlertModal] = useState({
    isOpen: false, type: "", title: "", message: "",
  });

  const showAlert  = (title, message, type = "error") =>
    setAlertModal({ isOpen: true, title, message, type });
  const closeAlert = () =>
    setAlertModal((p) => ({ ...p, isOpen: false }));

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const switchMethod = (method) => {
    setLoginMethod(method);
    setFormData({ email: "", phone: "", password: formData.password });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const password = formData.password.trim();
    if (!password) { showAlert("Validation Error", "Password is required.", "warning"); return; }

    if (loginMethod === "email") {
      if (!formData.email.trim()) { showAlert("Validation Error", "Email is required.", "warning"); return; }
    } else {
      if (!formData.phone.trim()) { showAlert("Validation Error", "Mobile number is required.", "warning"); return; }
      if (!/^[0-9]{10}$/.test(formData.phone.trim())) {
        showAlert("Validation Error", "Enter a valid 10-digit mobile number.", "warning");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        password,
        ...(loginMethod === "email"
          ? { email: formData.email.trim() }
          : { phone: formData.phone.trim() }),
      };

      const res = await api.post("/api/auth/login", payload);

      if (!res?.data?.token || !res?.data?.user) throw new Error("Invalid server response");

      const { token, user } = res.data;
      login(token, user);

      // Navigate directly by role — avoids timing bug with roleRedirect()
      navigate(getRoleRoute(user.role), { replace: true });

    } catch (err) {
      let message = "Login failed. Please try again.";
      if (!navigator.onLine)  message = "No internet connection.";
      else if (err.response)  message = err.response.data?.message || `Server error (${err.response.status})`;
      else if (err.request)   message = "Server is not responding. Please try later.";
      else if (err.message)   message = err.message;
      showAlert("Login Failed", message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 font-[Poppins]">

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
      />

      {/* ── Left: Form ── */}
      <div className="flex items-center justify-center px-6 py-16 bg-gradient-to-b from-[#E6F4EA] to-[#FDF8E3]">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-10 space-y-5 animate-fadeIn border border-green-100"
        >
          <div className="text-center space-y-2">
            <h2 className="font-[Montserrat] text-3xl font-bold text-[#1E9C17]">
              Welcome Back
            </h2>
            <p className="text-sm text-gray-700">
              Login to buy fresh crops directly from farmers.
            </p>
          </div>

          <GoogleButton />

          {/* Login method toggle */}
          <div className="flex rounded-xl overflow-hidden border-2 border-green-200">
            <button
              type="button"
              onClick={() => switchMethod("email")}
              className={`flex-1 py-2.5 text-sm font-semibold transition ${
                loginMethod === "email"
                  ? "bg-[#1E9C17] text-white"
                  : "bg-white text-gray-500 hover:bg-green-50"
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => switchMethod("phone")}
              className={`flex-1 py-2.5 text-sm font-semibold transition ${
                loginMethod === "phone"
                  ? "bg-[#1E9C17] text-white"
                  : "bg-white text-gray-500 hover:bg-green-50"
              }`}
            >
              Mobile Number
            </button>
          </div>

          {/* Credential input */}
          {loginMethod === "email" ? (
            <div className="relative group">
              <input
                type="email"
                name="email"
                value={formData.email}
                placeholder=" "
                onChange={handleChange}
                className="peer auth-input bg-white/80 border-green-200 focus:ring-green-300 focus:ring-2 transition"
              />
              <label className="floating-label text-green-700">Email</label>
            </div>
          ) : (
            <div className="relative group">
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                placeholder=" "
                onChange={handleChange}
                maxLength={10}
                className="peer auth-input bg-white/80 border-green-200 focus:ring-green-300 focus:ring-2 transition"
              />
              <label className="floating-label text-green-700">Mobile Number (10 digits)</label>
            </div>
          )}

          {/* Password */}
          <div className="relative group">
            <input
              type="password"
              name="password"
              value={formData.password}
              placeholder=" "
              onChange={handleChange}
              className="peer auth-input bg-white/80 border-green-200 focus:ring-green-300 focus:ring-2 transition"
            />
            <label className="floating-label text-green-700">Password</label>
          </div>

          {/* Forgot password */}
          {loginMethod === "email" && (
            <div className="text-right -mt-2">
              <span
                onClick={() => navigate("/forgot-password")}
                className="text-sm text-[#1E9C17] cursor-pointer hover:underline"
              >
                Forgot password?
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#1E9C17] to-[#27AE60] text-white py-3 rounded-2xl font-semibold tracking-wide shadow-lg hover:scale-105 hover:shadow-2xl transition disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="text-center text-sm text-gray-700">
            Don't have an account?{" "}
            <span
              className="text-[#1E9C17] cursor-pointer font-medium hover:underline"
              onClick={() => navigate("/register")}
            >
              Register
            </span>
          </p>
        </form>
      </div>

      {/* ── Right: Image ── */}
      <div className="hidden md:block relative">
        <img
          src="Login.jpg"
          alt="Login"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 flex flex-col justify-center h-full px-16 text-white space-y-8 animate-fadeIn">
          <p className="uppercase tracking-[0.3em] text-sm text-[#FDB933]">
            Direct to Consumer Marketplace
          </p>
          <h1 className="font-[Montserrat] text-5xl leading-tight font-extrabold">
            Fresh, Organic Crops <br />
            <span className="text-[#FDB933]">
              Delivered Straight From Farmers
            </span>
          </h1>
          <p className="text-base text-gray-200 leading-relaxed max-w-2xl">
            MeroBari bridges the gap between farmers and consumers by eliminating middlemen.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;