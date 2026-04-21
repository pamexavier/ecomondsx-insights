import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EcomondsLogo } from "@/components/EcomondsLogo";
import { StatCard } from "@/components/StatCard";
import { TrendCard, TrendCardSkeleton } from "@/components/TrendCard";
import { MOCK_PAYLOAD, type TrendsPayload } from "@/lib/mock-trends";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function Dashboard() {
  const [data, setData] = useState<TrendsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tendencias")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json: TrendsPayload) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData(MOCK_PAYLOAD);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-background text-foreground bg-noise">
      {/* Background grid + glow */}
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{ background: "var(--gradient-radial-glow)" }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <EcomondsLogo size={36} />
            <div className="flex items-baseline gap-1">
              <span className="text-display text-xl font-extrabold tracking-tight">
                Ecomonds
              </span>
              <span className="text-display text-xl font-extrabold text-primary text-glow">
                X
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 border border-border-strong px-3 py-1.5">
            <span className="h-1.5 w-1.5 bg-primary animate-pulse-dot" />
            <span className="text-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Atualizado em tempo real
            </span>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 pb-24">
        {/* Hero */}
        <section className="pt-16 md:pt-24">
          <div className="animate-fade-up flex items-center gap-2 text-mono text-[11px] uppercase tracking-[0.25em] text-primary">
            <span className="h-px w-8 bg-primary" />
            Construção Civil Sustentável
          </div>
          <h1
            className="text-display mt-5 max-w-4xl text-5xl md:text-7xl font-extrabold leading-[0.95] animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            Tendências que moldam o
            <br />
            futuro da{" "}
            <span className="relative inline-block text-primary text-glow">
              obra.
              <span className="absolute -bottom-2 left-0 h-px w-full bg-primary/50" />
            </span>
          </h1>
          <p
            className="text-mono mt-6 max-w-2xl text-base md:text-lg leading-relaxed text-muted-foreground animate-fade-up"
            style={{ animationDelay: "220ms" }}
          >
            Monitoramento contínuo de materiais, regulação, tecnologia e
            mercado. Sinais coletados de centenas de fontes, filtrados por IA e
            entregues em um só painel — para você decidir antes do resto.
          </p>
        </section>

        {/* Stats */}
        <section className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            index={0}
            label="Tendências ativas"
            value={data ? String(data.stats.activeTrends) : "—"}
            hint="últimos 7 dias"
            live
          />
          <StatCard
            index={1}
            label="Fontes monitoradas"
            value={data ? String(data.stats.monitoredSources) : "—"}
            hint="portais, papers, normas"
          />
          <StatCard
            index={2}
            label="Última atualização"
            value={data ? formatTime(data.stats.lastUpdate) : "—"}
            hint="sincronização via n8n"
          />
          <StatCard
            index={3}
            label="Relevância média"
            value={data ? `${data.stats.avgRelevance}%` : "—"}
            hint="filtrado por IA"
          />
        </section>

        {/* Trends grid */}
        <section className="mt-20">
          <div className="flex items-end justify-between border-b border-border pb-4 mb-8">
            <div>
              <div className="text-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                /tendencias
              </div>
              <h2 className="text-display mt-2 text-2xl md:text-3xl font-bold">
                Sinais em alta esta semana
              </h2>
            </div>
            <div className="text-mono hidden md:block text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {loading ? "carregando..." : `${data?.trends.length ?? 0} resultados`}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TrendCardSkeleton key={i} index={i} />
                ))
              : data?.trends.map((t, i) => (
                  <TrendCard key={t.id} trend={t} index={i} />
                ))}
          </div>
        </section>

        {/* Highlight + Keywords */}
        <section className="mt-20 grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Featured article */}
          <article className="lg:col-span-2 relative bg-card border border-border p-8 md:p-10 overflow-hidden animate-fade-up">
            <span className="absolute top-0 left-0 h-px w-1/3 bg-primary" />
            <div className="flex items-center gap-2 text-mono text-[10px] uppercase tracking-[0.25em] text-primary">
              <span className="h-1.5 w-1.5 bg-primary" />
              Destaque da semana
            </div>
            {loading || !data ? (
              <>
                <div className="mt-6 h-10 w-3/4 bg-surface animate-pulse" />
                <div className="mt-3 h-10 w-2/3 bg-surface animate-pulse" />
              </>
            ) : (
              <>
                <h3 className="text-display mt-6 text-3xl md:text-4xl font-extrabold leading-tight">
                  {data.highlight.title}
                </h3>
                <p className="text-mono mt-5 text-sm md:text-base leading-relaxed text-muted-foreground max-w-2xl">
                  {data.highlight.excerpt}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-5">
                  <div className="text-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Fonte
                  </div>
                  <div className="text-mono text-sm text-foreground">
                    {data.highlight.source}
                  </div>
                  <div className="ml-auto text-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {formatTime(data.highlight.publishedAt)}
                  </div>
                </div>
              </>
            )}
          </article>

          {/* Keywords */}
          <aside className="bg-card border border-border p-8 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="flex items-center gap-2 text-mono text-[10px] uppercase tracking-[0.25em] text-primary">
              <span className="h-1.5 w-1.5 bg-primary animate-pulse-dot" />
              Palavras-chave em alta
            </div>
            <h3 className="text-display mt-4 text-xl font-bold">
              O que está pulsando
            </h3>
            <div className="mt-6 flex flex-wrap gap-2">
              {(data?.keywords ?? Array.from({ length: 10 }).map(() => "")).map(
                (kw, i) =>
                  kw ? (
                    <span
                      key={kw + i}
                      className="text-mono text-xs px-3 py-1.5 border border-primary/40 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-default"
                    >
                      #{kw}
                    </span>
                  ) : (
                    <span
                      key={i}
                      className="h-7 w-20 bg-surface animate-pulse"
                    />
                  ),
              )}
            </div>
          </aside>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <EcomondsLogo size={24} />
            <span className="text-mono text-xs text-muted-foreground">
              EcomondsX © 2025 — Inteligência Sustentável
            </span>
          </div>
          <div className="text-mono text-xs text-muted-foreground flex items-center gap-2">
            <span>Automação via n8n</span>
            <span className="text-border-strong">·</span>
            <span>Curadoria por IA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
