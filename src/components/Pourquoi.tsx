import { motion } from "motion/react";
import { ShieldCheck, Clock, Leaf, Award } from "lucide-react";
import { BlurText } from "@/components/BlurText";
import { REASONS } from "@/lib/constants";

const iconMap = { ShieldCheck, Clock, Leaf, Award } as const;
type IconKey = keyof typeof iconMap;

export function Pourquoi() {
  return (
    <section id="why" className="relative py-28 md:py-40 border-t border-border/40">
      <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)]">
        {/* Section intro — centred */}
        <div className="flex flex-col items-center text-center gap-4 mb-16">
          <span className="section-badge">Why Atelier</span>
          <BlurText
            text="The standard, not the exception."
            className="font-display uppercase leading-[0.9] tracking-tight text-foreground max-w-[22ch]"
            style={{ fontSize: "clamp(36px, 5vw, 72px)" } as React.CSSProperties}
          />
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-body text-foreground/60 max-w-md leading-relaxed"
          >
            Four commitments that underpin every move we make — measurable, auditable, and non-negotiable.
          </motion.p>
        </div>

        {/* 4-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {REASONS.map((reason, idx) => {
            const Icon = iconMap[reason.icon as IconKey];
            return (
              <motion.div
                key={reason.title}
                className="liquid-glass rounded-2xl p-7 flex flex-col gap-5 min-h-[260px]"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  delay: idx * 0.08,
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {/* Icon */}
                <div className="liquid-glass-strong rounded-full w-11 h-11 flex items-center justify-center">
                  {Icon && <Icon className="size-5 text-foreground" />}
                </div>

                {/* Title */}
                <h3 className="font-display uppercase text-xl tracking-tight">
                  {reason.title}
                </h3>

                {/* Body */}
                <p className="font-body text-sm text-foreground/65 leading-relaxed">
                  {reason.body}
                </p>

                {/* Bottom accent */}
                <div className="mt-auto h-px w-10 bg-gradient-to-r from-primary to-transparent" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
