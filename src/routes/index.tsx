import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EcomondsLogo } from "@/components/EcomondsLogo";
import { StatCard } from "@/components/StatCard";
import { TrendCard, TrendCardSkeleton } from "@/components/TrendCard";
<<<<<<< HEAD
import { MOCK_PAYLOAD, type TrendsPayload } from "@/lib/mock-trends";
=======
import { type TrendsPayload } from "@/lib/mock-trends";
import { KeywordMarquee } from "@/components/KeywordMarquee";
import { supabase } from "@/lib/supabase";

>>>>>>> bf44afc (ajustes de filtro, fontes e dashboard)

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
<<<<<<< HEAD
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
=======
    return (
      d.toLocaleDateString("pt-BR") +
      " às " +
      d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    );
>>>>>>> bf44afc (ajustes de filtro, fontes e dashboard)
  } catch {
    return "—";
  }
}

function Dashboard() {
  const [data, setData] = useState<TrendsPayload | null>(null);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD

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
=======
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  const [filtroAtivo, setFiltroAtivo] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSupabaseData() {
      try {
        setLoading(true);
        const { data: noticias, error } = await supabase
          .from("noticias")
          .select("*")
          .order("criado_em", { ascending: false });

        if (error) throw error;

        if (noticias) {
          const formattedData: TrendsPayload = {
            trends: noticias.map((n) => ({
              ...n,
              id: n.id,
              title: n.titulo_pt || n.titulo,
              description: n.resumo_executivo || n.resumo_pt || "Análise em processamento...",
              relevance: Math.floor(Math.random() * (99 - 85 + 1)) + 85,
              category: n.categoria || "Geral",
              trend: "up",
            })),
            stats: {
              activeTrends: noticias.length,
              monitoredSources: 2, // fixo por enquanto, atualiza manualmente quando adicionar
              lastUpdate: noticias[0]?.criado_em,
              avgRelevance: 94,
            },
            highlight: {
              title: noticias[0]?.titulo_pt || noticias[0]?.titulo,
              excerpt: noticias[0]?.resumo_executivo || noticias[0]?.resumo_pt || noticias[0]?.motivo,
              source: noticias[0]?.fonte,
              publishedAt: noticias[0]?.pub_date || noticias[0]?.criado_em,
            },
            keywords: Array.from(
              new Set(noticias.map((n) => n.categoria).filter(Boolean))
            ),
          };
          setData(formattedData);
        }
      } catch (err) {
        console.error("Erro:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSupabaseData();
  }, []);

  // 2. Filtra trends
  const trendsFiltradas = filtroAtivo
    ? data?.trends.filter((t) => t.categoria === filtroAtivo)
    : data?.trends;

  return (
    <div className="relative min-h-screen bg-background text-foreground bg-noise">
>>>>>>> bf44afc (ajustes de filtro, fontes e dashboard)
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
            <div className="flex items-baseline">
<<<<<<< HEAD
              <span className="text-display text-xl font-extrabold tracking-tight">
                Ecominds
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
=======
              <span className="text-display text-xl font-extrabold tracking-tight">Ecominds</span>
              <span className="text-display text-xl font-extrabold text-primary text-glow">X</span>
            </div>
          </div>
          <div className="flex items-center gap-2 border border-border-strong px-3 py-1.5">
            <span className="h-1.5 w-1.5 bg-primary animate-pulse-dot" />
            <span className="text-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Live Intelligence
>>>>>>> bf44afc (ajustes de filtro, fontes e dashboard)
            </span>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 pb-24">
        {/* Hero */}
        <section className="pt-16 md:pt-24">
          <div className="animate-fade-up flex items-center gap-2 text-mono text-[11px] uppercase tracking-[0.25em] text-primary">
<<<<<<< HEAD
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
=======
            <span className="h-px w-8 bg-primary" /> Intelligence Dashboard
          </div>
          <h1 className="text-display mt-5 max-w-4xl text-5xl md:text-7xl font-extrabold leading-[0.95] animate-fade-up">
            O FUTURO da construção,
            <br />
            <span className="text-primary text-glow">decodificado.</span>
          </h1>
          <p
  className="text-mono mt-8 max-w-2xl text-sm md:text-base leading-relaxed text-muted-foreground animate-fade-up border-l-2 border-primary/40 pl-5"
  style={{ animationDelay: "180ms" }}
>
  Monitoramos centenas de fontes ao redor do mundo — eficiência energética,
  hídrica, materiais, métodos construtivos e o que há de mais novo no mercado.
  Filtramos tudo, e entregamos aqui:{" "}
  <span className="text-foreground font-medium">
    sem alarmismo, sem militância, sem viés político.
  </span>{" "}
  Apenas informação técnica aplicável à sua obra.
</p>
>>>>>>> bf44afc (ajustes de filtro, fontes e dashboard)
        </section>

        {/* Stats */}
        <section className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-3">
<<<<<<< HEAD
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
=======
          <StatCard index={0} label="Sinais Ativos" value={data ? String(data.stats.activeTrends) : "—"} hint="Base Supabase" live />
          <StatCard index={1} label="Fontes" value={data ? String(data.stats.monitoredSources) : "—"} hint="Monitoramento Global" />
          <StatCard index={2} label="Sync" value={data ? formatTime(data.stats.lastUpdate).split(" às ")[1] : "—"} hint="Último pulso" />
          <StatCard index={3} label="IA Score" value="94%" hint="Precisão de filtro" />
        </section>

        {/* Trends Grid */}
        <section className="mt-20">
          <div className="flex items-end justify-between border-b border-border pb-4 mb-8">
            <h2 className="text-display text-2xl font-bold">Sinais em alta</h2>
>>>>>>> bf44afc (ajustes de filtro, fontes e dashboard)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TrendCardSkeleton key={i} index={i} />
                ))
<<<<<<< HEAD
              : data?.trends.map((t, i) => (
                  <TrendCard key={t.id} trend={t} index={i} />
=======
              : trendsFiltradas?.map((t, i) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedNews(t)}
                    className="cursor-pointer transition-all hover:translate-y-[-4px]"
                  >
                    <TrendCard trend={t} index={i} />
                  </div>
>>>>>>> bf44afc (ajustes de filtro, fontes e dashboard)
                ))}
          </div>
        </section>

