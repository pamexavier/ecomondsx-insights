import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { EcomondsLogo } from "@/components/EcomondsLogo";
import { TrendCard, TrendCardSkeleton } from "@/components/TrendCard";
import { KeywordMarquee } from "@/components/KeywordMarquee";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/acervo")({
  component: Acervo,
});

const PAGE_SIZE = 20;

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

function Acervo() {
  const [noticias, setNoticias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);
  const filtroPorData = dataInicio || dataFim;

  async function fetchNoticias(pageNum: number, reset = false) {
    try {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      let query = supabase
        .from("noticias")
        .select("*")
        .order("atualizado_em", { ascending: false });

      // Se não filtrar por data, pega só o histórico (antes de hoje)
      if (!filtroPorData) {
        query = query.lt("atualizado_em", hoje.toISOString());
      }

      if (filtroCategoria) {
        query = query.ilike("categoria", filtroCategoria);
      }

      if (dataInicio) {
        query = query.gte("atualizado_em", new Date(dataInicio).toISOString());
      }

      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        query = query.lte("atualizado_em", fim.toISOString());
      }

      if (!filtroPorData) {
        query = query.range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formatted = (data ?? []).map((n: any) => ({
        ...n,
        title: n.titulo_pt || n.titulo,
        description: n.resumo_executivo || n.resumo_pt || "Análise em processamento...",
        relevance: Math.floor(Math.random() * (99 - 85 + 1)) + 85,
        category: n.categoria || "Geral",
        trend: "up",
      }));

      if (reset || pageNum === 0) {
        setNoticias(formatted);
      } else {
        setNoticias((prev) => [...prev, ...formatted]);
      }

      setHasMore(!filtroPorData && formatted.length === PAGE_SIZE);
    } catch (err) {
      console.error("Erro:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Busca categorias únicas pro marquee
  useEffect(() => {
    async function fetchCategorias() {
      const { data } = await supabase.from("noticias").select("categoria");
      if (data) {
        const unicas = Array.from(new Set(data.map((n: any) => n.categoria).filter(Boolean))) as string[];
        setCategorias(unicas);
      }
    }
    fetchCategorias();
  }, []);

  // Refaz busca quando muda filtro
  useEffect(() => {
    setPage(0);
    fetchNoticias(0, true);
  }, [filtroCategoria, dataInicio, dataFim]);

  function carregarMais() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNoticias(nextPage);
  }

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
          <Link to="/" className="flex items-center gap-3">
            <EcomondsLogo size={38} />
            <div className="flex items-baseline">
              <span className="text-display text-xl font-extrabold tracking-tight">Ecominds</span>
              <span className="text-display text-xl font-extrabold text-primary text-glow">X</span>
            </div>
          </Link>
          <Link
            to="/"
            className="text-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 pb-24">
        {/* Hero */}
        <section className="pt-16 md:pt-24">
          <div className="animate-fade-up flex items-center gap-2 text-mono text-[11px] uppercase tracking-[0.25em] text-primary mb-5">
            <span className="h-px w-8 bg-primary" /> Acervo
          </div>
          <h1 className="text-display max-w-4xl text-5xl md:text-7xl font-extrabold leading-[0.90] animate-fade-up">
            Sinais do
            <br />
            <span className="text-primary text-glow">passado.</span>
          </h1>
          <p
            className="text-mono mt-8 max-w-2xl text-sm md:text-base leading-relaxed text-muted-foreground animate-fade-up border-l-2 border-primary/40 pl-5"
            style={{ animationDelay: "180ms" }}
          >
            Todo sinal detectado, preservado. Filtre por categoria ou período e mergulhe no histórico de tendências da construção.
          </p>
        </section>

        {/* Filtros */}
        <section className="mt-12">
          <KeywordMarquee
            keywords={categorias}
            activeKeyword={filtroCategoria}
            onSelect={(kw) => setFiltroCategoria((prev) => prev === kw ? null : kw)}
          />

          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <span className="text-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Período:
            </span>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="text-mono text-xs bg-card border border-border px-3 py-2 text-foreground focus:outline-none focus:border-primary transition-colors"
            />
            <span className="text-muted-foreground text-xs">até</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="text-mono text-xs bg-card border border-border px-3 py-2 text-foreground focus:outline-none focus:border-primary transition-colors"
            />
            {(dataInicio || dataFim || filtroCategoria) && (
              <button
                onClick={() => { setDataInicio(""); setDataFim(""); setFiltroCategoria(null); }}
                className="text-mono text-[10px] uppercase tracking-[0.2em] text-rose-400 border border-rose-400/30 px-3 py-2 hover:bg-rose-400/10 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </section>

        {/* Grid */}
        <section className="mt-12">
          <div className="flex items-end justify-between border-b border-border pb-4 mb-8">
            <h2 className="text-display text-2xl font-bold">
              {filtroCategoria ? `#${filtroCategoria}` : "Todos os sinais"}
            </h2>
            {!loading && (
              <span className="text-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                {noticias.length} registros
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <TrendCardSkeleton key={i} index={i} />)}
            </div>
          ) : noticias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">
                Nenhum sinal encontrado
              </div>
              <p className="text-muted-foreground text-sm mb-6">
                Tente ajustar os filtros ou limpar a busca.
              </p>
              <button
                onClick={() => { setDataInicio(""); setDataFim(""); setFiltroCategoria(null); }}
                className="text-mono text-[10px] uppercase tracking-[0.2em] border border-primary/30 text-primary px-4 py-2 hover:border-primary transition-colors"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {noticias.map((t, i) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedNews(t)}
                    className="cursor-pointer transition-all hover:translate-y-[-4px]"
                  >
                    <TrendCard trend={t} index={i} />
                  </div>
                ))}
              </div>

              {!filtroPorData && hasMore && (
                <div className="mt-12 flex justify-center">
                  <button
                    onClick={carregarMais}
                    disabled={loadingMore}
                    className="text-mono text-[10px] uppercase tracking-[0.2em] border border-primary/30 text-primary px-8 py-4 hover:border-primary transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? "Carregando..." : "Carregar mais →"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* MODAL */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-background/60 backdrop-blur-sm p-4">
          <div className="absolute inset-0 -z-10" onClick={() => setSelectedNews(null)} />

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
              <div className="relative p-6 bg-surface/50 border border-border">
                <span className="absolute -top-3 left-4 bg-card px-2 text-mono text-[10px] text-muted-foreground uppercase">
                  Resumo Executivo
                </span>
                <p className="text-foreground leading-relaxed text-lg italic">
                  "{selectedNews.resumo_executivo || selectedNews.description}"
                </p>
              </div>

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
                  ACESSAR FONTE ORIGINAL NA ÍNTEGRA
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}