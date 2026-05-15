import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EcomondsLogo } from "@/components/EcomondsLogo";
import { StatCard } from "@/components/StatCard";
import { TrendCard, TrendCardSkeleton } from "@/components/TrendCard";
import { type TrendsPayload } from "@/lib/mock-trends";
import { KeywordMarquee } from "@/components/KeywordMarquee";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("pt-BR") +
      " às " +
      d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return "—";
  }
}

function Dashboard() {
  const [data, setData] = useState<TrendsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  // 1. Novo estado para filtro
  const [filtroAtivo, setFiltroAtivo] = useState<string | null>(null);
  // 2. Filtra trends
  const trendsFiltradas = filtroAtivo
    ? data?.trends.filter((t) => t.category === filtroAtivo)
    : data?.trends;

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
              monitoredSources: new Set(noticias.map((n) => n.fonte)).size || 12,
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

  return (
    <div className="relative min-h-screen bg-background text-foreground bg-noise">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{ background: "var(--gradient-radial-glow)" }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <EcomondsLogo size={38} />
            <div className="flex items-baseline">
              <span className="text-display text-xl font-extrabold tracking-tight">Ecominds</span>
              <span className="text-display text-xl font-extrabold text-primary text-glow">X</span>
            </div>
          </div>
          <div className="flex items-center gap-2 border border-border-strong px-3 py-1.5">
            <span className="h-1.5 w-1.5 bg-primary animate-pulse-dot" />
            <span className="text-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              News
            </span>
            <a
                 href="/inteligencia"
  className="text-mono text-[10px] uppercase tracking-[0.2em] text-primary ml-2 px-2 py-0.5 border border-primary transition-colors hover:brightness-125"
  style={{ boxShadow: "0 0 8px rgba(0,255,100, 0.5)" }}
>
  Inteligência de Projeto →
</a>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 pb-24">
  {/* Hero */}
  <section className="pt-16 md:pt-24">
    {/* Título Superior / Nome do Produto */}
    <div className="animate-fade-up flex items-center gap-2 text-mono text-[21px] uppercase tracking-[0.25em] text-primary mb-5">
      <span className="h-px w-8 bg-primary" /> Vector-X
    </div>
    
    <h1 className="text-display max-w-4xl text-5xl md:text-7xl font-extrabold leading-[0.90] animate-fade-up">
      O FUTURO da construção 
      <br /> 
      <span className="text-primary text-glow">decodificado.</span>
    </h1>
          <p
  className="text-mono mt-8 max-w-2xl text-sm md:text-base leading-relaxed text-muted-foreground animate-fade-up border-l-2 border-primary/40 pl-5"
  style={{ animationDelay: "180ms" }}
>
  Monitoramos sinais do mundo inteiro — <span className="text-foreground font-medium">novos materiais, eficiência energética, soluções hídricas, automação, IA aplicada, métodos construtivos e tecnologias emergentes.</span>{" "}
  Filtramos o ruído e entregamos apenas o que importa:{" "}
  <span className="text-foreground font-medium">
    informação técnica, aplicável e relevante  
  </span>{" "}
 para quem projeta o futuro da construção.
</p>
        </section>

        {/* Stats */}
        <section className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard index={0} label="Sinais Ativos" value={data ? String(data.stats.activeTrends) : "—"} hint="Base Supabase" live />
          <StatCard index={1} label="Fontes" value={data ? String(data.stats.monitoredSources) : "—"} hint="Monitoramento Global" />
          <StatCard index={2} label="Sync" value={data ? formatTime(data.stats.lastUpdate).split(" às ")[1] : "—"} hint="Último pulso" />
          <StatCard index={3} label="IA Score" value="94%" hint="Precisão de filtro" />
        </section>

        {/* Trends Grid */}
        <section className="mt-20">
          <div className="flex items-end justify-between border-b border-border pb-4 mb-8">
            <h2 className="text-display text-2xl font-bold">Sinais em alta</h2>
          </div>
 <div className="mt-12">
          <KeywordMarquee
            keywords={data?.keywords ?? []}
            duration={45}
            activeKeyword={filtroAtivo}
            onSelect={(kw) => setFiltroAtivo(prev => prev === kw ? null : kw)}
          />
        </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TrendCardSkeleton key={i} index={i} />
                ))
              : trendsFiltradas?.map((t, i) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedNews(t)}
                    className="cursor-pointer transition-all hover:translate-y-[-4px]"
                  >
                    <TrendCard trend={t} index={i} />
                  </div>
                ))}
          </div>
        </section>

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