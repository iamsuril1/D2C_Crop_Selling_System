import { useContext, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";

import { FaSearch, FaUserCircle, FaShoppingCart, FaBars, FaTimes } from "react-icons/fa";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { cartCount } = useContext(CartContext);
  const navigate = useNavigate();

  // Mobile menu
  const [menuOpen, setMenuOpen] = useState(false);

  // Profile dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Search
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  // Sticky navbar
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Mock search data
  const sampleCrops = ["Tomato", "Potato", "Onion", "Carrot", "Corn", "Wheat", "Rice"];
  useEffect(() => {
    if (!search.trim()) return setSuggestions([]);
    setSuggestions(sampleCrops.filter(c => c.toLowerCase().includes(search.toLowerCase())));
  }, [search]);

  // Role-based navigation
  const goToDashboard = () => {
    setDropdownOpen(false);
    if (user?.role === "consumer") navigate("/dashboard");
    if (user?.role === "farmer") navigate("/farmer");
    if (user?.role === "admin") navigate("/admin");
  };

  // Role-based menu item
  const roleMenuItem = () => {
    if (!user) return null;
    if (user.role === "consumer") return (
      <button onClick={() => navigate("/dashboard")} className="hover:text-[#1E9C17] transition">
        View Products
      </button>
    );
    if (user.role === "farmer") return (
      <button onClick={() => navigate("/add-product")} className="hover:text-[#1E9C17] transition">
        Add Product
      </button>
    );
  };

  return (
    <nav className={`w-full bg-white shadow-sm py-3 px-6 flex items-center justify-between z-50 transition-all ${isSticky ? "fixed top-0 shadow-lg" : "relative"}`}>
      
      {/* Logo */}
      <Link to="/" className="flex items-center">
        <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex space-x-6 font-medium text-gray-700 items-center">
        {roleMenuItem()}
        <Link to="/about" className="hover:text-[#1E9C17] transition">About</Link>
        <Link to="/contact" className="hover:text-[#1E9C17] transition">Contact</Link>
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
                <li key={index} className="px-4 py-2 hover:bg-gray-100 cursor-pointer">{item}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Cart */}
        {user && (
          <Link to="/cart" className="relative">
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
          <div className="relative">
            <FaUserCircle
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="text-3xl text-[#1E9C17] cursor-pointer hover:text-[#FDB933]"
            />
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md w-40 z-50">
                <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100">Profile</Link>
                <button onClick={goToDashboard} className="block w-full text-left px-4 py-2 hover:bg-gray-100">
                  Dashboard
                </button>
                <Link to="/orders" className="block px-4 py-2 hover:bg-gray-100">Orders</Link>
                <button onClick={logout} className="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-600">
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden sm:flex items-center space-x-3">
            <Link to="/login" className="hover:text-[#1E9C17] font-medium">Login</Link>
            <Link to="/register" className="bg-[#1E9C17] text-white px-4 py-2 rounded-md hover:bg-[#158212]">Register</Link>
          </div>
        )}

        {/* Mobile Button */}
        <button className="md:hidden text-2xl text-gray-700" onClick={() => setMenuOpen(true)}>
          <FaBars />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 md:hidden">
          <div className="bg-white w-64 h-full p-6">
            <div className="flex justify-between items-center mb-6">
              <img src="/logo.png" className="h-10" />
              <FaTimes className="text-2xl cursor-pointer" onClick={() => setMenuOpen(false)} />
            </div>

            <div className="flex flex-col space-y-4">
              {roleMenuItem()}
              <Link to="/about" onClick={() => setMenuOpen(false)}>About</Link>
              <Link to="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>

              {!user ? (
                <>
                  <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)}>Register</Link>
                </>
              ) : (
                <>
                  <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
                  <button onClick={goToDashboard}>Dashboard</button>
                  <Link to="/orders" onClick={() => setMenuOpen(false)}>Orders</Link>
                  <button onClick={logout} className="text-red-600">Logout</button>
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