import { useEffect, useState, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../api/axios";

const RoleModal = ({ onSelect }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 max-w-sm w-full text-center">
      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">👋</span>
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Almost there!</h2>
      <p className="text-gray-500 text-sm mb-6 sm:mb-8">
        How would you like to use MeroBari?
      </p>
      <div className="space-y-3">
        <button
          onClick={() => onSelect("consumer")}
          className="w-full flex items-center gap-3 sm:gap-4 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 transition text-left group active:scale-[0.98]"
        >
          <span className="text-2xl sm:text-3xl">🛒</span>
          <div>
            <p className="font-bold text-gray-900 group-hover:text-green-800 text-sm sm:text-base">Shop as Consumer</p>
            <p className="text-xs text-gray-500">Browse and buy fresh produce from local farms</p>
          </div>
        </button>
        <button
          onClick={() => onSelect("farmer")}
          className="w-full flex items-center gap-3 sm:gap-4 border-2 border-gray-200 hover:border-amber-500 hover:bg-amber-50 rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 transition text-left group active:scale-[0.98]"
        >
          <span className="text-2xl sm:text-3xl">🌾</span>
          <div>
            <p className="font-bold text-gray-900 group-hover:text-amber-800 text-sm sm:text-base">Sell as Farmer</p>
            <p className="text-xs text-gray-500">List your crops and sell directly to consumers</p>
          </div>
        </button>
      </div>
    </div>
  </div>
);

const getRoleRoute = (role) => {
  if (role === "farmer")   return "/farmer";
  if (role === "consumer") return "/consumer";
  if (role === "admin")    return "/admin";
  return "/";
};

const AuthCallback = () => {
  const [params]           = useSearchParams();
  const navigate           = useNavigate();
  const { login, setUser } = useContext(AuthContext);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [tempToken, setTempToken]         = useState(null);
  const [error, setError]                 = useState("");

  useEffect(() => {
    const token = params.get("token");
    const isNew = params.get("newUser") === "true";

    if (!token) {
      setError("Authentication failed. Please try again.");
      return;
    }

    if (isNew) {
      setTempToken(token);
      setShowRoleModal(true);
    } else {
      finishLogin(token);
    }
  }, []);

  const finishLogin = async (token) => {
    try {
      localStorage.setItem("token", token);
      const res = await api.get("/api/auth/me");
      const userData = res.data?.user;
      login(token, userData);
      navigate(getRoleRoute(userData?.role), { replace: true });
    } catch (err) {
      localStorage.removeItem("token");
      setError("Failed to load your account. Please try again.");
    }
  };

  const handleRoleSelect = async (role) => {
    try {
      localStorage.setItem("token", tempToken);
      const res = await api.put("/api/auth/set-role", { role });
      login(res.data.token, res.data.user);
      navigate(getRoleRoute(res.data.user?.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to set role. Please try again.");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-xs w-full">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-xl">⚠️</span>
          </div>
          <p className="text-red-600 font-semibold mb-4 text-sm sm:text-base">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="w-full sm:w-auto bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm active:scale-[0.98] transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (showRoleModal) return <RoleModal onSelect={handleRoleSelect} />;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Signing you in…</p>
      </div>
    </div>
  );
};

export default AuthCallback;