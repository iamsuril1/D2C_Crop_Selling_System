import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../api/axios";


const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setError(""); // clear error when user types
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const email = formData.email.trim();
    const password = formData.password.trim();

    // ✅ Explicit page-level error if fields are missing
    if (!email && !password) {
      setError("Email and password are required");
      return;
    }

    if (!email) {
      setError("Email is required");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await api.post("/api/auth/login", {
        email,
        password,
      });

      // Validate backend response
      if (!res?.data?.token || !res?.data?.user) {
        throw new Error("Invalid server response");
      }

      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);
      navigate("/");
    } catch (err) {
      let message = "Login failed. Please try again.";

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
      {/* LEFT FORM */}
      <div className="flex items-center justify-center px-6 py-16 bg-gradient-to-b from-[#E6F4EA] to-[#FDF8E3]">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-10 space-y-6 animate-fadeIn border border-green-100"
        >
          <div className="text-center space-y-2">
            <h2 className="font-[Montserrat] text-3xl font-bold text-[#1E9C17]">
              Welcome Back
            </h2>
            <p className="text-sm text-gray-700">
              Login to buy fresh crops directly from farmers.
            </p>
          </div>

          <div className="relative group">
            <input
              type="email"
              name="email"
              placeholder=" "
              onChange={handleChange}
              className="peer auth-input bg-white/80 border-green-200 focus:ring-green-300 focus:ring-2 transition"
            />
            <label className="floating-label text-green-700">Email</label>
          </div>

          <div className="relative group">
            <input
              type="password"
              name="password"
              placeholder=" "
              onChange={handleChange}
              className="peer auth-input bg-white/80 border-green-200 focus:ring-green-300 focus:ring-2 transition"
            />
            <label className="floating-label text-green-700">Password</label>
          </div>

          {/* ✅ Page-level error */}
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#1E9C17] to-[#27AE60] text-white py-3 rounded-2xl
                       font-semibold tracking-wide shadow-lg hover:scale-105 hover:shadow-2xl transition"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="text-center text-sm text-gray-700">
            Don’t have an account?{" "}
            <span
              className="text-[#1E9C17] cursor-pointer font-medium hover:underline"
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
            MeroBari bridges the gap between farmers and consumers by eliminating
            middlemen.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
