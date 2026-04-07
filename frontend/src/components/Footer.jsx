import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-[#1D1D1D] text-[#E0E0E0] font-[Poppins]">
      <div className="max-w-7xl mx-auto px-6 py-16">

        {/* TOP */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* BRAND */}
          <div>
            <h2 className="font-[Montserrat] text-2xl font-bold text-white">
              MeroBari
            </h2>
            <p className="mt-4 text-sm text-[#BDBDBD] leading-relaxed">
              MeroBari is a Direct-To-Consumer crop selling platform that
              connects farmers and buyers for transparent, fair, and secure
              agricultural trade.
            </p>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h3 className="font-[Montserrat] text-lg font-semibold text-white mb-4">
              Quick Links
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/" className="hover:text-[#FDB933] transition">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#FDB933] transition">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[#FDB933] transition">
                  Register
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-[#FDB933] transition">
                  Explore Crops
                </Link>
              </li>
            </ul>
          </div>

          {/* CONTACT */}
          <div>
            <h3 className="font-[Montserrat] text-lg font-semibold text-white mb-4">
              Contact
            </h3>
            <ul className="space-y-3 text-sm text-[#BDBDBD]">
              <li>Email: surilpokharel4@gmail.com</li>
              <li>Phone: +977-9803383479</li>
              <li>Location: Nepal</li>
            </ul>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="border-t border-[#333333] my-10"></div>

        {/* BOTTOM */}
        <div className="flex flex-col md:flex-row items-center justify-between text-sm text-[#BDBDBD] gap-4">
          <p>© {new Date().getFullYear()} MeroBari. All rights reserved.</p>
          <p>D2C Crop Selling System | Final Year Project</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
