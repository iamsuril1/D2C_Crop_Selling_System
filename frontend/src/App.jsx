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
import PaymentSuccess        from "./pages/PaymentSuccess";
import PaymentFailure        from "./pages/PaymentFailure";

import ForgotPassword from "./pages/ForgotPassword";

import ReturnRequest from "./pages/ReturnRequest";
import FarmerReturns from "./pages/FarmerReturns.jsx";

import About   from "./pages/About";
import Contact from "./pages/Contact";

import PageWrapper from "./components/PageWrapper";
import AdminPayouts from "./pages/AdminPayouts";


/* ── ProtectedRoute ─────────────────────────────────────── */
const ProtectedRoute = ({ user, roles, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const HeroPage = ({ children }) => (
  <div className="hero-no-offset">{children}</div>
);

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
    if (!user) return <HeroPage><Home /></HeroPage>;
    if (user.role === "farmer")   return <Navigate to="/farmer"   replace />;
    if (user.role === "consumer") return <Navigate to="/consumer" replace />;
    if (user.role === "admin")    return <Navigate to="/admin"    replace />;
    return <HeroPage><Home /></HeroPage>;
  };

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "80vh" }}>
        <Routes>

          {/* ── Root ── */}
          <Route path="/" element={roleRedirect()} />

          {/* ── Auth ── */}
          <Route path="/login"           element={!user ? <HeroPage><Login /></HeroPage>    : <Navigate to="/" replace />} />
          <Route path="/register"        element={!user ? <HeroPage><Register /></HeroPage> : <Navigate to="/" replace />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* ── Product detail (public) ── */}
          <Route path="/product/:id" element={<ProductDetails />} />

          {/* ── Consumer ── */}
          <Route path="/consumer"  element={<ProtectedRoute user={user} roles={["consumer"]}><ConsumerDashboard /></ProtectedRoute>} />
          <Route path="/cart"      element={<ProtectedRoute user={user} roles={["consumer"]}><Orders /></ProtectedRoute>} />
          <Route path="/my-orders" element={<ProtectedRoute user={user} roles={["consumer"]}><ConsumerOrderTracking /></ProtectedRoute>} />

          {/* Payment — main selection page */}
          <Route path="/payment" element={<ProtectedRoute user={user} roles={["consumer"]}><PaymentSelection /></ProtectedRoute>} />

          {/* eSewa redirect landing pages */}
          <Route path="/payment/esewa/success" element={<ProtectedRoute user={user} roles={["consumer"]}><PaymentSuccess /></ProtectedRoute>} />
          <Route path="/payment/esewa/failure" element={<ProtectedRoute user={user} roles={["consumer"]}><PaymentFailure /></ProtectedRoute>} />

          {/* Khalti redirect landing page (success + failure handled inside PaymentSuccess) */}
          <Route path="/payment/khalti/success" element={<ProtectedRoute user={user} roles={["consumer"]}><PaymentSuccess /></ProtectedRoute>} />

          <Route path="/return-request" element={<ProtectedRoute user={user} roles={["consumer"]}><ReturnRequest /></ProtectedRoute>} />

          {/* ── Farmer ── */}
          <Route path="/farmer"                  element={<ProtectedRoute user={user} roles={["farmer"]}><FarmerDashboard /></ProtectedRoute>} />
          <Route path="/add-product"             element={<ProtectedRoute user={user} roles={["farmer"]}><ProductForm /></ProtectedRoute>} />
          <Route path="/farmer/orders"           element={<ProtectedRoute user={user} roles={["farmer"]}><FarmerOrders /></ProtectedRoute>} />
          <Route path="/farmer/payment-settings" element={<ProtectedRoute user={user} roles={["farmer"]}><FarmerPaymentSettings /></ProtectedRoute>} />
          <Route path="/farmer/returns"          element={<ProtectedRoute user={user} roles={["farmer"]}><FarmerReturns /></ProtectedRoute>} />

          {/* ── Admin ── */}
          <Route path="/admin" element={<ProtectedRoute user={user} roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />

          {/* ── Shared (all logged-in roles) ── */}
          <Route path="/profile"       element={<ProtectedRoute user={user} roles={["consumer","farmer","admin"]}><Profile /></ProtectedRoute>} />
          <Route path="/profile/edit"  element={<ProtectedRoute user={user} roles={["consumer","farmer","admin"]}><EditProfile /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute user={user} roles={["consumer","farmer","admin"]}><Notifications /></ProtectedRoute>} />

          {/* ── Public ── */}
          <Route path="/about"   element={<HeroPage><About /></HeroPage>} />
          <Route path="/contact" element={<Contact />} />

          {/* ── Fallback ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/admin/payouts" element={
          <ProtectedRoute user={user} roles={["admin"]}>
          <AdminPayouts />
          </ProtectedRoute>
} />

        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default App;