import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import { AuthContext }         from "../context/AuthContext";
import { CartContext }         from "../context/CartContext";
import { NotificationContext } from "../context/NotificationContext";

import {
  FaSearch, FaUserCircle, FaShoppingCart, FaBars, FaTimes,
  FaBell, FaClipboardList, FaBox, FaUndo,
} from "react-icons/fa";

import api from "../api/axios";

const TRANSPARENT_ROUTES = ["/"];

const Navbar = () => {
  const { user, logout }   = useContext(AuthContext);
  const { cartItems }      = useContext(CartContext);
  const notifCtx           = useContext(NotificationContext);
  const location           = useLocation();

  const notifications  = notifCtx?.notifications  || [];
  const unreadCount    = notifCtx?.unreadCount     || 0;
  const hasUnread      = notifCtx?.hasUnread       || false;
  const refetch        = notifCtx?.refetch;
  const markAsRead     = notifCtx?.markAsRead;
  const markAllAsRead  = notifCtx?.markAllAsRead;

  const navigate = useNavigate();

  const [menuOpen,      setMenuOpen]      = useState(false);
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false); // mobile search bar toggle
  const [search,        setSearch]        = useState("");
  const [suggestions,   setSuggestions]   = useState([]);

  /* ── scroll-aware state ── */
  const isTransparentRoute = TRANSPARENT_ROUTES.includes(location.pathname);
  const [scrolled,  setScrolled]  = useState(false);
  const [visible,   setVisible]   = useState(!isTransparentRoute);
  const lastScrollY = useRef(0);

  useEffect(() => {
    setScrolled(false);
    setVisible(!isTransparentRoute);
    lastScrollY.current = window.scrollY;
  }, [location.pathname, isTransparentRoute]);

  useEffect(() => {
    const SHOW_THRESHOLD = 80;
    const onScroll = () => {
      const y = window.scrollY;
      if (isTransparentRoute) {
        setScrolled(y > SHOW_THRESHOLD);
        setVisible(y > SHOW_THRESHOLD);
      } else {
        setScrolled(y > 10);
        setVisible(true);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isTransparentRoute]);

  /* ── lock body scroll when mobile drawer/search is open ── */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  /* ── pending returns badge ── */
  const [pendingReturns, setPendingReturns] = useState(0);
  useEffect(() => {
    if (user?.role !== "farmer") return;
    const fetchPending = async () => {
      try {
        const res   = await api.get("/api/returns/farmer");
        const count = (res.data || []).filter((r) => r.status === "pending").length;
        setPendingReturns(count);
      } catch { /* non-critical */ }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  /* ── search suggestions ── */
  const sampleCrops = ["Tomato", "Potato", "Onion", "Carrot", "Corn", "Wheat", "Rice"];
  useEffect(() => {
    if (!search.trim()) return setSuggestions([]);
    setSuggestions(sampleCrops.filter((c) => c.toLowerCase().includes(search.toLowerCase())));
  }, [search]);

  /* ── outside click ── */
  const notifRef   = useRef(null);
  const profileRef = useRef(null);
  useEffect(() => {
    const onDown = (e) => {
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const cartCount = useMemo(() => {
    if (!Array.isArray(cartItems)) return 0;
    return cartItems.length;
  }, [cartItems]);

  const closeAll = () => {
    setMenuOpen(false);
    setProfileOpen(false);
    setNotifOpen(false);
    setSearchOpen(false);
  };

  const goToDashboard = () => {
    closeAll();
    if (user?.role === "consumer") return navigate("/consumer");
    if (user?.role === "farmer")   return navigate("/farmer");
    if (user?.role === "admin")    return navigate("/admin");
    navigate("/");
  };

  const handleLogout = () => {
    closeAll();
    logout?.();
    navigate("/");
  };

  /* ── desktop role links ── */
  const roleMenuItem = () => {
    if (!user) return null;
    if (user.role === "consumer") {
      return (
        <>
          <button type="button" onClick={() => { closeAll(); navigate("/consumer"); }} className="hover:text-[#1E9C17] transition">
            View Products
          </button>
          <button type="button" onClick={() => { closeAll(); navigate("/my-orders"); }} className="hover:text-[#1E9C17] transition flex items-center gap-2">
            <FaClipboardList /><span>My Orders</span>
          </button>
        </>
      );
    }
    if (user.role === "farmer") {
      return (
        <>
          <button type="button" onClick={() => { closeAll(); navigate("/add-product"); }} className="hover:text-[#1E9C17] transition">
            Add Product
          </button>
          <button type="button" onClick={() => { closeAll(); navigate("/farmer/orders"); }} className="hover:text-[#1E9C17] transition flex items-center gap-2">
            <FaBox /><span>Manage Orders</span>
          </button>
          <button type="button" onClick={() => { closeAll(); navigate("/farmer/returns"); }} className="hover:text-[#1E9C17] transition flex items-center gap-2">
            <FaUndo /><span>Returns</span>
            {pendingReturns > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingReturns}</span>
            )}
          </button>
        </>
      );
    }
    return null;
  };

  const solid = scrolled || !isTransparentRoute;
  const navBg = scrolled
    ? "bg-white/95 backdrop-blur-md shadow-md"
    : isTransparentRoute
    ? "bg-transparent"
    : "bg-white shadow-sm";
  const textColor  = solid ? "text-gray-700"  : "text-white";
  const logoFilter = solid ? "" : "brightness-0 invert";

  return (
    <>
      {/* ── Main navbar ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${navBg} ${
          visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        {/* Primary bar */}
        <div className="px-3 sm:px-6 py-3 flex items-center justify-between gap-2">

          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0" onClick={closeAll}>
            <img
              src="/logo.png"
              alt="Logo"
              className="h-8 sm:h-10 w-auto object-contain transition-all duration-300"
              style={{ filter: logoFilter }}
            />
          </Link>

          {/* Desktop nav links */}
          <div className={`hidden md:flex space-x-6 font-medium items-center ${textColor}`}>
            {roleMenuItem()}
            <Link to="/about"   className="hover:text-[#1E9C17] transition" onClick={closeAll}>About</Link>
            <Link to="/contact" className="hover:text-[#1E9C17] transition" onClick={closeAll}>Contact</Link>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2 sm:gap-3 sm:space-x-0">

            {/* Desktop search */}
            <div className="relative hidden sm:block w-48 md:w-56">
              <input
                type="text"
                placeholder="Search crops..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-full text-sm border focus:outline-none focus:ring-2 focus:ring-[#1E9C17] transition-all duration-300 ${
                  solid
                    ? "bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500"
                    : "bg-white/15 border-white/30 text-white placeholder-white/60 backdrop-blur-sm"
                }`}
              />
              <FaSearch className={`absolute left-3 top-2.5 text-sm ${solid ? "text-gray-500" : "text-white/70"}`} />
              {suggestions.length > 0 && (
                <ul className="absolute bg-white shadow-lg w-full rounded-xl mt-2 z-50 border border-gray-100 overflow-hidden">
                  {suggestions.map((item, i) => (
                    <li
                      key={i}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-gray-700 text-sm"
                      onClick={() => { setSearch(item); setSuggestions([]); }}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Mobile search toggle */}
            <button
              type="button"
              className={`sm:hidden text-xl transition ${solid ? "text-gray-700" : "text-white/80"}`}
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search"
            >
              <FaSearch />
            </button>

            {/* Notifications */}
            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); refetch?.(); }}
                  className="relative p-0.5"
                  aria-label="Notifications"
                >
                  <FaBell className={`text-xl sm:text-2xl transition ${solid ? "text-gray-700 hover:text-[#1E9C17]" : "text-white/80 hover:text-white"}`} />
                  {hasUnread && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full leading-none min-w-[16px] text-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  /* Full-width on mobile, fixed-width dropdown on sm+ */
                  <div className="absolute right-0 mt-2 bg-white shadow-xl rounded-2xl border border-gray-100 z-50 overflow-hidden
                                  w-[calc(100vw-24px)] max-w-xs sm:w-80 sm:max-w-none
                                  -translate-x-[calc(100%-20px)] sm:translate-x-0">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <div className="font-semibold text-gray-900 text-sm">Notifications</div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button type="button" onClick={() => markAllAsRead?.()} className="text-xs text-blue-600 hover:underline">
                            Mark all read
                          </button>
                        )}
                        <button type="button" onClick={() => { closeAll(); navigate("/notifications"); }} className="text-xs text-gray-700 hover:underline">
                          View all
                        </button>
                      </div>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-gray-500">No notifications yet.</div>
                    ) : (
                      <div className="max-h-72 sm:max-h-80 overflow-auto">
                        {notifications.slice(0, 8).map((n) => (
                          <button
                            key={n._id}
                            type="button"
                            onClick={() => {
                              if (!n.isRead) markAsRead?.(n._id);
                              closeAll();
                              if (n?.data?.orderId) navigate(user?.role === "consumer" ? "/my-orders" : "/farmer/orders");
                              else if (n?.data?.returnId) navigate(user?.role === "consumer" ? "/my-orders" : "/farmer/returns");
                            }}
                            className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 ${!n.isRead ? "bg-blue-50" : "bg-white"}`}
                          >
                            <div className="text-sm font-semibold text-gray-900 truncate">{n.title}</div>
                            <div className="text-xs text-gray-600 line-clamp-2">{n.message}</div>
                            <div className="text-[11px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="border-t">
                      <Link to="/notifications" className="block text-center py-2.5 text-sm text-green-700 hover:bg-green-50" onClick={closeAll}>
                        View all notifications
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cart — consumer only */}
            {user?.role === "consumer" && (
              <Link to="/cart" className="relative p-0.5" onClick={closeAll} title="Shopping cart">
                <FaShoppingCart className={`text-xl sm:text-2xl transition ${solid ? "text-gray-700 hover:text-[#1E9C17]" : "text-white/80 hover:text-white"}`} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#FDB933] text-white text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full leading-none min-w-[16px] text-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            {/* User menu */}
            {user ? (
              <div className="relative" ref={profileRef}>
                <FaUserCircle
                  onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
                  className={`text-2xl sm:text-3xl cursor-pointer transition ${solid ? "text-[#1E9C17] hover:text-[#FDB933]" : "text-white/90 hover:text-white"}`}
                />
                {profileOpen && (
                  /* Dropdown — avoids right overflow on mobile */
                  <div className="absolute right-0 mt-2 bg-white shadow-xl rounded-xl w-48 z-50 border border-gray-100 overflow-hidden">
                    <Link to="/profile"       className="block px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700" onClick={closeAll}>Profile</Link>
                    <button type="button" onClick={goToDashboard} className="block w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700">Dashboard</button>
                    {user.role === "consumer" && (
                      <Link to="/my-orders" className="block px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700" onClick={closeAll}>My Orders</Link>
                    )}
                    {user.role === "farmer" && (
                      <>
                        <Link to="/farmer/orders"  className="block px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700" onClick={closeAll}>Manage Orders</Link>
                        <Link to="/farmer/returns" className="block px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700" onClick={closeAll}>
                          Returns
                          {pendingReturns > 0 && (
                            <span className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingReturns}</span>
                          )}
                        </Link>
                      </>
                    )}
                    <Link to="/notifications" className="block px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700" onClick={closeAll}>
                      Notifications
                      {hasUnread && <span className="ml-2 text-xs text-red-600 font-semibold">({unreadCount})</span>}
                    </Link>
                    <div className="border-t border-gray-100" />
                    <button type="button" onClick={handleLogout} className="block w-full text-left px-4 py-2.5 hover:bg-red-50 text-sm text-red-600">Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 sm:gap-3">
                <Link to="/login"    className={`font-medium text-sm transition ${solid ? "text-gray-700 hover:text-[#1E9C17]" : "text-white/80 hover:text-white"}`}>Login</Link>
                <Link to="/register" className="bg-[#1E9C17] text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#158212] transition whitespace-nowrap">Register</Link>
              </div>
            )}

            {/* Hamburger */}
            <button
              className={`md:hidden text-xl sm:text-2xl transition p-0.5 ${solid ? "text-gray-700" : "text-white"}`}
              onClick={() => { setMenuOpen(true); setProfileOpen(false); setNotifOpen(false); }}
              aria-label="Open menu"
            >
              <FaBars />
            </button>
          </div>
        </div>

        {/* Mobile search bar — expands below the main bar */}
        {searchOpen && (
          <div className="sm:hidden px-3 pb-3 animate-slideDown">
            <div className="relative">
              <input
                type="text"
                placeholder="Search crops..."
                value={search}
                autoFocus
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 rounded-full text-sm border border-gray-300 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E9C17]"
              />
              <FaSearch className="absolute left-3 top-3 text-sm text-gray-400" />
              {search && (
                <button
                  type="button"
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  onClick={() => { setSearch(""); setSuggestions([]); }}
                >
                  <FaTimes className="text-sm" />
                </button>
              )}
            </div>
            {suggestions.length > 0 && (
              <ul className="bg-white shadow-lg w-full rounded-xl mt-1 border border-gray-100 overflow-hidden">
                {suggestions.map((item, i) => (
                  <li
                    key={i}
                    className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-gray-700 text-sm active:bg-gray-100"
                    onClick={() => { setSearch(item); setSuggestions([]); setSearchOpen(false); }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </nav>

      {/* ── Mobile drawer ── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 md:hidden transition-opacity duration-300 ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Drawer panel — slides in from right */}
      <div
        className={`fixed top-0 right-0 h-full w-[min(320px,85vw)] bg-white z-50 md:hidden
                    shadow-2xl flex flex-col transition-transform duration-300 ease-in-out
                    ${menuOpen ? "translate-x-0" : "translate-x-full"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <img src="/logo.png" className="h-8" alt="Logo" />
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition"
            aria-label="Close menu"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-3 py-3">

          {/* User info pill */}
          {user && (
            <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-gray-50 rounded-xl">
              <FaUserCircle className="text-3xl text-[#1E9C17] flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 text-sm truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-gray-500 capitalize">{user.role}</div>
              </div>
            </div>
          )}

          {/* Search in drawer */}
          <div className="relative px-0 mb-3">
            <input
              type="text"
              placeholder="Search crops..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-full text-sm border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E9C17]"
            />
            <FaSearch className="absolute left-3 top-3 text-sm text-gray-400" />
          </div>

          <div className="flex flex-col gap-0.5">
            {/* Role-based links */}
            {user?.role === "consumer" && (
              <>
                <MobileLink to="/consumer"  onClick={closeAll}>View Products</MobileLink>
                <MobileLink to="/my-orders" onClick={closeAll}>
                  <FaClipboardList className="inline mr-2 text-base" />My Orders
                </MobileLink>
                <MobileLink to="/cart" onClick={closeAll}>
                  <FaShoppingCart className="inline mr-2 text-base" />
                  Cart
                  {cartCount > 0 && (
                    <span className="ml-2 bg-[#FDB933] text-white text-xs px-1.5 py-0.5 rounded-full">{cartCount}</span>
                  )}
                </MobileLink>
              </>
            )}
            {user?.role === "farmer" && (
              <>
                <MobileLink to="/add-product"    onClick={closeAll}>Add Product</MobileLink>
                <MobileLink to="/farmer/orders"  onClick={closeAll}>
                  <FaBox className="inline mr-2 text-base" />Manage Orders
                </MobileLink>
                <MobileLink to="/farmer/returns" onClick={closeAll}>
                  <FaUndo className="inline mr-2 text-base" />Returns
                  {pendingReturns > 0 && (
                    <span className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingReturns}</span>
                  )}
                </MobileLink>
              </>
            )}

            <MobileLink to="/about"   onClick={closeAll}>About</MobileLink>
            <MobileLink to="/contact" onClick={closeAll}>Contact</MobileLink>

            <div className="border-t border-gray-100 my-2" />

            {!user ? (
              <>
                <MobileLink to="/login"    onClick={closeAll}>Login</MobileLink>
                <MobileLink to="/register" onClick={closeAll}>Register</MobileLink>
              </>
            ) : (
              <>
                <MobileLink to="/profile" onClick={closeAll}>Profile</MobileLink>
                <MobileLink to="/notifications" onClick={closeAll}>
                  Notifications
                  {hasUnread && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                  )}
                </MobileLink>
                <button
                  type="button"
                  onClick={goToDashboard}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 text-sm font-medium transition"
                >
                  Dashboard
                </button>
              </>
            )}
          </div>
        </div>

        {/* Drawer footer — logout / auth buttons */}
        <div className="flex-shrink-0 px-3 py-4 border-t border-gray-100">
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-center py-3 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 active:bg-red-200 transition"
            >
              Logout
            </button>
          ) : (
            <div className="flex gap-2">
              <Link
                to="/login"
                onClick={closeAll}
                className="flex-1 text-center py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={closeAll}
                className="flex-1 text-center py-3 rounded-xl bg-[#1E9C17] text-white font-semibold text-sm hover:bg-[#158212] transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const MobileLink = ({ to, onClick, children }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 active:bg-gray-100 text-sm font-medium transition"
  >
    {children}
  </Link>
);

export default Navbar;