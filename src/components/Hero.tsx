import { motion } from "motion/react";
import { ArrowUpRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrubSequence } from "@/components/ScrubSequence";
import { BlurText } from "@/components/BlurText";
import {
  FRAMES_PATH, FRAME_COUNT, FRAME_EXT,
  BRAND_TAGLINE, HERO_HEADLINE, HERO_SUB,
  HERO_CTA_PRIMARY, HERO_CTA_SECONDARY,
  CTA_HREF, PARTNERS,
} from "@/lib/constants";

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scrollRef: React.RefObject<any>;
};

export function Hero({ scrollRef }: Props) {
  return (
    <section
      ref={scrollRef}
      id="hero"
      className="relative bg-background"
      style={{ height: "250vh" }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Frame sequence canvas */}
        <ScrubSequence
          framesPath={FRAMES_PATH}
          frameCount={FRAME_COUNT}
          ext={FRAME_EXT}
          scrollTargetRef={scrollRef}
          className="absolute inset-0 w-full h-full z-0"
        />

        {/* Fallback gradient shown while frames load or if no frames exist */}
        <div className="absolute inset-0 z-[0] bg-gradient-to-br from-[hsl(20_15%_6%)] via-[hsl(14_30%_12%)] to-[hsl(20_15%_9%)]" />

        {/* Cinematic radial vignette */}
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(120%_80%_at_50%_60%,transparent_40%,rgba(0,0,0,0.55)_100%)]" />

        {/* Bottom fade into next section */}
        <div className="absolute bottom-0 inset-x-0 h-[40vh] z-[2] gradient-fade-b" />

        {/* Hero content */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="liquid-glass rounded-full px-1 py-1 inline-flex items-center gap-2">
              <span className="bg-foreground text-background rounded-full px-3 py-1 text-xs font-semibold">
                New
              </span>
              <span className="pr-3 text-sm text-foreground/85 font-body">{BRAND_TAGLINE}</span>
            </div>
          </motion.div>

          {/* Headline */}
          <BlurText
            text={HERO_HEADLINE}
            as="h1"
            className="mt-6 font-display uppercase text-foreground max-w-[14ch] leading-[0.92] tracking-[-0.02em]"
            style={{ fontSize: "clamp(56px, 9vw, 144px)" } as React.CSSProperties}
            delay={0.09}
            startDelay={0.15}
          />

          {/* Subtext */}
          <motion.p
            initial={{ filter: "blur(10px)", opacity: 0, y: 16 }}
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 font-body text-base md:text-lg text-foreground/70 max-w-xl leading-relaxed"
          >
            {HERO_SUB}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex items-center gap-3 flex-wrap justify-center"
          >
            <Button variant="hero" asChild>
              <a href={CTA_HREF}>
                {HERO_CTA_PRIMARY} <ArrowUpRight className="ml-1 size-4" />
              </a>
            </Button>
            <Button variant="heroGlass">
              <Play className="mr-1.5 size-4 fill-current" />
              {HERO_CTA_SECONDARY}
            </Button>
          </motion.div>
        </div>

        {/* Partners row — pinned to bottom */}
        <motion.div
          className="absolute bottom-10 inset-x-0 z-10 flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          <span className="liquid-glass rounded-full px-4 py-1.5 text-xs font-body text-foreground/80">
            Trusted by
          </span>
          <div className="flex items-center gap-8 md:gap-14 flex-wrap justify-center px-6">
            {PARTNERS.map((p) => (
              <span
                key={p}
                className="font-display italic text-xl md:text-2xl text-foreground/60 tracking-tight"
              >
                {p}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
