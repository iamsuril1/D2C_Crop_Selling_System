import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";

import { AuthContext } from "./context/AuthContext.jsx";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";

import FarmerDashboard from "./pages/FarmerDashboard";
import ConsumerDashboard from "./pages/ConsumerDashboard";
import AdminDashboard from "./pages/AdminDashboard";

import ProductDetails from "./pages/ProductDetails";
import ProductForm from "./components/ProductForm";

import Orders from "./pages/Orders";
import Notifications from "./pages/Notifications";

// Order Management
import FarmerOrders from "./pages/FarmerOrders";
import ConsumerOrderTracking from "./pages/ConsumerOrdertracking";

// Payment
import FarmerPaymentSettings from "./pages/FarmerPaymentSettings";
import PaymentSelection from "./pages/PaymentSelection";

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
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
    if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
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
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/" replace />}
          />
          <Route
            path="/register"
            element={!user ? <Register /> : <Navigate to="/" replace />}
          />

          {/* Public */}
          <Route path="/product/:id" element={<ProductDetails />} />

          {/* Consumer */}
          <Route
            path="/consumer"
            element={
              <ProtectedRoute roles={["consumer"]}>
                <ConsumerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cart"
            element={
              <ProtectedRoute roles={["consumer"]}>
                <Orders />
              </ProtectedRoute>
            }
          />
          
          {/* Consumer Order Tracking */}
          <Route
            path="/my-orders"
            element={
              <ProtectedRoute roles={["consumer"]}>
                <ConsumerOrderTracking />
              </ProtectedRoute>
            }
          />
          
          {/* Payment Route */}
          <Route
            path="/payment"
            element={
              <ProtectedRoute roles={["consumer"]}>
                <PaymentSelection />
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
          
          {/* Farmer Order Management */}
          <Route
            path="/farmer/orders"
            element={
              <ProtectedRoute roles={["farmer"]}>
                <FarmerOrders />
              </ProtectedRoute>
            }
          />
          
          {/* Farmer Payment Settings */}
          <Route
            path="/farmer/payment-settings"
            element={
              <ProtectedRoute roles={["farmer"]}>
                <FarmerPaymentSettings />
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

          {/* Notifications */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute roles={["consumer", "farmer", "admin"]}>
                <Notifications />
              </ProtectedRoute>
            }
          />

          {/* Optional static pages */}
          <Route
            path="/about"
            element={
              <div className="min-h-screen bg-gray-50 p-8">
                <h1 className="text-3xl font-bold">About</h1>
              </div>
            }
          />
          <Route
            path="/contact"
            element={
              <div className="min-h-screen bg-gray-50 p-8">
                <h1 className="text-3xl font-bold">Contact</h1>
              </div>
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