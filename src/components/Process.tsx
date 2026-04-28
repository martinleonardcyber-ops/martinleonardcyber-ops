import { motion } from "motion/react";
import { BlurText } from "@/components/BlurText";
import { PROCESS_STEPS } from "@/lib/constants";

export function Process() {
  return (
    <section id="process" className="relative py-28 md:py-40 border-t border-border/40 overflow-hidden">
      <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)]">
        {/* Section intro */}
        <div className="flex flex-col items-start gap-4 mb-16">
          <span className="section-badge">How it works</span>
          <BlurText
            text="Four steps to complete."
            className="font-display uppercase leading-[0.9] tracking-tight text-foreground max-w-[16ch]"
            style={{ fontSize: "clamp(36px, 5vw, 72px)" } as React.CSSProperties}
          />
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-body text-foreground/60 max-w-md leading-relaxed"
          >
            Every Atelier move follows a precision-engineered sequence — no guesswork, no gaps, no surprises.
          </motion.p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 relative">
          {PROCESS_STEPS.map((step, idx) => (
            <motion.div
              key={step.n}
              className="relative px-0 md:px-8 py-10 md:py-14 flex flex-col gap-4 items-start border-b md:border-b-0 border-border/40 last:border-b-0"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                delay: idx * 0.1,
                duration: 0.65,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {/* Vertical separator between steps (desktop) */}
              {idx < PROCESS_STEPS.length - 1 && (
                <div className="hidden md:block absolute top-1/4 right-0 w-px h-1/2 bg-gradient-to-b from-transparent via-border to-transparent" />
              )}

              {/* Big number */}
              <span
                className="font-display leading-none text-primary/20 -mb-4 select-none"
                style={{ fontSize: "clamp(80px, 10vw, 140px)" }}
              >
                {step.n.padStart(2, "0")}
              </span>

              {/* Title */}
              <h3 className="font-display uppercase text-2xl md:text-3xl tracking-tight">
                {step.title}
              </h3>

              {/* Body */}
              <p className="font-body text-sm text-foreground/65 leading-relaxed max-w-[28ch]">
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
