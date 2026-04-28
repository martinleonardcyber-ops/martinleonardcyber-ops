import { motion } from "motion/react";
import { MessageSquare } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { BlurText } from "@/components/BlurText";
import { FAQ_ITEMS } from "@/lib/constants";

export function Faq() {
  return (
    <section id="faq" className="relative py-28 md:py-40 border-t border-border/40">
      <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)]">
        <div className="grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] gap-16">
          {/* Left — sticky heading */}
          <div className="md:sticky md:top-24 md:self-start">
            <span className="section-badge">FAQ</span>

            <BlurText
              text="Frequently asked."
              className="font-display uppercase leading-[0.9] tracking-tight text-foreground mt-4 max-w-[14ch]"
              style={{ fontSize: "clamp(36px, 4.5vw, 64px)" } as React.CSSProperties}
            />

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="font-body text-foreground/60 leading-relaxed mt-5 max-w-[36ch]"
            >
              Can't find what you're looking for? Reach out directly — our team responds within the hour.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8"
            >
              <Button variant="heroGlass" asChild>
                <a href="mailto:hello@atelier-move.com">
                  <MessageSquare className="mr-1.5 size-4" />
                  Contact us
                </a>
              </Button>
            </motion.div>
          </div>

          {/* Right — accordion */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <Accordion type="single" collapsible>
              {FAQ_ITEMS.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="border-border/40"
                >
                  <AccordionTrigger className="font-display uppercase text-lg md:text-xl tracking-tight py-6 hover:no-underline text-left data-[state=open]:text-primary transition-colors">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="font-body text-foreground/70 text-[15px] leading-relaxed pb-6 max-w-[60ch]">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
