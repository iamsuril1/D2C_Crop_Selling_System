import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-[#1D1D1D] text-[#E0E0E0] font-[Poppins]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        {/* TOP — 1 col on mobile, 2 on sm, 4 on md */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">

          {/* BRAND — full width on mobile */}
          <div className="sm:col-span-2 md:col-span-1">
            <h2 className="font-[Montserrat] text-xl sm:text-2xl font-bold text-white">
              MeroBari
            </h2>
            <p className="mt-3 sm:mt-4 text-sm text-[#BDBDBD] leading-relaxed">
              MeroBari is a Direct-To-Consumer crop selling platform that
              connects farmers and buyers for transparent, fair, and secure
              agricultural trade.
            </p>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h3 className="font-[Montserrat] text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2.5 sm:space-y-3 text-sm">
              <li>
                <Link to="/" className="hover:text-[#FDB933] active:text-[#FDB933] transition">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#FDB933] active:text-[#FDB933] transition">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[#FDB933] active:text-[#FDB933] transition">
                  Register
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-[#FDB933] active:text-[#FDB933] transition">
                  Explore Crops
                </Link>
              </li>
            </ul>
          </div>

          {/* CONTACT */}
          <div>
            <h3 className="font-[Montserrat] text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
              Contact
            </h3>
            <ul className="space-y-2.5 sm:space-y-3 text-sm text-[#BDBDBD]">
              <li className="break-all">Email: surilpokharel4@gmail.com</li>
              <li>Phone: +977-9803383479</li>
              <li>Location: Nepal</li>
            </ul>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="border-t border-[#333333] my-8 sm:my-10"></div>

        {/* BOTTOM — stacked on mobile, row on md+ */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-[#BDBDBD] gap-2 sm:gap-4 text-center sm:text-left">
          <p>© {new Date().getFullYear()} MeroBari. All rights reserved.</p>
          <p>D2C Crop Selling System | Final Year Project</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;