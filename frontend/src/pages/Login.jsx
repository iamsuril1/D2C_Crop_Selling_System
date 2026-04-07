import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../api/axios";
import AlertModal from "../components/AlertModal";

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const [loginMethod, setLoginMethod] = useState("email"); // "email" | "phone"
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const [alertModal, setAlertModal] = useState({
    isOpen: false, type: "", title: "", message: "",
  });

  const showAlert = (title, message, type = "error") => {
    setAlertModal({ isOpen: true, title, message, type });
  };
  const closeAlert = () => {
    setAlertModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const switchMethod = (method) => {
    setLoginMethod(method);
    setFormData({ email: "", phone: "", password: formData.password });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const password = formData.password.trim();
    if (!password) {
      showAlert("Validation Error", "Password is required.", "warning");
      return;
    }

    if (loginMethod === "email") {
      if (!formData.email.trim()) {
        showAlert("Validation Error", "Email is required.", "warning");
        return;
      }
    } else {
      if (!formData.phone.trim()) {
        showAlert("Validation Error", "Mobile number is required.", "warning");
        return;
      }
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

      if (!res?.data?.token || !res?.data?.user) {
        throw new Error("Invalid server response");
      }

      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);
      navigate("/");
    } catch (err) {
      let message = "Login failed. Please try again.";

      if (!navigator.onLine) {
        message = "No internet connection.";
      } else if (err.response) {
        message = err.response.data?.message || `Server error (${err.response.status})`;
      } else if (err.request) {
        message = "Server is not responding. Please try later.";
      } else if (err.message) {
        message = err.message;
      }

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

      {/* Left Form */}
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

          {/* Forgot password — only shown for email login */}
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

      {/* Right Image */}
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