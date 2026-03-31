import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";

import { AuthContext } from "./context/AuthContext.jsx";

import Navbar   from "./components/Navbar";
import Footer   from "./components/Footer";

import Home     from "./pages/Home";
import Login    from "./pages/Login";
import Register from "./pages/Register";

import Profile     from "./pages/Profile";
import EditProfile from "./pages/EditProfile";

import FarmerDashboard   from "./pages/FarmerDashboard";
import ConsumerDashboard from "./pages/ConsumerDashboard";
import AdminDashboard    from "./pages/AdminDashboard";

import ProductDetails from "./pages/ProductDetails";
import ProductForm    from "./components/ProductForm";

import Orders        from "./pages/Orders";
import Notifications from "./pages/Notifications";

import FarmerOrders          from "./pages/FarmerOrders";
import ConsumerOrderTracking from "./pages/ConsumerOrdertracking";

import FarmerPaymentSettings from "./pages/FarmerPaymentSettings";
import PaymentSelection      from "./pages/PaymentSelection";

import ForgotPassword from "./pages/ForgotPassword";

// NEW
import ReturnRequest  from "./pages/ReturnRequest";
import FarmerReturns  from "./pages/FarmerReturns";

const ProtectedRoute = ({ user, roles, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

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
    if (user.role === "farmer")   return <Navigate to="/farmer"   replace />;
    if (user.role === "consumer") return <Navigate to="/consumer" replace />;
    if (user.role === "admin")    return <Navigate to="/admin"    replace />;
    return <Home />;
  };

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "80vh" }}>
        <Routes>
          <Route path="/" element={roleRedirect()} />

          <Route path="/login"          element={!user ? <Login />    : <Navigate to="/" replace />} />
          <Route path="/register"       element={!user ? <Register /> : <Navigate to="/" replace />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/product/:id" element={<ProductDetails />} />

          {/* Consumer */}
          <Route path="/consumer" element={<ProtectedRoute user={user} roles={["consumer"]}><ConsumerDashboard /></ProtectedRoute>} />
          <Route path="/cart"     element={<ProtectedRoute user={user} roles={["consumer"]}><Orders /></ProtectedRoute>} />
          <Route path="/my-orders" element={<ProtectedRoute user={user} roles={["consumer"]}><ConsumerOrderTracking /></ProtectedRoute>} />
          <Route path="/payment"  element={<ProtectedRoute user={user} roles={["consumer"]}><PaymentSelection /></ProtectedRoute>} />
          {/* NEW: consumer return request */}
          <Route path="/return-request" element={<ProtectedRoute user={user} roles={["consumer"]}><ReturnRequest /></ProtectedRoute>} />

          {/* Farmer */}
          <Route path="/farmer"                  element={<ProtectedRoute user={user} roles={["farmer"]}><FarmerDashboard /></ProtectedRoute>} />
          <Route path="/add-product"             element={<ProtectedRoute user={user} roles={["farmer"]}><ProductForm /></ProtectedRoute>} />
          <Route path="/farmer/orders"           element={<ProtectedRoute user={user} roles={["farmer"]}><FarmerOrders /></ProtectedRoute>} />
          <Route path="/farmer/payment-settings" element={<ProtectedRoute user={user} roles={["farmer"]}><FarmerPaymentSettings /></ProtectedRoute>} />
          {/* NEW: farmer returns management */}
          <Route path="/farmer/returns"          element={<ProtectedRoute user={user} roles={["farmer"]}><FarmerReturns /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute user={user} roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />

          {/* Shared */}
          <Route path="/profile"       element={<ProtectedRoute user={user} roles={["consumer","farmer","admin"]}><Profile /></ProtectedRoute>} />
          <Route path="/profile/edit"  element={<ProtectedRoute user={user} roles={["consumer","farmer","admin"]}><EditProfile /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute user={user} roles={["consumer","farmer","admin"]}><Notifications /></ProtectedRoute>} />

          <Route path="/about"   element={<div className="min-h-screen bg-gray-50 p-8"><h1 className="text-3xl font-bold">About</h1></div>} />
          <Route path="/contact" element={<div className="min-h-screen bg-gray-50 p-8"><h1 className="text-3xl font-bold">Contact</h1></div>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default App;