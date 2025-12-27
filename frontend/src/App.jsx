import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";

function App() {
  const { user, loading } = useContext(AuthContext);

  // Wait until auth state is resolved
  if (loading) return null;

  // Redirect logged-in users from login/register to their dashboard
  const RedirectIfAuthenticated = ({ children }) => {
    if (user) {
      if (user.role === "consumer") return <Navigate to="/dashboard" />;
      if (user.role === "farmer") return <Navigate to="/farmer" />;
      if (user.role === "admin") return <Navigate to="/admin" />;
    }
    return children;
  };

  // Inline Role-Based Protection
  const ProtectedRoute = ({ allowedRoles, children }) => {
    if (!user) return <Navigate to="/login" replace />; // Not logged in
    if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />; // Wrong role
    return children; // Allowed
  };

  return (
    <>
      <Navbar />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route
          path="/register"
          element={
            <RedirectIfAuthenticated>
              <Register />
            </RedirectIfAuthenticated>
          }
        />
        <Route
          path="/login"
          element={
            <RedirectIfAuthenticated>
              <Login />
            </RedirectIfAuthenticated>
          }
        />

        {/* Dashboards */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["consumer"]}>
              <div>Consumer Dashboard</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer"
          element={
            <ProtectedRoute allowedRoles={["farmer"]}>
              <div>Farmer Dashboard</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <div>Admin Dashboard</div>
            </ProtectedRoute>
          }
        />

        {/* Profile page */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["consumer", "farmer", "admin"]}>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>

      <Footer />
    </>
  );
}

export default App;
