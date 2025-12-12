import { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { FaSearch, FaUserCircle } from "react-icons/fa";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="w-full bg-white shadow-md py-3 px-6 flex items-center justify-between">

      {/* Logo */}
      <div>
        <Link to="/" className="text-2xl font-bold text-[#1E9C17]">
          D2C
        </Link>
      </div>

      {/* Center Navigation */}
      <div className="hidden md:flex space-x-10 font-medium text-gray-700">
        <Link to="/products" className="hover:text-[#1E9C17] transition">Products</Link>
        <Link to="/farmers" className="hover:text-[#1E9C17] transition">Farmers</Link>
        <Link to="/about" className="hover:text-[#1E9C17] transition">About</Link>
        <Link to="/contact" className="hover:text-[#1E9C17] transition">Contact</Link>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-4">

        {/* Search */}
        <div className="relative hidden sm:block">
          <input
            type="text"
            placeholder="Search crops..."
            className="border border-gray-300 rounded-md pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-[#1E9C17]"
          />
          <FaSearch className="absolute left-2 top-3 text-gray-500" />
        </div>

        {/* Authenticated */}
        {user ? (
          <div className="flex items-center space-x-3">
            <Link to="/profile">
              <FaUserCircle className="text-3xl text-[#1E9C17] hover:text-[#FDB933] cursor-pointer" />
            </Link>

            <button
              onClick={logout}
              className="bg-[#EB5757] text-white px-3 py-1 rounded-md hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        ) : (
          /* Guest (Not Logged In) */
          <div className="flex items-center space-x-3">
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

      </div>
    </nav>
  );
};

export default Navbar;
