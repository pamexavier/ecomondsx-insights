import type { Trend } from "@/lib/mock-trends";

interface Props {
  trend: Trend;
  index: number;
}

export function TrendCard({ trend, index }: Props) {
  const num = String(index + 1).padStart(2, "0");
  return (
    <article
      className="group relative overflow-hidden bg-card border border-border p-6 min-h-[260px] flex flex-col transition-all duration-300 hover:border-primary hover:bg-surface animate-fade-up"
      style={{ animationDelay: `${index * 80 + 200}ms` }}
    >
      {/* Top glow line on hover */}
      <span className="absolute top-0 left-0 h-px w-0 bg-primary transition-all duration-500 group-hover:w-full" />

      {/* Watermark number */}
      <span
        className="text-display pointer-events-none absolute -right-2 -bottom-6 text-[120px] font-extrabold leading-none text-foreground/[0.04] select-none"
        aria-hidden
      >
        {num}
      </span>

      <div className="flex items-center justify-between text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="border border-border-strong px-2 py-1 text-primary">
          {trend.category}
        </span>
        <span>#{num}</span>
      </div>

      <h3 className="text-display mt-5 text-xl font-bold leading-tight text-foreground">
        {trend.title}
      </h3>

      <p className="text-mono mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">
        {trend.description}
      </p>

      <div className="mt-auto pt-6 relative z-10">
        <div className="flex items-center justify-between text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          <span>Relevância</span>
          <span className="text-primary">{trend.relevance}%</span>
        </div>
        <div className="h-px w-full bg-border relative overflow-hidden">
          <span
            className="absolute inset-y-0 left-0 bg-primary"
            style={{ width: `${trend.relevance}%` }}
          />
        </div>
      </div>
    </article>
  );
}

export function TrendCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="bg-card border border-border p-6 min-h-[260px] flex flex-col animate-pulse"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex justify-between">
        <div className="h-5 w-20 bg-surface" />
        <div className="h-5 w-8 bg-surface" />
      </div>
      <div className="mt-5 h-6 w-4/5 bg-surface" />
      <div className="mt-2 h-6 w-3/5 bg-surface" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full bg-surface" />
        <div className="h-3 w-11/12 bg-surface" />
        <div className="h-3 w-2/3 bg-surface" />
      </div>
      <div className="mt-auto h-px w-full bg-surface" />
    </div>
  );
}
