import { motion, useInView } from "motion/react";
import { useRef } from "react";

type Tag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";

type Props = {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  startDelay?: number;
  as?: Tag;
};

export function BlurText({
  text,
  className = "",
  style,
  delay = 0.07,
  startDelay = 0,
  as: Tag = "h2",
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const words = text.split(" ");

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={className} style={style}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          className="inline-block will-change-[filter,transform,opacity]"
          initial={{ filter: "blur(10px)", opacity: 0, y: 24 }}
          animate={inView ? { filter: "blur(0px)", opacity: 1, y: 0 } : undefined}
          transition={{
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
            delay: startDelay + i * delay,
          }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </Tag>
  );
}
