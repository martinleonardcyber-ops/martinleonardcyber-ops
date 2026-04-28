/* ─── Frame sequence config ─────────────────────────────────────────────────── */
export const FRAMES_PATH = "/frames";
export const FRAME_COUNT = 240;
export const FRAME_EXT = "jpg" as const;

/* ─── Brand ─────────────────────────────────────────────────────────────────── */
export const BRAND_NAME = "Atelier";
export const BRAND_TAGLINE = "Built for what's next";

/* ─── Navigation ────────────────────────────────────────────────────────────── */
export const NAV_ITEMS = [
  { label: "Services", href: "#services" },
  { label: "Process",  href: "#process" },
  { label: "Why Us",   href: "#why" },
  { label: "FAQ",      href: "#faq" },
] as const;

export const CTA_LABEL = "Get a Quote";
export const CTA_HREF  = "#cta";

/* ─── Hero ──────────────────────────────────────────────────────────────────── */
export const HERO_HEADLINE       = "Move, quietly.";
export const HERO_SUB            = "From studio to penthouse. The art of relocation, redefined by people who take it personally.";
export const HERO_CTA_PRIMARY    = "Get a quote";
export const HERO_CTA_SECONDARY  = "Watch the film";

/* ─── Partners ──────────────────────────────────────────────────────────────── */
export const PARTNERS = ["Christie's", "Sotheby's", "Piaget", "LVMH", "Hermès", "Patek Philippe"];

/* ─── Services ──────────────────────────────────────────────────────────────── */
export const SERVICES = [
  {
    icon: "Truck",
    title: "Residential Moving",
    body: "White-glove door-to-door relocation for homes of every scale — from studio apartment to private estate.",
  },
  {
    icon: "Package",
    title: "Premium Packing",
    body: "Every object wrapped as if it is irreplaceable. Because to you, it is. Professional-grade materials throughout.",
  },
  {
    icon: "Warehouse",
    title: "Secure Storage",
    body: "Climate-controlled, 24/7-monitored facilities for short or extended stays. Access by appointment, always.",
  },
  {
    icon: "Globe",
    title: "International",
    body: "Border-to-border logistics with full customs expertise, real-time tracking, and a single point of contact.",
  },
  {
    icon: "Building2",
    title: "Commercial",
    body: "Office relocations executed with surgical precision. Planned for zero downtime and seamless day-one readiness.",
  },
  {
    icon: "Sparkles",
    title: "Bespoke",
    body: "Art, wine, antiques, grand pianos. Handled by specialists who understand the weight — and the worth — of value.",
  },
] as const;

/* ─── Why Us ────────────────────────────────────────────────────────────────── */
export const REASONS = [
  {
    icon: "ShieldCheck",
    title: "Fully Insured",
    body: "Comprehensive coverage on every item, every move. No fine print, no exceptions, no surprises.",
  },
  {
    icon: "Clock",
    title: "Always On Time",
    body: "Our punctuality rate is tracked, published, and taken personally by every member of our team.",
  },
  {
    icon: "Leaf",
    title: "Eco-Conscious",
    body: "Carbon-offset logistics with a fleet actively transitioning to electric. Moving forward, in every sense.",
  },
  {
    icon: "Award",
    title: "Certified Excellence",
    body: "Certified by the International Association of Movers. Audited annually. Proud of the standard.",
  },
] as const;

/* ─── Process ───────────────────────────────────────────────────────────────── */
export const PROCESS_STEPS = [
  {
    n: "1",
    title: "Consultation",
    body: "We listen first. A dedicated advisor maps every detail before anything moves.",
  },
  {
    n: "2",
    title: "Tailored Plan",
    body: "A bespoke timeline, team, and vehicle plan assembled specifically for your situation.",
  },
  {
    n: "3",
    title: "Move Day",
    body: "Our crew arrives equipped, briefed, and ready. You supervise — or you don't. Either works.",
  },
  {
    n: "4",
    title: "Settlement",
    body: "We don't leave until you're at home. Post-move follow-up included as standard.",
  },
] as const;

