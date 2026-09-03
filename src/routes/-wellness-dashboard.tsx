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

// ─── referências globais (curadoria editorial) ────────────────────────────────
// TODO: substituir pelas fotos reais/licenciadas dos empreendimentos.
//
// PROCESSO DE CHECAGEM (obrigatório antes de publicar/editar qualquer item):
// 1. Todo número (área, contagem de plantas/árvores, score de certificação, ano,
//    altura etc.) precisa vir de pelo menos 2 fontes independentes que convirjam
//    (ex: ArchDaily + site do arquiteto + Wikipedia). Se as fontes divergirem,
//    usar o valor do projetista/arquiteto original como desempate.
// 2. Nunca aceitar um número "redondo e impressionante" gerado por IA sem
//    confirmar contra uma fonte primária — diferenças grandes (>10-15%) entre o
//    valor usado e o valor de consenso são sinal de confabulação, não de
//    arredondamento.
// 3. Registrar a data da última verificação em `verificadoEm` para permitir
//    auditorias periódicas (ex: revisar a cada 6-12 meses ou quando o card for
//    editado).
const REFERENCIAS_GLOBAIS = [
  {
    nome: "One Central Park",
    local: "Sydney, Austrália",
    ano: "2014",
    arquiteto: "Ateliers Jean Nouvel + PTW Architects",
    dimensoes: "Torres de 116 m e 64,5 m · 623 apartamentos",
    certificacao: "Green Star 6★",
    metricaChave: "250 espécies nativas",
    destaque:
      "Fachada viva com cerca de 250 espécies de plantas nativas australianas (~85.000 plantas) e heliostatos que redirecionam luz solar para os jardins sombreados.",
    especificacoes: [
      "Jardim vertical projetado pelo botânico Patrick Blanc — ~250 espécies nativas australianas, ~85.000 plantas",
      "Heliostatos (espelhos motorizados) iluminam áreas sombreadas com luz solar refletida",
      "Avaliação máxima no Green Star, sistema australiano de certificação ambiental",
      "Eleito 'Best Tall Building Worldwide' pelo CTBUH em 2014",
    ],
    impactoDocumentado: [
      { label: "Fachada viva", valor: "≈1.200 m² — uma das maiores fachadas vegetais em escala única do mundo" },
      { label: "Certificação", valor: "Green Star 6★ (nota máxima do sistema australiano)" },
    ],
    imagens: [
      "/images/wellness/ocp-1.jpg",
      "/images/wellness/ocp-2.jpg",
      "/images/wellness/ocp-3.jpg",
    ],
    verificadoEm: "2026-06-13",
  },
  {
    nome: "The Edge",
    local: "Amsterdã, Holanda",
    ano: "2014",
    arquiteto: "PLP Architecture",
    dimensoes: "15 andares · 40.000 m² de área construída",
    certificacao: "BREEAM Outstanding (98,36%)",
    metricaChave: "98,36% BREEAM",
    destaque:
      "Considerado um dos edifícios mais sustentáveis do mundo, com sensores que ajustam iluminação, temperatura e ocupação em tempo real.",
    especificacoes: [
      "Cerca de 28.000 sensores monitoram movimento, luz, temperatura e CO₂",
      "Iluminação LED alimentada via Ethernet (Power over Ethernet), controlada pelo celular dos usuários",
      "4.100 m² de painéis solares no teto + energia geotérmica de um aquífero subterrâneo",
      "Edifício 'energy positive': gera mais energia do que consome",
    ],
    impactoDocumentado: [
      { label: "BREEAM", valor: "98,36% — maior nota já registrada para um edifício de escritórios" },
      { label: "Balanço energético", valor: "Edifício 'energy positive': produção solar + geotérmica supera o consumo" },
    ],
    imagens: [
      "/images/wellness/the-edge-1.jpg",
      "/images/wellness/the-edge-2.jpg",
      "/images/wellness/the-edge-2.jpg",
    ],

    verificadoEm: "2026-06-13",
  },
  {
    nome: "Bosco Verticale",
    local: "Milão, Itália",
    ano: "2014",
    arquiteto: "Stefano Boeri Architetti",
    dimensoes: "Torres de 80 m e 112 m · 113 apartamentos",
    certificacao: "International Highrise Award 2014",
    metricaChave: "≈20 t CO₂/ano",
    destaque:
      "Duas torres residenciais que abrigam o equivalente a um hectare de floresta, filtrando CO₂ e partículas finas do ar urbano.",
    especificacoes: [
      "Cerca de 800-900 árvores, 5.000 arbustos e 15.000 plantas perenes nas fachadas",
      "Estimativa de absorção de ~20 toneladas de CO₂ por ano",
      "Irrigação alimentada por água residual tratada na própria edificação",
      "Painéis fotovoltaicos contribuem para a autossuficiência energética das torres",
    ],
    impactoDocumentado: [
      { label: "Sequestro de carbono", valor: "≈20 toneladas de CO₂ absorvidas por ano (estimativa do projeto)" },
      { label: "Reconhecimento", valor: "International Highrise Award 2014 — melhor arranha-céu do mundo" },
    ],
    imagens: [
      "/images/wellness/bosco-1.jpg",
      "/images/wellness/bosco-2.jpg",
      "/images/wellness/bosco-3.jpg",
    ],
    verificadoEm: "2026-06-13",
  },
  {
    nome: "PARKROYAL Collection Pickering",
    local: "Singapura",
    ano: "2013",
    arquiteto: "WOHA",
    dimensoes: "367 quartos · 15.000 m² de áreas verdes",
    certificacao: "Green Mark Platinum",
    metricaChave: "15.000 m² verdes",
    destaque:
      "Hotel-jardim com terraços escalonados, captação de água da chuva e painéis fotovoltaicos integrados à fachada.",
    especificacoes: [
      "15.000 m² de skygardens, paredes verdes e espelhos d'água — o dobro da área do terreno",
      "Green Mark Platinum, a certificação ambiental mais alta de Singapura",
      "Irrigação das coberturas verdes alimentada por energia solar",
      "Corredores com ventilação natural reduzem a dependência de ar-condicionado",
    ],
    impactoDocumentado: [
      { label: "Área verde", valor: "15.000 m² — o dobro da área do terreno do empreendimento" },
      { label: "Certificação", valor: "Green Mark Platinum (nota máxima do BCA de Singapura)" },
    ],
    imagens: [
      "/images/wellness/parkroyal-1.jpg",
      "/images/wellness/parkroyal-2.jpg",
      "/images/wellness/parkroyal-3.jpg",
      "/images/wellness/parkroyal-4.jpg",
    ],
    verificadoEm: "2026-06-13",
  },
  {
    nome: "Amazon Spheres",
    local: "Seattle, EUA",
    ano: "2018",
    arquiteto: "NBBJ",
    dimensoes: "3 cúpulas de vidro · a maior com 27 m de altura",
    certificacao: "Biophilic Design",
    metricaChave: "40.000 plantas",
    destaque:
      "Três cúpulas de vidro que recriam um ecossistema de floresta tropical, usadas como espaço de trabalho e bem-estar dos colaboradores.",
    especificacoes: [
      "Cerca de 40.000 plantas de mais de 30 países diferentes",
      "Parede viva de 4 andares (~370 m²) com 200 espécies",
      "Microclima controlado a ~22°C e 60% de umidade, simulando floresta nublada da Costa Rica",
      "Estrutura de aço com 2.643 painéis de vidro laminado",
    ],
    impactoDocumentado: [
      { label: "Biodiversidade", valor: "≈40.000 plantas de mais de 30 países, em três cúpulas de vidro" },
      { label: "Parede viva", valor: "4 andares (~370 m²) com 200 espécies de plantas" },
    ],
    imagens: [
      "/images/wellness/amazon-1.jpg",
      "/images/wellness/amazon-2.jpg",
      "/images/wellness/amazon-3.jpg",
      "/images/wellness/amazon-4.jpg",
    ],
    verificadoEm: "2026-06-13",
  },
  {
    nome: "CapitaSpring",
    local: "Singapura",
    ano: "2021",
    arquiteto: "BIG + Carlo Ratti Associati",
    dimensoes: "280 m de altura · 51 andares",
    certificacao: "Green Mark Platinum",
    metricaChave: "80.000 plantas",
    destaque:
      "Torre com o 'Green Oasis' suspenso entre os andares 17 e 20, integrando hortas comunitárias e áreas de descompressão.",
    especificacoes: [
      "'Green Oasis': jardim vertical de 35 m de altura distribuído em 4 pavimentos",
      "Cerca de 80.000 plantas — área verde equivalente a 140% do terreno",
      "Horta urbana no terraço com mais de 150 espécies, a mais alta de Singapura",
      "Certificações Green Mark Platinum e Universal Design GoldPLUS (BCA Singapura)",
    ],
    impactoDocumentado: [
      { label: "Área verde", valor: "≈80.000 plantas — equivalente a 140% da área do terreno" },
      { label: "Certificação", valor: "Green Mark Platinum + Universal Design GoldPLUS (BCA Singapura)" },
    ],
    imagens: [
      "/images/wellness/capitaspring-1.jpg",
      "/images/wellness/capitaspring-2.jpg",
      "/images/wellness/capitaspring-3.jpg",
      "/images/wellness/capitaspring-4.jpg",
    ],
    verificadoEm: "2026-06-13",
  },
] as const;

