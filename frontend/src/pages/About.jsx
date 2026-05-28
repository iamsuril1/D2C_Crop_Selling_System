import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/* ── tiny in-view hook ── */
const useInView = (threshold = 0.15) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
};

/* ── animated counter ── */
const Counter = ({ target, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const [ref, visible] = useInView();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

/* ── data ── */
const values = [
  {
    icon: "🌾",
    title: "Farmer First",
    desc: "Every feature we build starts with one question: does this help the farmer earn more? We refuse to build tools that benefit only the platform.",
    color: "from-green-400 to-emerald-500",
    bg: "bg-green-50",
  },
  {
    icon: "🔍",
    title: "Radical Transparency",
    desc: "Consumers see exactly which farm their food comes from, the harvest date, and the real price — no hidden markups, no mystery supply chains.",
    color: "from-blue-400 to-cyan-500",
    bg: "bg-blue-50",
  },
  {
    icon: "🤝",
    title: "Fair Trade",
    desc: "We charge a minimal platform fee — never a percentage that punishes success. Farmers keep the overwhelming majority of every sale.",
    color: "from-amber-400 to-orange-400",
    bg: "bg-amber-50",
  },
  {
    icon: "📍",
    title: "Local Roots",
    desc: "Built specifically for Nepal's agriculture ecosystem — Nepali payment methods, local languages, and geography-aware product discovery.",
    color: "from-purple-400 to-violet-500",
    bg: "bg-purple-50",
  },
];

const team = [
  {
    name: "Suril Pokharel",
    role: "Founder & Full-Stack Developer",
    desc: "Computer Engineering student passionate about using technology to solve real agricultural problems in Nepal.",
    init: "SP",
    color: "from-green-400 to-emerald-500",
  },
];

const timeline = [
  {
    year: "2023",
    title: "The Idea",
    desc: "Noticed that a local farmer received only Rs. 12 per kg for tomatoes sold at Rs. 80 in the market. MeroBari was born from that injustice.",
    dot: "bg-green-500",
  },
  {
    year: "Early 2024",
    title: "Research & Design",
    desc: "Interviewed 40+ farmers across Bhaktapur, Kavre, and Lalitpur to understand their real pain points with existing middlemen systems.",
    dot: "bg-blue-500",
  },
  {
    year: "Mid 2024",
    title: "Development",
    desc: "Built the core platform — geo-based discovery, multi-farmer cart, local payment integration (eSewa, bank QR), and return management.",
    dot: "bg-amber-500",
  },
  {
    year: "Late 2024",
    title: "Beta Launch",
    desc: "Onboarded the first cohort of farmers and consumers. Processed the first 100 direct orders with zero middlemen.",
    dot: "bg-purple-500",
  },
  {
    year: "2025",
    title: "Growing",
    desc: "Expanding to more districts, adding real-time inventory tracking, and building farmer analytics so they can price smarter.",
    dot: "bg-rose-500",
  },
];

const faqs = [
  {
    q: "Is MeroBari free for farmers to join?",
    a: "Yes. Registering and listing products is completely free. MeroBari charges only a small platform fee on completed orders — never on listings.",
  },
  {
    q: "How does delivery work?",
    a: "Each farmer manages their own delivery. A fixed delivery fee of Rs. 200 per farmer shipment is added at checkout so consumers always know the real cost upfront.",
  },
  {
    q: "What payment methods are supported?",
    a: "Cash on Delivery, eSewa, Bank QR scan-to-pay, and direct bank transfer. Farmers configure which methods they accept through their payment settings.",
  },
  {
    q: "Can I buy from multiple farmers in one order?",
    a: "Yes. MeroBari's multi-origin cart groups items by farmer into separate shipments automatically, so you pay each farmer independently in one checkout flow.",
  },
  {
    q: "What if I receive a damaged or wrong item?",
    a: "Consumers can request a return within 2 days of delivery. Farmers review the request (with optional evidence photo) and approve or reject it. Approved returns restore stock automatically.",
  },
  {
    q: "How does geo-based discovery work?",
    a: "When you share your location, MeroBari shows products from farmers within your chosen radius first — so your food travels less and stays fresher.",
  },
];

/* ── component ── */
const About = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [heroLoaded, setHeroLoaded] = useState(false);

  const [missionRef,  missionVisible]  = useInView();
  const [valuesRef,   valuesVisible]   = useInView();
  const [statsRef,    statsVisible]    = useInView();
  const [timelineRef, timelineVisible] = useInView();
  const [teamRef,     teamVisible]     = useInView();
  const [faqRef,      faqVisible]      = useInView();

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full font-[Poppins] text-[#1D1D1D] overflow-x-hidden">

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-[70vh] flex flex-col justify-center overflow-hidden"
        style={{
          backgroundImage: "url('/home/hero.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/65 to-black/40" />

        {/* diagonal accent */}
        <div
          className="absolute top-0 right-0 w-[40vw] h-full opacity-10"
          style={{ background: "linear-gradient(135deg, transparent 45%, #1E9C17 45%)" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16 sm:py-24">
          <div
            className={`transition-all duration-700 ${
              heroLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <span className="w-8 h-px bg-[#FDB933]" />
              <span className="text-[#FDB933] text-xs font-semibold uppercase tracking-[0.25em]">
                Our Story
              </span>
            </div>

            <h1
              className="font-[Montserrat] font-black text-white leading-[0.95]"
              style={{ fontSize: "clamp(2.2rem, 7vw, 6rem)" }}
            >
              We exist so<br />
              farmers get<br />
              <span className="text-[#1E9C17]">paid fairly.</span>
            </h1>

            <p
              className="mt-6 sm:mt-8 max-w-xl text-[#D0D0D0] text-base sm:text-lg leading-relaxed"
              style={{ transitionDelay: "200ms" }}
            >
              MeroBari is Nepal's first Direct-to-Consumer agricultural
              marketplace — built to eliminate exploitation, not just
              digitise it.
            </p>

            {/* FIX 1: Hero buttons full-width on mobile */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto text-center bg-[#1E9C17] text-white px-7 py-3.5 rounded-full font-bold text-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
              >
                Join MeroBari
              </Link>
              <Link
                to="/contact"
                className="w-full sm:w-auto text-center border border-white/30 text-white px-7 py-3.5 rounded-full font-semibold text-sm hover:bg-white/10 transition"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══ MISSION ═══════════════════════════════════════════════════════ */}
      <section ref={missionRef} className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            <div
              className={`transition-all duration-700 ${
                missionVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"
              }`}
            >
              <span className="text-[#1E9C17] text-xs font-semibold uppercase tracking-[0.25em]">
                Why We Exist
              </span>
              <h2
                className="font-[Montserrat] font-black text-[#0D1F0D] mt-4 leading-tight"
                style={{ fontSize: "clamp(1.7rem, 3.5vw, 3rem)" }}
              >
                Nepal's farmers deserve<br />
                <span className="text-[#1E9C17]">better than 30%.</span>
              </h2>
              <div className="mt-6 space-y-4 text-gray-600 text-sm sm:text-base leading-relaxed">
                <p>
                  In the traditional Nepali agricultural supply chain, a farmer
                  who grows tomatoes receives less than <strong>30%</strong> of
                  the price a consumer pays at the market. The remaining 70%
                  is split among brokers, wholesalers, transporters, and
                  retailers — none of whom grew a single plant.
                </p>
                <p>
                  MeroBari was built to collapse that chain. When a farmer
                  lists on MeroBari and a consumer buys directly, <strong>the
                  farmer keeps up to 90%</strong> of the sale price. The
                  consumer pays less. Everyone wins — except the middleman.
                </p>
                <p>
                  This isn't just about money. It's about dignity, data, and
                  direct relationships between the people who grow food and
                  the people who eat it.
                </p>
              </div>
            </div>

            {/* Pull-quote card */}
            <div
              className={`transition-all duration-700 delay-200 ${
                missionVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"
              }`}
            >
              <div className="relative bg-[#0D1F0D] rounded-3xl p-7 sm:p-10 overflow-hidden">
                {/* decorative circles */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#1E9C17]/20" />
                <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-[#FDB933]/10" />

                <div className="relative">
                  <div className="text-[#1E9C17] text-5xl sm:text-6xl font-serif leading-none mb-4">"</div>
                  <p className="text-white text-base sm:text-xl font-medium leading-relaxed mb-6">
                    I used to sell 10 kg of spinach to the broker for Rs. 80.
                    The same spinach was sold in Kathmandu for Rs. 400.
                    Now I sell it myself for Rs. 300. My family eats better.
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      RB
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">Ramesh B.</p>
                      <p className="text-white/50 text-xs">Vegetable Farmer, Bhaktapur</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATS ═════════════════════════════════════════════════════════ */}
      <section ref={statsRef} className="py-16 sm:py-20 bg-[#F5F7F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div
            className={`text-center mb-10 sm:mb-14 transition-all duration-700 ${
              statsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="text-[#1E9C17] text-xs font-semibold uppercase tracking-[0.25em]">
              By The Numbers
            </span>
            <h2
              className="font-[Montserrat] font-black text-[#0D1F0D] mt-3"
              style={{ fontSize: "clamp(1.6rem, 3vw, 2.8rem)" }}
            >
              Impact so far
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {[
              { target: 500,   suffix: "+", label: "Farmers onboarded",   color: "text-[#1E9C17]",  border: "border-[#1E9C17]/30" },
              { target: 10000, suffix: "+", label: "Direct orders",       color: "text-[#FDB933]",  border: "border-[#FDB933]/40" },
              { target: 15,    suffix: "+", label: "Crop categories",     color: "text-blue-500",   border: "border-blue-300"      },
              { target: 0,     suffix: "%", label: "Middleman cut",       color: "text-purple-500", border: "border-purple-300"    },
            ].map((s, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl border-2 ${s.border} p-5 sm:p-7 text-center
                            transition-all duration-700 hover:-translate-y-1 hover:shadow-lg`}
                style={{
                  transitionDelay: statsVisible ? `${i * 80}ms` : "0ms",
                  opacity:  statsVisible ? 1 : 0,
                  transform: statsVisible ? "translateY(0)" : "translateY(24px)",
                }}
              >
                {/* FIX 2: Smaller number on mobile so it fits in 2-col grid */}
                <p className={`font-[Montserrat] font-black text-4xl sm:text-5xl ${s.color}`}>
                  <Counter target={s.target} suffix={s.suffix} />
                </p>
                <p className="text-gray-500 text-xs sm:text-sm mt-2">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ VALUES ════════════════════════════════════════════════════════ */}
      <section ref={valuesRef} className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div
            className={`text-center mb-12 sm:mb-16 transition-all duration-700 ${
              valuesVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="text-[#1E9C17] text-xs font-semibold uppercase tracking-[0.25em]">
              What We Stand For
            </span>
            <h2
              className="font-[Montserrat] font-black text-[#0D1F0D] mt-3"
              style={{ fontSize: "clamp(1.6rem, 3vw, 2.8rem)" }}
            >
              Our core values
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {values.map((v, i) => (
              <div
                key={i}
                className={`group rounded-3xl p-6 sm:p-7 border border-gray-100
                            hover:shadow-xl hover:-translate-y-2 transition-all duration-400 ${v.bg}`}
                style={{
                  transitionDelay: valuesVisible ? `${i * 80}ms` : "0ms",
                  opacity:  valuesVisible ? 1 : 0,
                  transform: valuesVisible ? "translateY(0)" : "translateY(24px)",
                }}
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${v.color}
                              flex items-center justify-center text-2xl mb-5 shadow-md
                              group-hover:scale-110 transition-transform duration-300`}
                >
                  {v.icon}
                </div>
                <h3 className="font-[Montserrat] font-bold text-[#0D1F0D] text-base sm:text-lg mb-3">
                  {v.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TIMELINE ══════════════════════════════════════════════════════ */}
      <section ref={timelineRef} className="py-16 sm:py-24 bg-[#0D1F0D] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #1E9C17 0%, transparent 60%)" }}
        />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 relative">
          <div
            className={`text-center mb-12 sm:mb-16 transition-all duration-700 ${
              timelineVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="text-[#1E9C17] text-xs font-semibold uppercase tracking-[0.25em]">
              Our Journey
            </span>
            <h2
              className="font-[Montserrat] font-black text-white mt-3"
              style={{ fontSize: "clamp(1.6rem, 3vw, 2.8rem)" }}
            >
              How we got here
            </h2>
          </div>

          <div className="relative">
            {/* vertical line — offset to align with dot center (dot is w-10 sm:w-12) */}
            <div className="absolute left-5 sm:left-6 top-0 bottom-0 w-px bg-white/10" />

            {/* FIX 3: Tighter gap on mobile */}
            <div className="space-y-6 sm:space-y-10">
              {timeline.map((item, i) => (
                <div
                  key={i}
                  className="relative flex gap-4 sm:gap-8"
                  style={{
                    transitionDelay: timelineVisible ? `${i * 100}ms` : "0ms",
                    opacity:  timelineVisible ? 1 : 0,
                    transform: timelineVisible ? "translateX(0)" : "translateX(-20px)",
                    transition: "all 0.6s ease",
                  }}
                >
                  {/* dot — slightly smaller on mobile */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${item.dot} flex items-center
                                    justify-center text-white font-bold text-xs shadow-lg
                                    ring-4 ring-[#0D1F0D]`}>
                      {item.year.slice(-2)}
                    </div>
                  </div>

                  {/* content */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 flex-1
                                  hover:bg-white/10 transition-colors min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full
                                       ${item.dot} text-white whitespace-nowrap`}>
                        {item.year}
                      </span>
                      <h3 className="font-[Montserrat] font-bold text-white text-sm sm:text-base">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-white/60 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ TEAM ══════════════════════════════════════════════════════════ */}
      <section ref={teamRef} className="py-16 sm:py-24 bg-[#F5F7F0]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12">
          <div
            className={`text-center mb-10 sm:mb-14 transition-all duration-700 ${
              teamVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="text-[#1E9C17] text-xs font-semibold uppercase tracking-[0.25em]">
              The People
            </span>
            <h2
              className="font-[Montserrat] font-black text-[#0D1F0D] mt-3"
              style={{ fontSize: "clamp(1.6rem, 3vw, 2.8rem)" }}
            >
              Who built MeroBari
            </h2>
          </div>

          <div className="flex justify-center">
            {team.map((t, i) => (
              <div
                key={i}
                
                className={`bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm
                            hover:shadow-xl hover:-translate-y-1 transition-all duration-400
                            max-w-sm w-full text-center`}
                style={{
                  transitionDelay: teamVisible ? `${i * 100}ms` : "0ms",
                  opacity:  teamVisible ? 1 : 0,
                  transform: teamVisible ? "translateY(0)" : "translateY(24px)",
                }}
              >
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br ${t.color}
                              flex items-center justify-center text-white font-black
                              text-xl sm:text-2xl mx-auto mb-5 shadow-lg`}
                >
                  {t.init}
                </div>
                <h3 className="font-[Montserrat] font-bold text-[#0D1F0D] text-lg sm:text-xl">
                  {t.name}
                </h3>
                <p className="text-[#1E9C17] font-semibold text-xs sm:text-sm mt-1">{t.role}</p>
                <p className="text-gray-500 text-sm mt-4 leading-relaxed">{t.desc}</p>

                {/* Tech stack badges */}
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  {["React", "Node.js", "MongoDB", "Express", "Tailwind"].map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1 bg-gray-100 text-gray-600 text-xs
                                 font-medium rounded-full"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Built with love note */}
          <div
            className={`mt-8 sm:mt-10 text-center transition-all duration-700 delay-300 ${
              teamVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <p className="text-gray-500 text-sm px-4">
              Built as a Final Year Project at{" "}
              <span className="font-semibold text-[#0D1F0D]">
                Kathmandu Engineering College
              </span>{" "}
              — with real farmers, real problems, and real solutions.
            </p>
          </div>
        </div>
      </section>

      {/* ══ TECH STACK ════════════════════════════════════════════════════ */}
      <section className="py-12 sm:py-16 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-6 sm:mb-8">
            Built with
          </p>
          {/* FIX 5: Smaller badge text + tighter gap on mobile */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
            {[
              { label: "React 18",     color: "bg-blue-50   text-blue-700"   },
              { label: "Node.js",      color: "bg-green-50  text-green-700"  },
              { label: "Express",      color: "bg-gray-100  text-gray-700"   },
              { label: "MongoDB",      color: "bg-green-50  text-green-800"  },
              { label: "Tailwind CSS", color: "bg-cyan-50   text-cyan-700"   },
              { label: "JWT Auth",     color: "bg-purple-50 text-purple-700" },
              { label: "Nodemailer",   color: "bg-red-50    text-red-700"    },
              { label: "Multer",       color: "bg-yellow-50 text-yellow-700" },
              { label: "eSewa API",    color: "bg-green-50  text-green-700"  },
            ].map((t) => (
              <span
                key={t.label}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${t.color}`}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════════════════ */}
      <section ref={faqRef} className="py-16 sm:py-24 bg-[#F5F7F0]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-12">
          <div
            className={`text-center mb-10 sm:mb-14 transition-all duration-700 ${
              faqVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="text-[#1E9C17] text-xs font-semibold uppercase tracking-[0.25em]">
              FAQ
            </span>
            <h2
              className="font-[Montserrat] font-black text-[#0D1F0D] mt-3"
              style={{ fontSize: "clamp(1.6rem, 3vw, 2.8rem)" }}
            >
              Common questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((item, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl border-2 overflow-hidden transition-all duration-700 ${
                  openFaq === i ? "border-[#1E9C17]" : "border-gray-100 hover:border-gray-200"
                }`}
                style={{
                  transitionDelay: faqVisible ? `${i * 60}ms` : "0ms",
                  opacity:  faqVisible ? 1 : 0,
                  transform: faqVisible ? "translateY(0)" : "translateY(16px)",
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-3 sm:gap-4"
                >
                  {/* FIX 6: Slightly smaller question text on mobile */}
                  <span className="font-semibold text-[#0D1F0D] text-xs sm:text-sm leading-snug">
                    {item.q}
                  </span>
                  <span
                    className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center
                                justify-center text-sm font-bold transition-all duration-300 ${
                      openFaq === i
                        ? "bg-[#1E9C17] text-white rotate-45"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    +
                  </span>
                </button>

                {openFaq === i && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-5">
                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed border-t border-gray-100 pt-4">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ═══════════════════════════════════════════════════════════ */}
      <section className="bg-[#1E9C17] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "url('/home/farm.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-[#1E9C17]/90" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-14 sm:py-20
                        flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-10">
          <div className="text-center lg:text-left">
            <h2
              className="font-[Montserrat] font-black text-white leading-tight"
              style={{ fontSize: "clamp(1.7rem, 4vw, 3rem)" }}
            >
              Ready to be part<br />of the change?
            </h2>
            <p className="mt-3 text-white/70 text-sm sm:text-base max-w-md mx-auto lg:mx-0">
              Whether you grow food or eat it — MeroBari is for you.
            </p>
          </div>

          {/* FIX 7: CTA buttons stack on mobile, row on sm+ */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 flex-shrink-0 w-full sm:w-auto">
            <Link
              to="/register"
              className="w-full sm:w-auto text-center bg-white text-[#1E9C17] font-bold px-8 py-4 rounded-full
                         text-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              Join as Farmer
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto text-center bg-[#FDB933] text-black font-bold px-8 py-4 rounded-full
                         text-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              Shop as Consumer
            </Link>
            <Link
              to="/contact"
              className="w-full sm:w-auto text-center border-2 border-white/50 text-white font-semibold px-8 py-4
                         rounded-full text-sm hover:bg-white/10 transition"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default About;