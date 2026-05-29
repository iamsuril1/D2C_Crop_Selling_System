import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const About = () => {
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const dotCount = window.innerWidth < 480 ? 30 : 60;
    const dots = Array.from({ length: dotCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
        if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(30,156,23,${d.alpha})`;
        ctx.fill();
      });
      dots.forEach((a, i) => {
        dots.slice(i + 1).forEach((b) => {
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(30,156,23,${0.06 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      className="min-h-screen bg-[#040D04] text-white overflow-hidden relative flex items-center justify-center px-5 sm:px-8 py-20 sm:py-0"
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Playfair+Display:ital,wght@0,700;1,700&display=swap"
        rel="stylesheet"
      />

      {/* animated canvas bg */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* large faint background text */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(3.5rem, 22vw, 22rem)",
            lineHeight: 1,
            color: "transparent",
            WebkitTextStroke: "1px rgba(30,156,23,0.07)",
            whiteSpace: "nowrap",
          }}
        >
          MeroBari
        </span>
      </div>

      {/* top-left badge */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#1E9C17] animate-pulse flex-shrink-0" />
        <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.25em] sm:tracking-[0.3em] text-white/30">
          Final Year Project — 2025
        </span>
      </div>

      {/* main content */}
      <div
        className="relative max-w-2xl w-full text-center"
        style={{
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.9s ease, transform 0.9s ease",
        }}
      >
        {/* eyebrow */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
          <span className="h-px w-6 sm:w-10 bg-[#1E9C17]/50" />
          <span className="text-[#1E9C17] text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.25em] sm:tracking-[0.3em]">
            About MeroBari
          </span>
          <span className="h-px w-6 sm:w-10 bg-[#1E9C17]/50" />
        </div>

        {/* headline */}
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(2rem, 8vw, 5rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
          className="text-white mb-5 sm:mb-6 px-2 sm:px-0"
        >
          We exist so farmers
          <br />
          <em className="text-[#1E9C17] not-italic">get paid fairly.</em>
        </h1>

        {/* description */}
        <p
          className="text-white/50 text-sm sm:text-base lg:text-lg leading-relaxed max-w-xl mx-auto mb-10 sm:mb-12 px-2 sm:px-0"
          style={{ fontWeight: 300 }}
        >
          MeroBari is Nepal's first Direct-to-Consumer agricultural
          marketplace — built to eliminate exploitation, not just digitise it.
        </p>

        {/* divider */}
        <div className="flex items-center justify-center gap-4 mb-8 sm:mb-12">
          <span className="h-px flex-1 max-w-[60px] sm:max-w-[80px] bg-white/10" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#1E9C17]/60" />
          <span className="h-px flex-1 max-w-[60px] sm:max-w-[80px] bg-white/10" />
        </div>

        {/* CTA links */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full">
          <Link
            to="/register"
            className="group relative inline-flex items-center justify-center gap-2 bg-[#1E9C17] text-white text-sm font-medium px-8 py-4 rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(30,156,23,0.4)] hover:scale-105 w-full sm:w-auto"
          >
            <span className="relative z-10">Join MeroBari</span>
            <svg
              className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </Link>

          <Link
            to="/contact"
            className="inline-flex items-center justify-center gap-2 border border-white/15 text-white/60 text-sm font-medium px-8 py-4 rounded-full hover:border-white/30 hover:text-white transition-all duration-300 w-full sm:w-auto"
          >
            Contact Us
          </Link>
        </div>

        
      </div>
    </div>
  );
};

export default About;