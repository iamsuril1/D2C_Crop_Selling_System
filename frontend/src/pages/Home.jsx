/* src/pages/Home.jsx — completely new design
   Direction: Editorial brutalism meets organic warmth
   Palette: Cream (#F5F0E8), deep forest (#0A1F0A), living green (#1E9C17),
            harvest gold (#E8A020), raw clay (#C4846A)
   Type: Clash Display (display) + DM Sans (body) via Google Fonts
   Unforgettable element: The massive rotating crop wheel + the
   "price comparison" split screen that reveals on scroll
*/

import { Link } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";

/* ────────────────────────────────────────────────────────────
   HOOK: Intersection Observer (fires once)
──────────────────────────────────────────────────────────── */
const useReveal = (threshold = 0.12) => {
  const ref            = useRef(null);
  const [on, setOn]    = useState(false);
  useEffect(() => {
    const el  = ref.current;
    if (!el)  return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setOn(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, on];
};

/* ────────────────────────────────────────────────────────────
   HOOK: Animated counter
──────────────────────────────────────────────────────────── */
const Counter = ({ to, suffix = "" }) => {
  const [val, setVal]   = useState(0);
  const [ref, on]       = useReveal(0.3);
  useEffect(() => {
    if (!on) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(to / 72));
    const id   = setInterval(() => {
      cur += step;
      if (cur >= to) { setVal(to); clearInterval(id); }
      else setVal(cur);
    }, 14);
    return () => clearInterval(id);
  }, [on, to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
};

/* ────────────────────────────────────────────────────────────
   DATA
──────────────────────────────────────────────────────────── */
const CROPS = [
  { name: "Tomato",    kg: "Rs.28",  emoji: "🍅" },
  { name: "Spinach",   kg: "Rs.15",  emoji: "🥬" },
  { name: "Potato",    kg: "Rs.22",  emoji: "🥔" },
  { name: "Carrot",    kg: "Rs.35",  emoji: "🥕" },
  { name: "Garlic",    kg: "Rs.120", emoji: "🧄" },
  { name: "Ginger",    kg: "Rs.80",  emoji: "🫚" },
  { name: "Onion",     kg: "Rs.30",  emoji: "🧅" },
  { name: "Coriander", kg: "Rs.20",  emoji: "🌿" },
  { name: "Cabbage",   kg: "Rs.18",  emoji: "🥦" },
  { name: "Radish",    kg: "Rs.16",  emoji: "🌾" },
];

const HOW = [
  {
    n:     "01",
    head:  "Farmers list their crops",
    body:  "Set your price, upload a photo, choose regular and bulk rates. Live in under 3 minutes.",
    color: "#1E9C17",
  },
  {
    n:     "02",
    head:  "Consumers browse nearby",
    body:  "Location-based discovery surfaces farms closest to you first. Fresher produce, lower delivery fees.",
    color: "#E8A020",
  },
  {
    n:     "03",
    head:  "Direct payment & delivery",
    body:  "eSewa, Khalti, Bank QR or Cash on Delivery. Farmer ships directly to your door.",
    color: "#C4846A",
  },
];

const VOICES = [
  {
    quote: "I set my own price for the first time in 12 years of farming.",
    name:  "Ramesh B.", place: "Bhaktapur",    init: "RB",
  },
  {
    quote: "My restaurant saves Rs. 7,000 a month on vegetables alone.",
    name:  "Bikash T.", place: "Kathmandu",    init: "BT",
  },
  {
    quote: "I know exactly which farm my food comes from and when it was harvested.",
    name:  "Sita M.",   place: "Lalitpur",     init: "SM",
  },
];

/* ────────────────────────────────────────────────────────────
   TICKER (horizontal scroll marquee)
──────────────────────────────────────────────────────────── */
const Ticker = () => {
  const items = [...CROPS, ...CROPS];
  return (
    <div className="overflow-hidden py-5 border-y-2 border-[#0A1F0A]/12 bg-[#F5F0E8]">
      <div
        className="flex gap-0 w-max"
        style={{ animation: "tickerSlide 32s linear infinite" }}
      >
        {items.map((c, i) => (
          <div
            key={i}
            className="flex items-center gap-5 px-10 border-r-2 border-[#0A1F0A]/10 shrink-0"
          >
            <span className="text-3xl leading-none">{c.emoji}</span>
            <div>
              <p className="font-bold text-[#0A1F0A] text-lg leading-tight">{c.name}</p>
              <p className="text-[#1E9C17] text-xs font-semibold tracking-wide">{c.kg} / kg</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   ROTATING WHEEL OF CROPS (SVG)
──────────────────────────────────────────────────────────── */
const CropWheel = () => {
  const [angle, setAngle] = useState(0);
  const raf               = useRef(null);
  useEffect(() => {
    const tick = () => {
      setAngle((a) => (a + 0.18) % 360);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const radius = 110;
  const cx     = 160;
  const cy     = 160;

  return (
    <svg viewBox="0 0 320 320" className="w-full h-full" aria-hidden="true">
      {/* Outer decorative ring */}
      <circle cx={cx} cy={cy} r={148} fill="none" stroke="#1E9C17" strokeWidth="1" opacity="0.25" strokeDasharray="6 4" />
      <circle cx={cx} cy={cy} r={132} fill="none" stroke="#E8A020" strokeWidth="0.5" opacity="0.2" />

      {/* Rotating crop emojis */}
      {CROPS.map((crop, i) => {
        const a    = (i * (360 / CROPS.length) + angle) * (Math.PI / 180);
        const x    = cx + radius * Math.cos(a);
        const y    = cy + radius * Math.sin(a);
        const size = 18 + 6 * Math.abs(Math.sin(a));
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size}
            style={{ userSelect: "none" }}
          >
            {crop.emoji}
          </text>
        );
      })}

      {/* Center badge */}
      <circle cx={cx} cy={cy} r={56} fill="#0A1F0A" />
      <circle cx={cx} cy={cy} r={52} fill="#0A1F0A" stroke="#1E9C17" strokeWidth="1.5" />
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#1E9C17"
        fontFamily="Montserrat, sans-serif" fontWeight="900" fontSize="13">
        MERO
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="white"
        fontFamily="Montserrat, sans-serif" fontWeight="900" fontSize="13">
        BARI
      </text>
      <text x={cx} y={cy + 24} textAnchor="middle" fill="#E8A020"
        fontFamily="sans-serif" fontSize="9" letterSpacing="2">
        D2C
      </text>
    </svg>
  );
};

/* ────────────────────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────────────────────── */
const Home = () => {
  const [ready, setReady] = useState(false);

  const [howRef,    howOn]    = useReveal(0.1);
  const [statsRef,  statsOn]  = useReveal(0.2);
  const [voiceRef,  voiceOn]  = useReveal(0.1);
  const [ctaRef,    ctaOn]    = useReveal(0.15);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 40);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {/* ── Global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');

        @keyframes tickerSlide {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes heroIn {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1);    }
        }
        @keyframes lineGrow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }

        .hero-word {
          display: inline-block;
          opacity: 0;
          animation: heroIn 0.9s cubic-bezier(.16,1,.3,1) forwards;
        }
        .w1 { animation-delay: 0.05s; }
        .w2 { animation-delay: 0.18s; }
        .w3 { animation-delay: 0.32s; }
        .w4 { animation-delay: 0.46s; }
        .w5 { animation-delay: 0.58s; }
        .w6 { animation-delay: 0.70s; }

        .cd { font-family: 'Clash Display', 'Montserrat', sans-serif; }
        .dm { font-family: 'DM Sans', 'Poppins', sans-serif; }
      `}</style>

      <div className="dm text-[#0A1F0A] overflow-x-hidden bg-[#F5F0E8]">

        {/* ══════════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════════ */}
        <section className="relative min-h-screen bg-[#0A1F0A] flex flex-col overflow-hidden">

          {/* Background texture */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          {/* Radial glow */}
          <div
            className="absolute top-0 right-0 w-[600px] h-[600px] opacity-20 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 70% 30%, #1E9C17 0%, transparent 60%)",
            }}
          />

          {/* ── Main hero layout ── */}
          <div className="relative flex-1 flex flex-col lg:flex-row items-center max-w-7xl mx-auto w-full px-6 lg:px-16 pt-32 pb-16 gap-12">

            {/* Left: headline + CTAs */}
            <div className="flex-1 min-w-0">

              {/* Eyebrow */}
              {ready && (
                <div className="flex items-center gap-3 mb-8 hero-word w1">
                  <span className="w-8 h-px bg-[#1E9C17]" />
                  <span className="text-[#1E9C17] text-xs font-semibold tracking-[0.3em] uppercase">
                    Nepal's Farm to Table Platform
                  </span>
                </div>
              )}

              {/* Giant headline — 5 words, each animates in */}
              <h1
                className="cd font-bold leading-[0.9] text-white"
                style={{ fontSize: "clamp(3.2rem, 9vw, 8rem)" }}
              >
                {ready && (
                  <>
                    <span className="hero-word w2 block text-[#F5F0E8]">Fresh.</span>
                    <span className="hero-word w3 block text-[#1E9C17]">Honest.</span>
                    <span className="hero-word w4 block text-[#F5F0E8]">Direct.</span>
                  </>
                )}
              </h1>

              {/* Subtext */}
              {ready && (
                <p
                  className="hero-word w5 mt-8 text-[#a0b8a0] text-lg lg:text-xl leading-relaxed max-w-lg"
                >
                  MeroBari connects the farmers who grow your food directly with the people who eat it.
                  Transparent prices. Real harvests. Fair deals for everyone.
                </p>
              )}

              {/* CTAs */}
              {ready && (
                <div className="hero-word w6 mt-10 flex flex-wrap gap-4">
                  <Link
                    to="/register"
                    className="group relative overflow-hidden bg-[#1E9C17] text-white cd font-semibold px-8 py-4 rounded-2xl text-sm tracking-wide transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#1E9C17]/40"
                  >
                    <span className="absolute inset-0 bg-white/10 translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-500 skew-x-12" />
                    <span className="relative">Join as Farmer</span>
                  </Link>
                  <Link
                    to="/register"
                    className="group relative overflow-hidden bg-[#E8A020] text-[#0A1F0A] cd font-semibold px-8 py-4 rounded-2xl text-sm tracking-wide transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#E8A020]/40"
                  >
                    <span className="absolute inset-0 bg-white/15 translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-500 skew-x-12" />
                    <span className="relative">Shop Fresh Produce</span>
                  </Link>
                </div>
              )}

              {/* Inline stats */}
              {ready && (
                <div className="hero-word w6 mt-14 grid grid-cols-3 gap-0 border border-white/10 rounded-2xl overflow-hidden">
                  {[
                    { n: "500",  s: "+", l: "Farmers"    },
                    { n: "10000",s: "+", l: "Orders"     },
                    { n: "15",   s: "+", l: "Categories" },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className={`px-5 py-4 text-center ${i < 2 ? "border-r border-white/10" : ""}`}
                    >
                      <p className="cd font-bold text-white text-2xl">
                        {s.n}{s.s}
                      </p>
                      <p className="text-[#a0b8a0] text-xs mt-0.5 tracking-wide uppercase">{s.l}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: rotating crop wheel */}
            {ready && (
              <div
                className="w-72 h-72 lg:w-96 lg:h-96 flex-shrink-0"
                style={{ animation: "scaleIn 1s cubic-bezier(.16,1,.3,1) 0.4s both" }}
              >
                <CropWheel />
              </div>
            )}
          </div>

          {/* Bottom fade into cream */}
          <div className="h-16 bg-gradient-to-b from-transparent to-[#F5F0E8]" />
        </section>

        {/* ══════════════════════════════════════════════════════
            TICKER
        ══════════════════════════════════════════════════════ */}
        <Ticker />

        {/* ══════════════════════════════════════════════════════
            WHAT IS MEROBARI — 2-column editorial
        ══════════════════════════════════════════════════════ */}
        <section className="bg-[#F5F0E8] py-28 px-6 lg:px-16">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">

            {/* Left: big bold pull statement */}
            <div>
              <div className="inline-flex items-center gap-2 mb-8">
                <span className="w-6 h-6 rounded-full bg-[#1E9C17] flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-xs font-semibold tracking-[0.25em] uppercase text-[#1E9C17]">Why MeroBari</span>
              </div>

              <h2
                className="cd font-bold text-[#0A1F0A] leading-[0.95]"
                style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)" }}
              >
                Food grown in Nepal,
                <br />
                <span className="text-[#C4846A]">priced in Nepal,</span>
                <br />
                delivered in Nepal.
              </h2>

              {/* Decorative underline */}
              <div className="mt-6 h-1 w-24 bg-[#1E9C17] rounded-full" />

              <p className="mt-8 text-[#3a5a3a] text-lg leading-relaxed">
                Every product on MeroBari comes directly from the farmer who grew it.
                You see the harvest date, the farm location, and the price the farmer
                set themselves — nothing hidden, nothing inflated.
              </p>

              <div className="mt-10 space-y-4">
                {[
                  { icon: "🌱", text: "Prices set by the farmer, not a supply chain" },
                  { icon: "📍", text: "Geo-based discovery — closest farms first"    },
                  { icon: "🏭", text: "Bulk pricing for restaurants and traders"     },
                  { icon: "🔄", text: "Simple return system if anything goes wrong"  },
                ].map((f) => (
                  <div key={f.text} className="flex items-center gap-4">
                    <span className="text-2xl leading-none w-8 text-center flex-shrink-0">{f.icon}</span>
                    <p className="text-[#3a5a3a] text-sm font-medium">{f.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: stat tiles in a bold asymmetric grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  val:    <Counter to={90} suffix="%" />,
                  label:  "Revenue goes to the farmer",
                  bg:     "bg-[#0A1F0A]",
                  text:   "text-[#1E9C17]",
                  sub:    "text-[#a0b8a0]",
                  span:   "col-span-2",
                  large:  true,
                },
                {
                  val:    <Counter to={500} suffix="+" />,
                  label:  "Registered farmers",
                  bg:     "bg-[#1E9C17]",
                  text:   "text-white",
                  sub:    "text-white/70",
                  span:   "",
                },
                {
                  val:    <Counter to={2} suffix=" days" />,
                  label:  "Return window",
                  bg:     "bg-[#E8A020]",
                  text:   "text-[#0A1F0A]",
                  sub:    "text-[#0A1F0A]/60",
                  span:   "",
                },
                {
                  val:    <Counter to={15} suffix="+" />,
                  label:  "Crop categories",
                  bg:     "bg-[#C4846A]",
                  text:   "text-white",
                  sub:    "text-white/70",
                  span:   "",
                },
                {
                  val:    "Rs.50",
                  label:  "Base delivery fee",
                  bg:     "bg-[#F5F0E8] border-2 border-[#0A1F0A]/10",
                  text:   "text-[#0A1F0A]",
                  sub:    "text-[#6a7a6a]",
                  span:   "",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  className={`${s.bg} ${s.span} rounded-2xl p-7 flex flex-col justify-between min-h-[120px]`}
                >
                  <p className={`cd font-bold ${s.text} ${s.large ? "text-5xl" : "text-3xl"}`}>
                    {s.val}
                  </p>
                  <p className={`${s.sub} text-xs font-medium mt-2 leading-snug`}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════════════════════ */}
        <section ref={howRef} className="bg-[#0A1F0A] py-28 px-6 lg:px-16 overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div
              className="mb-16"
              style={{
                opacity:    howOn ? 1 : 0,
                transform:  howOn ? "translateY(0)" : "translateY(30px)",
                transition: "all 0.7s ease",
              }}
            >
              <span className="text-[#E8A020] text-xs font-semibold tracking-[0.3em] uppercase">The process</span>
              <h2
                className="cd font-bold text-white mt-3 leading-tight"
                style={{ fontSize: "clamp(2.2rem, 4vw, 3.8rem)" }}
              >
                Simple. Transparent.<br />Repeatable.
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {HOW.map((step, i) => (
                <div
                  key={i}
                  className="relative bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 hover:border-white/20 transition-all group"
                  style={{
                    opacity:    howOn ? 1 : 0,
                    transform:  howOn ? "translateY(0)" : "translateY(40px)",
                    transition: `all 0.7s ease ${i * 130}ms`,
                  }}
                >
                  {/* Large step number watermark */}
                  <div
                    className="absolute top-5 right-6 cd font-bold text-7xl leading-none select-none pointer-events-none"
                    style={{ color: step.color, opacity: 0.12 }}
                  >
                    {step.n}
                  </div>

                  {/* Step dot */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center cd font-bold text-[#0A1F0A] text-lg mb-6 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: step.color }}
                  >
                    {step.n}
                  </div>

                  <h3 className="cd font-semibold text-white text-xl mb-3 leading-tight">
                    {step.head}
                  </h3>
                  <p className="text-[#7a9a7a] text-sm leading-relaxed">
                    {step.body}
                  </p>

                  {/* Bottom accent line */}
                  <div
                    className="absolute bottom-0 left-8 right-8 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: step.color }}
                  />
                </div>
              ))}
            </div>

            {/* Payment methods strip */}
            <div
              className="mt-12 border border-white/10 rounded-2xl p-6 flex flex-wrap items-center gap-6"
              style={{
                opacity:    howOn ? 1 : 0,
                transform:  howOn ? "translateY(0)" : "translateY(20px)",
                transition: "all 0.7s ease 500ms",
              }}
            >
              <p className="text-[#7a9a7a] text-xs font-semibold uppercase tracking-widest">Accepted payments</p>
              <div className="flex flex-wrap gap-3">
                {["eSewa", "Khalti", "Bank QR", "Bank Transfer", "Cash on Delivery"].map((m) => (
                  <span
                    key={m}
                    className="bg-white/8 border border-white/15 text-white/80 text-xs font-semibold px-4 py-2 rounded-xl"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            STATS BAR
        ══════════════════════════════════════════════════════ */}
        <section ref={statsRef} className="bg-[#1E9C17] py-16 px-6 lg:px-16">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x md:divide-white/20">
              {[
                { to: 500,   s: "+",  l: "Farmers"          },
                { to: 10000, s: "+",  l: "Orders fulfilled"  },
                { to: 15,    s: "+",  l: "Crop categories"   },
                { to: 100,   s: "%",  l: "Transparent pricing"},
              ].map((s, i) => (
                <div
                  key={i}
                  className="text-center md:px-8"
                  style={{
                    opacity:    statsOn ? 1 : 0,
                    transform:  statsOn ? "scale(1)" : "scale(0.9)",
                    transition: `all 0.6s ease ${i * 100}ms`,
                  }}
                >
                  <p className="cd font-bold text-white text-5xl leading-none">
                    <Counter to={s.to} suffix={s.s} />
                  </p>
                  <p className="text-white/70 text-xs uppercase tracking-widest mt-3 font-medium">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            FOR FARMERS / FOR CONSUMERS — split
        ══════════════════════════════════════════════════════ */}
        <section className="bg-[#F5F0E8] py-28 px-6 lg:px-16">
          <div className="max-w-6xl mx-auto">

            {/* Section label */}
            <div className="text-center mb-16">
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[#C4846A]">Built for both sides</span>
              <h2
                className="cd font-bold text-[#0A1F0A] mt-3 leading-tight"
                style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
              >
                One platform. Two doors.
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">

              {/* Farmer door */}
              <div className="group bg-[#0A1F0A] rounded-3xl p-10 overflow-hidden relative hover:-translate-y-1 transition-transform">
                <div className="absolute top-0 right-0 w-40 h-40 opacity-20"
                  style={{ background: "radial-gradient(circle, #1E9C17 0%, transparent 70%)" }} />

                <span className="text-5xl block mb-6">🌾</span>
                <h3 className="cd font-bold text-white text-3xl mb-4 leading-tight">
                  For Farmers
                </h3>
                <p className="text-[#a0b8a0] leading-relaxed mb-8 text-sm">
                  List your crops, set regular and bulk prices, manage orders, accept multiple payment methods,
                  and handle returns — all from one dashboard.
                </p>
                <ul className="space-y-2 mb-10">
                  {[
                    "Free to register and list",
                    "Set your own prices",
                    "Accept bulk orders from traders",
                    "Location-based visibility",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-[#c0d0c0] text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1E9C17] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 bg-[#1E9C17] text-white cd font-semibold px-6 py-3 rounded-xl text-sm hover:bg-[#158212] transition-colors"
                >
                  Register as Farmer
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>

              {/* Consumer door */}
              <div className="group bg-[#ECEAE0] border-2 border-[#0A1F0A]/10 rounded-3xl p-10 overflow-hidden relative hover:-translate-y-1 transition-transform">
                <div className="absolute top-0 right-0 w-40 h-40 opacity-20"
                  style={{ background: "radial-gradient(circle, #E8A020 0%, transparent 70%)" }} />

                <span className="text-5xl block mb-6">🛒</span>
                <h3 className="cd font-bold text-[#0A1F0A] text-3xl mb-4 leading-tight">
                  For Consumers
                </h3>
                <p className="text-[#4a6a4a] leading-relaxed mb-8 text-sm">
                  Browse crops from farms near you, see harvest dates and real prices, choose Normal or Bulk
                  per item, and pay with the method that works for you.
                </p>
                <ul className="space-y-2 mb-10">
                  {[
                    "Farms sorted by distance from you",
                    "Normal & bulk pricing per product",
                    "eSewa, Khalti, COD and more",
                    "2-day return window on deliveries",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-[#3a5a3a] text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E8A020] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 bg-[#0A1F0A] text-white cd font-semibold px-6 py-3 rounded-xl text-sm hover:bg-[#1a3f1a] transition-colors"
                >
                  Start Shopping
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            VOICES
        ══════════════════════════════════════════════════════ */}
        <section ref={voiceRef} className="bg-[#F5F0E8] pt-0 pb-28 px-6 lg:px-16">
          <div className="max-w-6xl mx-auto">
            <div className="border-t-2 border-[#0A1F0A]/10 pt-16 mb-14">
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[#C4846A]">In their words</span>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {VOICES.map((v, i) => (
                <div
                  key={i}
                  className="bg-[#0A1F0A] rounded-2xl p-8 relative overflow-hidden"
                  style={{
                    opacity:    voiceOn ? 1 : 0,
                    transform:  voiceOn ? "translateY(0)" : "translateY(32px)",
                    transition: `all 0.7s ease ${i * 130}ms`,
                  }}
                >
                  {/* Quote mark */}
                  <p className="text-[#1E9C17] text-6xl font-serif leading-none absolute top-4 right-6 select-none opacity-30">"</p>

                  <p className="text-white/85 text-sm leading-relaxed mb-8 relative">
                    "{v.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#1E9C17] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {v.init}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{v.name}</p>
                      <p className="text-[#7a9a7a] text-xs">{v.place}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            FINAL CTA
        ══════════════════════════════════════════════════════ */}
        <section ref={ctaRef} className="bg-[#0A1F0A] py-32 px-6 lg:px-16 relative overflow-hidden">
          {/* Large decorative text behind */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
            aria-hidden="true"
          >
            <span
              className="cd font-bold text-white/[0.03] whitespace-nowrap"
              style={{ fontSize: "clamp(6rem, 18vw, 20rem)" }}
            >
              MEROBARI
            </span>
          </div>

          <div
            className="relative max-w-4xl mx-auto text-center"
            style={{
              opacity:    ctaOn ? 1 : 0,
              transform:  ctaOn ? "translateY(0)" : "translateY(32px)",
              transition: "all 0.8s ease",
            }}
          >
            <div className="inline-flex items-center gap-2 mb-8">
              <span className="w-8 h-px bg-[#E8A020]" />
              <span className="text-[#E8A020] text-xs font-semibold tracking-[0.3em] uppercase">Join today</span>
              <span className="w-8 h-px bg-[#E8A020]" />
            </div>

            <h2
              className="cd font-bold text-white leading-[0.95]"
              style={{ fontSize: "clamp(3rem, 8vw, 7rem)" }}
            >
              Grow with us.
            </h2>

            <p className="mt-6 text-[#a0b8a0] text-lg max-w-xl mx-auto leading-relaxed">
              Free to join. No listing fees. Built for Nepal's farmers and the people who love fresh food.
            </p>

            <div className="mt-12 flex flex-wrap gap-5 justify-center">
              <Link
                to="/register"
                className="bg-[#1E9C17] text-white cd font-semibold px-10 py-5 rounded-2xl text-base hover:bg-[#158212] hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#1E9C17]/30 transition-all"
              >
                Register Free
              </Link>
              <Link
                to="/about"
                className="border-2 border-white/20 text-white cd font-semibold px-10 py-5 rounded-2xl text-base hover:border-white/50 hover:-translate-y-1 transition-all"
              >
                Read Our Story
              </Link>
              <Link
                to="/contact"
                className="border-2 border-[#E8A020]/40 text-[#E8A020] cd font-semibold px-10 py-5 rounded-2xl text-base hover:border-[#E8A020] hover:-translate-y-1 transition-all"
              >
                Contact Us
              </Link>
            </div>

            <p className="mt-14 text-[#4a6a4a] text-xs">
              Final Year Project · Kathmandu Engineering College · Nepal 🇳🇵
            </p>
          </div>
        </section>

      </div>
    </>
  );
};

export default Home;