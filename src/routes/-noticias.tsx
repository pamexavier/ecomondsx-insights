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

export interface Noticia {
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
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) + " • " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

function formatarNoticia(n: any): Noticia {
  return {
    ...n,
    title: n.titulo_pt || n.titulo,
    description: n.resumo_executivo || n.resumo_pt || "Análise técnica em processamento...",
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
  badge: string;
}> = {
  Geral: {
    tabela: "noticias",
    tipos: ["aberto"],
    descricao: "Varredura contínua sobre tecnologias inovadoras, materiais e novos métodos que estão redesenhando a construção civil em tempo real.",
    temData: true,
    badge: "Open Feed",
  },
  Estratégia: {
    tabela: "noticias",
    tipos: ["estrategia"],
    descricao: "Inteligência direcionada para aplicação em projetos: modelos que reduzem custos, otimizam o tempo de obra e escalam a performance geral.",
    temData: true,
    badge: "ROI & Performance",
  },
  Radar: {
    tabela: "noticias",
    tipos: ["radar"],
    descricao: "Antecipação de mercado. Tópicos e movimentações estratégicas para blindar ativos financeiros e se posicionar à frente dos concorrentes.",
    temData: false,
    badge: "Early Signals",
  },
  Wellness: {
    tabela: "wellness_noticias",
    tipos: ["indice", "radar_wellness"],
    descricao: "Monitoramento sobre biofilia, conforto termoacústico, qualidade do ar e certificações focadas na saúde e performance humana no ambiente construído.",
    temData: true,
    badge: "IEQ & Biofilia",
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

  // Fechar modal com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedNews(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const totalSinaisCategorias = categorias.reduce((acc, c) => acc + (c.total || 0), 0);
  const maiorCategoriaTotal = categorias[0]?.total || 1;

  /* ────────────────────────────────────────────────────────────────────────
     RENDER 
  ──────────────────────────────────────────────────────────────────────── */
  return (
    <div className="relative min-h-screen bg-background text-foreground bg-noise selection:bg-primary/30">

      {/* ── CSS Customizado ── */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes draw-line {
          from { stroke-dashoffset: 320; }
          to { stroke-dashoffset: 0; }
        }
        .hero-spark path.line {
          stroke-dasharray: 320;
          animation: draw-line 1.4s cubic-bezier(0.2, 0.7, 0.2, 1) forwards 0.2s;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 198, 122, 0.25); 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 198, 122, 0.55);
        }
      `}} />

      {/* Background Arquitetônico & Atmosférico */}
      <div className="pointer-events-none fixed inset-0 bg-grid bg-grid-fade opacity-25" />
      <div className="pointer-events-none fixed top-0 inset-x-0 h-[500px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,198,122,0.12),transparent)]" />

      {/* Header */}
      <header data-local-nav className="sticky top-0 z-40 border-b border-border/40 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0 group">
            <div className="relative flex items-center justify-center">
              <EcomondsLogo size={34} />
              <div className="absolute inset-0 bg-primary/25 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="text-display text-base sm:text-lg font-bold tracking-tight leading-none text-foreground">Vector-X</span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  v2.4
                </span>
              </div>
              <span className="text-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">Intelligence Portal</span>
            </div>
          </Link>

          <nav className="overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 sm:gap-2 bg-card/50 p-1 rounded-xl border border-border/40">
              <Link to="/" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                Home
              </Link>
              <Link to="/noticias" className="text-xs sm:text-sm text-foreground font-semibold bg-background/80 shadow-sm border border-border/50 px-3.5 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Notícias
              </Link>
              <Link to="/wellness-analise-solar" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                Diagnóstico Bioclimático
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 pb-28">

        {/* ── Apresentação / Hero ── */}
        <section className="pt-10 sm:pt-14 pb-8 relative">
          <div className="pointer-events-none absolute -left-32 -top-16 w-[520px] h-[400px] bg-primary/8 blur-[130px] rounded-full" />

          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-8 lg:gap-12 relative">

            {/* Coluna Esquerda: Título e Contexto */}
            <div className="flex-1 space-y-5 animate-fade-up">
              <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Monitoramento Ativo • {config.badge}
              </div>

              <h1 className="text-display max-w-2xl text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] text-foreground">
                Sinais e tendências{" "}
                <span className="bg-gradient-to-r from-primary via-emerald-300 to-primary bg-clip-text text-transparent">
                  do ambiente construído.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
                {config.descricao}
              </p>
            </div>

            {/* Coluna Direita: Card de Telemetria de Sinais */}
            <div className="w-full lg:w-[400px] shrink-0 relative animate-fade-up" style={{ animationDelay: "120ms" }}>
              <div className="relative bg-gradient-to-b from-card/90 to-card/40 backdrop-blur-xl border border-border/70 rounded-2xl p-6 overflow-hidden shadow-2xl">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                <div className="pointer-events-none absolute -right-10 -top-10 w-44 h-44 bg-primary/10 blur-[60px] rounded-full" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-mono text-[10px] text-muted-foreground uppercase tracking-[0.14em]">
                      Sinais Mapeados ({aba})
                    </h3>
                    <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <path d="M6 15l6-6 6 6" />
                      </svg>
                      alta densidade
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-4xl font-extrabold text-foreground tabular-nums tracking-tight">
                      {totalSinaisCategorias.toLocaleString("pt-BR")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      registros indexados
                    </span>
                  </div>

                  {/* Sparkline com ponto final pulsante */}
                  <div className="relative">
                    <svg className="hero-spark w-full h-14 overflow-visible" viewBox="0 0 280 56" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="heroSparkFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.32" />
                          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,44 L28,40 L56,46 L84,28 L112,34 L140,18 L168,24 L196,10 L224,18 L252,6 L280,12 L280,56 L0,56 Z"
                        fill="url(#heroSparkFill)" stroke="none"
                      />
                      <path
                        className="line"
                        d="M0,44 L28,40 L56,46 L84,28 L112,34 L140,18 L168,24 L196,10 L224,18 L252,6 L280,12"
                        fill="none" stroke="var(--color-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                      />
                      <circle cx="280" cy="12" r="3.5" fill="var(--color-primary)" />
                    </svg>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Foco dominante:</span>
                    <span className="font-semibold text-foreground truncate max-w-[190px]">
                      {categorias[0]?.nome || "Sincronizando..."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Painel de Comando Sticky ── */}
        <section className="sticky top-[61px] z-30 py-3.5 -mx-4 px-4 sm:-mx-6 sm:px-6 bg-background/80 backdrop-blur-xl border-y border-border/50 shadow-sm">
          <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center">

            {/* Seletor de Abas */}
            <Tooltip.Provider delayDuration={150}>
              <div className="flex flex-wrap gap-1.5 bg-card/60 p-1.5 rounded-xl border border-border/60">
                {ABAS.map((a) => {
                  const ativo = aba === a;
                  return (
                    <Tooltip.Root key={a}>
                      <Tooltip.Trigger asChild>
                        <button
                          onClick={() => setAba(a)}
                          className={`relative text-xs sm:text-sm font-semibold px-5 py-2 rounded-lg border transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                            ativo
                              ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_rgba(0,198,122,0.25)]"
                              : "border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground"
                          }`}
                        >
                          {a}
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content side="bottom" sideOffset={8} className="z-50 max-w-[260px] rounded-xl border border-border bg-card/95 backdrop-blur-md px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground shadow-2xl">
                          <span className="block font-semibold text-foreground mb-0.5">{a}</span>
                          {ABA_CONFIG[a].descricao}
                          <Tooltip.Arrow className="fill-card" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  );
                })}
              </div>
            </Tooltip.Provider>

            {/* Filtros de Período e Data */}
            <div className="flex flex-wrap items-center justify-between xl:justify-end gap-2.5">
              <div className="flex items-center gap-1 bg-card/60 p-1 rounded-xl border border-border/60">
                {([
                  { key: "recente", label: labelRecente },
                  { key: "7dias", label: "7 Dias" },
                  { key: "30dias", label: "30 Dias" },
                  { key: "todos", label: "Tudo" },
                ] as const).map((opt) => {
                  const isSelected = periodo === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setPeriodo(opt.key)}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-all outline-none ${
                        isSelected
                          ? "text-foreground bg-background shadow-sm border border-border/60 font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/40 border border-transparent"
                      } ${temFiltroAtivo ? "opacity-35 pointer-events-none" : ""}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {config.temData && (
                <div className="flex items-center gap-1.5 bg-card/60 border border-border/60 p-1 rounded-xl">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg focus-within:bg-background/60 transition-colors">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">De</span>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="text-xs bg-transparent text-foreground focus:outline-none focus:text-primary transition-colors w-[104px]"
                    />
                  </div>
                  <span className="text-border">|</span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg focus-within:bg-background/60 transition-colors">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">Até</span>
                    <input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="text-xs bg-transparent text-foreground focus:outline-none focus:text-primary transition-colors w-[104px]"
                    />
                  </div>
                  {(dataInicio || dataFim) && (
                    <button
                      onClick={() => { setDataInicio(""); setDataFim(""); }}
                      className="text-xs text-rose-400 hover:bg-rose-500/10 px-2 py-1 rounded-md transition-colors"
                      title="Limpar datas"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Categorias com Barra de Densidade ── */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              Clusters de Tópicos
            </h3>
            {categoriaFiltro && (
              <button
                onClick={() => setCategoriaFiltro(null)}
                className="text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>✕</span> Limpar filtro: {categoriaFiltro}
              </button>
            )}
          </div>

          {loadingCategorias ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[68px] rounded-xl bg-card/40 border border-border/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {categorias.map((cat) => {
                const ativo = categoriaFiltro === cat.nome;
                const percentual = Math.max(8, Math.round((cat.total / maiorCategoriaTotal) * 100));
                return (
                  <button
                    key={cat.nome}
                    onClick={() => setCategoriaFiltro((prev) => (prev === cat.nome ? null : cat.nome))}
                    className={`group relative flex flex-col justify-between rounded-xl p-3.5 text-left transition-all duration-200 border overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      ativo
                        ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(0,198,122,0.12)]"
                        : "border-border/50 bg-card/30 hover:border-border hover:bg-card/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full mb-2">
                      <span
                        className={`text-xs truncate transition-colors ${
                          ativo ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {cat.nome}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded tabular-nums ${
                          ativo
                            ? "bg-primary text-primary-foreground"
                            : "bg-background/60 text-foreground/80 group-hover:text-foreground"
                        }`}
                      >
                        {cat.total}
                      </span>
                    </div>

                    {/* Microbarra de volume relativo */}
                    <div className="w-full h-1 bg-border/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          ativo ? "bg-primary" : "bg-muted-foreground/40 group-hover:bg-primary/70"
                        }`}
                        style={{ width: `${percentual}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Marquee de Keywords ── */}
        {aba === "Geral" && keywords.length > 0 && (
          <section className="mt-6">
            <KeywordMarquee
              keywords={keywords}
              activeKeyword={keywordFiltro}
              onSelect={(kw) => setKeywordFiltro((prev) => (prev === kw ? null : kw))}
            />
          </section>
        )}

        {/* ── Grid de Notícias ── */}
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-display text-xl sm:text-2xl font-bold flex items-center gap-2 text-foreground">
                {categoriaFiltro ? (
                  <>
                    <span className="text-primary font-mono">#</span> {categoriaFiltro}
                  </>
                ) : keywordFiltro ? (
                  <>
                    <span className="text-primary font-mono">#</span> {keywordFiltro}
                  </>
                ) : (
                  {
                    recente: "Sinais do Dia",
                    "7dias": "Radar Semanal",
                    "30dias": "Consolidado Mensal",
                    todos: "Base Completa",
                  }[periodo]
                )}
              </h2>
              {temFiltroAtivo && (
                <button
                  onClick={limparFiltros}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  Resetar visualização
                </button>
              )}
            </div>

            {!loading && totalRegistros !== null && (
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-card/50 border border-border/50 px-3 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                {totalRegistros.toLocaleString("pt-BR")} {totalRegistros === 1 ? "sinal encontrado" : "sinais encontrados"}
              </div>
            )}
          </div>

          {semNoticias ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card/20 rounded-2xl border border-border/40 border-dashed">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-1.5 text-foreground">Nenhum sinal encontrado para este recorte</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Não há registros correspondentes à combinação atual de categoria, palavra-chave ou janela de tempo.
              </p>
              <button
                onClick={() => { limparFiltros(); setPeriodo("todos"); }}
                className="text-xs font-semibold bg-primary text-primary-foreground px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all shadow-sm"
              >
                Ver Base Completa
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <TrendCardSkeleton key={i} index={i} />)
                  : noticiasFiltradas.map((t, i) => (
                      <div key={t.id} onClick={() => handleSelectNews(t)} className="cursor-pointer h-full">
                        <TrendCard trend={t} index={i} />
                      </div>
                    ))}
              </div>

              {hasMore && !loading && (
                <div className="mt-12 flex justify-center">
                  <button
                    onClick={carregarMais}
                    disabled={loadingMore}
                    className="group text-xs sm:text-sm font-semibold border border-border/70 bg-card/60 hover:bg-card text-foreground px-7 py-3.5 rounded-xl hover:border-primary/50 transition-all disabled:opacity-50 flex items-center gap-2.5 shadow-sm"
                  >
                    {loadingMore ? "Sincronizando mais sinais..." : "Carregar mais sinais"}
                    {!loadingMore && (
                      <span className="text-primary group-hover:translate-y-0.5 transition-transform">↓</span>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* ── MODAL DE LEITURA (Bento Dossier Layout) ── */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-2 sm:p-4 md:p-6">
          <div className="absolute inset-0" onClick={() => setSelectedNews(null)} />

          <div className="relative flex flex-col bg-card shadow-2xl w-full max-w-4xl max-h-[92vh] rounded-2xl border border-border/80 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            {/* Top Bar Fixa do Modal */}
            <div className="sticky top-0 z-20 flex items-center justify-between px-5 sm:px-7 py-4 border-b border-border/60 bg-card/95 backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  {selectedNews.categoria || "Geral"}
                </span>

                {selectedNews.score_tecnico !== undefined && selectedNews.score_tecnico > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-background/80 text-foreground border border-border">
                    Score Técnico: <strong className="text-primary">{selectedNews.score_tecnico}</strong>
                  </span>
                )}

                {selectedNews.fonte && (
                  <span className="text-xs text-muted-foreground hidden sm:inline-block border-l border-border pl-3">
                    Fonte: <strong className="text-foreground/80 font-medium">{selectedNews.fonte}</strong>
                  </span>
                )}
              </div>

              <button
                onClick={() => setSelectedNews(null)}
                aria-label="Fechar"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/60 rounded-lg transition-colors hover:border-border bg-background/50"
              >
                <span className="hidden sm:inline font-mono text-[10px]">ESC</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Corpo do Dossiê */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8 bg-card">
              <div className="max-w-3xl mx-auto space-y-8">

                {/* Cabeçalho do Artigo */}
                <div className="space-y-5">
                  <h2 className="text-display text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.18] text-foreground tracking-tight">
                    {selectedNews.title}
                  </h2>

                  {/* Card de Resumo Executivo */}
                  <div className="relative p-5 sm:p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/25 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 text-xs text-primary uppercase font-mono font-semibold tracking-wider mb-2.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      Síntese Executiva
                    </div>
                    <p className="text-foreground/95 leading-relaxed text-sm sm:text-base font-medium">
                      {selectedNews.resumo_executivo || selectedNews.description}
                    </p>
                  </div>
                </div>

                {/* Grid de Análise Profunda */}
                {loadingDetalhes ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="p-5 rounded-xl border border-border/40 bg-background/30 space-y-3">
                        <div className="h-3.5 w-28 rounded bg-border animate-pulse" />
                        <div className="h-16 rounded bg-border/50 animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">

                    {selectedNews.o_que_e && (
                      <div className="md:col-span-2 p-5 rounded-xl bg-background/40 border border-border/60 space-y-2">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
                          O que é na prática
                        </h4>
                        <p className="text-foreground/90 leading-relaxed text-sm sm:text-base">
                          {selectedNews.o_que_e}
                        </p>
                      </div>
                    )}

                    {selectedNews.impacto_real && (
                      <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/25 space-y-2">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-primary flex items-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                            <polyline points="17 6 23 6 23 12" />
                          </svg>
                          Impacto Real & ROI
                        </h4>
                        <p className="text-foreground leading-relaxed text-sm font-medium">
                          {selectedNews.impacto_real}
                        </p>
                      </div>
                    )}

                    {selectedNews.como_aplicar && (
                      <div className="p-5 rounded-xl bg-background/40 border border-border/60 space-y-2">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                          </svg>
                          Aplicação em Projeto / Obra
                        </h4>
                        <p className="text-muted-foreground leading-relaxed text-sm">
                          {selectedNews.como_aplicar}
                        </p>
                      </div>
                    )}

                    {selectedNews.quando_usar && (
                      <div className="p-5 rounded-xl bg-background/40 border border-border/60 space-y-2">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          Timing & Contexto de Uso
                        </h4>
                        <p className="text-muted-foreground leading-relaxed text-sm">
                          {selectedNews.quando_usar}
                        </p>
                      </div>
                    )}

                    {selectedNews.motivo && (
                      <div className="p-5 rounded-xl bg-background/40 border border-border/60 space-y-2">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                          </svg>
                          Relevância Estratégica
                        </h4>
                        <p className="text-muted-foreground leading-relaxed text-sm">
                          {selectedNews.motivo}
                        </p>
                      </div>
                    )}

                    {selectedNews.contras && (
                      <div className="md:col-span-2 p-5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-rose-400 flex items-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                          Limitações, Gargalos e Riscos
                        </h4>
                        <p className="text-muted-foreground leading-relaxed text-sm">
                          {selectedNews.contras}
                        </p>
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>

            {/* Footer Fixo com Ação */}
            <div className="px-5 sm:px-7 py-4 border-t border-border/60 bg-card/95 backdrop-blur-md shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs font-mono text-muted-foreground">
                Indexado em: <span className="text-foreground/80">{formatTime(selectedNews.pub_date || selectedNews.atualizado_em)}</span>
              </div>
              {selectedNews.link && (
                <a
                  href={selectedNews.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 font-semibold text-xs sm:text-sm rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(0,198,122,0.2)]"
                >
                  Acessar Documento Original
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </a>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}