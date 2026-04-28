import { useRef } from "react";
import { Quote } from "lucide-react";
import { BlurText } from "@/components/BlurText";
import { TESTIMONIALS } from "@/lib/constants";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
};

function TestimonialCard({ quote, name, role }: Testimonial) {
  return (
    <div className="liquid-glass rounded-2xl p-7 w-[340px] md:w-[400px] shrink-0 flex flex-col gap-5">
      <Quote className="size-5 text-primary/70" />
      <p className="font-body text-foreground/85 italic leading-relaxed text-[15px] flex-1">
        "{quote}"
      </p>
      <div className="mt-auto flex items-center gap-3">
        <div className="size-9 rounded-full bg-gradient-to-br from-primary/60 to-secondary/60 shrink-0" />
        <div>
          <p className="font-body font-medium text-sm">{name}</p>
          <p className="font-body text-xs text-foreground/55 uppercase tracking-wide">{role}</p>
        </div>
      </div>
    </div>
  );
}

export function Testimonials() {
  const containerRef = useRef<HTMLDivElement>(null);

  const row1 = [...TESTIMONIALS, ...TESTIMONIALS];
  const row2 = [
    ...TESTIMONIALS.slice(4),
    ...TESTIMONIALS.slice(0, 4),
    ...TESTIMONIALS.slice(4),
    ...TESTIMONIALS.slice(0, 4),
  ];

  return (
    <section id="testimonials" className="relative py-28 md:py-40 overflow-hidden border-t border-border/40">
      <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)] mb-14">
        <div className="flex flex-col items-start gap-4">
          <span className="section-badge">Client voices</span>
          <BlurText
            text="They say it better than we ever could."
            className="font-display uppercase leading-[0.9] tracking-tight text-foreground max-w-[22ch]"
            style={{ fontSize: "clamp(32px, 4.5vw, 64px)" } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Marquee rows */}
      <div
        ref={containerRef}
        className="flex flex-col gap-5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] group"
      >
        {/* Row 1 — left */}
        <div className="flex gap-5 w-max animate-marquee group-hover:pause">
          {row1.map((t, i) => (
            <TestimonialCard key={i} {...t} />
          ))}
        </div>

        {/* Row 2 — right */}
        <div className="flex gap-5 w-max animate-marquee-rev group-hover:pause">
          {row2.map((t, i) => (
            <TestimonialCard key={i} {...t} />
          ))}
        </div>
      </div>
    </section>
  );
}
