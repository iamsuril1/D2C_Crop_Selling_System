import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  // Wait until auth state is resolved
  if (loading) return null;

  // If user is logged in, redirect to correct dashboard
  if (user) {
    if (user.role === "consumer") {
      return <Navigate to="/dashboard" replace />;
    }
    if (user.role === "farmer") {
      return <Navigate to="/farmer" replace />;
    }
    if (user.role === "admin") {
      return <Navigate to="/admin" replace />;
    }
  }

  // If NOT logged in, allow access to route (login/register)
  return children;
};

export default ProtectedRoute;
