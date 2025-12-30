import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";

import { AuthContext } from "./context/AuthContext";

function App() {
  const { user, loading } = useContext(AuthContext);

  // Wait until auth state is resolved
  if (loading) return null;

  // Redirect logged-in users from login/register
  const RedirectIfAuthenticated = ({ children }) => {
    if (user) {
      if (user.role === "consumer") return <Navigate to="/dashboard" replace />;
      if (user.role === "farmer") return <Navigate to="/farmer" replace />;
      if (user.role === "admin") return <Navigate to="/admin" replace />;
    }
    return children;
  };

  // Role-based protection
  const ProtectedRoute = ({ allowedRoles, children }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (!allowedRoles.includes(user.role))
      return <Navigate to="/" replace />;
    return children;
  };

  return (
    <>
      <Navbar />

      <Routes>
        {/* Public */}
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

        {/* Profile */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["consumer", "farmer", "admin"]}>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute allowedRoles={["consumer", "farmer", "admin"]}>
              <EditProfile />
            </ProtectedRoute>
          }
        />
      </Routes>

      <Footer />
    </>
  );
}

export default App;
