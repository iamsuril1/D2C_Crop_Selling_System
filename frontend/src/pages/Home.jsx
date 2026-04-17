import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

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

const categories = [
  { name: "Vegetables", img: "/home/vegetables.webp", tag: "Fresh Daily",  price: "From Rs. 20/kg"  },
  { name: "Fruits",     img: "/home/fruits.jpg",      tag: "Seasonal",     price: "From Rs. 40/kg"  },
  { name: "Herbs",      img: "/home/Spices.webp",     tag: "Aromatic",     price: "From Rs. 15/kg"  },
  { name: "Grains",     img: "/home/Grains.jpg",      tag: "Staple",       price: "From Rs. 50/kg"  },
];

const steps = [
  {
    num: "01",
    title: "Register Once",
    desc: "Create your free account as a farmer or consumer in under 2 minutes. No hidden fees, no commitments.",
    color: "from-green-400 to-emerald-500",
    accent: "#1E9C17",
  },
  {
    num: "02",
    title: "Browse & List",
    desc: "Farmers publish fresh produce with real prices. Consumers discover nearby farms sorted by distance.",
    color: "from-amber-400 to-orange-400",
    accent: "#FDB933",
  },
  {
    num: "03",
    title: "Pay & Receive",
    desc: "Multiple local payment options — eSewa, bank QR, or cash on delivery. Direct delivery, zero middlemen.",
    color: "from-teal-400 to-cyan-500",
    accent: "#0ea5e9",
  },
];

const cheapPicks = [
  { name: "Spinach",   price: "Rs. 15/kg",   tag: "🥬" },
  { name: "Potato",    price: "Rs. 22/kg",   tag: "🥔" },
  { name: "Tomato",    price: "Rs. 28/kg",   tag: "🍅" },
  { name: "Onion",     price: "Rs. 30/kg",   tag: "🧅" },
  { name: "Carrot",    price: "Rs. 35/kg",   tag: "🥕" },
  { name: "Cabbage",   price: "Rs. 18/kg",   tag: "🥦" },
  { name: "Garlic",    price: "Rs. 120/kg",  tag: "🧄" },
  { name: "Ginger",    price: "Rs. 80/kg",   tag: "🫚" },
  { name: "Coriander", price: "Rs. 20/bunch",tag: "🌿" },
  { name: "Radish",    price: "Rs. 16/kg",   tag: "🌾" },
];

const testimonials = [
  {
    quote: "I earn 60% more per kilogram since joining MeroBari. No more middlemen taking my profit.",
    name: "Ramesh B.",
    role: "Vegetable Farmer, Bhaktapur",
    init: "RB",
    color: "from-green-400 to-emerald-500",
  },
  {
    quote: "I know exactly which farm my tomatoes come from. That transparency is priceless.",
    name: "Sita M.",
    role: "Consumer, Lalitpur",
    init: "SM",
    color: "from-amber-400 to-orange-400",
  },
  {
    quote: "The geo-based discovery helped me find a local herb farm 2km away. Game changer.",
    name: "Bikash T.",
    role: "Consumer, Kathmandu",
    init: "BT",
    color: "from-teal-400 to-cyan-500",
  },
];

/* ─────────────────────────────────────────────────────────────
   SUB-COMPONENTS
   FIX: every component that calls useInView() is now a proper
   named component — hooks can never be called inside IIFEs,
   conditionally, or inside render-time callbacks. The original
   code had two `{(() => { const [ref,visible]=useInView(); ... })()}`
   patterns inside Home's JSX which violates the Rules of Hooks.
───────────────────────────────────────────────────────────── */

