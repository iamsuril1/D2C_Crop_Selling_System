import { useContext, useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  const { cartCount } = useContext(CartContext);

  // Mobile menu
  const [menuOpen, setMenuOpen] = useState(false);

  // Profile dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Search functionality
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  // Sticky navbar
  const [isSticky, setIsSticky] = useState(false);

  // Sticky behavior on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Temporary mock search data (connect backend later)
  const sampleCrops = [
    "Tomato",
    "Potato",
    "Onion",
    "Carrot",
    "Corn",
    "Wheat",
    "Rice",
  ];

  // Update suggestions when typing
  useEffect(() => {
    if (search.trim() === "") {
      setSuggestions([]);
      return;
    }

    const filtered = sampleCrops.filter((c) =>
      c.toLowerCase().includes(search.toLowerCase())
    );
    setSuggestions(filtered);
  }, [search]);

  return (
    <nav
      className={`w-full bg-white shadow-sm py-3 px-6 flex items-center justify-between z-50 transition-all ${
        isSticky ? "fixed top-0 shadow-lg" : "relative"
      }`}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center">
        <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex space-x-10 font-medium text-gray-700">
        <Link to="/products" className="hover:text-[#1E9C17] transition">
          Products
        </Link>
        <Link to="/farmers" className="hover:text-[#1E9C17] transition">
          Farmers
        </Link>
        <Link to="/about" className="hover:text-[#1E9C17] transition">
          About
        </Link>
        <Link to="/contact" className="hover:text-[#1E9C17] transition">
          Contact
        </Link>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">

        {/* Search Bar */}
        <div className="relative hidden sm:block w-64">
          <input
            type="text"
            placeholder="Search crops..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="
              w-full
              pl-10 pr-4 py-2
              rounded-full
              bg-gray-100
              border border-gray-300
              focus:outline-none
              focus:ring-2 focus:ring-[#1E9C17]
              transition
            "
          />
          <FaSearch className="absolute left-3 top-3 text-gray-500" />

          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <ul className="absolute bg-white shadow-lg w-full rounded-lg mt-2 max-h-48 overflow-y-auto text-gray-700 z-50">
              {suggestions.map((item, index) => (
                <li
                  key={index}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cart (Visible only if logged in) */}
        {user && (
          <Link to="/cart" className="relative">
            <FaShoppingCart className="text-2xl text-gray-700 hover:text-[#1E9C17] transition" />

            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#FDB933] text-white text-xs px-2 py-0.5 rounded-full">
                {cartCount}
              </span>
            )}
          </Link>
        )}

        {/* Authenticated User */}
        {user ? (
          <div className="relative">
            <FaUserCircle
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="text-3xl text-[#1E9C17] cursor-pointer hover:text-[#FDB933] transition"
            />

            {/* Profile Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md w-40 z-50">
                <Link
                  to="/profile"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  Profile
                </Link>
                <Link
                  to="/orders"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  Orders
                </Link>
                <button
                  onClick={logout}
                  className="block text-left w-full px-4 py-2 hover:bg-red-50 text-red-600"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Guest State */
          <div className="hidden sm:flex items-center space-x-3">
            <Link to="/login" className="hover:text-[#1E9C17] font-medium">
              Login
            </Link>
            <Link
              to="/register"
              className="bg-[#1E9C17] text-white px-4 py-2 rounded-md hover:bg-[#158212] transition font-medium"
            >
              Register
            </Link>
          </div>
        )}

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-2xl text-gray-700"
          onClick={() => setMenuOpen(true)}
        >
          <FaBars />
        </button>
      </div>

      {/* Mobile Slide-in Menu */}
      {menuOpen && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-40 z-50 md:hidden">
          <div className="bg-white w-64 h-full p-6">
            <div className="flex justify-between items-center mb-6">
              <img src="/logo.png" className="h-10" />
              <FaTimes
                className="text-2xl cursor-pointer"
                onClick={() => setMenuOpen(false)}
              />
            </div>

            <div className="flex flex-col space-y-4 text-gray-700">
              <Link to="/products">Products</Link>
              <Link to="/farmers">Farmers</Link>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>

              {!user && (
                <>
                  <Link to="/login">Login</Link>
                  <Link to="/register">Register</Link>
                </>
              )}

              {user && (
                <>
                  <Link to="/profile">Profile</Link>
                  <Link to="/orders">Orders</Link>
                  <button className="text-left text-red-600" onClick={logout}>
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