<<<<<<< HEAD
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
          <KeywordMarquee keywords={data?.keywords ?? []} duration={45} />
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
              EcomindsX — Inteligência Sustentável
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
=======
        <div className="mt-12">
          <KeywordMarquee
            keywords={data?.keywords ?? []}
            duration={45}
            activeKeyword={filtroAtivo}
            onSelect={(kw) => setFiltroAtivo(prev => prev === kw ? null : kw)}
          />
        </div>
      </main>

      {/* MODAL DE DETALHES */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-background/60 backdrop-blur-sm p-4">
          <div className="h-full w-full max-w-2xl bg-card border-l border-border p-8 md:p-12 overflow-y-auto animate-in slide-in-from-right duration-300 relative shadow-2xl">
            <button
              onClick={() => setSelectedNews(null)}
              className="absolute top-6 right-6 text-muted-foreground hover:text-primary text-mono text-xs p-2 border border-border"
            >
              [ ESC ] FECHAR
            </button>

            <div className="text-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-6">
              {selectedNews.categoria} // {selectedNews.fonte}
            </div>

            <h2 className="text-display text-3xl md:text-5xl font-extrabold leading-tight mb-8">
              {selectedNews.title}
            </h2>

            <div className="space-y-6">

              {/* Resumo Executivo */}
              <div className="relative p-6 bg-surface/50 border border-border">
                <span className="absolute -top-3 left-4 bg-card px-2 text-mono text-[10px] text-muted-foreground uppercase">
                  Resumo Executivo
                </span>
                <p className="text-foreground leading-relaxed text-lg italic">
                  "{selectedNews.resumo_executivo || selectedNews.description}"
                </p>
              </div>

              {/* O que é */}
              {selectedNews.o_que_e && (
                <div className="space-y-2">
                  <h4 className="text-mono text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-2">
                    <span className="h-px w-4 bg-primary" /> O que é na prática
                  </h4>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {selectedNews.o_que_e}
                  </p>
                </div>
              )}

              {/* Impacto Real */}
              {selectedNews.impacto_real && (
                <div className="relative p-5 border border-primary/30 bg-primary/5">
                  <span className="absolute -top-3 left-4 bg-card px-2 text-mono text-[10px] text-primary uppercase">
                    Impacto Real
                  </span>
                  <p className="text-foreground leading-relaxed text-sm font-medium">
                    {selectedNews.impacto_real}
                  </p>
                </div>
              )}

              {/* Como Aplicar */}
              {selectedNews.como_aplicar && (
                <div className="space-y-2">
                  <h4 className="text-mono text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-2">
                    <span className="h-px w-4 bg-primary" /> Como aplicar em obra
                  </h4>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {selectedNews.como_aplicar}
                  </p>
                </div>
              )}

              {/* Contras */}
              {selectedNews.contras && (
                <div className="space-y-2">
                  <h4 className="text-mono text-[10px] uppercase tracking-widest text-rose-400 font-bold flex items-center gap-2">
                    <span className="h-px w-4 bg-rose-400" /> Limitações e riscos
                  </h4>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {selectedNews.contras}
                  </p>
                </div>
              )}

              {/* Quando Usar */}
              {selectedNews.quando_usar && (
                <div className="space-y-2">
                  <h4 className="text-mono text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-2">
                    <span className="h-px w-4 bg-primary" /> Quando usar
                  </h4>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {selectedNews.quando_usar}
                  </p>
                </div>
              )}

              {/* Por que é relevante */}
              {selectedNews.motivo && (
                <div className="space-y-2">
                  <h4 className="text-mono text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-2">
                    <span className="h-px w-4 bg-primary" /> Por que isso é relevante
                  </h4>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {selectedNews.motivo}
                  </p>
                </div>
              )}

              <div className="pt-8 border-t border-border flex flex-col gap-4">
                <div className="text-mono text-[10px] text-muted-foreground">
                  PUBLICADO EM: {formatTime(selectedNews.pub_date || selectedNews.criado_em)}
                </div>
                <a
                  href={selectedNews.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-primary text-primary-foreground px-6 py-4 font-bold text-mono text-xs tracking-tighter hover:bg-primary/90 transition-colors"
                >
                  ACESSAR FONTE ORIGINAL NA ÍNTEGRA →
                </a>
              </div>

            </div>
          </div>
          <div className="absolute inset-0 -z-10" onClick={() => setSelectedNews(null)} />
        </div>
      )}
    </div>
  );
}
>>>>>>> bf44afc (ajustes de filtro, fontes e dashboard)
