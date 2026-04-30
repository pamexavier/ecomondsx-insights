import { useState } from "react";

interface KeywordMarqueeProps {
  keywords: string[];
  duration?: number;
  activeKeyword?: string | null;
  onSelect?: (kw: string) => void;
}

export function KeywordMarquee({ keywords, duration = 45, activeKeyword, onSelect }: KeywordMarqueeProps) {
  const [paused, setPaused] = useState(false);
  const items = [...keywords, ...keywords];

  return (
    <div
      className="relative overflow-hidden border-y border-border py-2.5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span
        className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16"
        style={{ background: "linear-gradient(90deg, oklch(0.17 0.008 152), transparent)" }}
      />
      <span
        className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16"
        style={{ background: "linear-gradient(-90deg, oklch(0.17 0.008 152), transparent)" }}
      />

      <div
        className="flex w-max gap-6"
        style={{
          animation: `marquee ${duration}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {items.map((kw, i) => {
          const isActive = activeKeyword === kw;
          return (
            <span
              key={`${kw}-${i}`}
              onClick={() => onSelect?.(kw)}
              className={`text-mono shrink-0 cursor-pointer border px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] transition-colors
                ${isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary/30 text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground"
                }`}
            >
              #{kw}
            </span>
          );
        })}
      </div>
    </div>
  );
}