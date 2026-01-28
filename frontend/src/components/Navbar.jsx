import { useContext, useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";

import {
  FaSearch,
  FaUserCircle,
  FaShoppingCart,
  FaBars,
  FaTimes,
} from "react-icons/fa";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { cartItems } = useContext(CartContext); 
  const navigate = useNavigate();

  // ✅ EXPLICIT: Cart count = number of unique items
  const cartCount = useMemo(() => {
    if (!Array.isArray(cartItems)) return 0;
    return cartItems.length;
  }, [cartItems]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const sampleCrops = ["Tomato", "Potato", "Onion", "Carrot", "Corn", "Wheat", "Rice"];
  useEffect(() => {
    if (!search.trim()) return setSuggestions([]);
    setSuggestions(
      sampleCrops.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search]);

  // ✅ EXPLICIT: Role-based dashboard
  const goToDashboard = () => {
    setDropdownOpen(false);
    setMenuOpen(false);
    if (user?.role === "consumer") return navigate("/consumer");
    if (user?.role === "farmer") return navigate("/farmer");
    if (user?.role === "admin") return navigate("/admin");
    navigate("/");
  };

  // ✅ EXPLICIT: Logout → Home (/)
  const handleLogout = () => {
    setDropdownOpen(false);
    setMenuOpen(false);
    logout?.();  // Clears AuthContext + localStorage
    navigate("/");  // ✅ Goes to Home
  };

  const roleMenuItem = () => {
    if (!user) return null;
    if (user.role === "consumer")
      return (
        <button onClick={() => navigate("/consumer")} className="hover:text-[#1E9C17] transition">
          View Products
        </button>
      );
    if (user.role === "farmer")
      return (
        <button onClick={() => navigate("/farmer")} className="hover:text-[#1E9C17] transition">
          My Dashboard
        </button>
      );
    return null;
  };

  return (
    <nav className={`w-full bg-white shadow-sm py-3 px-6 flex items-center justify-between z-50 transition-all duration-300 ${
      isSticky ? "fixed top-0 shadow-lg backdrop-blur-sm bg-white/95" : "relative"
    }`}>
      {/* Logo */}
      <Link to="/" className="flex items-center group">
        <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain group-hover:scale-105 transition" />
      </Link>

      {/* Desktop Nav */}
      <div className="hidden md:flex space-x-8 font-medium text-gray-700 items-center">
        {roleMenuItem()}
        <Link to="/about" className="hover:text-[#1E9C17] transition-all duration-200">About</Link>
        <Link to="/contact" className="hover:text-[#1E9C17] transition-all duration-200">Contact</Link>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative hidden lg:block w-72">
          <input
            type="text"
            placeholder="Search crops..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E9C17] focus:border-transparent transition-all"
          />
          <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
          {suggestions.length > 0 && (
            <ul className="absolute w-full bg-white shadow-2xl rounded-2xl mt-2 z-50 max-h-80 overflow-auto border border-gray-100">
              {suggestions.map((item, index) => (
                <li
                  key={index}
                  className="px-5 py-3 hover:bg-green-50 cursor-pointer border-b border-gray-50 last:border-b-0 transition-colors"
                  onClick={() => {
                    setSearch(item);
                    setSuggestions([]);
                  }}
                >
                  <span className="font-medium text-gray-900">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ✅ Cart - Consumer only */}
        {user?.role === "consumer" && (
          <Link to="/cart" className="relative p-2 group">
            <FaShoppingCart className="text-2xl text-gray-700 group-hover:text-[#1E9C17] transition-all duration-200" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FDB933] text-white text-xs px-2 py-1 rounded-full min-w-[24px] h-[24px] flex items-center justify-center text-[0.7rem] font-bold shadow-lg border-2 border-white">
                {cartCount}
              </span>
            )}
          </Link>
        )}

        {/* Auth */}
        {user ? (
          <div className="relative" onMouseLeave={() => setDropdownOpen(false)}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="p-2 rounded-full hover:bg-gray-100 transition-all"
            >
              <FaUserCircle className="text-3xl text-[#1E9C17] hover:text-[#FDB933]" />
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-3 bg-white shadow-2xl rounded-2xl w-56 z-50 border border-gray-100 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                  <div className="font-semibold text-gray-900">{user.firstName} {user.lastName}</div>
                  <div className="text-sm text-gray-600">{user.role}</div>
                </div>
                
                <div className="py-2">
                  <Link
                    to="/profile"
                    className="block px-6 py-3 hover:bg-gray-50 transition-all"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Profile Settings
                  </Link>
                  
                  <button
                    onClick={goToDashboard}
                    className="block w-full text-left px-6 py-3 hover:bg-green-50 hover:text-[#1E9C17] transition-all font-medium"
                  >
                    My Dashboard
                  </button>
                  
                  {user.role === "consumer" && (
                    <Link
                      to="/cart"
                      className="block px-6 py-3 hover:bg-gray-50 transition-all"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Shopping Cart
                    </Link>
                  )}
                  
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-6 py-3 hover:bg-red-50 text-red-600 font-medium transition-all"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex items-center space-x-4">
            <Link 
              to="/login" 
              className="text-gray-700 hover:text-[#1E9C17] font-medium transition-all px-4 py-2 hover:bg-gray-50 rounded-xl"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-gradient-to-r from-[#1E9C17] to-[#158212] text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
            >
              Get Started
            </Link>
          </div>
        )}

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-all"
          onClick={() => setMenuOpen(true)}
        >
          <FaBars className="text-2xl text-gray-700" />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[99] md:hidden" 
          onClick={() => setMenuOpen(false)}
        >
          <div 
            className="bg-white w-80 h-full absolute right-0 shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b">
              <div className="flex items-center justify-between mb-2">
                <img src="/logo.png" className="h-10" alt="Logo" />
                <FaTimes 
                  className="text-2xl cursor-pointer hover:text-red-500 transition-colors" 
                  onClick={() => setMenuOpen(false)}
                />
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {roleMenuItem()}
              <Link 
                to="/about" 
                className="block py-3 px-4 rounded-xl hover:bg-gray-50 hover:text-[#1E9C17] transition-all"
                onClick={() => setMenuOpen(false)}
              >
                About
              </Link>
              <Link 
                to="/contact" 
                className="block py-3 px-4 rounded-xl hover:bg-gray-50 hover:text-[#1E9C17] transition-all"
                onClick={() => setMenuOpen(false)}
              >
                Contact
              </Link>

              {!user ? (
                <>
                  <Link 
                    to="/login" 
                    className="block py-4 px-6 bg-gray-100 hover:bg-gray-200 font-semibold rounded-xl text-center transition-all"
                    onClick={() => setMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register" 
                    className="block py-4 px-6 bg-gradient-to-r from-[#1E9C17] to-[#158212] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    to="/profile" 
                    className="block py-3 px-4 rounded-xl hover:bg-gray-50 font-semibold transition-all"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button 
                    onClick={goToDashboard} 
                    className="block w-full text-left py-3 px-4 rounded-xl hover:bg-green-50 hover:text-[#1E9C17] font-semibold transition-all"
                  >
                    Dashboard
                  </button>
                  <hr className="border-gray-200 my-2" />
                  <button 
                    onClick={handleLogout} 
                    className="block w-full text-left py-3 px-4 rounded-xl hover:bg-red-50 text-red-600 font-semibold transition-all"
                  >
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
