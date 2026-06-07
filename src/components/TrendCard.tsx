import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { Trend } from "@/lib/mock-trends";

interface TrendCardProps {
  trend: Trend;
  index: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  material: "text-emerald-400 border-emerald-400/30",
  regulação: "text-rose-400 border-rose-400/30",
  tecnologia: "text-cyan-400 border-cyan-400/30",
  mercado: "text-amber-400 border-amber-400/30",
  energia: "text-amber-400 border-amber-400/30",
  hídrico: "text-blue-400 border-blue-400/30",
};

function formatTime(iso?: string) {
  if (!iso) return "—";

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

  const categoryColor =
    CATEGORY_COLORS[trend.category] ??
    "text-primary border-primary/30";

  function handleMouseMove(
    e: React.MouseEvent<HTMLDivElement>
  ) {
    if (!cardRef.current || !glowRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();

    glowRef.current.style.setProperty(
      "--mx",
      `${e.clientX - rect.left}px`
    );

    glowRef.current.style.setProperty(
      "--my",
      `${e.clientY - rect.top}px`
    );
  }

  function handleMouseEnter() {
    if (glowRef.current) {
      glowRef.current.style.opacity = "1";
    }
  }

  function handleMouseLeave() {
    if (glowRef.current) {
      glowRef.current.style.opacity = "0";
    }
  }

  // Datas possíveis vindas do backend
  // @ts-ignore
  const publishedAt =
    trend.publishedAt ||
    trend.pubDate ||
    trend.pub_date ||
    trend.criado_em;

  return (
    <div
      ref={cardRef}
      className={cn(
        "group relative flex flex-col overflow-hidden border border-border bg-card p-6 transition-[border-color] duration-300",
        "hover:border-primary/40 animate-fade-up"
      )}
      style={{
        animationDelay: `${index * 60}ms`,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Corner brackets */}
      <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-primary/0 group-hover:border-primary/70 transition-all duration-300 group-hover:top-3 group-hover:left-3" />
      <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-primary/0 group-hover:border-primary/70 transition-all duration-300 group-hover:top-3 group-hover:right-3" />
      <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-primary/0 group-hover:border-primary/70 transition-all duration-300 group-hover:bottom-3 group-hover:left-3" />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-primary/0 group-hover:border-primary/70 transition-all duration-300 group-hover:bottom-3 group-hover:right-3" />

      {/* Linha topo */}
      <span className="absolute left-0 top-0 h-px w-0 bg-primary transition-all duration-500 group-hover:w-full" />

      {/* Glow */}
      <span
        ref={glowRef}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(circle 100px at var(--mx, 50%) var(--my, 50%), hsl(var(--primary) / .07), transparent)",
        }}
      />

      {/* Categoria */}
      <div
        className={cn(
          "text-mono mb-3 flex items-center gap-2 text-[9px] uppercase tracking-[0.2em]",
          categoryColor
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />

        {trend.category}
      </div>

      {/* Título */}
      <h3 className="text-display flex-1 text-sm font-bold leading-snug text-foreground">
        {trend.title}
      </h3>

      {/* Descrição */}
      <p className="text-mono mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {trend.description}
      </p>

      {/* Métricas */}
      {(trend as any).metricas?.items?.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(trend as any).metricas.items.slice(0, 3).map((m: any, i: number) => (
            <div key={i} className="border border-border bg-surface/40 p-2 text-center">
              <p className="text-primary text-sm font-bold leading-none mb-1">{m.valor}</p>
              <p className="text-mono text-[9px] text-muted-foreground leading-tight uppercase tracking-wide">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Relevância */}
      <div className="mt-5">
        <div className="text-mono mb-1.5 flex items-center justify-between text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
          <span>Curadoria</span>

          <span className="text-primary/70">
            {trend.relevance}%
          </span>
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

      {/* Footer */}
      <div className="text-mono mt-4 flex items-center justify-between text-[9px] text-muted-foreground/50">
        <span>
          {
            // @ts-ignore
            trend.fonte || trend.source
          }
        </span>

        {publishedAt && (
          <span>{formatTime(publishedAt)}</span>
        )}
      </div>
    </div>
  );
}

export function TrendCardSkeleton({
  index,
}: {
  index: number;
}) {
  return (
    <div
      className="animate-fade-up border border-border bg-card p-6"
      style={{
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div className="h-2.5 w-16 bg-surface animate-pulse" />

      <div className="mt-4 h-4 w-full bg-surface animate-pulse" />

      <div className="mt-2 h-4 w-3/4 bg-surface animate-pulse" />

      <div className="mt-3 h-3 w-full bg-surface animate-pulse" />

      <div className="mt-6 h-px w-full bg-surface animate-pulse" />

      <div className="mt-4 h-2.5 w-20 bg-surface animate-pulse" />
    </div>
  );
}