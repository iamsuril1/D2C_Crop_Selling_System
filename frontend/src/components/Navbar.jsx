import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import { NotificationContext } from "../context/NotificationContext";

import {
  FaSearch,
  FaUserCircle,
  FaShoppingCart,
  FaBars,
  FaTimes,
  FaBell,
} from "react-icons/fa";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { cartItems } = useContext(CartContext);

  const notifCtx = useContext(NotificationContext);
  const notifications = notifCtx?.notifications || [];
  const unreadCount = notifCtx?.unreadCount || 0;
  const hasUnread = notifCtx?.hasUnread || false;
  const refetch = notifCtx?.refetch;
  const markAsRead = notifCtx?.markAsRead;
  const markAllAsRead = notifCtx?.markAllAsRead;

  const navigate = useNavigate();

  // Mobile menu
  const [menuOpen, setMenuOpen] = useState(false);

  // Dropdowns
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Search
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  // Sticky navbar
  const [isSticky, setIsSticky] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const cartCount = useMemo(() => {
    if (!Array.isArray(cartItems)) return 0;
    return cartItems.length; // unique products count
  }, [cartItems]);

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Mock search suggestions (replace with real API later)
  const sampleCrops = ["Tomato", "Potato", "Onion", "Carrot", "Corn", "Wheat", "Rice"];
  useEffect(() => {
    if (!search.trim()) return setSuggestions([]);
    setSuggestions(
      sampleCrops.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search]);

  // Close dropdowns on outside click
  useEffect(() => {
    const onDown = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const closeAll = () => {
    setMenuOpen(false);
    setProfileOpen(false);
    setNotifOpen(false);
  };

  const goToDashboard = () => {
    closeAll();
    if (user?.role === "consumer") return navigate("/consumer");
    if (user?.role === "farmer") return navigate("/farmer");
    if (user?.role === "admin") return navigate("/admin");
    navigate("/");
  };

  const handleLogout = () => {
    closeAll();
    logout?.();
    navigate("/"); // ✅ home after logout
  };

  const roleMenuItem = () => {
    if (!user) return null;

    if (user.role === "consumer") {
      return (
        <button
          type="button"
          onClick={() => {
            closeAll();
            navigate("/consumer");
          }}
          className="hover:text-[#1E9C17] transition"
        >
          View Products
        </button>
      );
    }

    if (user.role === "farmer") {
      return (
        <button
          type="button"
          onClick={() => {
            closeAll();
            navigate("/add-product");
          }}
          className="hover:text-[#1E9C17] transition"
        >
          Add Product
        </button>
      );
    }

    return null;
  };

  return (
    <nav
      className={`w-full bg-white shadow-sm py-3 px-6 flex items-center justify-between z-50 transition-all ${
        isSticky ? "fixed top-0 shadow-lg" : "relative"
      }`}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center" onClick={closeAll}>
        <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex space-x-6 font-medium text-gray-700 items-center">
        {roleMenuItem()}
        <Link to="/about" className="hover:text-[#1E9C17] transition" onClick={closeAll}>
          About
        </Link>
        <Link to="/contact" className="hover:text-[#1E9C17] transition" onClick={closeAll}>
          Contact
        </Link>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative hidden sm:block w-64">
          <input
            type="text"
            placeholder="Search crops..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E9C17]"
          />
          <FaSearch className="absolute left-3 top-3 text-gray-500" />
          {suggestions.length > 0 && (
            <ul className="absolute bg-white shadow-lg w-full rounded-lg mt-2 z-50">
              {suggestions.map((item, index) => (
                <li
                  key={index}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setSearch(item);
                    setSuggestions([]);
                  }}
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 🔔 Notifications (all logged-in users) */}
        {user && (
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setNotifOpen((v) => !v);
                setProfileOpen(false);
                refetch?.();
              }}
              className="relative"
              aria-label="Notifications"
              title="Notifications"
            >
              <FaBell className="text-2xl text-gray-700 hover:text-[#1E9C17] transition" />
              {hasUnread && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white shadow-xl rounded-xl border z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div className="font-semibold text-gray-900">Notifications</div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllAsRead?.()}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        closeAll();
                        navigate("/notifications");
                      }}
                      className="text-xs text-gray-700 hover:underline"
                    >
                      View all
                    </button>
                  </div>
                </div>

                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-500">
                    No notifications yet.
                  </div>
                ) : (
                  <div className="max-h-80 overflow-auto">
                    {notifications.slice(0, 8).map((n) => (
                      <button
                        key={n._id}
                        type="button"
                        onClick={() => {
                          if (!n.isRead) markAsRead?.(n._id);
                          closeAll();
                          // Optional later:
                          // if (n?.data?.orderId) navigate(`/order/${n.data.orderId}`);
                        }}
                        className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 ${
                          !n.isRead ? "bg-blue-50" : "bg-white"
                        }`}
                      >
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {n.title}
                        </div>
                        <div className="text-xs text-gray-600 line-clamp-2">
                          {n.message}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="border-t">
                  <Link
                    to="/notifications"
                    className="block text-center py-2 text-sm text-green-700 hover:bg-green-50"
                    onClick={closeAll}
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cart (consumer only) */}
        {user?.role === "consumer" && (
          <Link to="/cart" className="relative" onClick={closeAll}>
            <FaShoppingCart className="text-2xl text-gray-700 hover:text-[#1E9C17]" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#FDB933] text-white text-xs px-2 py-0.5 rounded-full">
                {cartCount}
              </span>
            )}
          </Link>
        )}

        {/* User / Auth */}
        {user ? (
          <div className="relative" ref={profileRef}>
            <FaUserCircle
              onClick={() => {
                setProfileOpen((v) => !v);
                setNotifOpen(false);
              }}
              className="text-3xl text-[#1E9C17] cursor-pointer hover:text-[#FDB933]"
              title="Account"
            />

            {profileOpen && (
              <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md w-44 z-50 border">
                <Link
                  to="/profile"
                  className="block px-4 py-2 hover:bg-gray-100"
                  onClick={closeAll}
                >
                  Profile
                </Link>

                <button
                  type="button"
                  onClick={goToDashboard}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Dashboard
                </button>

                <Link
                  to="/notifications"
                  className="block px-4 py-2 hover:bg-gray-100"
                  onClick={closeAll}
                >
                  Notifications
                  {hasUnread ? (
                    <span className="ml-2 text-xs text-red-600 font-semibold">
                      ({unreadCount})
                    </span>
                  ) : null}
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-600"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden sm:flex items-center space-x-3">
            <Link to="/login" className="hover:text-[#1E9C17] font-medium">
              Login
            </Link>
            <Link
              to="/register"
              className="bg-[#1E9C17] text-white px-4 py-2 rounded-md hover:bg-[#158212]"
            >
              Register
            </Link>
          </div>
        )}

        {/* Mobile Button */}
        <button
          className="md:hidden text-2xl text-gray-700"
          onClick={() => {
            setMenuOpen(true);
            setProfileOpen(false);
            setNotifOpen(false);
          }}
          aria-label="Open menu"
        >
          <FaBars />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 md:hidden">
          <div className="bg-white w-64 h-full p-6">
            <div className="flex justify-between items-center mb-6">
              <img src="/logo.png" className="h-10" alt="Logo" />
              <FaTimes
                className="text-2xl cursor-pointer"
                onClick={() => setMenuOpen(false)}
              />
            </div>

            <div className="flex flex-col space-y-4">
              {roleMenuItem()}
              <Link to="/about" onClick={closeAll}>
                About
              </Link>
              <Link to="/contact" onClick={closeAll}>
                Contact
              </Link>

              {!user ? (
                <>
                  <Link to="/login" onClick={closeAll}>
                    Login
                  </Link>
                  <Link to="/register" onClick={closeAll}>
                    Register
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/profile" onClick={closeAll}>
                    Profile
                  </Link>
                  <button type="button" onClick={goToDashboard}>
                    Dashboard
                  </button>
                  <Link to="/notifications" onClick={closeAll}>
                    Notifications
                  </Link>
                  {user.role === "consumer" && (
                    <Link to="/cart" onClick={closeAll}>
                      Cart
                    </Link>
                  )}
                  <button type="button" onClick={handleLogout} className="text-red-600">
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
