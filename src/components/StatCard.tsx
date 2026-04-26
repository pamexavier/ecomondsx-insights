import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  index: number;
  label: string;
  value: string;
  hint?: string;
  live?: boolean;
}

function parseNumeric(val: string): { prefix: string; num: number; suffix: string } | null {
  const match = val.match(/^([^0-9]*)([0-9]+)([^0-9]*)$/);
  if (!match) return null;
  return { prefix: match[1], num: parseInt(match[2], 10), suffix: match[3] };
}

export function StatCard({ index, label, value, hint, live }: StatCardProps) {
  const [displayed, setDisplayed] = useState("—");
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!value || value === "—") {
      setDisplayed("—");
      return;
    }

    const parsed = parseNumeric(value);
    if (!parsed) {
      // valor não numérico (ex: "14:32") — exibe direto
      setDisplayed(value);
      return;
    }

    const { prefix, num, suffix } = parsed;
    const duration = 1200 + index * 120;
    const startTime = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(eased * num);
      setDisplayed(`${prefix}${current}${suffix}`);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, index]);

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-border bg-card px-5 py-4",
        "animate-fade-up"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Scan line */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px animate-scan"
        style={{
          background:
            "linear-gradient(90deg, transparent, hsl(var(--primary) / .6), transparent)",
        }}
      />

      <div className="text-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>

      <div className="text-display mt-2 text-3xl font-extrabold tabular-nums">
        {displayed}
        {live && (
          <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot align-middle" />
        )}
      </div>

      {hint && (
        <div className="text-mono mt-1.5 text-[10px] text-primary/50">
          {hint}
        </div>
      )}
    </div>
  );
}

export function StatCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="animate-fade-up border border-border bg-card px-5 py-4"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="h-3 w-24 bg-surface animate-pulse" />
      <div className="mt-3 h-8 w-16 bg-surface animate-pulse" />
      <div className="mt-2 h-2.5 w-20 bg-surface animate-pulse" />
    </div>
  );
}
