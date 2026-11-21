import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { Trend } from "@/lib/mock-trends";

interface TrendCardProps {
  trend: Trend;
  index: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  material: "text-emerald-400",
  regulação: "text-rose-400",
  tecnologia: "text-cyan-400",
  mercado: "text-amber-400",
  energia: "text-amber-400",
  hídrico: "text-blue-400",
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
    CATEGORY_COLORS[trend.category] ?? "text-primary";

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current || !glowRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();

    glowRef.current.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    glowRef.current.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  function handleMouseEnter() {
    if (glowRef.current) glowRef.current.style.opacity = "1";
  }

  function handleMouseLeave() {
    if (glowRef.current) glowRef.current.style.opacity = "0";
  }

  // Datas possíveis vindas do backend
  // @ts-ignore
  const publishedAt =
    trend.publishedAt || trend.pubDate || trend.pub_date || trend.criado_em;

  return (
    <div
      ref={cardRef}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card p-6 transition-[border-color,transform] duration-300",
        "hover:border-primary/30 hover:-translate-y-0.5 animate-fade-up"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Linha de destaque no topo — mantida, é sutil e funciona bem */}
      <span className="absolute left-0 top-0 h-px w-0 bg-primary transition-all duration-500 group-hover:w-full" />

      {/* Glow que segue o mouse — o efeito que você curtiu, intocado */}
      <span
        ref={glowRef}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(circle 140px at var(--mx, 50%) var(--my, 50%), hsl(var(--primary) / .06), transparent)",
        }}
      />

      {/* Categoria — label continua em mono/uppercase (é um dado, faz
          sentido), mas com tracking mais contido e sem o dot pulsante
          repetido em toda a grade */}
      <div
        className={cn(
          "text-mono mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider",
          categoryColor
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {trend.category}
      </div>

      <h3 className="text-display flex-1 text-base font-bold leading-snug text-foreground">
        {trend.title}
      </h3>

      {/* Descrição — agora usa a fonte sans (corpo de texto legível),
          não mais mono */}
      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {trend.description}
      </p>

      {/* Métricas */}
      {(trend as any).metricas?.items?.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(trend as any).metricas.items.slice(0, 3).map((m: any, i: number) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-surface/40 p-2 text-center"
            >
              <p className="text-primary text-sm font-bold leading-none mb-1">
                {m.valor}
              </p>
              <p className="text-mono text-[9px] text-muted-foreground leading-tight uppercase tracking-wide">
                {m.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Relevância */}
      <div className="mt-5">
        <div className="text-mono mb-1.5 flex items-center justify-between text-[9px] uppercase tracking-wider text-muted-foreground">
          <span>Curadoria</span>
          <span className="text-primary/70">{trend.relevance}%</span>
        </div>

        <div className="h-px w-full bg-border rounded-full overflow-hidden">
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
      <div className="text-mono mt-4 flex items-center justify-between text-[10px] text-muted-foreground/60">
        <span>
          {
            // @ts-ignore
            trend.fonte || trend.source
          }
        </span>
        {publishedAt && <span>{formatTime(publishedAt)}</span>}
      </div>
    </div>
  );
}

export function TrendCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="animate-fade-up rounded-3xl border border-border bg-card p-6"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="h-2.5 w-16 rounded-full bg-surface animate-pulse" />
      <div className="mt-4 h-4 w-full rounded-md bg-surface animate-pulse" />
      <div className="mt-2 h-4 w-3/4 rounded-md bg-surface animate-pulse" />
      <div className="mt-3 h-3 w-full rounded-md bg-surface animate-pulse" />
      <div className="mt-6 h-px w-full bg-surface animate-pulse" />
      <div className="mt-4 h-2.5 w-20 rounded-full bg-surface animate-pulse" />
    </div>
  );
}