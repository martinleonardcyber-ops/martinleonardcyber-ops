import { motion } from "motion/react";
import {
  Truck, Package, Warehouse, Globe, Building2, Sparkles, ArrowUpRight,
} from "lucide-react";
import { BlurText } from "@/components/BlurText";
import { SERVICES } from "@/lib/constants";

const iconMap = { Truck, Package, Warehouse, Globe, Building2, Sparkles } as const;
type IconKey = keyof typeof iconMap;

/* Per-card grid class overrides */
const cardGrid = [
  "md:row-span-2 md:col-span-1 min-h-[480px]",   // 0 — tall
  "md:col-span-1 min-h-[228px]",                  // 1 — small
  "md:col-span-1 min-h-[228px]",                  // 2 — small
  "md:col-span-2 min-h-[228px]",                  // 3 — wide
  "md:col-span-1 min-h-[228px]",                  // 4 — small
  "md:col-span-3 min-h-[200px]",                  // 5 — full-width
];

export function ServicesBento() {
  return (
    <section id="services" className="relative py-28 md:py-40">
      <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)]">
        {/* Section intro */}
        <div className="flex flex-col items-start gap-4 mb-14">
          <span className="section-badge">What we do</span>
          <BlurText
            text="Everything that moves. Under one roof."
            className="font-display uppercase leading-[0.9] tracking-tight text-foreground max-w-[20ch]"
            style={{ fontSize: "clamp(36px, 5vw, 72px)" } as React.CSSProperties}
          />
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-body text-foreground/60 max-w-lg leading-relaxed"
          >
            Six specialist disciplines. One seamlessly coordinated team. Every detail handled so you don't have to think about it.
          </motion.p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {SERVICES.map((service, idx) => {
            const Icon = iconMap[service.icon as IconKey];
            return (
              <motion.div
                key={service.title}
                className={[
                  "liquid-glass rounded-2xl p-6 relative overflow-hidden group cursor-pointer",
                  cardGrid[idx],
                ].join(" ")}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  delay: (idx % 3) * 0.07,
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -4 }}
              >
                {/* Icon */}
                <div className="liquid-glass-strong rounded-full w-11 h-11 flex items-center justify-center mb-5">
                  {Icon && <Icon className="size-5 text-foreground" />}
                </div>

                {/* Title */}
                <h3 className="font-display uppercase text-2xl md:text-3xl leading-[0.95] tracking-tight mb-3 max-w-[18ch]">
                  {service.title}
                </h3>

                {/* Body */}
                <p className="font-body text-sm text-foreground/65 max-w-[38ch] leading-relaxed">
                  {service.body}
                </p>

                {/* Hover arrow */}
                <ArrowUpRight className="absolute top-6 right-6 size-5 text-foreground/30 group-hover:text-foreground/80 transition-colors duration-200" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
