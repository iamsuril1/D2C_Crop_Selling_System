import { createContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios";
export const AuthContext = createContext(null);
export default AuthContext;
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
