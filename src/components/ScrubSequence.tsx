import { useEffect, useRef } from "react";

export type ScrubSequenceProps = {
  framesPath: string;
  frameCount: number;
  ext?: "jpg" | "webp";
  className?: string;
  scrollTargetRef: React.RefObject<HTMLElement | null>;
};

const pad4 = (n: number) => String(n).padStart(4, "0");

export function ScrubSequence({
  framesPath,
  frameCount,
  ext = "jpg",
  className,
  scrollTargetRef,
}: ScrubSequenceProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const imagesRef  = useRef<HTMLImageElement[]>([]);
  const rafRef     = useRef<number | null>(null);
  const visible    = useRef(true);
  const prefersReduced = useRef(
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  /* ── Preload all frames ──────────────────────────────────────────────── */
  useEffect(() => {
    const imgs: HTMLImageElement[] = [];
    const urls = Array.from(
      { length: frameCount },
      (_, i) => `${framesPath}/frame_${pad4(i + 1)}.${ext}`
    );

    // Priority-load frame 1 for immediate first paint
    const first = new Image();
    first.src = urls[0];
    (first as HTMLImageElement & { fetchpriority?: string }).fetchpriority = "high";
    imgs[0] = first;

    urls.slice(1).forEach((src, i) => {
      const img = new Image();
      img.src = src;
      imgs[i + 1] = img;
    });

    imagesRef.current = imgs;
  }, [framesPath, frameCount, ext]);

  /* ── Resize canvas to viewport with dpr ─────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width  = "100%";
      canvas.style.height = "100%";
      drawFrame(currentIndex());
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Pause rAF when hero is off-screen ──────────────────────────────── */
  useEffect(() => {
    const el = scrollTargetRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { visible.current = entry.isIntersecting; },
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [scrollTargetRef]);

  /* ── rAF scroll loop ─────────────────────────────────────────────────── */
  useEffect(() => {
    const tick = () => {
      if (visible.current && !prefersReduced.current) {
        drawFrame(currentIndex());
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Static fallback for reduced motion ─────────────────────────────── */
  useEffect(() => {
    if (prefersReduced.current) {
      const mid = Math.floor(frameCount / 2);
      const img = imagesRef.current[mid];
      if (!img) return;
      if (img.complete) drawImage(img);
      else img.addEventListener("load", () => drawImage(img), { once: true });
    }
  }, [frameCount]);

  const currentIndex = () => {
    const el = scrollTargetRef.current;
    if (!el) return 0;
    const rect  = el.getBoundingClientRect();
    const total = el.offsetHeight - window.innerHeight;
    const progress = total > 0
      ? Math.min(1, Math.max(0, -rect.top / total))
      : 0;
    return Math.min(frameCount - 1, Math.floor(progress * (frameCount - 1)));
  };

  const drawFrame = (idx: number) => {
    const img = imagesRef.current[idx];
    if (img && img.complete && img.naturalWidth > 0) drawImage(img);
  };

  const drawImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cw = canvas.width,  ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  return (
    <>
      <p className="sr-only">
        Cinematic scroll animation showing a high-end relocation in progress.
      </p>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={className}
        style={{ transform: "translateZ(0)", willChange: "contents" }}
      />
    </>
  );
}
