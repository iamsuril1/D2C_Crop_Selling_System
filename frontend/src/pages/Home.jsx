import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="w-full font-[Poppins] text-[#1D1D1D]">

      {/* HERO */}
      <section
        className="relative min-h-[75vh] flex items-center"
        style={{
          backgroundImage: "url('/home/hero.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50"></div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-6 py-24 text-white">
          <h1 className="font-[Montserrat] text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
            Fresh Crops From <br />
            <span className="text-[#FDB933]">Direct Farmers</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[#E0E0E0] max-w-2xl">
            Buy farm-fresh produce directly from farmers with transparent
            pricing, secure transactions, and fast delivery.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/login"
              className="bg-[#1E9C17] text-white px-7 py-3 rounded-lg font-semibold hover:scale-105 transition-transform"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-[#FDB933] text-black px-7 py-3 rounded-lg font-semibold hover:scale-105 transition-transform"
            >
              Register
            </Link>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE */}
      <section className="bg-[#F5FFF5] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-[Montserrat] text-2xl sm:text-3xl font-bold">
            Why Choose MeroBari?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-12">
            {[
              ["100%", "Transparency"],
              ["0%", "Middlemen"],
              ["Fresh", "Farm Produce"],
              ["Secure", "Transactions"],
            ].map(([title, subtitle], i) => (
              <div
                key={i}
                className="bg-white p-8 rounded-xl shadow transition-transform hover:scale-105 hover:shadow-lg"
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

      {/* HOW IT WORKS */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-[Montserrat] text-2xl sm:text-3xl font-bold">
            How the Platform Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-14">
            {[
              ["Register", "Create one account to access the platform"],
              ["Browse or List", "Explore or list available crops"],
              ["Order & Delivery", "Secure payment and direct delivery"],
            ].map(([title, desc], i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-8 shadow-sm transition-transform hover:scale-105 hover:shadow-lg"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#1E9C17] text-white flex items-center justify-center font-bold">
                  {i + 1}
                </div>
                <h3 className="font-[Montserrat] font-semibold text-lg">
                  {title}
                </h3>
                <p className="text-[#828282] text-sm mt-2">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED CATEGORIES */}
      <section className="bg-[#FAFAFA] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-[Montserrat] text-2xl sm:text-3xl font-bold">
            Featured Categories
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-12">
            {[
              ["Vegetables", "/home/vegetables.webp"],
              ["Fruits", "/home/fruits.jpg"],
              ["Grains", "/home/Grains.jpg"],
              ["Spices & Herbs", "/home/Spices.webp"],
            ].map(([title, img], i) => (
              <div
                key={i}
                className="bg-white rounded-xl overflow-hidden shadow-sm transition-transform hover:scale-105 hover:shadow-lg"
              >
                <img
                  src={img}
                  alt={title}
                  className="h-36 w-full object-cover"
                />
                <div className="p-4">
                  <h3 className="font-[Montserrat] font-semibold">
                    {title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1E9C17] py-16 sm:py-20 text-white text-center">
        <h2 className="font-[Montserrat] text-3xl sm:text-4xl font-bold">
          Start Your Journey with MeroBari
        </h2>
        <p className="mt-4 text-[#E0E0E0]">
          One platform. One account. Direct agriculture.
        </p>

        <div className="mt-8 flex justify-center flex-wrap gap-4">
          <Link
            to="/login"
            className="bg-white text-[#1E9C17] px-7 py-3 rounded-lg font-semibold hover:scale-105 transition-transform"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="bg-[#FDB933] text-black px-7 py-3 rounded-lg font-semibold hover:scale-105 transition-transform"
          >
            Register
          </Link>
        </div>
      </section>

    </div>
  );
};

export default Home;
