import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "motion/react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, BRAND_NAME, CTA_LABEL, CTA_HREF } from "@/lib/constants";

export function Navbar() {
  const [scrolled, setScrolled]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("");
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => {
    setScrolled(v > 40);
  });

  /* Track active section via IntersectionObserver */
  useEffect(() => {
    const sections = NAV_ITEMS.map(({ href }) =>
      document.querySelector(href) as HTMLElement | null
    ).filter(Boolean) as HTMLElement[];

    if (sections.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveHref(`#${e.target.id}`);
        });
      },
      { threshold: 0.4 }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <motion.header
        className="fixed z-50 left-1/2 -translate-x-1/2"
        animate={{ top: scrolled ? "8px" : "16px" }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: "min(1200px, calc(100vw - 32px))" }}
      >
        <div
          className={[
            "liquid-glass rounded-full px-2 py-2 flex items-center justify-between gap-4 transition-all duration-300",
            scrolled ? "backdrop-blur-xl" : "",
          ].join(" ")}
        >
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 pl-3 shrink-0">
            <img src="/logo.svg" className="h-6 w-auto" alt={BRAND_NAME} />
            <span className="font-display text-lg tracking-tight text-foreground">
              {BRAND_NAME}
            </span>
          </a>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className={[
                  "relative px-3.5 py-2 text-sm font-body transition-colors",
                  activeHref === href
                    ? "text-foreground"
                    : "text-foreground/70 hover:text-foreground",
                ].join(" ")}
              >
                {label}
                {activeHref === href && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                )}
              </a>
            ))}
          </nav>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-2">
            <Button variant="heroSolid" size="sm" className="hidden md:inline-flex rounded-full px-4 py-1.5 text-sm" asChild>
              <a href={CTA_HREF}>
                {CTA_LABEL} <ArrowUpRight className="ml-1 size-4" />
              </a>
            </Button>
            <button
              className="md:hidden liquid-glass rounded-full p-2 text-foreground/80 hover:text-foreground transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            className="fixed inset-0 z-40 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-background/90 backdrop-blur-2xl" />
            <nav className="relative z-10 flex flex-col items-center justify-center h-full gap-6">
              {NAV_ITEMS.map(({ label, href }, i) => (
                <motion.a
                  key={href}
                  href={href}
                  className="font-display uppercase text-4xl tracking-tight text-foreground hover:text-primary transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </motion.a>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: NAV_ITEMS.length * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <Button variant="hero" asChild>
                  <a href={CTA_HREF} onClick={() => setMobileOpen(false)}>
                    {CTA_LABEL} <ArrowUpRight className="ml-1 size-4" />
                  </a>
                </Button>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
