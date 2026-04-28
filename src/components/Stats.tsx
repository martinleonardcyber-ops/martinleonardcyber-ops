import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { BlurText } from "@/components/BlurText";
import { STATS, STATS_BG_VIDEO } from "@/lib/constants";

function AnimatedNumber({ value, suffix }: { value: string; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const target = parseInt(value.replace(/,/g, ""), 10);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || isNaN(target)) return;
    let start: number | null = null;
    const duration = 1800;

    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {isNaN(target) ? value : display.toLocaleString()}
      {suffix}
    </span>
  );
}

export function Stats() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !STATS_BG_VIDEO) return;
    // MP4 only — for HLS add hls.js as a dependency and handle here
    video.src = STATS_BG_VIDEO;
  }, []);

  return (
    <section className="relative py-32 md:py-44 overflow-hidden">
      {/* Background */}
      {STATS_BG_VIDEO ? (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover saturate-0"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(14_40%_10%)] via-[hsl(20_15%_8%)] to-[hsl(32_20%_7%)]" />
      )}

      {/* Gradient fades */}
      <div className="absolute top-0 inset-x-0 h-[200px] z-[1] gradient-fade-t" />
      <div className="absolute bottom-0 inset-x-0 h-[200px] z-[1] gradient-fade-b" />

      {/* Content */}
      <div className="relative z-10 max-w-[var(--max)] mx-auto px-[var(--gutter)]">
        <div className="flex flex-col items-center text-center gap-5 mb-14">
          <span className="section-badge">By the numbers</span>
          <BlurText
            text="A track record that speaks for itself."
            className="font-display uppercase leading-[0.9] tracking-tight text-foreground max-w-[24ch]"
            style={{ fontSize: "clamp(28px, 3.5vw, 54px)" }}
          />
        </div>

        <div className="liquid-glass rounded-3xl p-10 md:p-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 relative">
            {STATS.map((stat, idx) => (
              <div key={stat.label} className="relative flex flex-col items-center text-center">
                {/* Vertical separator */}
                {idx > 0 && (
                  <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-12 bg-border/40" />
                )}

                <motion.span
                  className="font-display italic leading-none text-foreground"
                  style={{ fontSize: "clamp(40px, 5vw, 72px)" }}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ delay: idx * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                </motion.span>

                <p className="font-body text-sm text-foreground/60 mt-3 tracking-wide uppercase">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
