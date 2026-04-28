import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlurText } from "@/components/BlurText";
import {
  CTA_BG_VIDEO, CTA_HEADLINE, CTA_SUB,
  CTA_LABEL, CTA_HREF,
  FOOTER_LINKS, COPYRIGHT, BRAND_NAME,
} from "@/lib/constants";

export function CtaFooter() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !CTA_BG_VIDEO) return;
    // MP4 only — for HLS add hls.js as a dependency and handle here
    video.src = CTA_BG_VIDEO;
  }, []);

  return (
    <section
      id="cta"
      className="relative min-h-[100vh] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background */}
      {CTA_BG_VIDEO ? (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.55)" }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(14_55%_18%)] via-[hsl(20_15%_8%)] to-[hsl(20_15%_6%)]" />
      )}

      {/* Gradient fades */}
      <div className="absolute top-0 inset-x-0 h-[200px] z-[1] gradient-fade-t" />
      <div className="absolute bottom-0 inset-x-0 h-[200px] z-[1] gradient-fade-b" />

      {/* Noise texture */}
      <div className="absolute inset-0 z-[2] noise pointer-events-none" />

      {/* CTA content */}
      <div className="relative z-10 flex flex-col items-center text-center px-[var(--gutter)] py-24 flex-1 w-full justify-center">
        <BlurText
          text={CTA_HEADLINE}
          as="h2"
          className="font-display italic text-foreground text-center max-w-[16ch] leading-[0.88] tracking-[-0.02em]"
          style={{ fontSize: "clamp(56px, 10vw, 180px)" }}
        />

        <motion.p
          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 font-body text-base md:text-lg text-foreground/75 max-w-xl"
        >
          {CTA_SUB}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.6, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex items-center gap-3 flex-wrap justify-center"
        >
          <Button variant="hero" asChild>
            <a href={CTA_HREF}>
              {CTA_LABEL} <ArrowUpRight className="ml-1 size-4" />
            </a>
          </Button>
          <Button variant="heroGlass">
            View pricing
          </Button>
        </motion.div>
      </div>

      {/* Footer bar */}
      <div className="relative z-10 w-full border-t border-border/40">
        <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)] py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" className="h-5 w-auto opacity-60" alt={BRAND_NAME} />
            <span className="font-body text-xs text-foreground/50">{COPYRIGHT}</span>
          </div>
          <nav className="flex items-center gap-6">
            {FOOTER_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="font-body text-xs text-foreground/50 hover:text-foreground/80 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
