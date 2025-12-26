import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />

        {/* Protect login/register for logged-in users */}
        <Route
          path="/register"
          element={
            <ProtectedRoute>
              <Register />
            </ProtectedRoute>
          }
        />
        <Route
          path="/login"
          element={
            <ProtectedRoute>
              <Login />
            </ProtectedRoute>
          }
        />

        {/* Example dashboard routes */}
        <Route path="/dashboard" element={<div>Consumer Dashboard</div>} />
        <Route path="/farmer" element={<div>Farmer Dashboard</div>} />
        <Route path="/admin" element={<div>Admin Dashboard</div>} />
      </Routes>

      <Footer />
    </>
  );
}

export default App;
