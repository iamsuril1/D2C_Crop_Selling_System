import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const useReveal = (threshold = 0.12) => {
  const ref         = useRef(null);
  const [on, setOn] = useState(false);
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

const VEGGIES = [
  { name: "Tomato",    color: "#E74C3C", emoji: "🍅" },
  { name: "Spinach",   color: "#27AE60", emoji: "🥬" },
  { name: "Potato",    color: "#D4A853", emoji: "🥔" },
  { name: "Carrot",    color: "#E67E22", emoji: "🥕" },
  { name: "Garlic",    color: "#C8A97E", emoji: "🧄" },
  { name: "Onion",     color: "#9B59B6", emoji: "🧅" },
  { name: "Corn",      color: "#F1C40F", emoji: "🌽" },
  { name: "Broccoli",  color: "#1E9C17", emoji: "🥦" },
  { name: "Eggplant",  color: "#6C3483", emoji: "🍆" },
  { name: "Coriander", color: "#2ECC71", emoji: "🌿" },
  { name: "Capsicum",  color: "#E74C3C", emoji: "🫑" },
  { name: "Cucumber",  color: "#28B463", emoji: "🥒" },
];

const VeggieWheel = () => {
  const [angle, setAngle] = useState(0);
  const raf               = useRef(null);

  useEffect(() => {
    const tick = () => {
      setAngle((a) => (a + 0.15) % 360);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const cx     = 160;
  const cy     = 160;
  const radius = 115;

  return (
    <svg viewBox="0 0 320 320" className="w-full h-full" aria-hidden="true">
      <circle cx={cx} cy={cy} r={150} fill="none" stroke="#1E9C17" strokeWidth="1"   opacity="0.15" strokeDasharray="5 5" />
      <circle cx={cx} cy={cy} r={130} fill="none" stroke="#E8A020" strokeWidth="0.5" opacity="0.12" />
      <circle cx={cx} cy={cy} r={60}  fill="none" stroke="#1E9C17" strokeWidth="0.5" opacity="0.2"  strokeDasharray="3 3" />

      {VEGGIES.map((v, i) => {
        const a  = (i * (360 / VEGGIES.length) + angle) * (Math.PI / 180);
        const x  = cx + radius * Math.cos(a);
        const y  = cy + radius * Math.sin(a);
        const x0 = cx + 62 * Math.cos(a);
        const y0 = cy + 62 * Math.sin(a);
        return (
          <line
            key={`spoke-${i}`}
            x1={x0} y1={y0} x2={x} y2={y}
            stroke={v.color} strokeWidth="0.6" opacity="0.2"
          />
        );
      })}

      {VEGGIES.map((v, i) => {
        const a    = (i * (360 / VEGGIES.length) + angle) * (Math.PI / 180);
        const x    = cx + radius * Math.cos(a);
        const y    = cy + radius * Math.sin(a);
        const scale = 0.78 + 0.32 * ((Math.sin(a) + 1) / 2);
        const size  = Math.round(20 * scale);
        return (
          <text
            key={i} x={x} y={y}
            textAnchor="middle" dominantBaseline="central"
            fontSize={size} style={{ userSelect: "none" }}
          >
            {v.emoji}
          </text>
        );
      })}

      <circle cx={cx} cy={cy} r={58} fill="#0A1F0A" />
      <circle cx={cx} cy={cy} r={54} fill="#0A1F0A" stroke="#1E9C17" strokeWidth="1.5" />
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#1E9C17"
        fontFamily="Montserrat, sans-serif" fontWeight="900" fontSize="13" letterSpacing="1">
        MERO
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="white"
        fontFamily="Montserrat, sans-serif" fontWeight="900" fontSize="13" letterSpacing="1">
        BARI
      </text>
      <text x={cx} y={cy + 23} textAnchor="middle" fill="#E8A020"
        fontFamily="sans-serif" fontSize="8" letterSpacing="3">
        NEPAL
      </text>
    </svg>
  );
};

const FlightPath = () => {
  return (
    <div className="relative w-full overflow-hidden py-14 px-4 sm:py-20 sm:px-6 lg:px-16 bg-[#F5F0E8]">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-10 sm:mb-16">
          <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[#1E9C17]">
            How it works
          </span>
          <h2
            className="cd font-bold text-[#0A1F0A] mt-3 leading-tight"
            style={{ fontSize: "clamp(1.5rem, 5vw, 3rem)" }}
          >
            Farm to your door, directly.
          </h2>
          <p className="mt-4 text-[#5a7a5a] text-sm max-w-md mx-auto leading-relaxed">
            No middlemen. No inflated prices. Just a direct line between the farmer who grows your food and the table you eat it at.
          </p>
        </div>

        {/* Mobile: vertical stack of nodes */}
        <div className="block sm:hidden mb-10">
          <div className="flex flex-col items-center gap-0">
            {/* Farmer */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#0A1F0A] flex items-center justify-center shadow-xl">
                <svg viewBox="0 0 24 24" fill="none" stroke="#1E9C17" strokeWidth="1.5" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </div>
              <p className="cd font-bold text-[#0A1F0A] text-sm">Farmer</p>
              <p className="text-[#1E9C17] text-xs font-medium">Lists crops</p>
            </div>
            {/* Arrow down */}
            <div className="flex flex-col items-center gap-1 py-3">
              <div className="w-px h-5 bg-[#1E9C17] opacity-40" />
              <span className="text-xl leading-none">✈️</span>
              <div className="w-px h-5 bg-[#1E9C17] opacity-40" />
            </div>
            {/* Platform */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-14 h-14 rounded-full bg-[#1E9C17] flex items-center justify-center shadow-xl ring-4 ring-[#1E9C17]/20">
                <span className="cd font-black text-white text-[9px] leading-tight text-center tracking-wide">
                  MERO<br />BARI
                </span>
              </div>
              <p className="cd font-bold text-[#0A1F0A] text-sm">Platform</p>
              <p className="text-[#1E9C17] text-xs font-medium">Connects both</p>
            </div>
            {/* Arrow down */}
            <div className="flex flex-col items-center gap-1 py-3">
              <div className="w-px h-5 bg-[#E8A020] opacity-40" />
              <span className="text-xl leading-none">📦</span>
              <div className="w-px h-5 bg-[#E8A020] opacity-40" />
            </div>
            {/* Consumer */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#E8A020] flex items-center justify-center shadow-xl">
                <svg viewBox="0 0 24 24" fill="none" stroke="#0A1F0A" strokeWidth="1.5" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <p className="cd font-bold text-[#0A1F0A] text-sm">Consumer</p>
              <p className="text-[#E8A020] text-xs font-medium">Buys fresh</p>
            </div>
          </div>
        </div>

        {/* Desktop: SVG flight path with absolute-positioned nodes */}
        <div className="relative hidden sm:block">
          <svg
            viewBox="0 0 900 180"
            className="w-full"
            style={{ overflow: "visible" }}
            aria-hidden="true"
          >
            <defs>
              <marker id="arrowGreen" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" fill="#1E9C17" />
              </marker>
              <marker id="arrowGold" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" fill="#E8A020" />
              </marker>
            </defs>
            <path d="M 130,90 Q 280,25 430,90" fill="none" stroke="#1E9C17" strokeWidth="2" strokeDasharray="8 5" opacity="0.4" markerEnd="url(#arrowGreen)" />
            <path d="M 470,90 Q 620,25 760,90" fill="none" stroke="#E8A020" strokeWidth="2" strokeDasharray="8 5" opacity="0.4" markerEnd="url(#arrowGold)" />
            <text fontSize="22" textAnchor="middle" dominantBaseline="central" style={{ userSelect: "none" }}>
              ✈️
              <animateMotion dur="3.2s" repeatCount="indefinite" path="M 130,90 Q 280,25 430,90" rotate="auto" />
            </text>
            <text fontSize="20" textAnchor="middle" dominantBaseline="central" style={{ userSelect: "none" }}>
              📦
              <animateMotion dur="3.2s" repeatCount="indefinite" begin="1.6s" path="M 470,90 Q 620,25 760,90" rotate="auto" />
            </text>
          </svg>

          <div className="absolute inset-0 flex items-center justify-between px-[5%] pointer-events-none">
            <div className="flex flex-col items-center gap-3 text-center w-28">
              <div className="w-16 h-16 rounded-2xl bg-[#0A1F0A] flex items-center justify-center shadow-xl">
                <svg viewBox="0 0 24 24" fill="none" stroke="#1E9C17" strokeWidth="1.5" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </div>
              <div>
                <p className="cd font-bold text-[#0A1F0A] text-sm">Farmer</p>
                <p className="text-[#1E9C17] text-xs font-medium">Lists crops</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 text-center w-28">
              <div className="w-16 h-16 rounded-full bg-[#1E9C17] flex items-center justify-center shadow-xl ring-4 ring-[#1E9C17]/20">
                <span className="cd font-black text-white text-[10px] leading-tight text-center tracking-wide">
                  MERO<br />BARI
                </span>
              </div>
              <div>
                <p className="cd font-bold text-[#0A1F0A] text-sm">Platform</p>
                <p className="text-[#1E9C17] text-xs font-medium">Connects both</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 text-center w-28">
              <div className="w-16 h-16 rounded-2xl bg-[#E8A020] flex items-center justify-center shadow-xl">
                <svg viewBox="0 0 24 24" fill="none" stroke="#0A1F0A" strokeWidth="1.5" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <div>
                <p className="cd font-bold text-[#0A1F0A] text-sm">Consumer</p>
                <p className="text-[#E8A020] text-xs font-medium">Buys fresh</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-10 sm:mt-20">
          {[
            { num: "01", title: "Register & List", body: "Farmers sign up free and list crops with harvest details and pricing. Live in minutes.", color: "#1E9C17" },
            { num: "02", title: "Browse & Order",  body: "Consumers discover nearby farms, see harvest dates, and place normal or bulk orders.",   color: "#E8A020" },
            { num: "03", title: "Pay & Receive",   body: "Pay via eSewa, FonePay, or Cash on Delivery. Produce delivered directly to you.",        color: "#C4846A" },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 sm:p-7 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden"
            >
              <span
                className="absolute top-4 right-5 cd font-black text-5xl sm:text-6xl leading-none select-none pointer-events-none"
                style={{ color: s.color, opacity: 0.08 }}
              >
                {s.num}
              </span>
              <div className="w-3 h-3 rounded-full mb-4 sm:mb-5" style={{ backgroundColor: s.color }} />
              <h3 className="cd font-bold text-[#0A1F0A] text-base sm:text-lg mb-2">{s.title}</h3>
              <p className="text-[#5a7a5a] text-sm leading-relaxed">{s.body}</p>
              <div className="absolute bottom-0 left-0 h-1 w-full rounded-b-2xl opacity-20" style={{ backgroundColor: s.color }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Ticker = () => {
  const items = [...VEGGIES, ...VEGGIES];
  return (
    <div className="overflow-hidden py-3 sm:py-4 border-y-2 border-[#0A1F0A]/10 bg-[#F5F0E8]">
      <div
        className="flex gap-0 w-max"
        style={{ animation: "tickerSlide 30s linear infinite" }}
      >
        {items.map((v, i) => (
          <div
            key={i}
            className="flex items-center gap-2 sm:gap-3 px-4 sm:px-8 border-r border-[#0A1F0A]/8 shrink-0"
          >
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: v.color }} />
            <p className="font-semibold text-[#0A1F0A] text-xs sm:text-sm tracking-wide">{v.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const Home = () => {
  const [ready,    setReady]    = useState(false);
  const [howRef,   howOn]       = useReveal(0.1);
  const [doorsRef, doorsOn]     = useReveal(0.1);
  const [voiceRef, voiceOn]     = useReveal(0.1);
  const [ctaRef,   ctaOn]       = useReveal(0.15);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 40);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes tickerSlide {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes heroIn {
          from { opacity: 0; transform: translateY(36px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1);    }
        }
        @keyframes floatY {
          0%, 100% { transform: translateY(0px);   }
          50%       { transform: translateY(-14px); }
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
        .w7 { animation-delay: 0.82s; }

        .cd { font-family: 'Clash Display', 'Montserrat', sans-serif; }
        .dm { font-family: 'DM Sans', 'Poppins', sans-serif; }

        /* ── Mobile-specific fixes ── */

        /* Prevent horizontal overflow on small screens */
        * { box-sizing: border-box; }

        /* Ensure buttons are always fully tappable on mobile */
        @media (max-width: 639px) {
          .hero-cta-btn {
            width: 100%;
            min-height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* Reduce hero heading size further on very small phones */
          .hero-headline {
            font-size: clamp(2.4rem, 18vw, 5rem) !important;
          }

          /* Improve readability of badge chips */
          .feature-chip {
            font-size: 11px;
            padding: 6px 12px;
          }
        }

        /* Smooth touch scrolling */
        html { -webkit-overflow-scrolling: touch; }

        /* Prevent text selection on decorative elements */
        .no-select { user-select: none; -webkit-user-select: none; }
      `}</style>

      <div className="dm text-[#0A1F0A] overflow-x-hidden bg-[#F5F0E8]">

        {/* ── HERO ── */}
        <section className="relative min-h-[100svh] bg-[#0A1F0A] flex flex-col overflow-hidden">

          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div
            className="absolute top-0 right-0 w-[280px] h-[280px] sm:w-[500px] sm:h-[500px] lg:w-[700px] lg:h-[700px] opacity-[0.15] pointer-events-none"
            style={{ background: "radial-gradient(circle at 70% 25%, #1E9C17 0%, transparent 60%)" }}
          />

          <div className="relative flex-1 flex flex-col lg:flex-row items-center max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-16 pt-24 sm:pt-32 pb-10 sm:pb-16 gap-6 lg:gap-12">

            {/* Left text */}
            <div className="flex-1 min-w-0 w-full text-center lg:text-left">

              {ready && (
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-5 sm:mb-8 hero-word w1">
                  <span className="w-6 sm:w-8 h-px bg-[#1E9C17]" />
                  <span className="text-[#1E9C17] text-[10px] sm:text-xs font-semibold tracking-[0.25em] sm:tracking-[0.3em] uppercase">
                    Nepal's Farm to Table Platform
                  </span>
                </div>
              )}

              <h1
                className="cd font-bold leading-[0.9] text-white hero-headline"
                style={{ fontSize: "clamp(2.8rem, 14vw, 8rem)" }}
              >
                {ready && (
                  <>
                    <span className="hero-word w2 block text-[#F5F0E8]">Fresh.</span>
                    <span className="hero-word w3 block text-[#1E9C17]">Honest.</span>
                    <span className="hero-word w4 block text-[#F5F0E8]">Direct.</span>
                  </>
                )}
              </h1>

              {ready && (
                <p className="hero-word w5 mt-5 sm:mt-8 text-[#a0b8a0] text-sm sm:text-lg leading-relaxed max-w-xs sm:max-w-lg mx-auto lg:mx-0">
                  MeroBari connects Nepal's farmers directly with consumers.
                  No middlemen. No hidden markups. Real harvests at fair prices.
                </p>
              )}

              {ready && (
                <div className="hero-word w6 mt-6 sm:mt-10 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center lg:items-start">
                  <Link
                    to="/register"
                    className="hero-cta-btn group relative overflow-hidden bg-[#1E9C17] text-white cd font-semibold px-7 sm:px-8 py-4 rounded-2xl text-sm tracking-wide transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#1E9C17]/40 text-center"
                  >
                    <span className="absolute inset-0 bg-white/10 translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-500 skew-x-12" />
                    <span className="relative">Join as Farmer</span>
                  </Link>
                  <Link
                    to="/register"
                    className="hero-cta-btn group relative overflow-hidden bg-[#E8A020] text-[#0A1F0A] cd font-semibold px-7 sm:px-8 py-4 rounded-2xl text-sm tracking-wide transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#E8A020]/40 text-center"
                  >
                    <span className="absolute inset-0 bg-white/15 translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-500 skew-x-12" />
                    <span className="relative">Shop Fresh Produce</span>
                  </Link>
                  <Link
                    to="/login"
                    className="hero-cta-btn border-2 border-white/20 text-white cd font-semibold px-7 sm:px-8 py-4 rounded-2xl text-sm tracking-wide transition-all hover:border-white/50 hover:-translate-y-1 text-center"
                  >
                    Sign In
                  </Link>
                </div>
              )}

              {ready && (
                <div className="hero-word w7 mt-5 sm:mt-8 flex flex-wrap gap-2 justify-center lg:justify-start">
                  {[
                    "Free to register",
                    "Nearby farms first",
                    "eSewa and COD",
                    "2-day returns",
                  ].map((f) => (
                    <span
                      key={f}
                      className="feature-chip bg-white/8 border border-white/12 text-white/60 text-[10px] sm:text-xs font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-full"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Veggie wheel — centered below text on mobile, side-by-side on desktop */}
            {ready && (
              <div
                className="w-44 h-44 xs:w-52 xs:h-52 sm:w-64 sm:h-64 lg:w-[400px] lg:h-[400px] flex-shrink-0 mx-auto lg:mx-0 mt-2 sm:mt-0"
                style={{
                  animation: `scaleIn 1s cubic-bezier(.16,1,.3,1) 0.4s both,
                              floatY 5s ease-in-out 1.4s infinite`,
                }}
              >
                <VeggieWheel />
              </div>
            )}
          </div>

          <div className="h-12 sm:h-16 bg-gradient-to-b from-transparent to-[#F5F0E8]" />
        </section>

        <Ticker />

        {/* ── HOW IT WORKS ── */}
        <div
          ref={howRef}
          style={{
            opacity:    howOn ? 1 : 0,
            transform:  howOn ? "translateY(0)" : "translateY(40px)",
            transition: "all 0.8s ease",
          }}
        >
          <FlightPath />
        </div>

        {/* ── TWO DOORS ── */}
        <section ref={doorsRef} className="bg-[#0A1F0A] py-16 sm:py-28 px-4 sm:px-6 lg:px-16">
          <div className="max-w-6xl mx-auto">

            <div
              className="text-center mb-8 sm:mb-14"
              style={{
                opacity:    doorsOn ? 1 : 0,
                transform:  doorsOn ? "translateY(0)" : "translateY(24px)",
                transition: "all 0.7s ease",
              }}
            >
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[#E8A020]">
                Built for both sides
              </span>
              <h2
                className="cd font-bold text-white mt-3 leading-tight"
                style={{ fontSize: "clamp(1.6rem, 5vw, 3.2rem)" }}
              >
                One platform. Two doors.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

              {/* Farmer door */}
              <div
                className="relative bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-10 overflow-hidden hover:bg-white/8 hover:-translate-y-1 transition-all"
                style={{
                  opacity:    doorsOn ? 1 : 0,
                  transform:  doorsOn ? "translateY(0)" : "translateY(32px)",
                  transition: "all 0.7s ease 100ms",
                }}
              >
                <div className="absolute top-0 right-0 w-40 h-40 opacity-10 pointer-events-none"
                  style={{ background: "radial-gradient(circle, #1E9C17 0%, transparent 70%)" }} />

                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#1E9C17]/15 border border-[#1E9C17]/20 flex items-center justify-center mb-5 sm:mb-6">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#1E9C17" strokeWidth="1.5" className="w-6 h-6 sm:w-7 sm:h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                </div>

                <h3 className="cd font-bold text-white text-xl sm:text-2xl mb-3">For Farmers</h3>
                <p className="text-[#a0b8a0] text-sm leading-relaxed mb-5 sm:mb-8">
                  List your crops, set your own prices, manage orders and returns — all from a single dashboard built for Nepal's farmers.
                </p>
                <ul className="space-y-3 mb-7 sm:mb-10">
                  {[
                    "Free to register and list crops",
                    "Set regular and bulk pricing",
                    "Accept multiple payment methods",
                    "Geo-based visibility to nearby buyers",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[#c0d0c0] text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1E9C17] flex-shrink-0 mt-1.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 bg-[#1E9C17] text-white cd font-semibold px-5 sm:px-6 py-3 rounded-xl text-sm hover:bg-[#158212] transition-colors w-full sm:w-auto justify-center sm:justify-start"
                >
                  Register as Farmer
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>

              {/* Consumer door */}
              <div
                className="relative bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-10 overflow-hidden hover:bg-white/8 hover:-translate-y-1 transition-all"
                style={{
                  opacity:    doorsOn ? 1 : 0,
                  transform:  doorsOn ? "translateY(0)" : "translateY(32px)",
                  transition: "all 0.7s ease 220ms",
                }}
              >
                <div className="absolute top-0 right-0 w-40 h-40 opacity-10 pointer-events-none"
                  style={{ background: "radial-gradient(circle, #E8A020 0%, transparent 70%)" }} />

                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#E8A020]/15 border border-[#E8A020]/20 flex items-center justify-center mb-5 sm:mb-6">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="1.5" className="w-6 h-6 sm:w-7 sm:h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>

                <h3 className="cd font-bold text-white text-xl sm:text-2xl mb-3">For Consumers</h3>
                <p className="text-[#a0b8a0] text-sm leading-relaxed mb-5 sm:mb-8">
                  Browse fresh produce from farms near you, choose normal or bulk quantities, and pay with the method that suits you.
                </p>
                <ul className="space-y-3 mb-7 sm:mb-10">
                  {[
                    "Farms sorted by distance from you",
                    "Normal and bulk pricing per item",
                    "eSewa, FonePay, COD accepted",
                    "2-day return window on deliveries",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[#c0d0c0] text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E8A020] flex-shrink-0 mt-1.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 bg-[#E8A020] text-[#0A1F0A] cd font-semibold px-5 sm:px-6 py-3 rounded-xl text-sm hover:bg-[#d49018] transition-colors w-full sm:w-auto justify-center sm:justify-start"
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

        {/* ── TESTIMONIALS ── */}
        <section ref={voiceRef} className="bg-[#F5F0E8] py-16 sm:py-28 px-4 sm:px-6 lg:px-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-14">
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[#C4846A]">
                In their words
              </span>
              <h2
                className="cd font-bold text-[#0A1F0A] mt-3"
                style={{ fontSize: "clamp(1.5rem, 4vw, 2.8rem)" }}
              >
                Real people. Real results.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  quote:  "I set my own price for the first time in 12 years of farming.",
                  name:   "Ramesh B.", place: "Bhaktapur", init: "RB", role: "Farmer",
                  accent: "#1E9C17",
                },
                {
                  quote:  "My restaurant saves thousands every month buying directly from farms.",
                  name:   "Bikash T.", place: "Kathmandu", init: "BT", role: "Consumer",
                  accent: "#E8A020",
                },
                {
                  quote:  "I know exactly which farm my food comes from and when it was harvested.",
                  name:   "Sita M.",   place: "Lalitpur",  init: "SM", role: "Consumer",
                  accent: "#C4846A",
                },
              ].map((v, i) => (
                <div
                  key={i}
                  className="bg-[#0A1F0A] rounded-2xl p-6 sm:p-8 relative overflow-hidden border border-white/5"
                  style={{
                    opacity:    voiceOn ? 1 : 0,
                    transform:  voiceOn ? "translateY(0)" : "translateY(32px)",
                    transition: `all 0.7s ease ${i * 130}ms`,
                  }}
                >
                  <div
                    className="absolute top-5 right-6 cd font-black text-6xl leading-none select-none opacity-10"
                    style={{ color: v.accent }}
                  >
                    "
                  </div>
                  <div className="w-8 h-0.5 rounded-full mb-5 sm:mb-6" style={{ backgroundColor: v.accent }} />
                  <p className="text-white/80 text-sm leading-relaxed mb-6 sm:mb-8">{v.quote}</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: v.accent }}
                    >
                      {v.init}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{v.name}</p>
                      <p className="text-[#7a9a7a] text-xs">{v.place} · {v.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section ref={ctaRef} className="bg-[#0A1F0A] py-20 sm:py-32 px-4 sm:px-6 lg:px-16 relative overflow-hidden">

          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
            aria-hidden="true"
          >
            <span
              className="cd font-bold text-white/[0.025] whitespace-nowrap"
              style={{ fontSize: "clamp(3rem, 12vw, 20rem)" }}
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
            <div className="inline-flex items-center gap-2 mb-5 sm:mb-8">
              <span className="w-6 sm:w-8 h-px bg-[#E8A020]" />
              <span className="text-[#E8A020] text-xs font-semibold tracking-[0.3em] uppercase">Join today</span>
              <span className="w-6 sm:w-8 h-px bg-[#E8A020]" />
            </div>

            <h2
              className="cd font-bold text-white leading-[0.95]"
              style={{ fontSize: "clamp(2.2rem, 10vw, 7rem)" }}
            >
              Grow with us.
            </h2>

            <p className="mt-4 sm:mt-6 text-[#a0b8a0] text-sm sm:text-lg max-w-xs sm:max-w-xl mx-auto leading-relaxed">
              Free to join. No listing fees. Built for Nepal's farmers and the people who love fresh food.
            </p>

            <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
              <Link
                to="/register"
                className="bg-[#1E9C17] text-white cd font-semibold px-7 sm:px-10 py-4 sm:py-5 rounded-2xl text-sm sm:text-base hover:bg-[#158212] hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#1E9C17]/30 transition-all text-center"
              >
                Register as Farmer
              </Link>
              <Link
                to="/register"
                className="bg-[#E8A020] text-[#0A1F0A] cd font-semibold px-7 sm:px-10 py-4 sm:py-5 rounded-2xl text-sm sm:text-base hover:bg-[#d49018] hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#E8A020]/30 transition-all text-center"
              >
                Shop as Consumer
              </Link>
              <Link
                to="/login"
                className="border-2 border-white/20 text-white cd font-semibold px-7 sm:px-10 py-4 sm:py-5 rounded-2xl text-sm sm:text-base hover:border-white/50 hover:-translate-y-1 transition-all text-center"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
};

export default Home;