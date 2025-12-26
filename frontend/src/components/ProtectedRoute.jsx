// components/ProtectedRoute.jsx
import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null; // or a spinner

  if (!user) return children; // allow access if not logged in

  // Redirect logged-in users to dashboard based on role
  if (user.role === "consumer") return <Navigate to="/dashboard" />;
  if (user.role === "farmer") return <Navigate to="/farmer" />;
  if (user.role === "admin") return <Navigate to="/admin" />;

  return children;
};

export default ProtectedRoute;