const StepCard = ({ step, index }) => {
  const [ref, visible] = useInView(0.25);
  return (
    <div
      ref={ref}
      className="relative"
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.65s ease ${index * 180}ms, transform 0.65s ease ${index * 180}ms`,
      }}
    >
      {index < steps.length - 1 && (
        <div
          className="hidden lg:block absolute top-10 left-[calc(100%+0px)] w-full h-px z-0 pointer-events-none"
          style={{
            background: `linear-gradient(to right, ${step.accent}60, transparent)`,
            width: "calc(100% - 3rem)",
            left: "calc(100% - 1.5rem)",
          }}
        />
      )}

      <div className="group relative bg-white rounded-3xl p-8 border border-gray-100
                      hover:border-transparent hover:shadow-2xl hover:shadow-green-900/8
                      hover:-translate-y-2 transition-all duration-400 overflow-hidden z-10">
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-3xl"
          style={{ background: `radial-gradient(circle at 30% 40%, ${step.accent}, transparent 70%)` }}
        />
        <div
          className="absolute -top-4 -right-2 font-[Montserrat] font-black text-8xl
                     leading-none select-none pointer-events-none opacity-5"
          style={{ color: step.accent }}
        >
          {step.num}
        </div>
        <div
          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color}
                      flex items-center justify-center text-white font-[Montserrat]
                      font-black text-lg mb-6 shadow-lg
                      group-hover:scale-110 transition-transform duration-300`}
        >
          {step.num}
        </div>
        <div className="flex items-center gap-3 mb-4">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: step.accent }} />
          <div
            className="h-px flex-1 rounded-full transition-all duration-700"
            style={{
              backgroundColor: step.accent,
              opacity: 0.25,
              transform: visible ? "scaleX(1)" : "scaleX(0)",
              transformOrigin: "left",
              transitionDelay: `${index * 180 + 400}ms`,
            }}
          />
        </div>
        <h3 className="font-[Montserrat] font-bold text-[#0D1F0D] text-xl mb-3">{step.title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
        <div
          className="absolute bottom-0 left-8 right-8 h-0.5 rounded-full
                     scale-x-0 group-hover:scale-x-100 transition-transform
                     duration-400 origin-left"
          style={{ background: `linear-gradient(to right, ${step.accent}, transparent)` }}
        />
      </div>
    </div>
  );
};

/* FIX: was an IIFE inside Home's JSX — now a proper component */
const HowItWorksHeader = () => {
  const [hdrRef, hdrVisible] = useInView();
  return (
    <div
      ref={hdrRef}
      className="mb-20"
      style={{
        opacity:    hdrVisible ? 1 : 0,
        transform:  hdrVisible ? "translateY(0)" : "translateY(24px)",
        transition: "all 0.7s ease",
      }}
    >
      <span className="text-[#1E9C17] text-xs font-semibold uppercase tracking-[0.25em]">
        Simple Process
      </span>
      <h2
        className="font-[Montserrat] font-black text-[#0D1F0D] mt-3"
        style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
      >
        How MeroBari Works
      </h2>
      <p className="mt-3 text-gray-500 text-base max-w-md">
        Three steps separate you from fresh, farmer-direct produce. Scroll to discover each one.
      </p>
    </div>
  );
};

/* FIX: was an IIFE inside Home's JSX — now a proper component */
const StepDots = () => {
  const [hintRef, hintVisible] = useInView(0.5);
  return (
    <div
      ref={hintRef}
      className="mt-16 flex items-center justify-center gap-3"
      style={{ opacity: hintVisible ? 1 : 0, transition: "opacity 0.7s ease 400ms" }}
    >
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.accent }} />
          {i < steps.length - 1 && (
            <div className="h-px w-12 rounded-full" style={{ backgroundColor: `${s.accent}40` }} />
          )}
        </div>
      ))}
    </div>
  );
};