/* ─── Stats ─────────────────────────────────────────────────────────────────── */
export const STATS = [
  { value: "2500",  suffix: "+", label: "Relocations" },
  { value: "98",    suffix: "%", label: "Client Satisfaction" },
  { value: "24",    suffix: "h", label: "Quote Turnaround" },
  { value: "15",    suffix: " yrs", label: "In Business" },
] as const;

export const STATS_BG_VIDEO: string = "";  // replace with MP4/HLS URL — empty = gradient fallback

/* ─── Testimonials ──────────────────────────────────────────────────────────── */
export const TESTIMONIALS = [
  {
    quote: "The most professional moving team I have ever worked with. Not a single item damaged, not a single minute late.",
    name: "Sophie Marchand",
    role: "Private Client, Geneva",
  },
  {
    quote: "We moved our entire 18-person office in a single weekend. Monday morning, everything was perfect. Extraordinary.",
    name: "James Thornton",
    role: "CEO, Thornton Capital",
  },
  {
    quote: "They handled my grandmother's antiques with a reverence that genuinely moved me. This is a company that understands care.",
    name: "Isabelle Fontaine",
    role: "Private Client, Zurich",
  },
  {
    quote: "The quote arrived in under two hours, the team in under two days. When you need to move fast, they deliver.",
    name: "Marcus Reinholt",
    role: "Director, Reinholt Properties",
  },
  {
    quote: "Five international moves in eight years. Atelier is the only company I have ever called back.",
    name: "Priya Mehta",
    role: "Private Client, London → Dubai",
  },
  {
    quote: "From the first call to the final placement of every painting, the communication was flawless. Truly premium service.",
    name: "Cédric Vuilleumier",
    role: "Art Collector, Basel",
  },
  {
    quote: "Our Zurich-to-Singapore relocation involved 340 boxes, a grand piano, and a wine collection. Zero issues.",
    name: "David Lim",
    role: "Private Client, Singapore",
  },
  {
    quote: "I have referred Atelier to four friends. Every single one has become a repeat client. That tells you everything.",
    name: "Anne-Claire Dupont",
    role: "Interior Architect, Paris",
  },
] as const;

/* ─── FAQ ───────────────────────────────────────────────────────────────────── */
export const FAQ_ITEMS = [
  {
    q: "How far in advance should I book?",
    a: "For local moves, two to three weeks is ideal. For international relocations, we recommend six to eight weeks to allow time for customs documentation and logistics planning.",
  },
  {
    q: "Are my belongings insured during the move?",
    a: "Yes. All moves include comprehensive insurance coverage from the moment we arrive to the moment the last item is placed. Additional declared-value coverage is available on request.",
  },
  {
    q: "Do you handle international customs?",
    a: "We do. Our logistics team manages all customs documentation, duty calculations, and border coordination for over 40 countries. You receive a single point of contact throughout.",
  },
  {
    q: "Can you move art, antiques, and wine?",
    a: "Specialist handling is one of our core services. We work with certified art handlers and use museum-grade crating for high-value objects. Wine is transported in temperature-controlled vehicles.",
  },
  {
    q: "What if my new address isn't ready?",
    a: "Our climate-controlled storage facilities can hold your belongings for any duration — days, months, or longer. Access is available by appointment seven days a week.",
  },
  {
    q: "Do you offer packing services?",
    a: "Full-service packing is included in every Bespoke package and available as an add-on for all other tiers. We use professional-grade materials and every box is labelled and inventoried.",
  },
] as const;

/* ─── CTA / Footer ──────────────────────────────────────────────────────────── */
export const CTA_BG_VIDEO: string  = "";  // replace with MP4/HLS URL — empty = gradient fallback
export const CTA_HEADLINE  = "Ready to move?";
export const CTA_SUB       = "One consultation. One plan. One perfect move.";

export const FOOTER_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms",   href: "/terms" },
  { label: "Careers", href: "/careers" },
  { label: "Contact", href: "/contact" },
] as const;

export const COPYRIGHT = `© ${new Date().getFullYear()} Atelier Move Ltd. All rights reserved.`;
