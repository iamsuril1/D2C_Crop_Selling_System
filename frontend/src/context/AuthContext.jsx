import { createContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios";

// ✅ Named export (Navbar can do: import { AuthContext } from ...)
export const AuthContext = createContext(null);

// ✅ Default export (App can do: import AuthContext from ...)
export default AuthContext;

// ✅ Provider (wrap your app with this in main.jsx)
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // App.jsx expects: const { user, loading } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);

  // Restore user on refresh if token exists
  useEffect(() => {
    const boot = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setUser(null);
          return;
        }

        const res = await api.get("/api/auth/me");
        setUser(res.data?.user || null);
      } catch (err) {
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, []);

  // Use this in Login.jsx after successful login
  const login = (token, userData) => {
    localStorage.setItem("token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      login,
      logout,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
