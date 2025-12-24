import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }

    try {
      setLoading(true);

      await axios.post("http://localhost:5000/api/auth/register", {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });

      // ✅ Show success card
      setSuccess(true);

      // ⏳ Redirect after 5 seconds
      setTimeout(() => {
        navigate("/login");
      }, 5000);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 font-[Poppins]">

      {/* SUCCESS CARD */}
      {success && (
        <div className="fixed top-6 right-6 z-50 animate-fadeIn">
          <div className="bg-white border border-black rounded-xl px-6 py-4 shadow-lg">
            <h4 className="font-[Montserrat] font-semibold text-[#1E9C17]">
              Registration Successful
            </h4>
            <p className="text-sm text-[#4F4F4F] mt-1">
              Redirecting to login page...
            </p>
          </div>
        </div>
      )}

      {/* LEFT IMAGE */}
      <div className="hidden md:block relative">
        <img
          src="/home/register.jpg"
          alt="Register"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex items-center justify-center h-full px-10 text-white">
          <h1 className="font-[Montserrat] text-4xl font-bold text-center">
            Join <span className="text-[#FDB933]">MeroBari</span>
          </h1>
        </div>
      </div>

      {/* RIGHT FORM */}
      <div className="flex items-center justify-center px-6 py-16">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">

          <h2 className="font-[Montserrat] text-3xl font-bold text-center">
            Create Account
          </h2>

          {/* NAME */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <input
                type="text"
                name="firstName"
                placeholder=" "
                required
                className="peer auth-input"
                onChange={handleChange}
              />
              <label className="floating-label">First Name</label>
            </div>

            <div className="relative">
              <input
                type="text"
                name="lastName"
                placeholder=" "
                required
                className="peer auth-input"
                onChange={handleChange}
              />
              <label className="floating-label">Last Name</label>
            </div>
          </div>

          {/* EMAIL */}
          <div className="relative">
            <input
              type="email"
              name="email"
              placeholder=" "
              required
              className="peer auth-input"
              onChange={handleChange}
            />
            <label className="floating-label">Email</label>
          </div>

          {/* PASSWORD */}
          <div className="relative">
            <input
              type="password"
              name="password"
              placeholder=" "
              required
              className="peer auth-input"
              onChange={handleChange}
            />
            <label className="floating-label">Password</label>
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="relative">
            <input
              type="password"
              name="confirmPassword"
              placeholder=" "
              required
              className="peer auth-input"
              onChange={handleChange}
            />
            <label className="floating-label">Confirm Password</label>
          </div>

          {/* ROLE */}
          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="role"
                value="consumer"
                checked={formData.role === "consumer"}
                onChange={handleChange}
              />
              Consumer
            </label>

            <label className="flex items-center gap-2">
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

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E9C17] text-white py-3 rounded-lg font-semibold hover:scale-105 transition"
          >
            {loading ? "Creating Account..." : "Register"}
          </button>

          <p className="text-center text-sm">
            Already have an account?{" "}
            <span
              className="text-[#1E9C17] cursor-pointer font-medium"
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
