import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

/* ── tiny hook: element in viewport ── */
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

const categories = [
  { name: "Vegetables", img: "/home/vegetables.webp", tag: "Fresh Daily" },
  { name: "Fruits",     img: "/home/fruits.jpg",      tag: "Seasonal" },
  { name: "Herbs",      img: "/home/Spices.webp",     tag: "Aromatic" },
  { name: "Grains",     img: "/home/Grains.jpg",      tag: "Staple" },
];

const steps = [
  {
    num: "01",
    title: "Register Once",
    desc: "Create your account as a farmer or consumer in under 2 minutes.",
    color: "from-green-400 to-emerald-500",
  },
  {
    num: "02",
    title: "Browse & List",
    desc: "Farmers publish fresh produce. Consumers discover nearby farms.",
    color: "from-yellow-400 to-amber-400",
  },
  {
    num: "03",
    title: "Pay & Receive",
    desc: "Multiple payment options. Direct delivery. Zero middlemen.",
    color: "from-emerald-500 to-teal-500",
  },
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

/* ─────────────────────────────────────── */
const Home = () => {
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [heroRef, heroVisible] = useInView(0.01);
  const [whyRef, whyVisible] = useInView();
  const [catRef, catVisible] = useInView();
  const [stepsRef, stepsVisible] = useInView();
  const [testimonialRef, testimonialVisible] = useInView();

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full font-[Poppins] text-[#1D1D1D] overflow-x-hidden">

      {/* ══════════════════════════════════════
          HERO — full viewport, cinematic
      ══════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative h-screen flex flex-col justify-center overflow-hidden"
        style={{
          backgroundImage: "url('/home/hero.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* layered overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* diagonal green accent line */}
        <div
          className="absolute top-0 right-0 w-[45vw] h-full opacity-10"
          style={{
            background: "linear-gradient(135deg, transparent 40%, #1E9C17 40%)",
          }}
        />

        {/* grain texture overlay */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 w-full">
          {/* eyebrow */}
          <div
            className={`inline-flex items-center gap-2 mb-6 transition-all duration-700 ${
              heroLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            <span className="w-8 h-px bg-[#FDB933]" />
            <span className="text-[#FDB933] text-xs font-semibold uppercase tracking-[0.25em]">
              Direct-to-Consumer Agriculture
            </span>
          </div>

          {/* headline */}
          <h1
            className={`font-[Montserrat] font-black text-white leading-[0.95] transition-all duration-700 ${
              heroLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{
              fontSize: "clamp(3rem, 8vw, 7rem)",
              transitionDelay: "350ms",
            }}
          >
            Farm to<br />
            <span
              className="text-transparent"
              style={{
                WebkitTextStroke: "2px #1E9C17",
              }}
            >
              Table.
            </span>
            <br />
            <span className="text-[#FDB933]">No Middlemen.</span>
          </h1>

          {/* sub */}
          <p
            className={`mt-8 max-w-lg text-[#D0D0D0] text-lg leading-relaxed transition-all duration-700 ${
              heroLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{ transitionDelay: "500ms" }}
          >
            MeroBari connects Nepal's farmers directly with consumers —
            transparent pricing, fresh produce, and zero exploitation.
          </p>

          {/* CTA */}
          <div
            className={`mt-10 flex flex-wrap gap-4 transition-all duration-700 ${
              heroLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{ transitionDelay: "650ms" }}
          >
            <Link
              to="/register"
              className="group relative overflow-hidden bg-[#1E9C17] text-white px-8 py-4 rounded-full font-bold text-sm tracking-wide hover:shadow-2xl hover:shadow-green-900/40 transition-all duration-300 hover:-translate-y-1"
            >
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              Get Started Free
            </Link>
            <Link
              to="/about"
              className="group flex items-center gap-2 text-white/80 hover:text-white px-6 py-4 text-sm font-semibold transition-all duration-200"
            >
              Learn more
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          {/* floating stat chips */}
          <div
            className={`mt-16 flex flex-wrap gap-3 transition-all duration-700 ${
              heroLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{ transitionDelay: "800ms" }}
          >
            {[
              { val: "500+", label: "Farmers" },
              { val: "0%", label: "Middlemen" },
              { val: "10K+", label: "Orders" },
            ].map((s, i) => (
              <div
                key={i}
                className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-2xl px-5 py-3"
              >
                <p className="font-[Montserrat] font-black text-white text-xl leading-none">{s.val}</p>
                <p className="text-white/60 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 animate-bounce">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════
          WHY MEROBARI — asymmetric layout
      ══════════════════════════════════════ */}
      <section ref={whyRef} className="py-28 bg-[#0D1F0D] relative overflow-hidden">
        {/* decorative circle */}
        <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full border border-[#1E9C17]/20" />
        <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full border border-[#1E9C17]/10" />

        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* left text */}
            <div
              className={`transition-all duration-700 ${
                whyVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"
              }`}
            >
              <span className="text-[#1E9C17] text-xs font-semibold uppercase tracking-[0.25em]">
                The Problem We Solve
              </span>
              <h2 className="font-[Montserrat] font-black text-white mt-4 leading-tight"
                style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
              >
                Farmers earn less.<br />
                <span className="text-[#FDB933]">We fix that.</span>
              </h2>
              <p className="mt-6 text-[#9CAD9C] text-base leading-relaxed max-w-md">
                In Nepal's traditional chain, farmers receive less than 30% of
                the final price. Brokers, wholesalers, and distributors take the
                rest. MeroBari eliminates every unnecessary step.
              </p>

              <div className="mt-10 grid grid-cols-2 gap-6">
                {[
                  { label: "Farmer earnings", before: "30%", after: "90%", color: "text-[#1E9C17]" },
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

            {/* right: big numbers */}
            <div
              className={`transition-all duration-700 delay-200 ${
                whyVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"
              }`}
            >
              <div className="grid grid-cols-2 gap-4">
                {[
                  { target: 500, suffix: "+", label: "Farmers Onboarded", color: "border-[#1E9C17]/40 bg-[#1E9C17]/5" },
                  { target: 10000, suffix: "+", label: "Orders Fulfilled", color: "border-[#FDB933]/40 bg-[#FDB933]/5" },
                  { target: 15, suffix: "+", label: "Crop Categories", color: "border-[#FDB933]/40 bg-[#FDB933]/5" },
                  { target: 0, suffix: "%", label: "Middleman Cut", color: "border-[#1E9C17]/40 bg-[#1E9C17]/5" },
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
        </div>
      </section>

      {/* ══════════════════════════════════════
          CATEGORIES — overlapping cards
      ══════════════════════════════════════ */}
      <section ref={catRef} className="py-28 bg-[#F5F7F0]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div
            className={`text-center mb-16 transition-all duration-700 ${
              catVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="text-[#1E9C17] text-xs font-semibold uppercase tracking-[0.25em]">
              What We Grow
            </span>
            <h2 className="font-[Montserrat] font-black text-[#0D1F0D] mt-3"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              Fresh from the Field
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((cat, i) => (
              <div
                key={i}
                className={`group relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-700 ${
                  catVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
                style={{
                  transitionDelay: `${i * 100}ms`,
                  aspectRatio: i === 0 || i === 3 ? "3/4" : "3/5",
                }}
              >
                <img
                  src={cat.img}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                {/* overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {/* tag */}
                <div className="absolute top-4 left-4">
                  <span className="bg-[#FDB933] text-black text-xs font-bold px-3 py-1 rounded-full">
                    {cat.tag}
                  </span>
                </div>
                {/* name */}
                <div className="absolute bottom-5 left-5 right-5">
                  <h3 className="font-[Montserrat] font-black text-white text-xl">{cat.name}</h3>
                  <div className="mt-2 h-0.5 w-0 bg-[#1E9C17] group-hover:w-full transition-all duration-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          HOW IT WORKS — numbered steps
      ══════════════════════════════════════ */}
      <section ref={stepsRef} className="py-28 bg-white relative overflow-hidden">
        {/* giant background number */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 font-[Montserrat] font-black text-[20rem] leading-none text-[#F0F0F0] select-none pointer-events-none">
          D2C
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative">
          <div
            className={`mb-16 transition-all duration-700 ${
              stepsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="text-[#1E9C17] text-xs font-semibold uppercase tracking-[0.25em]">
              Simple Process
            </span>
            <h2 className="font-[Montserrat] font-black text-[#0D1F0D] mt-3"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              How MeroBari Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`group relative transition-all duration-700 ${
                  stepsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                {/* connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-gray-200 to-transparent z-0" />
                )}

                <div className="relative bg-[#F7FAF5] rounded-3xl p-8 border border-gray-100 group-hover:border-[#1E9C17]/30 group-hover:shadow-xl group-hover:shadow-green-900/5 transition-all duration-300 group-hover:-translate-y-2">
                  {/* big number */}
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} text-white font-[Montserrat] font-black text-lg mb-6 shadow-lg`}>
                    {step.num}
                  </div>
                  <h3 className="font-[Montserrat] font-bold text-[#0D1F0D] text-xl mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>

                  {/* hover accent */}
                  <div className="absolute bottom-0 left-8 right-8 h-0.5 bg-gradient-to-r from-[#1E9C17] to-[#FDB933] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════ */}
      <section ref={testimonialRef} className="py-28 bg-[#0D1F0D] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, #1E9C17 0%, transparent 50%), radial-gradient(circle at 80% 20%, #FDB933 0%, transparent 40%)",
          }}
        />

        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative">
          <div
            className={`text-center mb-16 transition-all duration-700 ${
              testimonialVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="text-[#1E9C17] text-xs font-semibold uppercase tracking-[0.25em]">
              Real Stories
            </span>
            <h2 className="font-[Montserrat] font-black text-white mt-3"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              Farmers & Consumers Speak
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className={`bg-white/5 border border-white/10 rounded-3xl p-7 transition-all duration-700 hover:bg-white/10 hover:border-white/20 ${
                  testimonialVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                {/* quote mark */}
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

      {/* ══════════════════════════════════════
          FINAL CTA — bold split
      ══════════════════════════════════════ */}
      <section className="bg-[#1E9C17] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "url('/home/farm.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-[#1E9C17]/90" />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 py-24 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div>
            <h2 className="font-[Montserrat] font-black text-white leading-tight"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
            >
              Ready to grow<br />with MeroBari?
            </h2>
            <p className="mt-4 text-white/70 max-w-md text-base">
              Join Nepal's most transparent agricultural marketplace today.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 flex-shrink-0">
            <Link
              to="/register"
              className="bg-white text-[#1E9C17] font-bold px-8 py-4 rounded-full text-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              Start as Farmer
            </Link>
            <Link
              to="/register"
              className="bg-[#FDB933] text-black font-bold px-8 py-4 rounded-full text-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              Shop as Consumer
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;