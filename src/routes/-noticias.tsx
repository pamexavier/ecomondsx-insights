import { Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { EcomondsLogo } from "@/components/EcomondsLogo";
import { TrendCard, TrendCardSkeleton } from "@/components/TrendCard";
import { KeywordMarquee } from "@/components/KeywordMarquee";
import { supabase } from "@/lib/supabase";

/* ────────────────────────────────────────────────────────────────────────
   TIPOS E CONFIGURAÇÕES
──────────────────────────────────────────────────────────────────────── */

export type Aba = "Geral" | "Estratégia" | "Radar" | "Wellness";
type Periodo = "recente" | "7dias" | "30dias" | "todos";

const PAGE_SIZE = 20;

interface CategoriaInfo { nome: string; total: number }

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
  score_tecnico?: number;
  metricas?: any;
  o_que_e?: string;
  impacto_real?: string;
  como_aplicar?: string;
  contras?: string;
  quando_usar?: string;
  motivo?: string;
  title: string;
  description: string;
  category: string;
  trend: "up";
  relevance: number;
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

function formatarNoticia(n: any): Noticia {
  return {
    ...n,
    title: n.titulo_pt || n.titulo,
    description: n.resumo_executivo || n.resumo_pt || "Análise em processamento...",
    category: n.categoria || "Geral",
    trend: "up",
    relevance: n.score_tecnico ?? 0,
  };
}

const ABA_CONFIG: Record<Aba, {
  tabela: "noticias" | "wellness_noticias";
  tipos: string[];
  descricao: string;
  temData: boolean;
}> = {
  Geral: {
    tabela: "noticias",
    tipos: ["aberto"],
    descricao: "Varredura contínua sobre tecnologias inovadoras, materiais e novos métodos que estão redesenhando a construção civil em tempo real.",
    temData: true,
  },
  Estratégia: {
    tabela: "noticias",
    tipos: ["estrategia"],
    descricao: "Inteligência direcionada para aplicação em projetos: modelos que reduzem custos, otimizam o tempo de obra e escalam a performance geral.",
    temData: true,
  },
  Radar: {
    tabela: "noticias",
    tipos: ["radar"],
    descricao: "Antecipação de mercado. Tópicos e movimentações estratégicas para blindar ativos financeiros e se posicionar à frente dos concorrentes.",
    temData: false,
  },
  Wellness: {
    tabela: "wellness_noticias",
    tipos: ["indice", "radar_wellness"],
    descricao: "Monitoramento sobre biofilia, conforto acústico, qualidade do ar e certificações focadas na experiência humana dentro do ambiente construído.",
    temData: true,
  },
};

interface Props {
  abaInicial?: Aba;
}

/* ────────────────────────────────────────────────────────────────────────
   COMPONENTE PRINCIPAL
──────────────────────────────────────────────────────────────────────── */

export default function Noticias({ abaInicial = "Geral" }: Props) {
  const [aba, setAba] = useState<Aba>(abaInicial);
  const config = ABA_CONFIG[aba];

  const [periodo, setPeriodo] = useState<Periodo>("recente");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [keywordFiltro, setKeywordFiltro] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [dataMaisRecente, setDataMaisRecente] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<CategoriaInfo[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [keywords, setKeywords] = useState<string[]>([]);

  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [totalRegistros, setTotalRegistros] = useState<number | null>(null);

  const [selectedNews, setSelectedNews] = useState<Noticia | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);

  const filtroPorData = dataInicio || dataFim;
  const temFiltroAtivo = !!(categoriaFiltro || filtroPorData);

  useEffect(() => {
    setCategoriaFiltro(null);
    setKeywordFiltro(null);
    setDataInicio("");
    setDataFim("");
    setPeriodo("recente");
    setPage(0);
    setNoticias([]);
    setTotalRegistros(null);
    setDataMaisRecente(null);
  }, [aba]);

  useEffect(() => {
    async function fetchDataRecente() {
      try {
        const tabela = ABA_CONFIG[aba].tabela;
        let query = supabase.from(tabela).select("atualizado_em").order("atualizado_em", { ascending: false }).limit(1);
        if (tabela === "noticias") query = query.in("tipo", ABA_CONFIG[aba].tipos);
        const { data } = await query;
        if (data?.[0]?.atualizado_em) setDataMaisRecente(data[0].atualizado_em);
      } catch { }
    }
    fetchDataRecente();
  }, [aba]);

  useEffect(() => {
    async function fetchCategorias() {
      setLoadingCategorias(true);
      try {
        const tabela = ABA_CONFIG[aba].tabela;
        let query = supabase.from(tabela).select("categoria").not("categoria", "is", null);
        if (tabela === "noticias") query = query.in("tipo", ABA_CONFIG[aba].tipos);
        const { data } = await query;
        const contagem: Record<string, number> = {};
        (data ?? []).forEach((n: any) => {
          const c = n.categoria?.trim();
          if (c) contagem[c] = (contagem[c] || 0) + 1;
        });
        const lista = Object.entries(contagem).map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
        setCategorias(lista);
        setKeywords(lista.slice(0, 12).map((c) => c.nome));
      } finally {
        setLoadingCategorias(false);
      }
    }
    fetchCategorias();
  }, [aba]);

  const fetchNoticias = useCallback(async (pageNum: number, reset = false) => {
    try {
      if (pageNum === 0) setLoading(true); else setLoadingMore(true);

      const tabela = ABA_CONFIG[aba].tabela;
      const campos = "id, titulo, titulo_pt, resumo_executivo, resumo_pt, categoria, fonte, atualizado_em, pub_date, link, score_tecnico, metricas";

      let query = supabase.from(tabela).select(campos, { count: "exact" }).order("atualizado_em", { ascending: false });

      if (tabela === "noticias") query = query.in("tipo", ABA_CONFIG[aba].tipos);
      if (categoriaFiltro) query = query.ilike("categoria", categoriaFiltro);
      if (dataInicio) query = query.gte("atualizado_em", new Date(dataInicio).toISOString());
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        query = query.lte("atualizado_em", fim.toISOString());
      }

      if (!temFiltroAtivo) {
        const agora = new Date();
        const seteDias = new Date(agora); seteDias.setDate(seteDias.getDate() - 7);
        const trintaDias = new Date(agora); trintaDias.setDate(trintaDias.getDate() - 30);

        switch (periodo) {
          case "recente":
            if (dataMaisRecente) {
              const diaRecente = new Date(dataMaisRecente); diaRecente.setHours(0, 0, 0, 0);
              const proximoDia = new Date(diaRecente); proximoDia.setDate(proximoDia.getDate() + 1);
              query = query.gte("atualizado_em", diaRecente.toISOString()).lt("atualizado_em", proximoDia.toISOString());
            }
            break;
          case "7dias": query = query.gte("atualizado_em", seteDias.toISOString()); break;
          case "30dias": query = query.gte("atualizado_em", trintaDias.toISOString()); break;
          case "todos": break;
        }
      }

      query = query.range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);
      const { data, error, count } = await query;
      if (error) throw error;

      const formatadas = (data ?? []).map(formatarNoticia);
      if (reset || pageNum === 0) setNoticias(formatadas); else setNoticias((prev) => [...prev, ...formatadas]);
      
      setHasMore(formatadas.length === PAGE_SIZE);
      if (count !== null) setTotalRegistros(count);
    } catch (err) {
      console.error("Erro ao buscar notícias:", err);
      setNoticias([]);
    } finally {
      setLoading(false); setLoadingMore(false);
    }
  }, [aba, periodo, categoriaFiltro, dataInicio, dataFim, temFiltroAtivo, dataMaisRecente]);

  useEffect(() => {
    if (periodo === "recente" && dataMaisRecente === null) return;
    setPage(0);
    fetchNoticias(0, true);
  }, [aba, periodo, categoriaFiltro, dataInicio, dataFim, dataMaisRecente]);

  const handleSelectNews = async (news: Noticia) => {
    setSelectedNews(news);
    setLoadingDetalhes(true);
    try {
      const tabela = ABA_CONFIG[aba].tabela;
      const { data, error } = await supabase
        .from(tabela)
        .select("o_que_e, impacto_real, como_aplicar, contras, quando_usar, motivo")
        .eq("id", news.id)
        .single();
      if (error) throw error;
      if (data) setSelectedNews((prev) => prev?.id === news.id ? { ...prev, ...data } : prev);
    } catch { } finally {
      setLoadingDetalhes(false);
    }
  };

  const limparFiltros = () => {
    setCategoriaFiltro(null); setKeywordFiltro(null); setDataInicio(""); setDataFim("");
  };

  const carregarMais = () => {
    const next = page + 1;
    setPage(next);
    fetchNoticias(next);
  };

  const noticiasFiltradas = keywordFiltro ? noticias.filter((n) => n.category === keywordFiltro) : noticias;
  const semNoticias = !loading && noticiasFiltradas.length === 0;
  const ABAS: Aba[] = ["Geral", "Estratégia", "Radar", "Wellness"];

  const labelRecente = dataMaisRecente
    ? new Date(dataMaisRecente).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    : "Recente";

  /* ────────────────────────────────────────────────────────────────────────
     RENDER 
  ──────────────────────────────────────────────────────────────────────── */
 return (
    <div className="relative min-h-screen bg-background text-foreground bg-noise selection:bg-primary/30">

      {/* ── CSS Customizado (Scrollbar do Modal + Sparkline do Hero) ── */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes draw-line {
          from { stroke-dashoffset: 320; }
          to { stroke-dashoffset: 0; }
        }
        .hero-spark path.line {
          stroke-dasharray: 320;
          animation: draw-line 1.4s cubic-bezier(0.2, 0.7, 0.2, 1) forwards 0.3s;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 198, 122, 0.3); 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 198, 122, 0.6);
        }
      `}} />

      {/* Background Tech */}
      <div className="pointer-events-none fixed inset-0 bg-grid bg-grid-fade opacity-30" />
      <div className="pointer-events-none fixed top-0 inset-x-0 h-[400px] bg-gradient-to-b from-primary/5 to-transparent" />

      {/* Header */}
      <header data-local-nav className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity shrink-0 group">
            <div className="relative">
              <EcomondsLogo size={32} />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-display text-base sm:text-lg font-bold tracking-tight leading-none text-foreground">Vector-X</span>
              <span className="text-mono text-[9px] uppercase tracking-[0.15em] text-primary/80 mt-0.5">Intelligence Portal</span>
            </div>
          </Link>
          <nav className="overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-5 sm:gap-7 px-1">
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">Home</Link>
              <Link to="/noticias" className="text-sm text-foreground font-semibold whitespace-nowrap relative">
                Notícias
                <span className="absolute -bottom-4 left-0 w-full h-[2px] bg-primary" />
              </Link>
              <Link to="/wellness-analise-solar" className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">Diagnóstico Bioclimático</Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 pb-24">

        {/* ── Apresentação ── */}
        <section className="pt-10 sm:pt-14 pb-10 relative">
          {/* Glow sutil atrás do título — dá profundidade sem virar neon */}
          <div className="pointer-events-none absolute -left-24 -top-10 w-[480px] h-[380px] bg-primary/10 blur-[110px] rounded-full" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 relative">

            <div className="flex-1 space-y-5 animate-fade-up">
              <div className="inline-flex items-center gap-2 text-mono text-[10px] uppercase tracking-[0.15em] text-primary">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                </span>
                Monitoramento ativo
              </div>

              <h1 className="text-display max-w-2xl text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.15] text-foreground">
                Sinais e tendências <br />
                <span className="text-primary">do ambiente construído.</span>
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed">
                {config.descricao}
              </p>
            </div>

            {/* Painel lateral — cartão de sinal com mini-gráfico, substitui o radar */}
            <div className="w-full lg:w-[380px] shrink-0 relative animate-fade-up" style={{ animationDelay: "150ms" }}>
              <div className="relative bg-card border border-border rounded-2xl p-6 overflow-hidden">
                <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 bg-primary/10 blur-[60px] rounded-full" />

                <div className="relative z-10">
                  <h3 className="text-mono text-[10px] text-muted-foreground uppercase tracking-[0.1em] mb-1">
                    Sinais monitorados
                  </h3>

                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-bold text-foreground tabular-nums">
                      {categorias.reduce((acc, c) => acc + (c.total || 0), 0)}
                    </span>
                    <span className="text-xs font-semibold text-primary flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <path d="M6 15l6-6 6 6" />
                      </svg>
                      em alta
                    </span>
                  </div>

                  <svg className="hero-spark w-full h-14" viewBox="0 0 280 56" preserveAspectRatio="none">
                    <path
                      d="M0,44 L28,40 L56,46 L84,28 L112,34 L140,18 L168,24 L196,10 L224,18 L252,6 L280,12 L280,56 L0,56 Z"
                      fill="url(#heroSparkFill)" stroke="none" opacity="0.5"
                    />
                    <path
                      className="line"
                      d="M0,44 L28,40 L56,46 L84,28 L112,34 L140,18 L168,24 L196,10 L224,18 L252,6 L280,12"
                      fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    />
                    <defs>
                      <linearGradient id="heroSparkFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <p className="text-xs text-muted-foreground/80 leading-relaxed mt-4 pt-4 border-t border-border/50">
                    Volume de sinais coletados nos últimos 30 dias, com aceleração em {categorias[0]?.nome?.toLowerCase() || "novidades recentes"}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Painel de Comando ── */}
        <section className="mt-2 sticky top-16 z-30 py-4 bg-background/80 backdrop-blur-md border-y border-border/40">
          <div className="flex flex-col xl:flex-row gap-5 justify-between items-start xl:items-center">

            <Tooltip.Provider delayDuration={150}>
              <div className="flex flex-wrap gap-1.5 w-full xl:w-auto bg-card/40 p-1.5 rounded-xl border border-border/40">
                {ABAS.map((a) => {
                  const ativo = aba === a;
                  return (
                    <Tooltip.Root key={a}>
                      <Tooltip.Trigger asChild>
                        <button onClick={() => setAba(a)}
                          className={`relative text-sm font-medium px-6 py-2.5 rounded-lg border-none outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                            ativo
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-card hover:text-foreground"
                          }`}>
                          {a}
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content side="bottom" sideOffset={8} className="z-50 max-w-[240px] rounded-xl border border-border bg-background/95 backdrop-blur px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground shadow-2xl">
                          {ABA_CONFIG[a].descricao}
                          <Tooltip.Arrow className="fill-background" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  );
                })}
              </div>
            </Tooltip.Provider>

            {/* Filtros de Tempo */}
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              <div className="flex items-center gap-1 bg-card/40 p-1.5 rounded-xl border border-border/40">
                {([ { key: "recente", label: labelRecente }, { key: "7dias", label: "7 Dias" }, { key: "30dias", label: "30 Dias" }, { key: "todos", label: "Tudo" } ] as const).map((opt) => (
                  <button key={opt.key} onClick={() => setPeriodo(opt.key)}
                    className={`text-xs px-3.5 py-1.5 rounded-lg border-none outline-none transition-all focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                      periodo === opt.key ? "text-foreground bg-border/50 font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-border/20"
                    } ${temFiltroAtivo ? "opacity-30 pointer-events-none" : ""}`}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {config.temData && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-card/40 border border-border/40 px-3 py-1.5 rounded-xl focus-within:border-primary/50 transition-colors">
                    <span className="text-[10px] text-muted-foreground uppercase">De</span>
                    <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
                      className="text-xs bg-transparent text-foreground focus:outline-none focus:text-primary transition-colors w-[100px]" />
                  </div>
                  <div className="flex items-center gap-2 bg-card/40 border border-border/40 px-3 py-1.5 rounded-xl focus-within:border-primary/50 transition-colors">
                    <span className="text-[10px] text-muted-foreground uppercase">Até</span>
                    <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
                      className="text-xs bg-transparent text-foreground focus:outline-none focus:text-primary transition-colors w-[100px]" />
                  </div>
                  {(dataInicio || dataFim) && (
                    <button onClick={() => { setDataInicio(""); setDataFim(""); }}
                      className="text-xs text-rose-400 hover:bg-rose-400/10 px-3 py-1.5 rounded-lg transition-colors" title="Limpar Data">✕</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Categorias ── */}
        <section className="mt-8 sm:mt-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <span className="w-1 h-3.5 bg-primary rounded-sm opacity-60" /> Categorias
            </h3>
            {categoriaFiltro && (
              <button onClick={() => setCategoriaFiltro(null)} className="text-xs text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1">
                ✕ Remover filtro
              </button>
            )}
          </div>
          {loadingCategorias ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-card/40 border border-border/40 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {categorias.map((cat) => {
                const ativo = categoriaFiltro === cat.nome;
                return (
                  <button key={cat.nome} onClick={() => setCategoriaFiltro(prev => prev === cat.nome ? null : cat.nome)}
                    className={`group relative flex flex-col gap-1 rounded-xl p-4 text-left transition-all duration-200 border outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                      ativo ? "border-primary bg-primary/10" : "border-border/40 bg-card/20 hover:border-border hover:bg-card/40"
                    }`}>
                    <span className={`text-xs truncate transition-colors ${
                      ativo ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"}`}>{cat.nome}</span>
                    <span className={`text-lg font-bold tabular-nums ${ativo ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                      {cat.total}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {aba === "Geral" && keywords.length > 0 && (
          <section className="mt-8">
            <KeywordMarquee keywords={keywords} activeKeyword={keywordFiltro} onSelect={(kw) => setKeywordFiltro(prev => prev === kw ? null : kw)} />
          </section>
        )}

        {/* ── Grid de Notícias ── */}
        <section className="mt-10 sm:mt-12">
          <div className="flex items-end justify-between border-b border-border/30 pb-3 mb-6">
            <h2 className="text-display text-xl sm:text-2xl font-bold flex items-center gap-2 text-foreground">
              {categoriaFiltro ? ( <><span className="text-primary">#</span> {categoriaFiltro}</> ) 
               : keywordFiltro ? ( <><span className="text-primary">#</span> {keywordFiltro}</> ) 
               : ({ recente: `Sinais do Dia`, "7dias": "Radar Semanal", "30dias": "Consolidado Mensal", todos: "Base Completa" }[periodo])}
            </h2>
            {!loading && totalRegistros !== null && (
              <span className="text-xs text-muted-foreground bg-card/40 border border-border/40 px-3 py-1 rounded-md">
                {totalRegistros.toLocaleString("pt-BR")} itens
              </span>
            )}
          </div>

          {semNoticias ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-card/10 rounded-2xl border border-border/20 border-dashed">
              <h3 className="text-lg font-bold mb-2 text-foreground">Nenhum resultado para este filtro</h3>
              <p className="text-sm text-muted-foreground mb-5">Tente outra categoria, período ou palavra-chave.</p>
              {(categoriaFiltro || filtroPorData) && (
                <button onClick={limparFiltros} className="text-xs border border-primary/30 text-primary px-4 py-2 rounded-lg hover:bg-primary/5 transition-all">
                  Limpar Filtros
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? Array.from({ length: 6 }).map((_, i) => <TrendCardSkeleton key={i} index={i} />)
                  : noticiasFiltradas.map((t, i) => (
                      <div key={t.id} onClick={() => handleSelectNews(t)} className="cursor-pointer">
                        <TrendCard trend={t} index={i} />
                      </div>
                    ))}
              </div>
              {hasMore && !loading && (
                <div className="mt-10 flex justify-center">
                  <button onClick={carregarMais} disabled={loadingMore} className="group text-sm border border-border/50 bg-card/30 text-foreground px-6 py-3 rounded-xl hover:border-primary/50 transition-all disabled:opacity-50 flex items-center gap-2">
                    {loadingMore ? "Carregando..." : "Carregar mais"}
                    {!loadingMore && <span className="group-hover:translate-y-0.5 transition-transform">↓</span>}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* ── MODAL DE LEITURA ── */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-2 sm:p-4 md:p-6">
          <div className="absolute inset-0" onClick={() => setSelectedNews(null)} />

          <div className="relative flex flex-col bg-card shadow-2xl w-full max-w-4xl h-[95vh] rounded-xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Top Bar Fixa */}
            <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3 border-b border-border/60 bg-card">
              <div className="flex items-center gap-3">
                <span className="text-primary text-xs font-semibold flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  {selectedNews.categoria}
                </span>
                {selectedNews.fonte && (
                  <span className="text-xs text-muted-foreground hidden sm:block border-l border-border pl-3">
                    Fonte: {selectedNews.fonte}
                  </span>
                )}
              </div>
              <button onClick={() => setSelectedNews(null)}
                aria-label="Fechar"
                className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground border border-border/60 rounded-lg transition-colors hover:border-border bg-background/40">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Conteúdo em coluna única */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8 md:p-10 bg-card flex justify-center">

              <div className="w-full max-w-3xl space-y-10">

                {/* Título e Resumo */}
                <div className="space-y-6">
                  <h2 className="text-display text-3xl sm:text-4xl font-extrabold leading-tight text-foreground">
                    {selectedNews.title}
                  </h2>

                  <div className="p-5 bg-primary/5 border border-primary/20 rounded-lg">
                    <h4 className="text-xs text-primary uppercase font-semibold tracking-wide mb-2">Resumo Executivo</h4>
                    <p className="text-foreground/90 leading-relaxed text-sm sm:text-base">
                      {selectedNews.resumo_executivo || selectedNews.description}
                    </p>
                  </div>
                </div>

                {/* Detalhes */}
                {loadingDetalhes ? (
                  <div className="flex flex-col space-y-6 opacity-60">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-3 w-24 rounded bg-border animate-pulse" />
                        <div className="h-20 rounded-lg bg-background/50 animate-pulse border border-border/40" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col space-y-8 pb-8">

                    {selectedNews.o_que_e && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2">
                          O que é na prática
                        </h4>
                        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{selectedNews.o_que_e}</p>
                      </div>
                    )}

                    {selectedNews.impacto_real && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-primary border-b border-primary/20 pb-2">
                          Impacto Real (ROI)
                        </h4>
                        <p className="text-foreground leading-relaxed text-sm sm:text-base font-medium">{selectedNews.impacto_real}</p>
                      </div>
                    )}

                    {selectedNews.como_aplicar && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2">
                          Como aplicar em obra
                        </h4>
                        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{selectedNews.como_aplicar}</p>
                      </div>
                    )}

                    {selectedNews.quando_usar && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2">
                          Quando Usar
                        </h4>
                        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{selectedNews.quando_usar}</p>
                      </div>
                    )}

                    {selectedNews.motivo && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground border-b border-border/40 pb-2">
                          Por que é relevante
                        </h4>
                        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{selectedNews.motivo}</p>
                      </div>
                    )}

                    {selectedNews.contras && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-rose-400 border-b border-rose-500/20 pb-2">
                          Limitações e Riscos
                        </h4>
                        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{selectedNews.contras}</p>
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>

            {/* Footer com link original */}
            <div className="p-4 sm:p-5 border-t border-border/60 bg-card shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground">
                Data do Registro: {formatTime(selectedNews.pub_date || selectedNews.atualizado_em)}
              </div>
              {selectedNews.link && (
                <a href={selectedNews.link} target="_blank" rel="noopener noreferrer"
                  className="w-full sm:w-auto text-center bg-primary text-primary-foreground px-8 py-3 font-semibold text-sm rounded-lg hover:bg-primary/90 transition-colors">
                  Acessar Documento Fonte →
                </a>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
