import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";


const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "consumer",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setError(""); // clear error on input change
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      role,
    } = formData;

    // ✅ Explicit page-level validations (no UI change)
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await api.post("/api/auth/register", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        role,
      });

      // Optional safety check
      if (!res || res.status !== 201) {
        // backend may still return 200; keep flexible
      }

      navigate("/login");
    } catch (err) {
      let message = "Registration failed. Please try again.";

      if (!navigator.onLine) {
        message = "No internet connection";
      } else if (err.response) {
        message =
          err.response.data?.message ||
          `Server error (${err.response.status})`;
      } else if (err.request) {
        message = "Server is not responding. Please try later.";
      } else if (err.message) {
        message = err.message;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 font-[Poppins]">
      {/* LEFT IMAGE + HERO TEXT */}
      <div className="hidden md:block relative">
        <img
          src="Register.png"
          alt="Register"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative z-10 flex flex-col justify-center h-full px-16 text-white space-y-8 animate-fadeIn">
          <p className="uppercase tracking-[0.3em] text-sm text-[#FDB933]">
            Join the D2C Revolution
          </p>

          <h1 className="font-[Montserrat] text-5xl leading-tight font-extrabold">
            Empower Farmers. <br />
            <span className="text-[#FDB933]">
              Build a Transparent Food System
            </span>
          </h1>

          <p className="text-base text-gray-200 leading-relaxed max-w-2xl">
            Become part of a next-generation agricultural marketplace that ensures
            fair pricing, direct farmer access, and fresh produce delivered with
            accountability and trust.
          </p>
        </div>
      </div>

      {/* RIGHT FORM */}
      <div className="flex items-center justify-center px-6 py-16 bg-gradient-to-b from-[#FDF8E3] to-[#E6F4EA]">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-lg bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-10 space-y-6 animate-fadeIn border border-green-100"
        >
          <h2 className="font-[Montserrat] text-3xl font-bold text-center text-[#1E9C17]">
            Create Account
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <input
                name="firstName"
                placeholder=" "
                onChange={handleChange}
                className="peer auth-input bg-white/80 border-green-200 focus:ring-green-300 focus:ring-2 transition"
              />
              <label className="floating-label text-green-700">First Name</label>
            </div>
            <div className="relative">
              <input
                name="lastName"
                placeholder=" "
                onChange={handleChange}
                className="peer auth-input bg-white/80 border-green-200 focus:ring-green-300 focus:ring-2 transition"
              />
              <label className="floating-label text-green-700">Last Name</label>
            </div>
          </div>

          <div className="relative">
            <input
              type="email"
              name="email"
              placeholder=" "
              onChange={handleChange}
              className="peer auth-input bg-white/80 border-green-200 focus:ring-green-300 focus:ring-2 transition"
            />
            <label className="floating-label text-green-700">Email</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <input
                type="password"
                name="password"
                placeholder=" "
                onChange={handleChange}
                className="peer auth-input bg-white/80 border-green-200 focus:ring-green-300 focus:ring-2 transition"
              />
              <label className="floating-label text-green-700">Password</label>
            </div>
            <div className="relative">
              <input
                type="password"
                name="confirmPassword"
                placeholder=" "
                onChange={handleChange}
                className="peer auth-input bg-white/80 border-green-200 focus:ring-green-300 focus:ring-2 transition"
              />
              <label className="floating-label text-green-700">Confirm</label>
            </div>
          </div>

          <div className="flex justify-center gap-8 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="consumer"
                checked={formData.role === "consumer"}
                onChange={handleChange}
              />
              Consumer
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="farmer"
                checked={formData.role === "farmer"}
                onChange={handleChange}
              />
              Farmer
            </label>
          </div>

          {/* ✅ Page-level error */}
          {error && (
            <p className="text-center text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#1E9C17] to-[#27AE60] text-white py-3 rounded-2xl
                       font-semibold tracking-wide shadow-lg hover:scale-105 hover:shadow-2xl transition"
          >
            {loading ? "Creating Account..." : "Register"}
          </button>

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
      </div>
    </div>
  );
};

export default Register;
