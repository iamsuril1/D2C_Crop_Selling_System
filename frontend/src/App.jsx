import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";

import AuthContext from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";

import FarmerDashboard from "./pages/FarmerDashboard";
import ConsumerDashboard from "./pages/ConsumerDashboard";
import ProductDetails from "./pages/ProductDetails";
import ProductForm from "./components/ProductForm";
import AdminDashboard from "./pages/AdminDashboard";

// ✅ This is your CART-DESIGN page (per your message)
import Orders from "./pages/Orders";

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const roleRedirect = () => {
    if (!user) return <Home />;
    if (user.role === "farmer") return <Navigate to="/farmer" replace />;
    if (user.role === "consumer") return <Navigate to="/consumer" replace />;
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    return <Home />;
  };

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
          {/* Root */}
          <Route path="/" element={roleRedirect()} />

          {/* Auth */}
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />

          {/* Public product details */}
          <Route path="/product/:id" element={<ProductDetails />} />

          {/* ✅ Cart route (opens Orders.jsx cart design) */}
          <Route
            path="/cart"
            element={
              <ProtectedRoute roles={["consumer"]}>
                <Orders />
              </ProtectedRoute>
            }
          />

          {/* Farmer */}
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

          {/* Consumer */}
          <Route
            path="/consumer"
            element={
              <ProtectedRoute roles={["consumer"]}>
                <ConsumerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
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
