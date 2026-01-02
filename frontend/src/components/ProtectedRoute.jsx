import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ publicOnly = false, allowedRoles, children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (publicOnly && user) {
    if (user.role === "consumer") return <Navigate to="/dashboard" replace />;
    if (user.role === "farmer") return <Navigate to="/farmer" replace />;
    if (user.role === "admin") return <Navigate to="/admin" replace />;
  }

  if (!publicOnly && !user) {
    return <Navigate to="/login" replace />;
  }

  if (!publicOnly && allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
