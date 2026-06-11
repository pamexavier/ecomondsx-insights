import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EcomondsLogo } from "@/components/EcomondsLogo";
import { WellnessCard, WellnessCardSkeleton, type WellnessNoticia } from "@/components/WellnessCard";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/lib/supabase";

// ─── tipos locais ─────────────────────────────────────────────────────────────

interface CertCount { cert: string; total: number }
interface CatCount  { categoria: string; total: number }

interface Stats {
  totalHoje: number;
  totalFontes: number;
  lastSync: string | null;
  destaque: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

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

function formatSyncTime(iso: string | null) {
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

// ─── página principal ─────────────────────────────────────────────────────────

export default function WellnessDashboard() {
  const [noticias, setNoticias]             = useState<WellnessNoticia[]>([]);
  const [loading, setLoading]               = useState(true);
  const [selectedNews, setSelectedNews]     = useState<WellnessNoticia | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
  const [filtroCert, setFiltroCert]         = useState<string | null>(null);

  const [certCounts, setCertCounts]         = useState<CertCount[]>([]);
  const [catCounts, setCatCounts]           = useState<CatCount[]>([]);
  const [stats, setStats]                   = useState<Stats>({
    totalHoje: 0,
    totalFontes: 0,
    lastSync: null,
    destaque: "—",
  });

  // ── fetch principal ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchNoticias() {
      try {
        setLoading(true);

        let query = supabase
          .from("wellness_noticias")
          .select(
            "id, titulo, titulo_pt, resumo_executivo, resumo_pt, categoria, certificacoes, fonte, link, pub_date, atualizado_em, score_tecnico, metricas, stakeholders, nivel_maturidade"
          )
          .in("tipo", ["indice", "radar_wellness"]);

        if (filtroCategoria) {
          query = query.eq("categoria", filtroCategoria);
        }

        if (filtroCert) {
          query = query.contains("certificacoes", [filtroCert]);
        }

        // Busca todos os dados primeiro
        const { data, error } = await query.order("atualizado_em", { ascending: false });
        if (error) throw error;

        // Filtra apenas os de hoje no frontend
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const noticiasData = (data ?? []).filter(item => {
          if (!item.atualizado_em) return false;
          const itemDate = new Date(item.atualizado_em);
          itemDate.setHours(0, 0, 0, 0);
          return itemDate.getTime() === hoje.getTime();
        });
        
        setNoticias(noticiasData);

        // Stats calculados
        setStats({
          totalHoje: noticiasData.length,
          totalFontes: new Set(noticiasData.map((n) => n.fonte).filter(Boolean)).size,
          lastSync: noticiasData[0]?.atualizado_em ?? null,
          destaque: noticiasData[0]?.categoria ?? "—",
        });
        
      } catch (err) {
        console.error("Wellness fetch error:", err);
        setStats({
          totalHoje: 0,
          totalFontes: 0,
          lastSync: null,
          destaque: "—",
        });
        setNoticias([]);
      } finally {
        setLoading(false);
      }
    }

    fetchNoticias();
  }, [filtroCategoria, filtroCert]);

  // ── fetch contagens (views do banco) ────────────────────────────────────────
  useEffect(() => {
    async function fetchCounts() {
      try {
        const { data: certData } = await supabase
          .from("wellness_cert_counts")
          .select("cert, total");
        
        if (certData) setCertCounts(certData);

        const { data: catData } = await supabase
          .from("wellness_cat_counts")
          .select("categoria, total");
        
        if (catData) setCatCounts(catData);
      } catch (err) {
        console.error("Error fetching counts:", err);
      }
    }
    
    fetchCounts();
  }, []);

  // ── abre modal com detalhes ──────────────────────────────────────────────────
  async function handleSelectNews(noticia: WellnessNoticia) {
    setSelectedNews(noticia);
    setLoadingDetalhes(true);
    try {
      const { data, error } = await supabase
        .from("wellness_noticias")
        .select("o_que_e, impacto_real, como_aplicar, contras, quando_usar, motivo, subcategorias, potencial_valorizacao, stakeholders, nivel_maturidade")
        .eq("id", noticia.id)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedNews((prev) =>
          prev?.id === noticia.id ? { ...prev, ...data } : prev
        );
      }
    } catch (err) {
      console.error("Detalhes error:", err);
    } finally {
      setLoadingDetalhes(false);
    }
  }

  const semSinaisHoje = !loading && noticias.length === 0;

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-wh-bg text-wh-text">

      {/* orbs de fundo */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: 500,
          height: 500,
          top: -120,
          left: -100,
          background: "var(--color-wh-primary)",
          filter: "blur(80px)",
          opacity: 0.04,
        }}
      />
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: 340,
          height: 340,
          top: 280,
          right: -80,
          background: "var(--color-wh-primary)",
          filter: "blur(70px)",
          opacity: 0.035,
        }}
      />

      {/* ── header responsivo ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-wh-border bg-wh-bg/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 py-2 sm:py-4">
          
          {/* Logo Vector-X - mais compacta no mobile */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group transition-opacity hover:opacity-80 shrink-0">
            <EcomondsLogo size={32} />
            <div className="flex flex-col justify-center">
              <span className="text-display text-sm sm:text-xl font-extrabold tracking-tight text-wh-text leading-none uppercase">
                Vector-X
              </span>
              <span className="text-mono text-[6px] sm:text-[8px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-wh-muted mt-1 opacity-70">
                By EcomindsX
              </span>
            </div>
          </Link>

          {/* Navegação - scroll horizontal no mobile */}
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 sm:gap-3 px-1">
              <Link
                to="/radar"
                className="text-mono text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-wh-muted px-2 py-1 hover:text-wh-primary transition-colors whitespace-nowrap"
              >
                Radar
              </Link>
              <Link
                to="/acervo"
                className="text-mono text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-wh-muted px-2 py-1 hover:text-wh-primary transition-colors whitespace-nowrap"
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
                className="text-mono text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-wh-primary px-2 py-1 border border-wh-primary transition-colors hover:brightness-125 whitespace-nowrap"
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

        {/* ── hero ────────────────────────────────────────────────────────── */}
        <section className="pt-12 sm:pt-16 md:pt-24">
          <div className="flex items-center gap-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-wh-primary mb-4 sm:mb-5 animate-fade-up">
            <span className="h-px w-6 sm:w-8 bg-wh-primary opacity-70" />
            Wellness Hub
          </div>
          <h1
            className="font-display max-w-4xl text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-bold leading-[1.1] sm:leading-[1.05] tracking-tight animate-fade-up"
            style={{ color: "var(--color-wh-text)" }}
          >
            Onde bem-estar e tendências globais se transformam em
            <br />
            <span
              style={{
                color: "var(--color-wh-primary)",
                textShadow: "0 0 32px rgba(94, 234, 212, 0.45)",
              }}
            >
              vantagem competitiva.
            </span>
          </h1>
          <p
            className="font-mono mt-6 sm:mt-8 max-w-2xl text-xs md:text-sm leading-relaxed text-wh-muted animate-fade-up border-l-2 pl-4 sm:pl-5"
            style={{
              animationDelay: "180ms",
              borderColor: "rgba(94,234,212,0.3)",
            }}
          >
            Acompanhe as certificações, pesquisas e tendências que estão moldando os empreendimentos mais desejados do mundo.
          </p>
        </section>

        {/* ── stats ───────────────────────────────────────────────────────── */}
        <section className="mt-10 sm:mt-14 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <StatCard
            index={0}
            label="Índices Hoje"
            value={loading ? "0" : String(stats.totalHoje ?? 0)}
            hint="Detectados hoje"
            live
          />
          <StatCard
            index={1}
            label="Fontes"
            value={loading ? "0" : String(stats.totalFontes ?? 0)}
            hint="Monitoramento global"
          />
          <StatCard
            index={2}
            label="Sync"
            value={loading ? "—" : (stats.lastSync ? formatSyncTime(stats.lastSync) : "—")}
            hint="Último pulso"
          />
          <StatCard
            index={3}
            label="Destaque"
            value={loading ? "—" : (stats.destaque ?? "—")}
            hint="Categoria do dia"
          />
        </section>

        {/* ── certificações ───────────────────────────────────────────────── */}
        {certCounts.length > 0 && (
          <section className="mt-12 sm:mt-16">
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-wh-muted">
                Certificações monitoradas
              </span>
              <span className="h-px flex-1 bg-wh-border-soft" />
              {filtroCert && (
                <button
                  onClick={() => setFiltroCert(null)}
                  className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-rose-400 border border-rose-400/30 px-2 sm:px-3 py-1 hover:bg-rose-400/10 transition-colors"
                >
                  ✕ Limpar
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              {certCounts.map((c) => {
                const ativo = filtroCert === c.cert;
                return (
                  <button
                    key={c.cert}
                    onClick={() =>
                      setFiltroCert((prev) => (prev === c.cert ? null : c.cert))
                    }
                    className={`group relative flex flex-col justify-between p-3 sm:p-5 text-left transition-all duration-200 border focus:outline-none ${
                      ativo
                        ? "border-wh-primary bg-wh-primary/10"
                        : "border-wh-border-soft bg-wh-surface hover:border-wh-primary/50 hover:bg-wh-primary/5"
                    }`}
                    style={
                      ativo
                        ? { boxShadow: "0 0 24px -4px rgba(94,234,212,0.3)" }
                        : {}
                    }
                  >
                    <span
                      className={`absolute top-0 left-0 right-0 h-px transition-all duration-300 ${
                        ativo ? "bg-wh-primary" : "bg-transparent group-hover:bg-wh-primary/30"
                      }`}
                    />
                    <span
                      className={`font-mono text-[8px] sm:text-[10px] uppercase tracking-[0.2em] font-bold transition-colors mb-3 sm:mb-4 ${
                        ativo ? "text-wh-primary" : "text-wh-text group-hover:text-wh-primary"
                      }`}
                    >
                      {c.cert}
                    </span>
                    <div className="flex items-end justify-between">
                      <span
                        className={`font-display text-xl sm:text-2xl font-extrabold tabular-nums transition-colors ${
                          ativo ? "text-wh-primary" : "text-wh-muted group-hover:text-wh-text"
                        }`}
                      >
                        {c.total}
                      </span>
                      <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.15em] text-wh-muted/60">
                        sinais
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── filtros de categoria ─────────────────────────────────────────── */}
        {catCounts.length > 0 && (
          <section className="mt-10 sm:mt-12">
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-wh-muted">
                Filtrar por tema
              </span>
              <span className="h-px flex-1 bg-wh-border-soft" />
              {filtroCategoria && (
                <button
                  onClick={() => setFiltroCategoria(null)}
                  className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-rose-400 border border-rose-400/30 px-2 sm:px-3 py-1 hover:bg-rose-400/10 transition-colors"
                >
                  ✕ Limpar
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {catCounts.map((c) => {
                const ativo = filtroCategoria === c.categoria;
                return (
                  <button
                    key={c.categoria}
                    onClick={() =>
                      setFiltroCategoria((prev) =>
                        prev === c.categoria ? null : c.categoria
                      )
                    }
                    className={`font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.18em] border px-2 sm:px-3 py-1 sm:py-1.5 transition-all ${
                      ativo
                        ? "text-wh-primary border-wh-primary bg-wh-primary/10"
                        : "text-wh-muted border-wh-border-soft hover:text-wh-primary hover:border-wh-primary/50"
                    }`}
                  >
                    {c.categoria}
                    <span className="ml-1 opacity-50">{c.total}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── grid de notícias ────────────────────────────────────────────── */}
        <section className="mt-12 sm:mt-16">
          <div className="flex items-end justify-between border-b pb-3 sm:pb-4 mb-6 sm:mb-8" style={{ borderColor: "var(--color-wh-border-soft)" }}>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-wh-text">
              {filtroCategoria ? (
                <>
                  <span style={{ color: "var(--color-wh-primary)" }}>#</span>
                  {filtroCategoria}
                </>
              ) : filtroCert ? (
                <>
                  <span style={{ color: "var(--color-wh-primary)" }}>#</span>
                  {filtroCert}
                </>
              ) : (
                "Índices de hoje"
              )}
            </h2>
            {!loading && !semSinaisHoje && (
              <span className="font-mono text-[9px] sm:text-[10px] text-wh-muted uppercase tracking-widest">
                {noticias.length} sinais
              </span>
            )}
          </div>

          {semSinaisHoje ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center">
              <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-wh-muted mb-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-wh-muted" />
                Hub em standby
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-wh-text mb-4">
                Nenhum índice detectado hoje.
              </h3>
              <p className="text-wh-muted text-xs sm:text-sm max-w-sm mb-6 sm:mb-8 leading-relaxed">
                O monitoramento de bem-estar segue ativo. Utilize os filtros superiores para pesquisar o acervo histórico do Hub.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <WellnessCardSkeleton key={i} index={i} />
                  ))
                : noticias.map((n, i) => (
                    <WellnessCard
                      key={n.id}
                      noticia={n}
                      index={i}
                      onClick={() => handleSelectNews(n)}
                    />
                  ))}
            </div>
          )}
        </section>
      </main>

      {/* ── MODAL DE DETALHES RESPONSIVO ── */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          {/* Overlay para fechar */}
          <div className="absolute inset-0" onClick={() => setSelectedNews(null)} />
          
          {/* Modal content - fullscreen no mobile, lateral no desktop */}
          <div className="relative flex flex-col bg-wh-surface shadow-2xl w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-2xl sm:rounded-l-2xl border-0 sm:border-l border-wh-border animate-in duration-300 slide-in-from-bottom sm:slide-in-from-right">
            
            {/* Header fixo no topo */}
            <div className="sticky top-0 bg-wh-surface/95 backdrop-blur-sm border-b border-wh-border p-4 sm:p-6 z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-wh-primary flex-1 break-words">
                  {selectedNews.categoria}
                  {selectedNews.fonte && (
                    <span className="hidden sm:inline"> // {selectedNews.fonte}</span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedNews(null)}
                  className="shrink-0 text-wh-muted hover:text-wh-primary font-mono text-[10px] sm:text-xs px-3 py-1.5 border border-wh-border rounded-sm"
                >
                  ✕ FECHAR
                </button>
              </div>
              
              {/* Fonte no mobile */}
              {selectedNews.fonte && (
                <div className="font-mono text-[8px] uppercase tracking-[0.15em] text-wh-muted mt-2 sm:hidden">
                  {selectedNews.fonte}
                </div>
              )}
            </div>

            {/* Conteúdo rolável */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5 sm:space-y-6">
              
              {/* Título */}
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight text-wh-text">
                {selectedNews.titulo_pt || selectedNews.titulo}
              </h2>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {(selectedNews as any).nivel_maturidade && (
                  <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.15em] text-wh-primary border border-wh-primary/30 px-2 py-1 rounded-sm">
                    MATURIDADE: {String((selectedNews as any).nivel_maturidade).toUpperCase()}
                  </span>
                )}
                {((selectedNews as any).stakeholders || []).slice(0, 2).map((s: string) => (
                  <span key={s} className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.15em] text-wh-muted border border-wh-border px-2 py-1 rounded-sm">
                    {s}
                  </span>
                ))}
                {((selectedNews as any).stakeholders || []).length > 2 && (
                  <span className="font-mono text-[8px] sm:text-[9px] text-wh-muted px-1">
                    +{((selectedNews as any).stakeholders.length - 2)}
                  </span>
                )}
              </div>

              {/* Certificações */}
              {(selectedNews.certificacoes || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(selectedNews.certificacoes || []).map((c) => (
                    <span key={c} className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.15em] text-wh-primary border border-wh-primary/30 px-2 py-1 rounded-sm">
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {/* Resumo Executivo */}
              <div className="relative p-4 sm:p-6 bg-wh-primary/5 border border-wh-border rounded-sm">
                <span className="absolute -top-2.5 left-3 sm:left-4 bg-wh-surface px-2 font-mono text-[8px] sm:text-[10px] text-wh-muted uppercase">
                  Resumo Executivo
                </span>
                <p className="text-wh-text leading-relaxed text-sm sm:text-base italic">
                  "{selectedNews.resumo_executivo || selectedNews.resumo_pt}"
                </p>
              </div>

              {/* Loading de detalhes */}
              {loadingDetalhes ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-2 w-24 bg-wh-muted/20 animate-pulse rounded" />
                      <div className="h-12 bg-wh-muted/10 animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* O que é na prática */}
                  {selectedNews.o_que_e && (
                    <div className="space-y-2">
                      <h4 className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-wh-primary font-bold flex items-center gap-2">
                        <span className="h-px w-4 bg-wh-primary" /> O que é na prática
                      </h4>
                      <p className="text-wh-muted leading-relaxed text-sm">{selectedNews.o_que_e}</p>
                    </div>
                  )}

                  {/* Potencial de Valorização */}
                  {(selectedNews as any).potencial_valorizacao && (
                    <div className="space-y-2">
                      <h4 className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-[#00C67A] font-bold flex items-center gap-2">
                        <span className="h-px w-4 bg-[#00C67A]" /> Potencial de Valorização
                      </h4>
                      <p className="text-wh-muted leading-relaxed text-sm">
                        {(selectedNews as any).potencial_valorizacao}
                      </p>
                    </div>
                  )}

                  {/* Impacto Real */}
                  {selectedNews.impacto_real && (
                    <div className="relative p-4 border border-wh-primary/30 bg-wh-primary/5 rounded-sm">
                      <span className="absolute -top-2.5 left-3 sm:left-4 bg-wh-surface px-2 font-mono text-[8px] sm:text-[10px] text-wh-primary uppercase">
                        Impacto Real
                      </span>
                      <p className="text-wh-text leading-relaxed text-sm font-medium">{selectedNews.impacto_real}</p>
                    </div>
                  )}

                  {/* Como aplicar */}
                  {selectedNews.como_aplicar && (
                    <div className="space-y-2">
                      <h4 className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-wh-primary font-bold flex items-center gap-2">
                        <span className="h-px w-4 bg-wh-primary" /> Como aplicar
                      </h4>
                      <p className="text-wh-muted leading-relaxed text-sm">{selectedNews.como_aplicar}</p>
                    </div>
                  )}

                  {/* Limitações e riscos */}
                  {selectedNews.contras && (
                    <div className="space-y-2">
                      <h4 className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-rose-400 font-bold flex items-center gap-2">
                        <span className="h-px w-4 bg-rose-400" /> Limitações e riscos
                      </h4>
                      <p className="text-wh-muted leading-relaxed text-sm">{selectedNews.contras}</p>
                    </div>
                  )}

                  {/* Quando usar */}
                  {selectedNews.quando_usar && (
                    <div className="space-y-2">
                      <h4 className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-wh-primary font-bold flex items-center gap-2">
                        <span className="h-px w-4 bg-wh-primary" /> Quando usar
                      </h4>
                      <p className="text-wh-muted leading-relaxed text-sm">{selectedNews.quando_usar}</p>
                    </div>
                  )}

                  {/* Por que isso é relevante */}
                  {selectedNews.motivo && (
                    <div className="space-y-2">
                      <h4 className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-wh-primary font-bold flex items-center gap-2">
                        <span className="h-px w-4 bg-wh-primary" /> Por que isso é relevante
                      </h4>
                      <p className="text-wh-muted leading-relaxed text-sm">{selectedNews.motivo}</p>
                    </div>
                  )}
                </>
              )}

              {/* Footer */}
              <div className="pt-6 border-t border-wh-border space-y-4">
                <div className="font-mono text-[9px] sm:text-[10px] text-wh-muted">
                  PUBLICADO EM: {formatTime(selectedNews.pub_date || selectedNews.atualizado_em)}
                </div>
                {selectedNews.link && (
                  <a
                    href={selectedNews.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-wh-primary text-wh-bg px-4 py-3 sm:py-4 font-bold font-mono text-[10px] sm:text-xs tracking-tighter hover:bg-wh-primary/90 transition-colors rounded-sm"
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