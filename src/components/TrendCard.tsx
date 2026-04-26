import { useRef } from "react";
import { cn } from "@/lib/utils";

export interface Trend {
  id: string;
  tag: string;
  title: string;
  excerpt?: string;
  source: string;
  relevance: number; // 0-100
  publishedAt: string;
  url?: string;
}

interface TrendCardProps {
  trend: Trend;
  index: number;
}

const TAG_COLORS: Record<string, string> = {
  energia: "text-amber-400 border-amber-400/30",
  hídrico: "text-blue-400 border-blue-400/30",
  materiais: "text-emerald-400 border-emerald-400/30",
  certificação: "text-violet-400 border-violet-400/30",
  tecnologia: "text-cyan-400 border-cyan-400/30",
  regulação: "text-rose-400 border-rose-400/30",
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function TrendCard({ trend, index }: TrendCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);

  const tagColor = TAG_COLORS[trend.tag.toLowerCase()] ?? "text-primary border-primary/30";

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current || !glowRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    glowRef.current.style.setProperty("--mx", `${x}px`);
    glowRef.current.style.setProperty("--my", `${y}px`);
  }

  function handleMouseEnter() {
    if (glowRef.current) glowRef.current.style.opacity = "1";
  }

  function handleMouseLeave() {
    if (glowRef.current) glowRef.current.style.opacity = "0";
  }

  const content = (
    <div
      ref={cardRef}
      className={cn(
        "group relative flex flex-col overflow-hidden border border-border bg-card p-6 transition-[border-color] duration-300",
        "hover:border-primary/40",
        "animate-fade-up"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Linha de acento no topo */}
      <span className="absolute left-0 top-0 h-px w-0 bg-primary transition-all duration-500 group-hover:w-full" />

      {/* Glow que segue o mouse */}
      <span
        ref={glowRef}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(circle 100px at var(--mx, 50%) var(--my, 50%), hsl(var(--primary) / .07), transparent)",
        }}
      />

      {/* Tag */}
      <div
        className={cn(
          "text-mono mb-3 flex items-center gap-2 text-[9px] uppercase tracking-[0.2em]",
          tagColor
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />
        {trend.tag}
      </div>

      {/* Título */}
      <h3 className="text-display flex-1 text-sm font-bold leading-snug text-foreground">
        {trend.title}
      </h3>

      {/* Excerpt se existir */}
      {trend.excerpt && (
        <p className="text-mono mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {trend.excerpt}
        </p>
      )}

      {/* Barra de relevância */}
      <div className="mt-5">
        <div className="text-mono mb-1.5 flex items-center justify-between text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
          <span>Relevância IA</span>
          <span className="text-primary/70">{trend.relevance}%</span>
        </div>
        <div className="h-px w-full bg-border">
          <div
            className="h-px bg-primary transition-all duration-1000"
            style={{
              width: `${trend.relevance}%`,
              transitionDelay: `${index * 60 + 400}ms`,
            }}
          />
        </div>
      </div>

      {/* Rodapé */}
      <div className="text-mono mt-4 flex items-center justify-between text-[9px] text-muted-foreground/50">
        <span>{trend.source}</span>
        <span>{formatTime(trend.publishedAt)}</span>
      </div>
    </div>
  );

  if (trend.url) {
    return (
      <a href={trend.url} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  return content;
}

export function TrendCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="animate-fade-up border border-border bg-card p-6"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="h-2.5 w-16 bg-surface animate-pulse" />
      <div className="mt-4 h-4 w-full bg-surface animate-pulse" />
      <div className="mt-2 h-4 w-3/4 bg-surface animate-pulse" />
      <div className="mt-6 h-px w-full bg-surface animate-pulse" />
      <div className="mt-4 flex justify-between">
        <div className="h-2.5 w-20 bg-surface animate-pulse" />
        <div className="h-2.5 w-10 bg-surface animate-pulse" />
      </div>
    </div>
  );
}
