import { useRef } from "react";

// ─── tipos ────────────────────────────────────────────────────────────────────

export interface WellnessNoticia {
  id: string;
  titulo: string;
  titulo_pt?: string;
  resumo_executivo?: string;
  resumo_pt?: string;
  categoria?: string;
  certificacoes?: string[];
  fonte?: string;
  link?: string;
  pub_date?: string;
  atualizado_em?: string;
  score_tecnico?: number;
  metricas?: Record<string, unknown>;
  o_que_e?: string;
  impacto_real?: string;
  como_aplicar?: string;
  contras?: string;
  quando_usar?: string;
  motivo?: string;
  subcategorias?: string[];
  potencial_valorizacao?: string;
  stakeholders?: string[];
  nivel_maturidade?: string;
}

// ─── mapa de cores por categoria ─────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  biofilia:           "text-teal-400 border-teal-400/30",
  "qualidade do ar":  "text-cyan-400 border-cyan-400/30",
  acústica:           "text-violet-400 border-violet-400/30",
  "saúde mental":     "text-emerald-400 border-emerald-400/30",
  iluminação:         "text-amber-400 border-amber-400/30",
  "conforto térmico": "text-orange-400 border-orange-400/30",
  certificações:      "text-teal-400 border-teal-400/30",
  água:               "text-blue-400 border-blue-400/30",
  nutrição:           "text-lime-400 border-lime-400/30",
  movimento:          "text-pink-400 border-pink-400/30",
};

function formatTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

// ─── WellnessCard ─────────────────────────────────────────────────────────────

interface WellnessCardProps {
  noticia: WellnessNoticia;
  index: number;
  onClick: () => void;
}

export function WellnessCard({ noticia, index, onClick }: WellnessCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);

  // Blindagem contra categorias nulas ou arrays
  const catString = String(noticia.categoria || "");
  const categoryColor = CATEGORY_COLORS[catString.toLowerCase()] ?? "text-teal-400 border-teal-400/30";

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

  const titulo = noticia.titulo_pt || noticia.titulo;
  const descricao = noticia.resumo_executivo || noticia.resumo_pt;
  const data = noticia.pub_date || noticia.atualizado_em;

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={[
        "group relative flex flex-col overflow-hidden cursor-pointer",
        "border border-wh-border-soft bg-wh-surface p-6",
        "transition-all duration-300 hover:-translate-y-1 hover:border-wh-primary/50",
        "animate-fade-up"
      ].join(" ")}
      style={{ animationDelay: `${index * 60}ms` }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Corner brackets */}
      <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-wh-primary/0 group-hover:border-wh-primary/60 transition-all duration-300 group-hover:top-3 group-hover:left-3" />
      <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-wh-primary/0 group-hover:border-wh-primary/60 transition-all duration-300 group-hover:top-3 group-hover:right-3" />
      <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-wh-primary/0 group-hover:border-wh-primary/60 transition-all duration-300 group-hover:bottom-3 group-hover:left-3" />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-wh-primary/0 group-hover:border-wh-primary/60 transition-all duration-300 group-hover:bottom-3 group-hover:right-3" />

      <span className="absolute left-0 top-0 h-px w-0 bg-wh-primary transition-all duration-500 group-hover:w-full" />

      {/* Glow com cor wh-primary */}
      <span
        ref={glowRef}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(circle 100px at var(--mx, 50%) var(--my, 50%), rgba(94,234,212,0.07), transparent)",
        }}
      />

      {/* Categoria */}
      <div
        className={[
          "font-mono mb-3 flex items-center gap-2 text-[9px] uppercase tracking-[0.2em]",
          categoryColor
        ].join(" ")}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
        {noticia.categoria}
      </div>

      {/* Título */}
      <h3 className="font-display flex-1 text-sm font-bold leading-snug text-wh-text">
        {titulo}
      </h3>

      {/* Descrição */}
      <p className="font-mono mt-3 line-clamp-2 text-xs leading-relaxed text-wh-muted">
        {descricao}
      </p>

      {/* Certificações */}
      {(noticia.certificacoes?.length ?? 0) > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {noticia.certificacoes!.map((c) => (
            <span
              key={c}
              className="font-mono text-[8px] uppercase tracking-[0.15em] text-wh-primary border border-wh-primary/30 px-2 py-0.5"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Stakeholders & Maturidade */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {noticia.nivel_maturidade && (
          <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-wh-primary bg-wh-primary/10 border border-wh-primary/20 px-1.5 py-0.5">
            {noticia.nivel_maturidade}
          </span>
        )}
        
        {(noticia.stakeholders?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1">
            {noticia.stakeholders!.slice(0, 2).map((s) => (
              <span
                key={s}
                className="font-mono text-[8px] uppercase tracking-[0.15em] text-wh-muted border border-wh-border-soft px-1.5 py-0.5 bg-wh-surface/50"
              >
                {s}
              </span>
            ))}
            {(noticia.stakeholders?.length ?? 0) > 2 && (
              <span className="font-mono text-[8px] text-wh-muted py-0.5">
                +{noticia.stakeholders!.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Métricas */}
      {(noticia.metricas as any)?.items?.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(noticia.metricas as any).items.slice(0, 3).map((m: any, i: number) => (
            <div
              key={i}
              className="border border-wh-border-soft p-2 text-center"
              style={{ background: "rgba(94,234,212,0.04)" }}
            >
              <p className="text-wh-primary text-sm font-bold leading-none mb-1">
                {m.valor}
              </p>
              <p className="font-mono text-[9px] text-wh-muted leading-tight uppercase tracking-wide">
                {m.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Score / curadoria */}
      {noticia.score_tecnico != null && (
        <div className="mt-5">
          <div className="font-mono mb-1.5 flex items-center justify-between text-[9px] uppercase tracking-[0.15em] text-wh-muted">
            <span>Curadoria</span>
            <span style={{ color: "rgba(94,234,212,0.7)" }}>
              {noticia.score_tecnico}%
            </span>
          </div>
          <div className="h-px w-full bg-wh-border-soft">
            <div
              className="h-px transition-all duration-1000 bg-wh-primary"
              style={{
                width: `${noticia.score_tecnico}%`,
                transitionDelay: `${index * 60 + 400}ms`,
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="font-mono mt-4 flex items-center justify-between text-[9px] text-wh-muted/50">
        <span>{noticia.fonte}</span>
        <span>{formatTime(data)}</span>
      </div>
    </div>
  );
}

// ─── WellnessCardSkeleton ─────────────────────────────────────────────────────

export function WellnessCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="animate-fade-up border border-wh-border-soft bg-wh-surface p-6"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="h-2.5 w-16 bg-wh-muted/20 animate-pulse rounded" />
      <div className="mt-4 h-4 w-full bg-wh-muted/20 animate-pulse rounded" />
      <div className="mt-2 h-4 w-3/4 bg-wh-muted/20 animate-pulse rounded" />
      <div className="mt-3 h-3 w-full bg-wh-muted/10 animate-pulse rounded" />
      <div className="mt-6 h-px w-full bg-wh-muted/20 animate-pulse" />
      <div className="mt-4 h-2.5 w-20 bg-wh-muted/20 animate-pulse rounded" />
    </div>
  );
}