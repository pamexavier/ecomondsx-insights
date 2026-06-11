import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { EcomondsLogo } from "@/components/EcomondsLogo";
import { TrendCard, TrendCardSkeleton } from "@/components/TrendCard";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/acervo")({
  component: Acervo,
});

const PAGE_SIZE = 20;

// ─── tipos ───────────────────────────────────────────────────────────────────
interface CategoriaInfo {
  nome: string;
  total: number;
}

interface Noticia {
  id: string;
  titulo: string;
  titulo_pt?: string;
  resumo_executivo?: string;
  resumo_pt?: string;
  categoria?: string;
  fonte?: string;
  atualizado_em: string;
  pub_date?: string;
  link?: string;
  // detalhes carregados no modal
  o_que_e?: string;
  impacto_real?: string;
  como_aplicar?: string;
  contras?: string;
  quando_usar?: string;
  motivo?: string;
  // campos derivados
  title: string;
  description: string;
  category: string;
  trend: "up";
}

// ─── helpers ─────────────────────────────────────────────────────────────────
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

function formatarNoticia(n: any): Noticia {
  return {
    ...n,
    title: n.titulo_pt || n.titulo,
    description: n.resumo_executivo || n.resumo_pt || "Análise em processamento...",
    category: n.categoria || "Geral",
    trend: "up",
  };
}

// ─── ícones inline mínimos ────────────────────────────────────────────────────
const IconeCategoria: Record<string, string> = {
  default: "◈",
};

