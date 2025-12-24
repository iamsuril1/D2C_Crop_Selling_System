import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
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

    try {
      setLoading(true);

      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        formData
      );

      const { token, user } = res.data;

      // Store auth data
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      setSuccess(true);

      // Role-based redirect
      setTimeout(() => {
        if (user.role === "consumer") {
          navigate("/dashboard");
        } else if (user.role === "farmer") {
          navigate("/farmer");
        } else if (user.role === "admin") {
          navigate("/admin");
        }
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 font-[Poppins]">

      {/* LEFT FORM */}
      <div className="flex items-center justify-center px-6 py-16">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md space-y-6"
        >
          <h2 className="font-[Montserrat] text-3xl font-bold text-center">
            Login
          </h2>

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

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E9C17] text-white py-3 rounded-lg
                       font-semibold hover:scale-105 transition"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="text-center text-sm">
            Don’t have an account?{" "}
            <span
              className="text-[#1E9C17] cursor-pointer font-medium"
              onClick={() => navigate("/register")}
            >
              Register
            </span>
          </p>
        </form>
      </div>

      {/* RIGHT IMAGE */}
      <div className="hidden md:block relative">
        <img
          src="/home/login.jpg"
          alt="Login"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex items-center justify-center h-full px-10 text-white">
          <h1 className="font-[Montserrat] text-4xl font-bold text-center">
            Welcome Back to{" "}
            <span className="text-[#FDB933]">MeroBari</span>
          </h1>
        </div>
      </div>

      {/* SUCCESS CARD */}
      {success && (
        <div className="fixed top-6 right-6 z-50 animate-fadeIn">
          <div className="bg-white border border-black rounded-xl px-6 py-4 shadow-lg">
            <h4 className="font-[Montserrat] font-semibold text-[#1E9C17]">
              Login Successful
            </h4>
            <p className="text-sm text-[#4F4F4F] mt-1">
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
