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

import ConsumerDashboard from "./pages/ConsumerDashboard";
import Orders from "./pages/Orders"; // ✅ Multi-user cart (fixed)

import FarmerDashboard from "./pages/FarmerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProductForm from "./components/ProductForm";

import ProductDetails from "./pages/ProductDetails";

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600 animate-pulse">Loading...</div>
      </div>
    );
  }

  // ✅ EXPLICIT: Role-based home redirect
  const roleRedirect = () => {
    if (!user) return <Home />;
    switch (user.role) {
      case "farmer": return <Navigate to="/farmer" replace />;
      case "consumer": return <Navigate to="/consumer" replace />;
      case "admin": return <Navigate to="/admin" replace />;
      default: return <Home />;
    }
  };

  // ✅ EXPLICIT: Protected route wrapper
  const ProtectedRoute = ({ roles, children }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1">
        <Routes>
          {/* Root/Home */}
          <Route path="/" element={roleRedirect()} />

          {/* Auth */}
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />

          {/* Public */}
          <Route path="/product/:id" element={<ProductDetails />} />

          {/* ✅ CONSUMER */}
          <Route path="/consumer" element={
            <ProtectedRoute roles={["consumer"]}>
              <ConsumerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/cart" element={
            <ProtectedRoute roles={["consumer"]}>
              <Orders />
            </ProtectedRoute>
          } />

          {/* Farmer */}
          <Route path="/farmer" element={
            <ProtectedRoute roles={["farmer"]}>
              <FarmerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/add-product" element={
            <ProtectedRoute roles={["farmer"]}>
              <ProductForm />
            </ProtectedRoute>
          } />

          {/* Admin */}
          <Route path="/admin" element={
            <ProtectedRoute roles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Profile */}
          <Route path="/profile" element={
            <ProtectedRoute roles={["consumer", "farmer", "admin"]}>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/profile/edit" element={
            <ProtectedRoute roles={["consumer", "farmer", "admin"]}>
              <EditProfile />
            </ProtectedRoute>
          } />

          {/* Navbar static pages */}
          <Route path="/about" element={
            <div className="min-h-screen bg-gray-50 p-8 md:p-12">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold text-gray-900 mb-8">About Us</h1>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Connecting farmers directly to consumers. Fresh produce, fair prices.
                </p>
              </div>
            </div>
          } />
          <Route path="/contact" element={
            <div className="min-h-screen bg-gray-50 p-8 md:p-12">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold text-gray-900 mb-8">Contact</h1>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Get in touch with us for support or partnerships.
                </p>
              </div>
            </div>
          } />

          {/* ✅ EXPLICIT: 404 fallback */}
          <Route path="*" element={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Page Not Found</h1>
                <p className="text-lg text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
                <Navigate to="/" replace />
              </div>
            </div>
          } />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
