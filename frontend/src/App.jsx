import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import FarmerDashboard from "./pages/FarmerDashboard";
import ProductForm from "./components/ProductForm";
import ConsumerDashboard from "./pages/ConsumerDashboard";
import ProductDetails from "./pages/ProductDetails";  // 👈 NEW
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // Central role-based redirect
  const roleRedirect = () => {
    if (!user) return <Home />;

    if (user.role === "farmer") return <Navigate to="/farmer" replace />;
    if (user.role === "consumer") return <Navigate to="/consumer" replace />;
    if (user.role === "admin") return <Navigate to="/admin" replace />;

    return <Home />;
  };

  // Protected route helper
  const ProtectedRoute = ({ roles, children }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (!roles.includes(user.role)) return <Navigate to="/" replace />;
    return children;
  };

  return (
    <>
      <Navbar />

      <main style={{ minHeight: "80vh" }}>
        <Routes>
          {/* Root route */}
          <Route path="/" element={roleRedirect()} />

          {/* Auth routes */}
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/" replace />}
          />
          <Route
            path="/register"
            element={!user ? <Register /> : <Navigate to="/" replace />}
          />

          {/* Product Details - PUBLIC (no auth required) 👈 NEW */}
          <Route path="/product/:id" element={<ProductDetails />} />

          {/* Farmer routes */}
          <Route
            path="/farmer"
            element={
              <ProtectedRoute roles={["farmer"]}>
                <FarmerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/add-product"
            element={
              <ProtectedRoute roles={["farmer"]}>
                <ProductForm />
              </ProtectedRoute>
            }
          />

          {/* Consumer routes */}
          <Route
            path="/consumer"
            element={
              <ProtectedRoute roles={["consumer"]}>
                <ConsumerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute roles={["consumer", "farmer", "admin"]}>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute roles={["consumer", "farmer", "admin"]}>
                <EditProfile />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </>
  );
}

export default App;
