import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="w-full font-[Poppins] text-[#1D1D1D] overflow-x-hidden">

      {/* HERO */}
      <section
        className="relative min-h-[80vh] flex items-center"
        style={{
          backgroundImage: "url('/home/hero.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/60"></div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 text-white animate-fadeIn">
          <h1 className="font-[Montserrat] text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
            Welcome to <span className="text-[#FDB933]">MeroBari</span>
          </h1>

          <h2 className="mt-3 text-xl sm:text-2xl font-semibold text-[#E0E0E0]">
            D2C Crop Selling System
          </h2>

          <p className="mt-6 max-w-2xl text-[#E0E0E0] text-base sm:text-lg">
            A transparent digital platform connecting agriculture directly
            to consumers — eliminating middlemen and ensuring fair trade.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/login"
              className="bg-[#1E9C17] px-8 py-3 rounded-lg font-semibold hover:scale-110 transition-transform duration-300"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-[#FDB933] text-black px-8 py-3 rounded-lg font-semibold hover:scale-110 transition-transform duration-300"
            >
              Register
            </Link>
          </div>
        </div>
      </section>

      {/* WHY MEROBARI */}
      <section className="py-20 bg-[#F5FFF5]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-[Montserrat] text-3xl font-bold">
            Why MeroBari?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mt-14">
            {[
              ["100%", "Transparency"],
              ["0%", "Middlemen"],
              ["Fresh", "Farm Produce"],
              ["Secure", "Payments"],
            ].map(([title, subtitle], i) => (
              <div
                key={i}
                className="bg-white p-8 rounded-xl shadow-lg
                           transform transition-all duration-300
                           hover:scale-110 hover:-translate-y-2"
              >
                <h3 className="font-[Montserrat] text-3xl font-bold text-[#1E9C17]">
                  {title}
                </h3>
                <p className="mt-2 text-[#828282]">{subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BACKGROUND SECTION (REUSED STYLE) */}
      <section
        className="relative py-24"
        style={{
          backgroundImage: "url('/home/farm.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[#1D1D1D]/70"></div>

        <div className="relative max-w-5xl mx-auto px-6 text-center text-white">
          <h2 className="font-[Montserrat] text-3xl sm:text-4xl font-bold">
            Agriculture with Trust & Technology
          </h2>

          <p className="mt-6 text-[#E0E0E0] leading-relaxed">
            MeroBari leverages modern technology to build trust, ensure
            traceability, and simplify the agricultural supply chain.
            Every crop listing and transaction is transparent and secure.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-[Montserrat] text-3xl font-bold">
            How the Platform Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-16">
            {[
              ["Create Account", "Register once to access the platform"],
              ["Buy or Sell Crops", "Browse or list agricultural products"],
              ["Order & Delivery", "Secure payment and direct delivery"],
            ].map(([title, desc], i) => (
              <div
                key={i}
                className="bg-white p-10 rounded-2xl shadow-md
                           transition-all duration-300
                           hover:scale-110 hover:shadow-xl"
              >
                <div className="w-14 h-14 mx-auto mb-6 rounded-full
                                bg-[#1E9C17] text-white flex
                                items-center justify-center font-bold text-lg">
                  {i + 1}
                </div>
                <h3 className="font-[Montserrat] text-lg font-semibold">
                  {title}
                </h3>
                <p className="mt-3 text-[#828282] text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 text-center bg-[#FAFAFA]">
        <h2 className="font-[Montserrat] text-4xl font-bold">
          Join MeroBari Today
        </h2>
        <p className="mt-4 text-[#828282]">
          One platform. One account. Transparent agriculture.
        </p>

        <div className="mt-8 flex justify-center gap-4 flex-wrap">
          <Link
            to="/login"
            className="bg-[#1E9C17] text-white px-8 py-3 rounded-lg
                       font-semibold hover:scale-110 transition-transform"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="bg-[#FDB933] text-black px-8 py-3 rounded-lg
                       font-semibold hover:scale-110 transition-transform"
          >
            Register
          </Link>
        </div>
      </section>

    </div>
  );
};

export default Home;