export default function WellnessDashboard() {
  const [noticias, setNoticias]             = useState<WellnessNoticia[]>([]);
  const [loading, setLoading]               = useState(true);
  const [selectedNews, setSelectedNews]     = useState<WellnessNoticia | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
  const [filtroCert, setFiltroCert]         = useState<string | null>(null);
  const [filtroData, setFiltroData]         = useState<"hoje" | "ontem" | "7dias" | "todos">("hoje");
  const [selectedRef, setSelectedRef]       = useState<(typeof REFERENCIAS_GLOBAIS)[number] | null>(null);
  const [imgIndex, setImgIndex]             = useState(0);

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

        // Se houver filtro de categoria/certificação ativo, mostramos os
        // resultados de qualquer data. Caso contrário, aplicamos o filtro
        // de período selecionado (hoje / ontem / 7 dias / tudo).
        const temFiltroAtivo = !!filtroCategoria || !!filtroCert;

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const ontem = new Date(hoje);
        ontem.setDate(ontem.getDate() - 1);

        const seteDiasAtras = new Date(hoje);
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 6);

        const noticiasData = (data ?? []).filter((item) => {
          if (temFiltroAtivo) return true;

          if (!item.atualizado_em) return false;
          const itemDate = new Date(item.atualizado_em);
          itemDate.setHours(0, 0, 0, 0);

          switch (filtroData) {
            case "ontem":
              return itemDate.getTime() === ontem.getTime();
            case "7dias":
              return itemDate.getTime() >= seteDiasAtras.getTime();
            case "todos":
              return true;
            case "hoje":
            default:
              return itemDate.getTime() === hoje.getTime();
          }
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
  }, [filtroCategoria, filtroCert, filtroData]);

  useEffect(() => {
    setImgIndex(0);
  }, [selectedRef]);

  useEffect(() => {
    if (!selectedRef) return;
    const interval = setInterval(() => {
      setImgIndex((prev) => (prev + 1) % selectedRef.imagens.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedRef]);

  const handlePrevImage = () => {
    if (!selectedRef) return;
    setImgIndex((prev) =>
      prev === 0 ? selectedRef.imagens.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    if (!selectedRef) return;
    setImgIndex((prev) => (prev + 1) % selectedRef.imagens.length);
  };

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

      {/* grain / ruído cinematográfico */}
      <div
        className="pointer-events-none fixed inset-0 z-30 opacity-[0.05] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "200px 200px",
        }}
      />

      {/* ── header responsivo ──────────────────────────────────────────────────── */}
      <header data-local-nav className="sticky top-0 z-40 border-b border-wh-border bg-wh-bg/80 backdrop-blur-md">
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
                to="/noticias"
                className="text-mono text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-wh-muted px-2 py-1 hover:text-wh-primary transition-colors whitespace-nowrap"
              >
                Notícias
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

          {/* CTA — Referências Globais */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <a
              href="#referencias-globais"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("referencias-globais")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="inline-flex items-center gap-2 sm:gap-3 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.25em] px-4 sm:px-5 py-2.5 sm:py-3 rounded-full border transition-all hover:brightness-110 animate-fade-up animate-glow-pulse"
              style={{
                animationDelay: "260ms",
                color: "#00C67A",
                borderColor: "rgba(0,198,122,0.45)",
                background: "rgba(0,198,122,0.06)",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#00C67A" }} />
              Conheça referências pelo mundo em Wellness
              <span aria-hidden>↓</span>
            </a>
            <Link
              to="/wellness-analise-solar"
              className="inline-flex items-center gap-2 sm:gap-3 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.25em] px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-wh-primary text-wh-bg border border-transparent transition-all hover:brightness-110 animate-fade-up"
              style={{ animationDelay: "260ms" }}
            >
              Análise Solar
              <span aria-hidden>☀️</span>
            </Link>
          </div>

          <style>{`
            @keyframes glowPulse {
              0%, 100% { box-shadow: 0 0 8px rgba(0,198,122,0.15), inset 0 0 6px rgba(0,198,122,0.04); }
              50% { box-shadow: 0 0 22px rgba(0,198,122,0.45), inset 0 0 10px rgba(0,198,122,0.1); }
            }
            .animate-glow-pulse {
              animation: glowPulse 2.6s ease-in-out infinite;
            }

            /* ── scrollbar customizada ──────────────────────────────────── */
            * {
              scrollbar-width: thin;
              scrollbar-color: rgba(94,234,212,0.45) var(--color-wh-bg);
            }
            ::-webkit-scrollbar {
              width: 10px;
              height: 10px;
            }
            ::-webkit-scrollbar-track {
              background: var(--color-wh-bg);
            }
            ::-webkit-scrollbar-thumb {
              background: linear-gradient(180deg, rgba(94,234,212,0.55), rgba(0,198,122,0.55));
              border-radius: 999px;
              border: 2px solid var(--color-wh-bg);
            }
            ::-webkit-scrollbar-thumb:hover {
              background: linear-gradient(180deg, rgba(94,234,212,0.9), rgba(0,198,122,0.9));
              box-shadow: 0 0 10px rgba(94,234,212,0.5);
            }
            ::-webkit-scrollbar-corner {
              background: transparent;
            }
          `}</style>
        </section>

        {/* ── stats ───────────────────────────────────────────────────────── */}
        <section className="mt-10 sm:mt-14 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <StatCard
            index={0}
            label={
              { hoje: "Índices Hoje", ontem: "Índices Ontem", "7dias": "Índices 7 Dias", todos: "Índices Total" }[
                filtroData
              ]
            }
            value={loading ? "0" : String(stats.totalHoje ?? 0)}
            hint={
              { hoje: "Detectados hoje", ontem: "Detectados ontem", "7dias": "Últimos 7 dias", todos: "Acervo completo" }[
                filtroData
              ]
            }
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

        {/* ── filtro de período ──────────────────────────────────────────── */}
        <section className="mt-10 sm:mt-12">
          <div className="flex items-center gap-3 mb-4 sm:mb-5">
            <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-wh-muted">
              Período
            </span>
            <span className="h-px flex-1 bg-wh-border-soft" />
            {(filtroCategoria || filtroCert) && (
              <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.15em] text-wh-muted/60">
                Ignorado durante filtro de tema
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "hoje", label: "Hoje" },
                { key: "ontem", label: "Ontem" },
                { key: "7dias", label: "Últimos 7 dias" },
                { key: "todos", label: "Tudo" },
              ] as const
            ).map((opt) => {
              const ativo = filtroData === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setFiltroData(opt.key)}
                  className={`font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.18em] border px-2 sm:px-3 py-1 sm:py-1.5 transition-all ${
                    ativo
                      ? "text-wh-primary border-wh-primary bg-wh-primary/10"
                      : "text-wh-muted border-wh-border-soft hover:text-wh-primary hover:border-wh-primary/50"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
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
                {
                  hoje: "Índices de hoje",
                  ontem: "Índices de ontem",
                  "7dias": "Índices dos últimos 7 dias",
                  todos: "Todos os índices",
                }[filtroData]
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
                {filtroCategoria || filtroCert
                  ? "Nenhum índice encontrado para esse filtro."
                  : {
                      hoje: "Nenhum índice detectado hoje.",
                      ontem: "Nenhum índice detectado ontem.",
                      "7dias": "Nenhum índice nos últimos 7 dias.",
                      todos: "Nenhum índice no acervo ainda.",
                    }[filtroData]}
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

        {/* ── referências globais ───────────────────────────────────────── */}
        <section id="referencias-globais" className="mt-16 sm:mt-24">
          <div className="flex items-center gap-3 mb-2">
            <span
              className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em]"
              style={{ color: "#00C67A" }}
            >
              Referências Globais
            </span>
            <span className="h-px flex-1 bg-wh-border-soft" />
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-wh-text mb-2">
            Empreendimentos que definem o padrão
          </h2>
          <p className="font-mono text-xs text-wh-muted max-w-2xl leading-relaxed mb-6 sm:mb-8">
            Curadoria de projetos pelo mundo que ilustram, na prática, as certificações, tecnologias e conceitos discutidos no Hub.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {REFERENCIAS_GLOBAIS.map((ref) => (
              <div
                key={ref.nome}
                onClick={() => setSelectedRef(ref)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedRef(ref);
                }}
                className="group relative flex flex-col overflow-hidden border border-wh-border-soft bg-wh-surface transition-all duration-300 hover:border-[#00C67A]/40 cursor-pointer focus:outline-none focus:border-[#00C67A]/60"
                

              >
                {/* imagem */}
                <div className="relative min-h-[220px] aspect-[5/4] sm:aspect-[3/2] overflow-hidden bg-wh-bg">
                  <img
                    src={ref.imagens[0]}
                    alt={ref.nome}
                    loading="lazy"
                    className="h-full w-full object-cover object-center transition-all duration-700 ease-out grayscale sm:grayscale group-hover:grayscale-0 group-hover:saturate-100 group-hover:brightness-100 group-active:grayscale-0 group-active:saturate-100 group-active:brightness-100 focus-visible:grayscale-0 focus-visible:saturate-100 focus-visible:brightness-100"
                  />
                  {/* gradiente para legibilidade */}
                  <div className="absolute inset-0 bg-gradient-to-t from-wh-bg via-wh-bg/10 to-transparent" />
                  {/* selo de certificação */}
                  <span
                    className="absolute top-3 left-3 font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm backdrop-blur-sm border bg-wh-bg/60 transition-colors duration-300 group-hover:text-[#00C67A]"
                    style={{ color: "#00C67A", borderColor: "rgba(0,198,122,0.35)" }}
                  >
                    {ref.certificacao}
                  </span>
                  {/* selo de métrica de impacto */}
                  <span
                    className="absolute top-3 right-3 font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm backdrop-blur-sm border bg-wh-bg/60"
                    style={{ color: "var(--color-wh-primary)", borderColor: "rgba(94,234,212,0.35)" }}
                  >
                    {ref.metricaChave}
                  </span>
                </div>

                {/* conteúdo */}
                <div className="flex flex-col gap-2 p-4 sm:p-5">
                  <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-wh-muted">
                    {ref.local}
                  </span>
                  <h3 className="font-display text-base sm:text-lg font-bold text-wh-text leading-snug">
                    {ref.nome}
                  </h3>
                  <p className="text-wh-muted text-xs sm:text-sm leading-relaxed">
                    {ref.destaque}
                  </p>
                  <span
                    className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.2em] mt-1 opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"
                    style={{ color: "#00C67A" }}
                  >
                    Ver especificações →
                  </span>
                </div>

                {/* linha de destaque inferior, acende no hover */}
                <span
                  className="absolute bottom-0 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                  style={{ background: "#00C67A" }}
                />
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ── MODAL DE DETALHES RESPONSIVO ── */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          {/* Overlay para fechar */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedNews(null)} />
          
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
                  className="shrink-0 z-30 text-wh-muted hover:text-wh-primary font-mono text-[10px] sm:text-xs px-4 py-2 border border-wh-border rounded-full bg-wh-bg/90 shadow-lg"
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

      {/* ── MODAL DE ESPECIFICAÇÕES — REFERÊNCIAS GLOBAIS ── */}
      {selectedRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-hidden p-3 sm:p-4">
          {/* Overlay para fechar */}
          <div className="absolute inset-0" onClick={() => setSelectedRef(null)} />

          <div className="relative flex flex-col bg-wh-surface shadow-2xl w-full max-w-[calc(100vw-1.25rem)] h-[calc(100vh-1.25rem)] max-h-[calc(100vh-1.25rem)] sm:h-auto sm:max-h-[88vh] sm:max-w-2xl sm:rounded-2xl border-0 sm:border border-wh-border animate-in duration-150 slide-in-from-bottom sm:fade-in overflow-hidden">

            {/* Imagem de topo (em cor) */}
            <div className="relative h-36 sm:h-52 shrink-0 overflow-hidden group">
              <div
                className="absolute inset-0 flex h-full transition-transform duration-300 ease-out"
                style={{
                  width: `${selectedRef.imagens.length * 100}%`,
                  transform: `translateX(-${(imgIndex * 100) / selectedRef.imagens.length}%)`,
                  zIndex: 20,
                }}
              >
                {selectedRef.imagens.map((img, idx) => (
                  <img
                    key={`${selectedRef.nome}-${idx}`}
                    src={img}
                    alt={`${selectedRef.nome} ${idx + 1}`}
                    loading="lazy"
                    className={`relative h-full flex-shrink-0 object-cover transition-transform duration-500 ease-out ${
                      idx === imgIndex ? "group-hover:scale-[1.08] group-hover:shadow-2xl" : ""
                    }`}
                    style={{
                      width: `${100 / selectedRef.imagens.length}%`,
                      zIndex: idx === imgIndex ? 20 : 1,
                    }}
                  />
                ))}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-wh-surface via-wh-surface/10 to-transparent pointer-events-none" style={{ zIndex: 10 }} />

              <button
                onClick={() => setSelectedRef(null)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 text-wh-text hover:text-[#00C67A] font-mono text-[10px] sm:text-xs px-3 py-1.5 border border-wh-border bg-wh-bg/90 backdrop-blur-sm rounded-sm shadow-lg transition-colors"
              >
                ✕ FECHAR
              </button>

              <button
                onClick={handlePrevImage}
                className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-wh-border bg-wh-bg/80 p-2 text-wh-text shadow-lg transition hover:border-wh-primary hover:bg-wh-bg/95 hover:text-wh-primary"
                aria-label="Imagem anterior"
              >
                ‹
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-wh-border bg-wh-bg/80 p-2 text-wh-text shadow-lg transition hover:border-wh-primary hover:bg-wh-bg/95 hover:text-wh-primary"
                aria-label="Próxima imagem"
              >
                ›
              </button>

              <span
                className="absolute top-3 left-3 sm:top-4 sm:left-4 font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm backdrop-blur-sm border bg-wh-bg/60"
                style={{ color: "#00C67A", borderColor: "rgba(0,198,122,0.35)" }}
              >
                {selectedRef.certificacao}
              </span>

              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                {selectedRef.imagens.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                      idx === imgIndex ? "bg-wh-primary" : "bg-wh-muted/40"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Conteúdo rolável */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5 sm:space-y-6">
              <div>
                <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-wh-muted">
                  {selectedRef.local} · {selectedRef.ano}
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight text-wh-text mt-1">
                  {selectedRef.nome}
                </h2>
                <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-wh-muted mt-2">
                  {selectedRef.arquiteto}
                </p>
              </div>

              {/* dimensões */}
              <div className="border border-wh-border-soft bg-wh-primary/5 rounded-sm px-4 py-3">
                <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-wh-muted">
                  Dimensões
                </span>
                <p className="text-wh-text text-sm sm:text-base font-medium mt-1">
                  {selectedRef.dimensoes}
                </p>
              </div>

              {/* impacto documentado */}
              <div className="border border-wh-border-soft rounded-sm px-4 py-3" style={{ background: "rgba(94,234,212,0.05)" }}>
                <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-wh-muted">
                  Impacto Documentado
                </span>
                <dl className="mt-2 space-y-2">
                  {selectedRef.impactoDocumentado.map((item, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                      <dt
                        className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.15em] shrink-0"
                        style={{ color: "var(--color-wh-primary)" }}
                      >
                        {item.label}:
                      </dt>
                      <dd className="text-wh-text text-sm font-medium">{item.valor}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* descrição */}
              <p className="text-wh-muted leading-relaxed text-sm">
                {selectedRef.destaque}
              </p>

              {/* especificações técnicas */}
              <div className="space-y-2">
                <h4
                  className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest font-bold flex items-center gap-2"
                  style={{ color: "#00C67A" }}
                >
                  <span className="h-px w-4" style={{ background: "#00C67A" }} /> Especificações técnicas
                </h4>
                <ul className="space-y-2">
                  {selectedRef.especificacoes.map((spec, i) => (
                    <li key={i} className="flex items-start gap-2 text-wh-muted text-xs sm:text-sm leading-relaxed">
                      <span className="mt-1.5 h-1 w-1 rounded-full shrink-0" style={{ background: "#00C67A" }} />
                      {spec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}