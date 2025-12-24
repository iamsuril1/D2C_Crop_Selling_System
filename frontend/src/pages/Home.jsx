import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="w-full font-[Poppins] text-[#1D1D1D] overflow-x-hidden">

      {/* HERO */}
      <section
        className="relative min-h-[85vh] flex items-center"
        style={{
          backgroundImage: "url('/home/hero.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/60 to-black/40"></div>

        <div className="relative max-w-7xl mx-auto px-6 py-28 text-white animate-fadeIn">
          <span className="inline-block mb-4 px-4 py-1 text-sm rounded-full bg-[#FDB933]/20 text-[#FDB933]">
            Direct-to-Consumer Agriculture
          </span>

          <h1 className="font-[Montserrat] text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
            Welcome to <span className="text-[#FDB933]">MeroBari</span>
          </h1>

          <h2 className="mt-3 text-xl sm:text-2xl font-medium text-[#E0E0E0]">
            D2C Crop Selling System
          </h2>

          <p className="mt-6 max-w-2xl text-[#E0E0E0] text-base sm:text-lg leading-relaxed">
            A digital platform that directly connects farmers and consumers,
            ensuring transparency, fair pricing, and secure agricultural trade.
          </p>

          <div className="mt-10 flex flex-wrap gap-5">
            <Link
              to="/login"
              className="bg-[#1E9C17] px-8 py-3 rounded-xl font-semibold
                         hover:scale-110 hover:shadow-lg transition-all"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-[#FDB933] text-black px-8 py-3 rounded-xl font-semibold
                         hover:scale-110 hover:shadow-lg transition-all"
            >
              Register
            </Link>
          </div>
        </div>
      </section>

      {/* WHY MEROBARI */}
      <section className="py-24 bg-[#F5FFF5] relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#1E9C17] to-[#FDB933]" />

        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-[Montserrat] text-3xl font-bold">
            Why MeroBari?
          </h2>

          <p className="mt-4 text-[#4F4F4F] max-w-2xl mx-auto">
            Designed to eliminate inefficiencies and empower both farmers
            and consumers through technology.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mt-16">
            {[
              ["100%", "Transparency"],
              ["0%", "Middlemen"],
              ["Fresh", "Farm Produce"],
              ["Secure", "Payments"],
            ].map(([title, subtitle], i) => (
              <div
                key={i}
                className="bg-white/90 backdrop-blur p-10 rounded-2xl shadow-lg
                           transition-all duration-300
                           hover:scale-110 hover:-translate-y-2"
              >
                <h3 className="font-[Montserrat] text-4xl font-bold text-[#1E9C17]">
                  {title}
                </h3>
                <p className="mt-3 text-[#828282]">{subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-[Montserrat] text-3xl font-bold">
            Explore Crop Categories
          </h2>

          <p className="mt-4 text-[#828282] max-w-2xl mx-auto">
            Carefully curated agricultural categories sourced directly
            from trusted farmers.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mt-16">
            {[
              ["Vegetables", "/home/vegetables.webp"],
              ["Fruits", "/home/fruits.jpg"],
              ["Herbs", "/home/Spices.webp"],
              ["Seeds", "/home/Grains.jpg"],
            ].map(([title, img], i) => (
              <div
                key={i}
                className="group relative rounded-3xl overflow-hidden shadow-xl
                           transition-all duration-300 hover:scale-110"
              >
                <img
                  src={img}
                  alt={title}
                  className="w-full h-60 object-cover
                             group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10"></div>
                <div className="absolute bottom-6 left-0 right-0 text-center">
                  <h3 className="font-[Montserrat] text-2xl font-bold text-white">
                    {title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INFO BACKGROUND */}
      <section
        className="relative py-28"
        style={{
          backgroundImage: "url('/home/farm.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[#1D1D1D]/75"></div>

        <div className="relative max-w-5xl mx-auto px-6 text-center text-white">
          <h2 className="font-[Montserrat] text-3xl sm:text-4xl font-bold">
            Technology-Driven Agriculture
          </h2>

          <p className="mt-6 text-[#E0E0E0] leading-relaxed text-lg">
            MeroBari integrates digital solutions into agriculture to
            simplify transactions, enhance trust, and support sustainable farming.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-[Montserrat] text-3xl font-bold">
            How the Platform Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-20">
            {[
              ["Create Account", "Register once to access the platform"],
              ["Buy or Sell Crops", "Browse or list agricultural products"],
              ["Order & Delivery", "Secure payment and direct delivery"],
            ].map(([title, desc], i) => (
              <div
                key={i}
                className="bg-white p-12 rounded-3xl shadow-md
                           transition-all duration-300
                           hover:scale-110 hover:shadow-2xl"
              >
                <div className="w-16 h-16 mx-auto mb-6 rounded-full
                                bg-gradient-to-br from-[#1E9C17] to-[#27AE60]
                                text-white flex items-center justify-center
                                font-bold text-xl">
                  {i + 1}
                </div>
                <h3 className="font-[Montserrat] text-lg font-semibold">
                  {title}
                </h3>
                <p className="mt-4 text-[#828282] text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 text-center bg-white">
        <h2 className="font-[Montserrat] text-4xl font-bold">
          Start Your Journey with MeroBari
        </h2>

        <p className="mt-4 text-[#828282] max-w-xl mx-auto">
          Join a transparent, secure, and farmer-friendly digital marketplace.
        </p>

        <div className="mt-10 flex justify-center gap-6 flex-wrap">
          <Link
            to="/login"
            className="bg-[#1E9C17] text-white px-10 py-4 rounded-xl
                       font-semibold hover:scale-110 transition-all"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="bg-[#FDB933] text-black px-10 py-4 rounded-xl
                       font-semibold hover:scale-110 transition-all"
          >
            Register
          </Link>
        </div>
      </section>

    </div>
  );
};

export default Home;
