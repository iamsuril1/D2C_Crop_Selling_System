import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../context/api";

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

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }

    try {
      setLoading(true);
      await api.post("/api/auth/register", formData);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 font-[Poppins]">
      {/* LEFT IMAGE + HERO TEXT */}
      <div className="hidden md:block relative">
        <img
          src="/home/register.jpg"
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
              <input name="firstName" required placeholder=" " onChange={handleChange} className="peer auth-input bg-white/80 border-green-200 focus:ring-green-300 focus:ring-2 transition" />
              <label className="floating-label text-green-700">First Name</label>
            </div>
            <div className="relative">
              <input name="lastName" required placeholder=" " onChange={handleChange} className="peer auth-input bg-white/80 border-green-200 focus:ring-green-300 focus:ring-2 transition" />
              <label className="floating-label text-green-700">Last Name</label>
            </div>
          </div>

          <div className="relative">
            <input type="email" name="email" required placeholder=" " onChange={handleChange} className="peer auth-input bg-white/80 border-green-200 focus:ring-green-300 focus:ring-2 transition" />
            <label className="floating-label text-green-700">Email</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <input type="password" name="password" required placeholder=" " onChange={handleChange} className="peer auth-input bg-white/80 border-green-200 focus:ring-green-300 focus:ring-2 transition" />
              <label className="floating-label text-green-700">Password</label>
            </div>
            <div className="relative">
              <input type="password" name="confirmPassword" required placeholder=" " onChange={handleChange} className="peer auth-input bg-white/80 border-green-200 focus:ring-green-300 focus:ring-2 transition" />
              <label className="floating-label text-green-700">Confirm</label>
            </div>
          </div>

          <div className="flex justify-center gap-8 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="role" value="consumer" checked={formData.role === "consumer"} onChange={handleChange} />
              Consumer
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="role" value="farmer" checked={formData.role === "farmer"} onChange={handleChange} />
              Farmer
            </label>
          </div>

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
