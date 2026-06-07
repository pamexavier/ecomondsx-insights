import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EcomondsLogo } from "@/components/EcomondsLogo";
import { StatCard } from "@/components/StatCard";
import { TrendCard, TrendCardSkeleton } from "@/components/TrendCard";
import { type TrendsPayload } from "@/lib/mock-trends";
import { KeywordMarquee } from "@/components/KeywordMarquee";
import { supabase } from "@/lib/supabase";

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

export default function Dashboard() {
  const [data, setData] = useState<TrendsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState<string | null>(null);

  const location = useLocation();
  const isRadar = location.pathname === "/radar";

  const trendsFiltradas = filtroAtivo
    ? data?.trends.filter((t) => t.category === filtroAtivo)
    : data?.trends;

  useEffect(() => {
    async function fetchSupabaseData() {
      try {
        setLoading(true);

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const tipoFiltro = isRadar ? "radar" : "estrategia";

        const { data: noticias, error } = await supabase
          .from("noticias")
          .select("id, titulo, titulo_pt, resumo_executivo, resumo_pt, categoria, fonte, atualizado_em, pub_date, metricas, score_tecnico")
          .gte("atualizado_em", hoje.toISOString())
          .eq("tipo", tipoFiltro)
          .order("atualizado_em", { ascending: false })
          .limit(12);

        if (error) throw error;

        if (noticias) {
          const formattedData: TrendsPayload = {
            trends: noticias.map((n) => ({
              ...n,
              id: n.id,
              title: n.titulo_pt || n.titulo,
              description: n.resumo_executivo || n.resumo_pt || "Análise em processamento...",
              category: n.categoria || "Geral",
              trend: "up" as const,
              relevance: n.score_tecnico ?? 0, 
            })),
            stats: {
              activeTrends: noticias.length,
              // Fallback removido
              monitoredSources: new Set(noticias.map((n) => n.fonte)).size,
              lastUpdate: noticias[0]?.atualizado_em,
              avgRelevance: noticias.length
                ? Math.round(noticias.reduce((acc, n) => acc + (n.score_tecnico ?? 0), 0) / noticias.length)
                : 0,
            },
            highlight: {
              title: noticias[0]?.titulo_pt || noticias[0]?.titulo,
              excerpt: noticias[0]?.resumo_executivo || noticias[0]?.resumo_pt,
              source: noticias[0]?.fonte,
              publishedAt: noticias[0]?.pub_date || noticias[0]?.atualizado_em,
            },
            keywords: Array.from(
              new Set(noticias.map((n) => n.categoria).filter(Boolean))
            ) as string[],
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
  }, [location.pathname, isRadar]);

  const handleSelectNews = async (news: any) => {
    setSelectedNews(news);
    setLoadingDetalhes(true);
    try {
      const { data: detalhes, error } = await supabase
        .from("noticias")
        .select("o_que_e, impacto_real, como_aplicar, contras, quando_usar, motivo")
        .eq("id", news.id)
        .single();

      if (error) throw error;
      if (detalhes) {
        setSelectedNews((prev: any) =>
          prev?.id === news.id ? { ...prev, ...detalhes } : prev
        );
      }
    } catch (err) {
      console.error("Erro ao buscar detalhes da notícia:", err);
    } finally {
      setLoadingDetalhes(false);
    }
  };

  const semSinaisHoje = !loading && (!data?.trends || data.trends.length === 0);

  return (
    <div className="relative min-h-screen bg-background text-foreground bg-noise">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{ background: "var(--gradient-radial-glow)" }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          
          {/* Logo linkado para a home */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <EcomondsLogo size={38} />
            <div className="flex items-baseline">
              <span className="text-display text-lg sm:text-xl font-extrabold tracking-tight">Ecominds</span>
              <span className="text-display text-lg sm:text-xl font-extrabold text-primary text-glow">X</span>
            </div>
          </Link>

          <div className="flex items-center border border-border-strong px-2 py-1 sm:px-3 sm:py-1.5 gap-4">
            {/* Link Radar */}
            <Link
              to="/radar"
              className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-muted-foreground px-2 py-0.5 hover:text-primary transition-colors whitespace-nowrap"
            >
              Radar
            </Link>
            
            {/* Link Acervo (Novo) */}
            <Link
              to="/acervo"
              className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-muted-foreground px-2 py-0.5 hover:text-primary transition-colors whitespace-nowrap"
            >
              Acervo
            </Link>

            <Link
              to="/inteligencia"
              className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-primary px-2 py-0.5 border border-primary transition-colors hover:brightness-125 whitespace-nowrap"
              style={{ boxShadow: "0 0 8px rgba(0,255,100, 0.5)" }}
            >
              <span className="hidden sm:inline">Inteligência de Projeto </span>
              <span className="inline sm:hidden">Inteligência </span>
              →
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 pb-24">
        {/* Hero */}
        <section className="pt-16 md:pt-24">
          <div className="animate-fade-up flex items-center gap-2 text-mono text-[21px] uppercase tracking-[0.25em] text-primary mb-5">
            <span className="h-px w-8 bg-primary" /> {isRadar ? "Radar Global" : "Vector-X"}
          </div>
          <h1 className="text-display max-w-4xl text-5xl md:text-7xl font-extrabold leading-[0.90] animate-fade-up">
            {isRadar ? (
              <>
                O que está sendo
                <br />
                <span className="text-primary text-glow">construído amanhã.</span>
              </>
            ) : (
              <>
                O FUTURO da construção
                <br />
                <span className="text-primary text-glow">decodificado.</span>
              </>
            )}
          </h1>
          <p
            className="text-mono mt-8 max-w-2xl text-sm md:text-base leading-relaxed text-muted-foreground animate-fade-up border-l-2 border-primary/40 pl-5"
            style={{ animationDelay: "180ms" }}
          >
            {isRadar
              ? "Sinais técnicos do setor da construção sustentável — materiais, energia, clima, água e tecnologia aplicada. Sem filtro de mercado, sem recorte de público. Só o que está acontecendo no mundo."
              : "Inteligência aplicada para quem projeta e constrói no mais alto nível. Tecnologias, materiais e métodos que ainda não chegaram ao mercado brasileiro — com análise de aplicação, ROI e janela de vantagem competitiva."}
          </p>
        </section>

        {/* Stats */}
        <section className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard index={0} label="Sinais Hoje" value={data ? String(data.stats.activeTrends) : "—"} hint="Detectados hoje" live />
          <StatCard index={1} label="Fontes" value={data ? String(data.stats.monitoredSources) : "—"} hint="Monitoramento Global" />
          <StatCard index={2} label="Sync" value={data?.stats.lastUpdate ? formatTime(data.stats.lastUpdate).split(" às ")[1] : "—"} hint="Último pulso" />
          <StatCard index={3} label="Destaque" value={data?.keywords?.[0] ?? "—"} hint="Categoria do dia" />
        </section>

        {/* Trends Grid */}
        <section className="mt-20">
          <div className="flex items-end justify-between border-b border-border pb-4 mb-8">
            <h2 className="text-display text-2xl font-bold">Sinais de hoje</h2>
            {!loading && !semSinaisHoje && (
              <span className="text-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                {data?.trends.length} sinais
              </span>
            )}
          </div>

          {/* Empty State */}
          {semSinaisHoje ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full" />
                Radar em standby
              </div>
              <h3 className="text-display text-2xl font-bold mb-4">
                Nenhum sinal detectado hoje.
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm mb-8 leading-relaxed">
                Enquanto o radar trabalha, explore o acervo completo de tendências anteriores.
              </p>
              <Link
                to="/acervo"
                className="text-mono text-[10px] uppercase tracking-[0.2em] bg-primary text-primary-foreground px-6 py-3 hover:bg-primary/90 transition-colors"
              >
                Explorar acervo →
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <KeywordMarquee
                  keywords={data?.keywords ?? []}
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
                        onClick={() => handleSelectNews(t)}
                        className="cursor-pointer transition-all hover:translate-y-[-4px]"
                      >
                        <TrendCard trend={t} index={i} />
                      </div>
                    ))}
              </div>
            </>
          )}
        </section>

        {/* Botão Acervo */}
        {!semSinaisHoje && !loading && (
          <section className="mt-20 border-t border-border pt-12 flex flex-col items-center text-center gap-4">
            <div className="text-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Quer ir mais fundo?
            </div>
            <h3 className="text-display text-2xl font-bold">
              Todo o histórico de sinais em um só lugar.
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
              Filtre por categoria, período e mergulhe no acervo completo de tendências detectadas.
            </p>
            <Link
              to="/acervo"
              className="mt-2 text-mono text-[10px] uppercase tracking-[0.2em] border border-primary/30 text-primary px-8 py-4 hover:border-primary transition-colors"
              style={{ boxShadow: "0 0 8px rgba(0,255,100, 0.2)" }}
            >
              Explorar Sinais Anteriores →
            </Link>
          </section>
        )}
      </main>

      {/* MODAL DE DETALHES */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-background/60 backdrop-blur-sm p-4">
          <div className="h-full w-full max-w-2xl bg-card border-l border-border p-8 md:p-12 overflow-y-auto animate-in slide-in-from-right duration-300 relative shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="text-mono text-[10px] uppercase tracking-[0.3em] text-primary flex-1 mt-2">
                {selectedNews.categoria} // {selectedNews.fonte}
              </div>
              <button
                onClick={() => setSelectedNews(null)}
                className="shrink-0 text-muted-foreground hover:text-primary text-mono text-xs p-2 border border-border"
              >
                [ ESC ] FECHAR
              </button>
            </div>

            <h2 className="text-display text-3xl md:text-5xl font-extrabold leading-tight mb-8">
              {selectedNews.title}
            </h2>

            <div className="space-y-6">
              <div className="relative p-6 bg-surface/50 border border-border">
                <span className="absolute -top-3 left-4 bg-card px-2 text-mono text-[10px] text-muted-foreground uppercase">
                  Resumo Executivo
                </span>
                <p className="text-foreground leading-relaxed text-lg italic">
                  "{selectedNews.resumo_executivo || selectedNews.description}"
                </p>
              </div>

              {loadingDetalhes ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-2 w-32 bg-muted-foreground/20 animate-pulse" />
                      <div className="h-16 bg-muted-foreground/10 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {selectedNews.o_que_e && (
                    <div className="space-y-2">
                      <h4 className="text-mono text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-2">
                        <span className="h-px w-4 bg-primary" /> O que é na prática
                      </h4>
                      <p className="text-muted-foreground leading-relaxed text-sm">{selectedNews.o_que_e}</p>
                    </div>
                  )}

                  {selectedNews.impacto_real && (
                    <div className="relative p-5 border border-primary/30 bg-primary/5">
                      <span className="absolute -top-3 left-4 bg-card px-2 text-mono text-[10px] text-primary uppercase">
                        Impacto Real
                      </span>
                      <p className="text-foreground leading-relaxed text-sm font-medium">{selectedNews.impacto_real}</p>
                    </div>
                  )}

                  {selectedNews.como_aplicar && (
                    <div className="space-y-2">
                      <h4 className="text-mono text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-2">
                        <span className="h-px w-4 bg-primary" /> Como aplicar em obra
                      </h4>
                      <p className="text-muted-foreground leading-relaxed text-sm">{selectedNews.como_aplicar}</p>
                    </div>
                  )}

                  {selectedNews.contras && (
                    <div className="space-y-2">
                      <h4 className="text-mono text-[10px] uppercase tracking-widest text-rose-400 font-bold flex items-center gap-2">
                        <span className="h-px w-4 bg-rose-400" /> Limitações e riscos
                      </h4>
                      <p className="text-muted-foreground leading-relaxed text-sm">{selectedNews.contras}</p>
                    </div>
                  )}

                  {selectedNews.quando_usar && (
                    <div className="space-y-2">
                      <h4 className="text-mono text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-2">
                        <span className="h-px w-4 bg-primary" /> Quando usar
                      </h4>
                      <p className="text-muted-foreground leading-relaxed text-sm">{selectedNews.quando_usar}</p>
                    </div>
                  )}

                  {selectedNews.motivo && (
                    <div className="space-y-2">
                      <h4 className="text-mono text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-2">
                        <span className="h-px w-4 bg-primary" /> Por que isso é relevante
                      </h4>
                      <p className="text-muted-foreground leading-relaxed text-sm">{selectedNews.motivo}</p>
                    </div>
                  )}
                </>
              )}

              <div className="pt-8 border-t border-border flex flex-col gap-4">
                <div className="text-mono text-[10px] text-muted-foreground">
                  PUBLICADO EM: {formatTime(selectedNews.pub_date || selectedNews.atualizado_em)}
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