const Marquee = ({ items, reverse = false }) => {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden py-2">
      <div
        className="flex gap-4 w-max"
        style={{ animation: `marquee${reverse ? "Rev" : ""} 30s linear infinite` }}
      >
        {doubled.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-white border border-gray-100
                       rounded-2xl px-5 py-3 shadow-sm flex-shrink-0
                       hover:border-[#1E9C17]/40 hover:shadow-md transition-all duration-200"
          >
            <span className="text-2xl">{item.tag}</span>
            <div>
              <p className="font-semibold text-gray-900 text-sm leading-none">{item.name}</p>
              <p className="text-[#1E9C17] font-bold text-xs mt-0.5">{item.price}</p>
            </div>
            <span className="ml-1 text-xs bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded-full">
              Cheapest
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
const Home = () => {
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [heroRef,          heroVisible]          = useInView(0.01);
  const [cheapRef,         cheapVisible]         = useInView(0.1);
  const [whyRef,           whyVisible]           = useInView();
  const [catRef,           catVisible]           = useInView();
  const [testimonialRef,   testimonialVisible]   = useInView();

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marqueeRev {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>

      <div className="w-full font-[Poppins] text-[#1D1D1D] overflow-x-hidden">

        {/* ══ HERO ══════════════════════════════════════════════ */}
        <section
          ref={heroRef}
          className="relative h-screen flex flex-col justify-center overflow-hidden"
          style={{ backgroundImage: "url('/home/hero.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-black/88 via-black/62 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div
            className="absolute top-0 right-0 w-[45vw] h-full opacity-10"
            style={{ background: "linear-gradient(135deg, transparent 40%, #1E9C17 40%)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.12] pointer-events-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}
          />

          <div className="relative max-w-7xl mx-auto px-6 lg:px-12 w-full">
            <div className="inline-flex items-center gap-2 mb-6" style={{ opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? "translateY(0)" : "translateY(16px)", transition: "all 0.7s ease 200ms" }}>
              <span className="w-8 h-px bg-[#FDB933]" />
              <span className="text-[#FDB933] text-xs font-semibold uppercase tracking-[0.25em]">
                Direct-to-Consumer Agriculture · Nepal
              </span>
            </div>

            <h1
              className="font-[Montserrat] font-black text-white leading-[0.93]"
              style={{ fontSize: "clamp(3rem, 8vw, 7rem)", opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? "translateY(0)" : "translateY(24px)", transition: "all 0.7s ease 350ms" }}
            >
              Farm to<br />
              <span className="text-transparent" style={{ WebkitTextStroke: "2px #1E9C17" }}>Table.</span>
              <br />
              <span className="text-[#FDB933]">No Middlemen.</span>
            </h1>

            <p
              className="mt-8 max-w-lg text-[#D0D0D0] text-lg leading-relaxed"
              style={{ opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? "translateY(0)" : "translateY(20px)", transition: "all 0.7s ease 500ms" }}
            >
              MeroBari connects Nepal's farmers directly with consumers — transparent pricing, fresh produce, and zero exploitation.
            </p>

            <div className="mt-10 flex flex-wrap gap-4" style={{ opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? "translateY(0)" : "translateY(20px)", transition: "all 0.7s ease 650ms" }}>
              <Link
                to="/register"
                className="group relative overflow-hidden bg-[#1E9C17] text-white px-8 py-4 rounded-full font-bold text-sm tracking-wide hover:shadow-2xl hover:shadow-green-900/40 transition-all duration-300 hover:-translate-y-1"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                Get Started Free
              </Link>
              <Link to="/about" className="group flex items-center gap-2 text-white/80 hover:text-white px-6 py-4 text-sm font-semibold transition-all duration-200">
                Learn more
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>

            <div className="mt-16 flex flex-wrap gap-3" style={{ opacity: heroLoaded ? 1 : 0, transform: heroLoaded ? "translateY(0)" : "translateY(20px)", transition: "all 0.7s ease 800ms" }}>
              {[
                { val: "500+",  label: "Farmers"     },
                { val: "0%",    label: "Middlemen"   },
                { val: "10K+",  label: "Orders"      },
                { val: "Rs.15", label: "Cheapest/kg" },
              ].map((s, i) => (
                <div key={i} className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-2xl px-5 py-3">
                  <p className="font-[Montserrat] font-black text-white text-xl leading-none">{s.val}</p>
                  <p className="text-white/60 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 animate-bounce">
            <span className="text-xs uppercase tracking-widest">Scroll</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </section>

        {/* ══ CHEAPEST PICKS MARQUEE ════════════════════════════ */}
        <section ref={cheapRef} className="py-14 bg-[#F5F7F0] relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#F5F7F0] to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#F5F7F0] to-transparent pointer-events-none" />
          <div
            className="max-w-7xl mx-auto px-6 lg:px-12 mb-6"
            style={{ opacity: cheapVisible ? 1 : 0, transform: cheapVisible ? "translateY(0)" : "translateY(20px)", transition: "all 0.6s ease" }}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1E9C17] animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E9C17]">Live Cheapest Prices</span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-[#1E9C17]/20 to-transparent" />
              <span className="text-xs text-gray-400 hidden sm:block">Direct from farmers · Updated daily</span>
            </div>
          </div>
          <div className="space-y-3">
            <Marquee items={cheapPicks} />
            <Marquee items={[...cheapPicks].reverse()} reverse />
          </div>
        </section>

        {/* ══ WHY MEROBARI ══════════════════════════════════════ */}
        <section ref={whyRef} className="py-28 bg-[#0D1F0D] relative overflow-hidden">
          <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full border border-[#1E9C17]/20" />
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full border border-[#1E9C17]/10" />
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div style={{ opacity: whyVisible ? 1 : 0, transform: whyVisible ? "translateX(0)" : "translateX(-40px)", transition: "all 0.7s ease" }}>
                <span className="text-[#1E9C17] text-xs font-semibold uppercase tracking-[0.25em]">The Problem We Solve</span>
                <h2 className="font-[Montserrat] font-black text-white mt-4 leading-tight" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>
                  Farmers earn less.<br /><span className="text-[#FDB933]">We fix that.</span>
                </h2>
                <p className="mt-6 text-[#9CAD9C] text-base leading-relaxed max-w-md">
                  In Nepal's traditional chain, farmers receive less than 30% of the final price. MeroBari eliminates every unnecessary step.
                </p>
                <div className="mt-10 grid grid-cols-2 gap-6">
                  {[
                    { label: "Farmer earnings",    before: "30%",  after: "90%",  color: "text-[#1E9C17]" },
                    { label: "Price transparency", before: "None", after: "100%", color: "text-[#FDB933]" },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/5 rounded-2xl p-5 border border-white/10">
                      <p className="text-xs text-[#9CAD9C] uppercase tracking-widest mb-3">{item.label}</p>
                      <div className="flex items-end gap-3">
                        <span className="text-white/30 text-sm line-through">{item.before}</span>
                        <span className={`font-[Montserrat] font-black text-2xl ${item.color}`}>{item.after}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4" style={{ opacity: whyVisible ? 1 : 0, transform: whyVisible ? "translateX(0)" : "translateX(40px)", transition: "all 0.7s ease 200ms" }}>
                {[
                  { target: 500,   suffix: "+", label: "Farmers Onboarded", color: "border-[#1E9C17]/40 bg-[#1E9C17]/5" },
                  { target: 10000, suffix: "+", label: "Orders Fulfilled",  color: "border-[#FDB933]/40 bg-[#FDB933]/5" },
                  { target: 15,    suffix: "+", label: "Crop Categories",   color: "border-[#FDB933]/40 bg-[#FDB933]/5" },
                  { target: 0,     suffix: "%", label: "Middleman Cut",     color: "border-[#1E9C17]/40 bg-[#1E9C17]/5" },
                ].map((s, i) => (
                  <div key={i} className={`rounded-2xl border p-6 ${s.color}`}>
                    <p className="font-[Montserrat] font-black text-white text-4xl leading-none">
                      <Counter target={s.target} suffix={s.suffix} />
                    </p>
                    <p className="text-[#9CAD9C] text-xs mt-3 leading-snug">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══ CATEGORIES ════════════════════════════════════════ */}
        <section ref={catRef} className="py-28 bg-[#F5F7F0]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="text-center mb-16" style={{ opacity: catVisible ? 1 : 0, transform: catVisible ? "translateY(0)" : "translateY(24px)", transition: "all 0.7s ease" }}>
              <span className="text-[#1E9C17] text-xs font-semibold uppercase tracking-[0.25em]">What We Grow</span>
              <h2 className="font-[Montserrat] font-black text-[#0D1F0D] mt-3" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
                Fresh from the Field
              </h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((cat, i) => (
                <div
                  key={i}
                  className="group relative rounded-3xl overflow-hidden cursor-pointer"
                  style={{ aspectRatio: i === 0 || i === 3 ? "3/4" : "3/5", opacity: catVisible ? 1 : 0, transform: catVisible ? "translateY(0)" : "translateY(40px)", transition: `all 0.7s ease ${i * 100}ms` }}
                >
                  <img src={cat.img} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="bg-[#FDB933] text-black text-xs font-bold px-3 py-1 rounded-full">{cat.tag}</span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="bg-[#1E9C17] text-white text-xs font-bold px-3 py-1 rounded-full">{cat.price}</span>
                  </div>
                  <div className="absolute bottom-5 left-5 right-5">
                    <h3 className="font-[Montserrat] font-black text-white text-xl">{cat.name}</h3>
                    <div className="mt-2 h-0.5 w-0 bg-[#1E9C17] group-hover:w-full transition-all duration-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ HOW IT WORKS ══════════════════════════════════════ */}
        <section className="py-28 bg-white relative overflow-hidden">
          <div className="absolute right-0 top-1/2 -translate-y-1/2 font-[Montserrat] font-black text-[18rem] leading-none text-[#F0F0F0] select-none pointer-events-none">
            D2C
          </div>
          <div className="max-w-7xl mx-auto px-6 lg:px-12 relative">
            {/* FIX: was an IIFE — now a proper named component */}
            <HowItWorksHeader />
            <div className="grid md:grid-cols-3 gap-8 relative">
              {steps.map((step, i) => (
                <StepCard key={i} step={step} index={i} />
              ))}
            </div>
            {/* FIX: was an IIFE — now a proper named component */}
            <StepDots />
          </div>
        </section>

        {/* ══ TESTIMONIALS ══════════════════════════════════════ */}
        <section ref={testimonialRef} className="py-28 bg-[#0D1F0D] relative overflow-hidden">
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #1E9C17 0%, transparent 50%),radial-gradient(circle at 80% 20%, #FDB933 0%, transparent 40%)" }} />
          <div className="max-w-7xl mx-auto px-6 lg:px-12 relative">
            <div className="text-center mb-16" style={{ opacity: testimonialVisible ? 1 : 0, transform: testimonialVisible ? "translateY(0)" : "translateY(24px)", transition: "all 0.7s ease" }}>
              <span className="text-[#1E9C17] text-xs font-semibold uppercase tracking-[0.25em]">Real Stories</span>
              <h2 className="font-[Montserrat] font-black text-white mt-3" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
                Farmers &amp; Consumers Speak
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-3xl p-7 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                  style={{ opacity: testimonialVisible ? 1 : 0, transform: testimonialVisible ? "translateY(0)" : "translateY(40px)", transition: `all 0.7s ease ${i * 120}ms` }}
                >
                  <div className="text-[#1E9C17] text-5xl font-serif leading-none mb-4">"</div>
                  <p className="text-white/80 text-sm leading-relaxed mb-6">{t.quote}</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {t.init}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{t.name}</p>
                      <p className="text-white/40 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ FINAL CTA ═════════════════════════════════════════ */}
        <section className="bg-[#1E9C17] relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('/home/farm.jpg')", backgroundSize: "cover", backgroundPosition: "center" }} />
          <div className="absolute inset-0 bg-[#1E9C17]/90" />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-12 py-24 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div>
              <h2 className="font-[Montserrat] font-black text-white leading-tight" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>
                Ready to grow<br />with MeroBari?
              </h2>
              <p className="mt-4 text-white/70 max-w-md text-base">Join Nepal's most transparent agricultural marketplace today.</p>
            </div>
            <div className="flex flex-wrap gap-4 flex-shrink-0">
              <Link to="/register" className="bg-white text-[#1E9C17] font-bold px-8 py-4 rounded-full text-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                Start as Farmer
              </Link>
              <Link to="/register" className="bg-[#FDB933] text-black font-bold px-8 py-4 rounded-full text-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                Shop as Consumer
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
};

export default Home;