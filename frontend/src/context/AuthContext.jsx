import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import jwtDecode from "jwt-decode"; // Make sure you installed jwt-decode@3.1.2

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from token on refresh
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token); // decode JWT token
        setUser({
          id: decoded.id,
          role: decoded.role,
        });
      } catch (error) {
        console.error("Invalid token", error);
        localStorage.removeItem("token");
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  // Logout function
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/"); // redirect to Home
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