// ─── componente principal ─────────────────────────────────────────────────────
function Acervo() {
  // estado de metadados (carregado na montagem — query leve)
  const [categorias, setCategorias] = useState<CategoriaInfo[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  // filtros
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // resultados (só carrega após filtro selecionado)
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [totalRegistros, setTotalRegistros] = useState<number | null>(null);

  // modal
  const [selectedNews, setSelectedNews] = useState<Noticia | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);

  const filtroAtivo = filtroCategoria || dataInicio || dataFim;
  const filtroPorData = dataInicio || dataFim;

  // ── 1. Carrega contagem de categorias (1 query leve, só na montagem) ─────────
  useEffect(() => {
    async function fetchCategorias() {
      setLoadingCategorias(true);
      try {
        // GROUP BY no banco — traz apenas N linhas de metadados, não os dados todos
        const { data, error } = await supabase
          .from("noticias")
          .select("categoria")
          .not("categoria", "is", null);

        if (error) throw error;

        // Agrupa no cliente (Supabase JS não suporta GROUP BY diretamente no select simples)
        const contagem: Record<string, number> = {};
        (data ?? []).forEach((n: any) => {
          const cat = n.categoria?.trim();
          if (cat) contagem[cat] = (contagem[cat] || 0) + 1;
        });

        const lista: CategoriaInfo[] = Object.entries(contagem)
          .map(([nome, total]) => ({ nome, total }))
          .sort((a, b) => b.total - a.total);

        setCategorias(lista);
      } finally {
        setLoadingCategorias(false);
      }
    }
    fetchCategorias();
  }, []);

  // ── 2. Busca notícias — só quando há filtro ativo ────────────────────────────
  const fetchNoticias = useCallback(
    async (pageNum: number, reset = false) => {
      if (!filtroAtivo) return;

      try {
        if (pageNum === 0) setLoading(true);
        else setLoadingMore(true);

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        let query = supabase
          .from("noticias")
          .select(
            "id, titulo, titulo_pt, resumo_executivo, resumo_pt, categoria, fonte, atualizado_em, pub_date, link",
            { count: "exact" }
          )
          .order("atualizado_em", { ascending: false });

        // Aplica filtro de categoria
        if (filtroCategoria) {
          query = query.ilike("categoria", filtroCategoria);
        }

        // Aplica filtro de data
        if (dataInicio) {
          query = query.gte("atualizado_em", new Date(dataInicio).toISOString());
        }
        if (dataFim) {
          const fim = new Date(dataFim);
          fim.setHours(23, 59, 59, 999);
          query = query.lte("atualizado_em", fim.toISOString());
        }

        // Excluir hoje quando não há filtro de data (comportamento original)
        if (!filtroPorData) {
          query = query.lt("atualizado_em", hoje.toISOString());
        }

        // Paginação SEMPRE aplicada (bug corrigido)
        query = query.range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        const formatted = (data ?? []).map(formatarNoticia);

        if (reset || pageNum === 0) {
          setNoticias(formatted);
        } else {
          setNoticias((prev) => [...prev, ...formatted]);
        }

        setHasMore(formatted.length === PAGE_SIZE);
        if (count !== null) setTotalRegistros(count);
      } catch (err) {
        console.error("Erro ao buscar notícias:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filtroAtivo, filtroCategoria, dataInicio, dataFim, filtroPorData]
  );

  // Recarrega quando filtros mudam
  useEffect(() => {
    if (!filtroAtivo) {
      setNoticias([]);
      setTotalRegistros(null);
      return;
    }
    setPage(0);
    fetchNoticias(0, true);
  }, [filtroCategoria, dataInicio, dataFim]);

  // ── 3. Detalhes no modal (lazy — só quando abre) ─────────────────────────────
  const handleSelectNews = async (news: Noticia) => {
    setSelectedNews(news);
    setLoadingDetalhes(true);
    try {
      const { data, error } = await supabase
        .from("noticias")
        .select("o_que_e, impacto_real, como_aplicar, contras, quando_usar, motivo")
        .eq("id", news.id)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedNews((prev) =>
          prev?.id === news.id ? { ...prev, ...data } : prev
        );
      }
    } catch (err) {
      console.error("Erro ao buscar detalhes:", err);
    } finally {
      setLoadingDetalhes(false);
    }
  };

  const limparFiltros = () => {
    setFiltroCategoria(null);
    setDataInicio("");
    setDataFim("");
  };

  const carregarMais = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNoticias(nextPage);
  };

  // ─── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-background text-foreground bg-noise">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{ background: "var(--gradient-radial-glow)" }}
      />

      {/* ── Header responsivo ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 py-2 sm:py-4">
          
          {/* Logo Vector-X - mais compacta no mobile */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group transition-opacity hover:opacity-80 shrink-0">
            <EcomondsLogo size={32} />
            <div className="flex flex-col justify-center">
              <span className="text-display text-sm sm:text-xl font-extrabold tracking-tight text-foreground leading-none uppercase">
                Vector-X
              </span>
              <span className="text-mono text-[6px] sm:text-[8px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-muted-foreground mt-1 opacity-70">
                By EcomindsX
              </span>
            </div>
          </Link>

          {/* Navegação - scroll horizontal no mobile */}
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 sm:gap-3 px-1">
              <Link
                to="/radar"
                className="text-mono text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-muted-foreground px-2 py-1 hover:text-primary transition-colors whitespace-nowrap"
              >
                Radar
              </Link>
              
              {/* Acervo (Ativo) */}
              <Link
                to="/acervo"
                className="text-mono text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-primary px-2 py-1 transition-colors whitespace-nowrap font-bold"
              >
                Acervo
              </Link>

              {/* Wellness Hub */}
              <Link
                to="/wellness"
                className="text-mono text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] whitespace-nowrap px-2 sm:px-3 py-1 transition-all hover:brightness-125"
                style={{
                  color: "#5EEAD4",
                  border: "1px solid rgba(94,234,212,0.5)",
                  borderRadius: "999px",
                  boxShadow: "0 0 10px rgba(94,234,212,0.25), inset 0 0 8px rgba(94,234,212,0.06)",
                }}
              >
                <span className="hidden sm:inline">Wellness Hub </span>
                <span className="inline sm:hidden">Wellness </span>
                ✦
              </Link>

              <Link
                to="/inteligencia"
                className="text-mono text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-primary px-2 py-1 border border-primary transition-colors hover:brightness-125 whitespace-nowrap"
                style={{ boxShadow: "0 0 8px rgba(0,255,100, 0.5)" }}
              >
                <span className="hidden sm:inline">Inteligência de Projeto </span>
                <span className="inline sm:hidden">Inteligência </span>
                →
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 pb-24">

        {/* ── Hero ── */}
        <section className="pt-12 sm:pt-16 md:pt-24">
          <div className="animate-fade-up flex items-center gap-2 text-mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-primary mb-4 sm:mb-5">
            <span className="h-px w-6 sm:w-8 bg-primary" /> Acervo
          </div>
          <h1 className="text-display max-w-4xl text-3xl sm:text-5xl md:text-7xl font-extrabold leading-[1.1] sm:leading-[0.90] animate-fade-up">
            Sinais do
            <br />
            <span className="text-primary text-glow">passado.</span>
          </h1>
          <p
            className="text-mono mt-6 sm:mt-8 max-w-2xl text-xs sm:text-sm md:text-base leading-relaxed text-muted-foreground animate-fade-up border-l-2 border-primary/40 pl-4 sm:pl-5"
            style={{ animationDelay: "180ms" }}
          >
            Selecione uma categoria ou defina um período para acessar o histórico de tendências da construção.
          </p>
        </section>

        {/* ── Filtro de período ── */}
        <section className="mt-10 sm:mt-12">
          <div className="flex items-center gap-3 mb-4 sm:mb-5">
            <span className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Período
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 bg-card border border-border px-3 sm:px-4 py-1.5 sm:py-2">
              <span className="text-mono text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest">De</span>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="text-mono text-[10px] sm:text-xs bg-transparent text-foreground focus:outline-none focus:text-primary transition-colors min-w-[110px] sm:min-w-[130px]"
              />
            </div>

            <span className="text-mono text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest">até</span>

            <div className="flex items-center gap-2 bg-card border border-border px-3 sm:px-4 py-1.5 sm:py-2">
              <span className="text-mono text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest">Até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="text-mono text-[10px] sm:text-xs bg-transparent text-foreground focus:outline-none focus:text-primary transition-colors min-w-[110px] sm:min-w-[130px]"
              />
            </div>

            {filtroAtivo && (
              <button
                onClick={limparFiltros}
                className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-rose-400 border border-rose-400/30 px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-rose-400/10 transition-colors"
              >
                ✕ Limpar
              </button>
            )}
          </div>
        </section>

        {/* ── Cards de categoria ── */}
        <section className="mt-10 sm:mt-12">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <span className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Categorias
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {loadingCategorias ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 sm:h-24 bg-card border border-border animate-pulse"
                  style={{ animationDelay: `${i * 60}ms` }}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {categorias.map((cat, i) => {
                const ativo = filtroCategoria === cat.nome;
                return (
                  <button
                    key={cat.nome}
                    onClick={() =>
                      setFiltroCategoria((prev) => (prev === cat.nome ? null : cat.nome))
                    }
                    className={`group relative flex flex-col justify-between p-3 sm:p-5 text-left transition-all duration-200 border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      ativo
                        ? "border-primary bg-primary/10 shadow-[0_0_24px_-4px_var(--color-primary,hsl(var(--primary)))]"
                        : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                    }`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <span
                      className={`absolute top-0 left-0 right-0 h-px transition-all duration-300 ${
                        ativo ? "bg-primary" : "bg-transparent group-hover:bg-primary/30"
                      }`}
                    />

                    <span
                      className={`text-mono text-[8px] sm:text-[10px] uppercase tracking-[0.2em] leading-relaxed font-bold transition-colors ${
                        ativo ? "text-primary" : "text-foreground group-hover:text-primary"
                      }`}
                    >
                      {cat.nome}
                    </span>

                    <div className="flex items-end justify-between mt-3 sm:mt-4">
                      <span
                        className={`text-display text-xl sm:text-2xl font-extrabold tabular-nums transition-colors ${
                          ativo ? "text-primary text-glow" : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {cat.total}
                      </span>
                      <span
                        className={`text-mono text-[8px] sm:text-[9px] uppercase tracking-[0.15em] transition-colors ${
                          ativo ? "text-primary/70" : "text-muted-foreground/60"
                        }`}
                      >
                        sinais
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Estado vazio — nenhum filtro selecionado ── */}
        {!filtroAtivo && !loadingCategorias && (
          <section className="mt-16 sm:mt-20 flex flex-col items-center justify-center text-center py-12 sm:py-16 border border-dashed border-border">
            <div className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-primary mb-3 sm:mb-4">
              ↑ Selecione uma categoria ou período
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-sm">
              Os registros serão carregados após você escolher um filtro acima.
            </p>
          </section>
        )}

        {/* ── Grid de resultados ── */}
        {filtroAtivo && (
          <section className="mt-12 sm:mt-14">
            <div className="flex items-end justify-between border-b border-border pb-3 sm:pb-4 mb-6 sm:mb-8">
              <h2 className="text-display text-xl sm:text-2xl font-bold">
                {filtroCategoria ? (
                  <>
                    <span className="text-primary">#</span>{filtroCategoria}
                  </>
                ) : (
                  "Filtro por período"
                )}
              </h2>
              {!loading && totalRegistros !== null && (
                <span className="text-mono text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest">
                  {totalRegistros.toLocaleString("pt-BR")} registros
                </span>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <TrendCardSkeleton key={i} index={i} />
                ))}
              </div>
            ) : noticias.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center">
                <div className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3 sm:mb-4">
                  Nenhum sinal encontrado
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm mb-5 sm:mb-6">
                  Tente ajustar os filtros ou ampliar o período.
                </p>
                <button
                  onClick={limparFiltros}
                  className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] border border-primary/30 text-primary px-3 sm:px-4 py-1.5 sm:py-2 hover:border-primary transition-colors"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {noticias.map((t, i) => (
                    <div
                      key={t.id}
                      onClick={() => handleSelectNews(t)}
                      className="cursor-pointer transition-all hover:translate-y-[-4px]"
                    >
                      <TrendCard trend={t} index={i} />
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-10 sm:mt-12 flex justify-center">
                    <button
                      onClick={carregarMais}
                      disabled={loadingMore}
                      className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] border border-primary/30 text-primary px-6 sm:px-8 py-3 sm:py-4 hover:border-primary transition-colors disabled:opacity-50"
                    >
                      {loadingMore ? "Carregando..." : "Carregar mais →"}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>

      {/* ── MODAL DE DETALHES RESPONSIVO ── */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          {/* Overlay para fechar */}
          <div className="absolute inset-0" onClick={() => setSelectedNews(null)} />
          
          {/* Modal content - fullscreen no mobile, lateral no desktop */}
          <div className="relative flex flex-col bg-card shadow-2xl w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-2xl sm:rounded-l-2xl border-0 sm:border-l border-border animate-in duration-300 slide-in-from-bottom sm:slide-in-from-right">
            
            {/* Header fixo no topo */}
            <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border p-4 sm:p-6 z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-primary flex-1 break-words">
                  {selectedNews.categoria}
                  {selectedNews.fonte && (
                    <span className="hidden sm:inline"> // {selectedNews.fonte}</span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedNews(null)}
                  className="shrink-0 text-muted-foreground hover:text-primary text-mono text-[10px] sm:text-xs px-3 py-1.5 border border-border rounded-sm"
                >
                  ✕ FECHAR
                </button>
              </div>
              
              {/* Fonte no mobile */}
              {selectedNews.fonte && (
                <div className="text-mono text-[8px] uppercase tracking-[0.15em] text-muted-foreground mt-2 sm:hidden">
                  {selectedNews.fonte}
                </div>
              )}
            </div>

            {/* Conteúdo rolável */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5 sm:space-y-6">
              
              {/* Título */}
              <h2 className="text-display text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight text-foreground">
                {selectedNews.title}
              </h2>

              {/* Resumo Executivo */}
              <div className="relative p-4 sm:p-6 bg-surface/30 border border-border rounded-sm">
                <span className="absolute -top-2.5 left-3 sm:left-4 bg-card px-2 text-mono text-[8px] sm:text-[10px] text-muted-foreground uppercase">
                  Resumo Executivo
                </span>
                <p className="text-foreground leading-relaxed text-sm sm:text-base italic">
                  "{selectedNews.resumo_executivo || selectedNews.description}"
                </p>
              </div>

              {/* Loading de detalhes */}
              {loadingDetalhes ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-2 w-24 bg-muted-foreground/20 animate-pulse rounded" />
                      <div className="h-12 bg-muted-foreground/10 animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {selectedNews.o_que_e && (
                    <div className="space-y-2">
                      <h4 className="text-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-2">
                        <span className="h-px w-4 bg-primary" /> O que é na prática
                      </h4>
                      <p className="text-muted-foreground leading-relaxed text-sm">{selectedNews.o_que_e}</p>
                    </div>
                  )}

                  {selectedNews.impacto_real && (
                    <div className="relative p-4 border border-primary/30 bg-primary/5 rounded-sm">
                      <span className="absolute -top-2.5 left-3 sm:left-4 bg-card px-2 text-mono text-[8px] sm:text-[10px] text-primary uppercase">
                        Impacto Real
                      </span>
                      <p className="text-foreground leading-relaxed text-sm font-medium">{selectedNews.impacto_real}</p>
                    </div>
                  )}

                  {selectedNews.como_aplicar && (
                    <div className="space-y-2">
                      <h4 className="text-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-2">
                        <span className="h-px w-4 bg-primary" /> Como aplicar em obra
                      </h4>
                      <p className="text-muted-foreground leading-relaxed text-sm">{selectedNews.como_aplicar}</p>
                    </div>
                  )}

                  {selectedNews.contras && (
                    <div className="space-y-2">
                      <h4 className="text-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-rose-400 font-bold flex items-center gap-2">
                        <span className="h-px w-4 bg-rose-400" /> Limitações e riscos
                      </h4>
                      <p className="text-muted-foreground leading-relaxed text-sm">{selectedNews.contras}</p>
                    </div>
                  )}

                  {selectedNews.quando_usar && (
                    <div className="space-y-2">
                      <h4 className="text-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-2">
                        <span className="h-px w-4 bg-primary" /> Quando usar
                      </h4>
                      <p className="text-muted-foreground leading-relaxed text-sm">{selectedNews.quando_usar}</p>
                    </div>
                  )}

                  {selectedNews.motivo && (
                    <div className="space-y-2">
                      <h4 className="text-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-2">
                        <span className="h-px w-4 bg-primary" /> Por que isso é relevante
                      </h4>
                      <p className="text-muted-foreground leading-relaxed text-sm">{selectedNews.motivo}</p>
                    </div>
                  )}
                </>
              )}

              {/* Footer */}
              <div className="pt-6 border-t border-border space-y-4">
                <div className="text-mono text-[9px] sm:text-[10px] text-muted-foreground">
                  PUBLICADO EM: {formatTime(selectedNews.pub_date || selectedNews.atualizado_em)}
                </div>
                {selectedNews.link && (
                  <a
                    href={selectedNews.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-primary text-primary-foreground px-4 py-3 sm:py-4 font-bold text-mono text-[10px] sm:text-xs tracking-tighter hover:bg-primary/90 transition-colors rounded-sm"
                  >
                    ACESSAR FONTE ORIGINAL NA ÍNTEGRA →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}