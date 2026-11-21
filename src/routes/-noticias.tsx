import { Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { EcomondsLogo } from "@/components/EcomondsLogo";
import { KeywordMarquee } from "@/components/KeywordMarquee";
import { supabase } from "@/lib/supabase";

/* ────────────────────────────────────────────────────────────────────────
   TIPOS E CONFIGURAÇÕES
──────────────────────────────────────────────────────────────────────── */

export type Aba = "Geral" | "Estratégia" | "Radar" | "Wellness";
type Periodo = "recente" | "7dias" | "30dias" | "todos";

const PAGE_SIZE = 20;

// Nome do bucket no Supabase Storage onde estão os arquivos da coluna `imagem_url`
const STORAGE_BUCKET =
  import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || "noticias-image";

interface CategoriaInfo {
  nome: string;
  total: number;
}

export interface MetricaItem {
  rotulo: string;
  valor: string;
}

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
  imagem_url?: string | null;
  imageUrl?: string | null;
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
    return (
      d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " • " +
      d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return "—";
  }
}

function formatShortDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * Converte o valor da coluna `imagem_url` (ex: "smartac-gen2-hvac-residencial.jpg")
 * na URL pública real do Supabase Storage. Retorna `null` se for NULL ou vazio.
 */
function resolverUrlImagem(imagem_url?: string | null): string | null {
  if (!imagem_url || typeof imagem_url !== "string") return null;
  const limpo = imagem_url.trim();
  if (!limpo || limpo.toUpperCase() === "NULL") return null;

  // Se já for uma URL completa (http/https) ou caminho local
  if (
    limpo.startsWith("http://") ||
    limpo.startsWith("https://") ||
    limpo.startsWith("/")
  ) {
    return limpo;
  }

  // Remove barra inicial ou prefixo duplicado do próprio bucket, se houver
  const semBarraInicial = limpo.replace(/^\/+/, "");
  const caminhoNoBucket = semBarraInicial.startsWith(`${STORAGE_BUCKET}/`)
    ? semBarraInicial.slice(STORAGE_BUCKET.length + 1)
    : semBarraInicial;

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(caminhoNoBucket);

  return data?.publicUrl || null;
}

function formatarNoticia(n: any): Noticia {
  return {
    ...n,
    title: n.titulo_pt || n.titulo,
    description:
      n.resumo_executivo ||
      n.resumo_pt ||
      "Análise técnica em processamento...",
    category: n.categoria || "Geral",
    trend: "up",
    relevance: n.score_tecnico ?? 0,
    imageUrl: resolverUrlImagem(n.imagem_url),
  };
}

/**
 * Converte qualquer estrutura vinda da coluna `metricas` do Supabase
 * (Array, Objeto chave-valor ou JSON string) em pares { rotulo, valor }.
 */
function extrairParMetrica(item: any): MetricaItem | null {
  if (item === null || item === undefined) return null;

  // Caso o item seja uma string simples (ex: "Redução: 85%")
  if (typeof item === "string" || typeof item === "number") {
    const str = String(item).trim();
    if (!str) return null;
    if (str.includes(":")) {
      const [esq, ...dir] = str.split(":");
      return { rotulo: esq.trim(), valor: dir.join(":").trim() };
    }
    return { rotulo: "Indicador", valor: str };
  }

  if (typeof item !== "object" || Array.isArray(item)) return null;

  const chavesRotulo = [
    "rotulo", "label", "nome", "name", "titulo", "title",
    "metrica", "indicador", "chave", "key", "parametro", "item",
  ];
  const chavesValor = [
    "valor", "value", "resultado", "numero", "dado",
    "val", "medida", "impacto", "meta", "detalhe", "descricao",
  ];
  const chavesUnidade = ["unidade", "unit", "un"];

  let rotulo = "";
  let valor = "";
  let unidade = "";

  for (const k of chavesRotulo) {
    if (typeof item[k] === "string" || typeof item[k] === "number") {
      rotulo = String(item[k]).trim();
      break;
    }
  }

  for (const k of chavesValor) {
    if (typeof item[k] === "string" || typeof item[k] === "number") {
      valor = String(item[k]).trim();
      break;
    }
  }

  for (const k of chavesUnidade) {
    if (typeof item[k] === "string" || typeof item[k] === "number") {
      unidade = String(item[k]).trim();
      break;
    }
  }

  // Fallback caso o JSON use chaves personalizadas (ex: { "Emissões": "-85%" })
  const entradasPrimitivas = Object.entries(item).filter(
    ([k, v]) =>
      (typeof v === "string" || typeof v === "number") &&
      String(v).trim() !== "" &&
      !chavesUnidade.includes(k.toLowerCase()),
  );

  if (!rotulo && !valor) {
    if (entradasPrimitivas.length === 1) {
      const [k, v] = entradasPrimitivas[0];
      rotulo = k.replace(/_/g, " ").trim();
      valor = String(v).trim();
    } else if (entradasPrimitivas.length >= 2) {
      rotulo = String(entradasPrimitivas[0][1]).trim();
      valor = String(entradasPrimitivas[1][1]).trim();
    }
  } else if (rotulo && !valor) {
    const outra = entradasPrimitivas.find(
      ([, v]) => String(v).trim() !== rotulo,
    );
    if (outra) valor = String(outra[1]).trim();
  } else if (!rotulo && valor) {
    const outra = entradasPrimitivas.find(
      ([, v]) => String(v).trim() !== valor,
    );
    rotulo = outra ? String(outra[1]).trim() : "Indicador";
  }

  if (!valor) return null;
  if (unidade && !valor.toLowerCase().includes(unidade.toLowerCase())) {
    valor = `${valor} ${unidade}`.trim();
  }

  return {
    rotulo: rotulo || "Indicador",
    valor,
  };
}

function normalizarMetricas(raw: any): MetricaItem[] {
  if (!raw) return [];
  let parsed = raw;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  // Desempacota objetos que guardam a lista em `items`, `metricas`, `dados`, etc.
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const listaInterna =
      parsed.items ||
      parsed.metricas ||
      parsed.dados ||
      parsed.indicadores ||
      parsed.lista ||
      Object.values(parsed).find((v) => Array.isArray(v));

    if (Array.isArray(listaInterna)) {
      parsed = listaInterna;
    }
  }

  if (Array.isArray(parsed)) {
    return parsed
      .map(extrairParMetrica)
      .filter((x): x is MetricaItem => x !== null)
      .slice(0, 4);
  }

  if (typeof parsed === "object") {
    return Object.entries(parsed)
      .filter(
        ([, val]) =>
          (typeof val === "string" || typeof val === "number") &&
          String(val).trim() !== "",
      )
      .map(([k, v]) => ({
        rotulo: k.replace(/_/g, " "),
        valor: String(v).trim(),
      }))
      .slice(0, 4);
  }

  return [];
}

function estimarTempoLeitura(noticia: Noticia): string {
  const palavras = [
    noticia.title,
    noticia.description,
    noticia.o_que_e,
    noticia.impacto_real,
    noticia.como_aplicar,
  ]
    .filter(Boolean)
    .join(" ")
    .split(/\s+/).length;
  const minutos = Math.max(3, Math.min(7, Math.ceil(palavras / 45)));
  return `${minutos} min`;
}

const ABA_CONFIG: Record<
  Aba,
  {
    tabela: "noticias" | "wellness_noticias";
    tipos: string[];
    descricao: string;
    temData: boolean;
    badge: string;
  }
> = {
  Geral: {
    tabela: "noticias",
    tipos: ["aberto"],
    descricao:
      "Varredura contínua sobre tecnologias inovadoras, materiais e novos métodos que estão redesenhando a construção civil em tempo real.",
    temData: true,
    badge: "Open Feed",
  },
  Estratégia: {
    tabela: "noticias",
    tipos: ["estrategia"],
    descricao:
      "Inteligência direcionada para aplicação em projetos: modelos que reduzem custos, otimizam o tempo de obra e escalam a performance geral.",
    temData: true,
    badge: "ROI & Performance",
  },
  Radar: {
    tabela: "noticias",
    tipos: ["radar"],
    descricao:
      "Antecipação de mercado. Tópicos e movimentações estratégicas para blindar ativos financeiros e se posicionar à frente dos concorrentes.",
    temData: false,
    badge: "Early Signals",
  },
  Wellness: {
    tabela: "wellness_noticias",
    tipos: ["indice", "radar_wellness"],
    descricao:
      "Monitoramento sobre biofilia, conforto termoacústico, qualidade do ar e certificações focadas na saúde e performance humana no ambiente construído.",
    temData: true,
    badge: "IEQ & Biofilia",
  },
};

interface Props {
  abaInicial?: Aba;
}

/* ────────────────────────────────────────────────────────────────────────
   COMPONENTES VISUAIS AUXILIARES
──────────────────────────────────────────────────────────────────────── */

function EditorialSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10 border-b border-[#DCE2DD]">
        <div className="lg:col-span-8 lg:pr-8 lg:border-r border-[#DCE2DD] space-y-4">
          <div className="aspect-[16/9] w-full rounded-xl bg-[#E5EAE6]" />
          <div className="h-4 w-36 rounded bg-[#DCE2DD]" />
          <div className="h-9 w-4/5 rounded bg-[#DCE2DD]" />
          <div className="h-16 w-full rounded bg-[#E5EAE6]" />
        </div>
        <div className="lg:col-span-4 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 pb-5 border-b border-[#DCE2DD]">
              <div className="h-3 w-24 rounded bg-[#DCE2DD]" />
              <div className="h-5 w-full rounded bg-[#DCE2DD]" />
              <div className="h-10 w-full rounded bg-[#E5EAE6]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
  const [busca, setBusca] = useState("");
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

  // Registro de IDs cuja imagem falhou no carregamento (evita ícone quebrado)
  const [imagensComErro, setImagensComErro] = useState<Record<string, boolean>>(
    {},
  );

  const [selectedNews, setSelectedNews] = useState<Noticia | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const filtroPorData = dataInicio || dataFim;
  const temFiltroAtivo = !!(categoriaFiltro || filtroPorData);

  const marcarErroImagem = useCallback((id: string) => {
    setImagensComErro((prev) => ({ ...prev, [id]: true }));
  }, []);

  const temImagemValida = useCallback(
    (n?: Noticia | null): boolean => {
      if (!n || !n.imageUrl) return false;
      return !imagensComErro[n.id];
    },
    [imagensComErro],
  );

  useEffect(() => {
    setCategoriaFiltro(null);
    setKeywordFiltro(null);
    setBusca("");
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
        let query = supabase
          .from(tabela)
          .select("atualizado_em")
          .order("atualizado_em", { ascending: false })
          .limit(1);
        if (tabela === "noticias")
          query = query.in("tipo", ABA_CONFIG[aba].tipos);
        const { data } = await query;
        if (data?.[0]?.atualizado_em) setDataMaisRecente(data[0].atualizado_em);
      } catch {}
    }
    fetchDataRecente();
  }, [aba]);

  useEffect(() => {
    async function fetchCategorias() {
      setLoadingCategorias(true);
      try {
        const tabela = ABA_CONFIG[aba].tabela;
        let query = supabase
          .from(tabela)
          .select("categoria")
          .not("categoria", "is", null);
        if (tabela === "noticias")
          query = query.in("tipo", ABA_CONFIG[aba].tipos);
        const { data } = await query;
        const contagem: Record<string, number> = {};
        (data ?? []).forEach((n: any) => {
          const c = n.categoria?.trim();
          if (c) contagem[c] = (contagem[c] || 0) + 1;
        });
        const lista = Object.entries(contagem)
          .map(([nome, total]) => ({ nome, total }))
          .sort((a, b) => b.total - a.total);
        setCategorias(lista);
        setKeywords(lista.slice(0, 12).map((c) => c.nome));
      } finally {
        setLoadingCategorias(false);
      }
    }
    fetchCategorias();
  }, [aba]);

  const fetchNoticias = useCallback(
    async (pageNum: number, reset = false) => {
      try {
        if (pageNum === 0) setLoading(true);
        else setLoadingMore(true);

        const tabela = ABA_CONFIG[aba].tabela;
        const camposComImagem =
          "id, titulo, titulo_pt, resumo_executivo, resumo_pt, categoria, fonte, atualizado_em, pub_date, link, imagem_url, score_tecnico, metricas";
        const camposSemImagem =
          "id, titulo, titulo_pt, resumo_executivo, resumo_pt, categoria, fonte, atualizado_em, pub_date, link, score_tecnico, metricas";

        const montarQuery = (colunas: string) => {
          let q = supabase
            .from(tabela)
            .select(colunas, { count: "exact" })
            .order("atualizado_em", { ascending: false });

          if (tabela === "noticias") q = q.in("tipo", ABA_CONFIG[aba].tipos);
          if (categoriaFiltro) q = q.ilike("categoria", categoriaFiltro);
          if (dataInicio)
            q = q.gte("atualizado_em", new Date(dataInicio).toISOString());
          if (dataFim) {
            const fim = new Date(dataFim);
            fim.setHours(23, 59, 59, 999);
            q = q.lte("atualizado_em", fim.toISOString());
          }

          if (!temFiltroAtivo) {
            const agora = new Date();
            const seteDias = new Date(agora);
            seteDias.setDate(seteDias.getDate() - 7);
            const trintaDias = new Date(agora);
            trintaDias.setDate(trintaDias.getDate() - 30);

            switch (periodo) {
              case "recente":
                if (dataMaisRecente) {
                  const diaRecente = new Date(dataMaisRecente);
                  diaRecente.setHours(0, 0, 0, 0);
                  const proximoDia = new Date(diaRecente);
                  proximoDia.setDate(proximoDia.getDate() + 1);
                  q = q
                    .gte("atualizado_em", diaRecente.toISOString())
                    .lt("atualizado_em", proximoDia.toISOString());
                }
                break;
              case "7dias":
                q = q.gte("atualizado_em", seteDias.toISOString());
                break;
              case "30dias":
                q = q.gte("atualizado_em", trintaDias.toISOString());
                break;
              case "todos":
                break;
            }
          }

          return q.range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);
        };

        let { data, error, count } = await montarQuery(camposComImagem);

        // Fallback seguro caso `wellness_noticias` ainda não possua a coluna `imagem_url`
        if (error) {
          const retry = await montarQuery(camposSemImagem);
          data = retry.data;
          error = retry.error;
          count = retry.count;
        }

        if (error) throw error;

        const formatadas = (data ?? []).map(formatarNoticia);
        if (reset || pageNum === 0) setNoticias(formatadas);
        else setNoticias((prev) => [...prev, ...formatadas]);

        setHasMore(formatadas.length === PAGE_SIZE);
        if (count !== null) setTotalRegistros(count);
      } catch (err) {
        console.error("Erro ao buscar notícias:", err);
        setNoticias([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      aba,
      periodo,
      categoriaFiltro,
      dataInicio,
      dataFim,
      temFiltroAtivo,
      dataMaisRecente,
    ],
  );

  useEffect(() => {
    if (periodo === "recente" && dataMaisRecente === null) return;
    setPage(0);
    fetchNoticias(0, true);
  }, [
    aba,
    periodo,
    categoriaFiltro,
    dataInicio,
    dataFim,
    dataMaisRecente,
    fetchNoticias,
  ]);

  const handleSelectNews = useCallback(
    async (news: Noticia) => {
      setSelectedNews(news);
      setLoadingDetalhes(true);
      try {
        const tabela = ABA_CONFIG[aba].tabela;
        const { data, error } = await supabase
          .from(tabela)
          .select(
            "o_que_e, impacto_real, como_aplicar, contras, quando_usar, motivo",
          )
          .eq("id", news.id)
          .single();
        if (error) throw error;
        if (data)
          setSelectedNews((prev) =>
            prev?.id === news.id ? { ...prev, ...data } : prev,
          );
      } catch {
      } finally {
        setLoadingDetalhes(false);
      }
    },
    [aba],
  );

  const limparFiltros = () => {
    setCategoriaFiltro(null);
    setKeywordFiltro(null);
    setBusca("");
    setDataInicio("");
    setDataFim("");
  };

  const carregarMais = () => {
    const next = page + 1;
    setPage(next);
    fetchNoticias(next);
  };

  const noticiasFiltradas = useMemo(() => {
    return noticias.filter((n) => {
      if (keywordFiltro && n.category !== keywordFiltro) return false;
      if (busca.trim()) {
        const q = busca.toLowerCase();
        const matchTitulo = n.title.toLowerCase().includes(q);
        const matchResumo = n.description.toLowerCase().includes(q);
        const matchCategoria = n.category.toLowerCase().includes(q);
        const matchFonte = (n.fonte || "").toLowerCase().includes(q);
        return matchTitulo || matchResumo || matchCategoria || matchFonte;
      }
      return true;
    });
  }, [noticias, keywordFiltro, busca]);

  // Prioriza como Manchete de Capa a notícia mais recente que possua imagem no Storage
  const { manchete, colLateral, restantes } = useMemo(() => {
    if (noticiasFiltradas.length === 0) {
      return {
        manchete: null,
        colLateral: [] as Noticia[],
        restantes: [] as Noticia[],
      };
    }
    const idxComFoto = noticiasFiltradas.findIndex((n) => temImagemValida(n));
    const idxManchete = idxComFoto >= 0 ? idxComFoto : 0;
    const itemManchete = noticiasFiltradas[idxManchete];
    const semManchete = noticiasFiltradas.filter((_, i) => i !== idxManchete);

    return {
      manchete: itemManchete,
      colLateral: semManchete.slice(0, 3),
      restantes: semManchete.slice(3),
    };
  }, [noticiasFiltradas, temImagemValida]);

  const indiceModal = useMemo(
    () =>
      selectedNews
        ? noticiasFiltradas.findIndex((n) => n.id === selectedNews.id)
        : -1,
    [selectedNews, noticiasFiltradas],
  );

  // Fechar modal com ESC ou navegar com setas ← / →
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedNews) return;
      if (e.key === "Escape") setSelectedNews(null);
      if (e.key === "ArrowRight" && indiceModal < noticiasFiltradas.length - 1) {
        handleSelectNews(noticiasFiltradas[indiceModal + 1]);
      }
      if (e.key === "ArrowLeft" && indiceModal > 0) {
        handleSelectNews(noticiasFiltradas[indiceModal - 1]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNews, indiceModal, noticiasFiltradas, handleSelectNews]);

  const copiarSintese = (n: Noticia) => {
    const texto = `${n.title}\n\nSíntese Executiva: ${
      n.resumo_executivo || n.description
    }\n${n.impacto_real ? `\nImpacto & ROI: ${n.impacto_real}` : ""}\nFonte: ${
      n.fonte || "Vector-X"
    }`;
    navigator.clipboard?.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const semNoticias = !loading && noticiasFiltradas.length === 0;
  const ABAS: Aba[] = ["Geral", "Estratégia", "Radar", "Wellness"];

  const labelRecente = dataMaisRecente
    ? new Date(dataMaisRecente).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })
    : "Recente";

  const totalSinaisCategorias = categorias.reduce(
    (acc, c) => acc + (c.total || 0),
    0,
  );

  /* ────────────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#F5F6F2] text-[#18221F] selection:bg-[#255841] selection:text-white">
      {/* ── Tipografia Editorial (Newsreader + Plus Jakarta Sans + JetBrains Mono) ── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .font-editorial { font-family: 'Newsreader', Georgia, serif; }
        .font-sans-ui { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
        .font-mono-tech { font-family: 'JetBrains Mono', monospace; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(37, 88, 65, 0.25); border-radius: 9999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(37, 88, 65, 0.5); }
      `,
        }}
      />

      {/* ── Masthead / Header Editorial ── */}
      <header
        data-local-nav
        className="sticky top-0 z-40 bg-[#F5F6F2]/95 backdrop-blur-md border-b border-[#DCE2DD] font-sans-ui"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0 group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#255841] flex items-center justify-center text-white shadow-sm">
                <EcomondsLogo size={24} />
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="font-bold text-lg tracking-tight text-[#18221F]">
                  VECTOR<span className="text-[#3A7D5E]">-X</span>
                </span>
                <span className="hidden md:inline-block text-xs text-[#6E7D77] border-l border-[#DCE2DD] pl-2.5">
                  Jornal Técnico do Ambiente Construído
                </span>
              </div>
            </Link>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2 text-xs font-medium">
            <Link
              to="/"
              className="px-3 py-1.5 rounded-md text-[#5A6862] hover:text-[#18221F] transition-colors whitespace-nowrap"
            >
              Home
            </Link>
            <Link
              to="/noticias"
              className="px-3.5 py-1.5 rounded-md bg-[#255841] text-white font-semibold shadow-sm whitespace-nowrap flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#EFECE4]" />
              Notícias & Sinais
            </Link>
            <Link
              to="/wellness-analise-solar"
              className="px-3 py-1.5 rounded-md text-[#5A6862] hover:text-[#18221F] transition-colors whitespace-nowrap"
            >
              Diagnóstico Bioclimático
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-24 font-sans-ui">
        {/* ── Cabeçalho de Edição ── */}
        <section className="pb-6 border-b-2 border-[#18221F]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono-tech uppercase tracking-[0.18em] text-[#3A7D5E] mb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#C86D51]" />
                <span>Curadoria Diária • {config.badge}</span>
                {totalSinaisCategorias > 0 && (
                  <>
                    <span className="text-[#DCE2DD]">•</span>
                    <span className="text-[#5A6862]">
                      {totalSinaisCategorias.toLocaleString("pt-BR")} sinais
                      indexados
                    </span>
                  </>
                )}
              </div>
              <h1 className="font-editorial text-4xl sm:text-5xl font-medium tracking-tight text-[#18221F] leading-[1.08]">
                Sinais & Tendências da Engenharia
              </h1>
            </div>

            <p className="text-sm text-[#4A5853] max-w-md leading-relaxed">
              {config.descricao}
            </p>
          </div>
        </section>

        {/* ── Barra de Navegação Editorial (Linha Única Sem Quebra) ── */}
        <section className="py-3.5 border-b border-[#DCE2DD] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Abas com sublinhado verde-floresta */}
          <Tooltip.Provider delayDuration={150}>
            <div className="flex items-center gap-6 overflow-x-auto custom-scrollbar">
              {ABAS.map((a) => {
                const ativo = aba === a;
                return (
                  <Tooltip.Root key={a}>
                    <Tooltip.Trigger asChild>
                      <button
                        onClick={() => setAba(a)}
                        className={`relative py-1.5 text-sm font-semibold whitespace-nowrap transition-colors outline-none ${
                          ativo
                            ? "text-[#255841]"
                            : "text-[#6E7D77] hover:text-[#18221F]"
                        }`}
                      >
                        {a}
                        {ativo && (
                          <span className="absolute bottom-0 inset-x-0 h-[2.5px] bg-[#255841] rounded-full" />
                        )}
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        side="bottom"
                        sideOffset={8}
                        className="z-50 max-w-[260px] rounded-xl border border-[#DCE2DD] bg-white px-3.5 py-2.5 text-xs leading-relaxed text-[#4A5853] shadow-xl"
                      >
                        <span className="block font-semibold text-[#18221F] mb-0.5">
                          {a}
                        </span>
                        {ABA_CONFIG[a].descricao}
                        <Tooltip.Arrow className="fill-white" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                );
              })}
            </div>
          </Tooltip.Provider>

          {/* Busca + Período + Intervalo de Datas */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:flex-initial">
              <svg
                className="w-3.5 h-3.5 text-[#6E7D77] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar tecnologia, norma, fonte..."
                className="w-full sm:w-56 pl-8 pr-6 py-1.5 text-xs bg-white border border-[#DCE2DD] rounded-full text-[#18221F] placeholder:text-[#889690] focus:outline-none focus:border-[#255841]"
              />
              {busca && (
                <button
                  onClick={() => setBusca("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#6E7D77] hover:text-[#18221F]"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center bg-[#EBF0EC] p-0.5 rounded-full border border-[#DCE2DD]">
              {(
                [
                  { key: "recente", label: labelRecente },
                  { key: "7dias", label: "7d" },
                  { key: "30dias", label: "30d" },
                  { key: "todos", label: "Tudo" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPeriodo(opt.key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
                    periodo === opt.key
                      ? "bg-[#255841] text-white font-semibold shadow-xs"
                      : "text-[#5A6862] hover:text-[#18221F]"
                  } ${temFiltroAtivo ? "opacity-40 pointer-events-none" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {config.temData && (
              <div className="hidden xl:flex items-center gap-1.5 bg-white border border-[#DCE2DD] px-3 py-1 rounded-full text-xs">
                <span className="text-[10px] font-mono-tech uppercase text-[#6E7D77]">
                  De
                </span>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="text-[11px] bg-transparent text-[#18221F] focus:outline-none w-[98px]"
                />
                <span className="text-[#DCE2DD]">|</span>
                <span className="text-[10px] font-mono-tech uppercase text-[#6E7D77]">
                  Até
                </span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="text-[11px] bg-transparent text-[#18221F] focus:outline-none w-[98px]"
                />
                {(dataInicio || dataFim) && (
                  <button
                    onClick={() => {
                      setDataInicio("");
                      setDataFim("");
                    }}
                    className="text-[11px] text-[#C86D51] hover:opacity-80 pl-1"
                    title="Limpar datas"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Tópicos / Clusters em Linha Editorial ── */}
        {!loadingCategorias && categorias.length > 0 && (
          <section className="py-3 border-b border-[#DCE2DD] flex items-center gap-2 overflow-x-auto custom-scrollbar">
            <span className="text-[10px] font-mono-tech uppercase tracking-widest text-[#6E7D77] shrink-0 mr-1">
              Cadernos:
            </span>
            <button
              onClick={() => setCategoriaFiltro(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
                categoriaFiltro === null
                  ? "bg-[#18221F] text-[#F5F6F2]"
                  : "bg-[#EFECE4] text-[#4A5853] hover:bg-[#E2DDD2]"
              }`}
            >
              Todos ({totalSinaisCategorias})
            </button>
            {categorias.map((cat) => {
              const ativo = categoriaFiltro === cat.nome;
              return (
                <button
                  key={cat.nome}
                  onClick={() =>
                    setCategoriaFiltro((prev) =>
                      prev === cat.nome ? null : cat.nome,
                    )
                  }
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                    ativo
                      ? "bg-[#255841] text-white shadow-xs"
                      : "bg-[#EFECE4] text-[#4A5853] hover:bg-[#E2DDD2]"
                  }`}
                >
                  <span>{cat.nome}</span>
                  <span
                    className={`text-[10px] font-mono-tech ${
                      ativo ? "text-[#EBF0EC]" : "text-[#6E7D77]"
                    }`}
                  >
                    {cat.total}
                  </span>
                </button>
              );
            })}
          </section>
        )}

        {/* ── Marquee de Keywords (Aba Geral) ── */}
        {aba === "Geral" && keywords.length > 0 && (
          <section className="mt-4">
            <KeywordMarquee
              keywords={keywords}
              activeKeyword={keywordFiltro}
              onSelect={(kw) =>
                setKeywordFiltro((prev) => (prev === kw ? null : kw))
              }
            />
          </section>
        )}

        {/* ── Barra de Status do Recorte ── */}
        {(temFiltroAtivo || keywordFiltro || busca) && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 bg-[#EFECE4] border border-[#DCE2DD] rounded-xl px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#18221F]">
              <span className="font-mono-tech uppercase text-[10px] tracking-wider text-[#3A7D5E] font-semibold">
                Filtro ativo:
              </span>
              {categoriaFiltro && (
                <span className="px-2.5 py-0.5 rounded-full bg-white text-[#255841] font-semibold border border-[#DCE2DD]">
                  Categoria: {categoriaFiltro}
                </span>
              )}
              {keywordFiltro && (
                <span className="px-2.5 py-0.5 rounded-full bg-white text-[#255841] font-semibold border border-[#DCE2DD]">
                  Tópico: #{keywordFiltro}
                </span>
              )}
              {busca && (
                <span className="px-2.5 py-0.5 rounded-full bg-white text-[#255841] font-semibold border border-[#DCE2DD]">
                  Busca: "{busca}"
                </span>
              )}
            </div>
            <button
              onClick={limparFiltros}
              className="text-xs font-semibold text-[#C86D51] hover:underline"
            >
              Limpar filtros ✕
            </button>
          </div>
        )}

        {/* ── CONTEÚDO PRINCIPAL ── */}
        <div className="mt-8">
          {loading ? (
            <EditorialSkeleton />
          ) : semNoticias ? (
            <div className="my-8 py-16 px-4 text-center bg-white rounded-2xl border border-[#DCE2DD]">
              <p className="font-editorial text-2xl text-[#18221F] mb-2">
                Nenhum sinal encontrado para este recorte.
              </p>
              <p className="text-sm text-[#6E7D77] max-w-md mx-auto mb-5">
                Não há registros correspondentes à combinação atual de categoria,
                palavra-chave ou janela de tempo.
              </p>
              <button
                onClick={() => {
                  limparFiltros();
                  setPeriodo("todos");
                }}
                className="px-5 py-2.5 rounded-full bg-[#255841] text-white text-xs font-semibold hover:bg-[#1D4633] transition-colors"
              >
                Ver Base Completa
              </button>
            </div>
          ) : (
            <>
              {/* ── 1ª DOBRA: MANCHETE DE CAPA (8 COL) + GIRO DO RADAR (4 COL) ── */}
              {manchete && (
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10 border-b border-[#DCE2DD]">
                  {/* Coluna Principal (8 colunas) */}
                  <article
                    onClick={() => handleSelectNews(manchete)}
                    className={`lg:col-span-8 group cursor-pointer flex flex-col justify-between ${
                      colLateral.length > 0
                        ? "lg:pr-8 lg:border-r border-[#DCE2DD]"
                        : "lg:col-span-12"
                    } ${
                      !temImagemValida(manchete)
                        ? "bg-white rounded-2xl border border-[#DCE2DD] p-6 sm:p-8 shadow-[0_8px_28px_rgba(24,34,31,0.04)]"
                        : ""
                    }`}
                  >
                    <div>
                      {temImagemValida(manchete) ? (
                        <div className="relative overflow-hidden rounded-xl bg-[#E5EAE6] aspect-[16/9] mb-5 border border-[#DCE2DD]">
                          <img
                            src={manchete.imageUrl!}
                            alt={manchete.title}
                            onError={() => marcarErroImagem(manchete.id)}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-[10px] font-mono-tech uppercase tracking-wider font-semibold bg-[#255841] text-white shadow-sm">
                              Destaque da Edição
                            </span>
                            <span className="px-3 py-1 rounded-full text-[10px] font-mono-tech uppercase tracking-wider font-semibold bg-[#F5F6F2]/95 text-[#18221F] backdrop-blur-xs">
                              {manchete.category}
                            </span>
                          </div>
                          {manchete.relevance > 0 && (
                            <div className="absolute bottom-3.5 right-3.5 px-2.5 py-1 rounded-md bg-[#18221F]/85 text-[#F5F6F2] font-mono-tech text-[11px] font-medium backdrop-blur-xs">
                              Score {manchete.relevance}/100
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#EAEDE8]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-[10px] font-mono-tech uppercase tracking-wider font-semibold bg-[#255841] text-white">
                              Destaque da Edição
                            </span>
                            <span className="px-3 py-1 rounded-full text-[10px] font-mono-tech uppercase tracking-wider font-semibold bg-[#EFECE4] text-[#18221F]">
                              {manchete.category}
                            </span>
                          </div>
                          {manchete.relevance > 0 && (
                            <span className="px-3 py-1 rounded-full text-xs font-mono-tech font-bold bg-[#EBF0EC] text-[#255841] border border-[#CFE0D6]">
                              Score {manchete.relevance}/100
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E7D77] mb-2.5">
                        <span className="font-semibold text-[#C86D51] uppercase tracking-wider text-[11px]">
                          {manchete.fonte || "Fonte Verificada"}
                        </span>
                        <span>•</span>
                        <span>
                          {formatShortDate(
                            manchete.pub_date || manchete.atualizado_em,
                          )}
                        </span>
                        <span>•</span>
                        <span className="font-mono-tech text-[11px]">
                          Leitura {estimarTempoLeitura(manchete)}
                        </span>
                      </div>

                      <h2 className="font-editorial text-2xl sm:text-4xl font-medium text-[#18221F] group-hover:text-[#255841] transition-colors leading-[1.15] mb-3.5">
                        {manchete.title}
                      </h2>

                      <p className="text-sm sm:text-base text-[#4A5853] leading-relaxed mb-5">
                        {manchete.description}
                      </p>
                    </div>

                    {/* Faixa de Métricas ou Chamada */}
                    {(() => {
                      const metricasManchete = normalizarMetricas(
                        manchete.metricas,
                      );
                      return metricasManchete.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-[#DCE2DD]">
                          {metricasManchete.slice(0, 3).map((m, idx) => (
                            <div
                              key={idx}
                              className="bg-[#EFECE4]/75 rounded-lg px-3.5 py-2.5 border border-[#E2DDD2]"
                            >
                              <span className="block text-[10px] font-mono-tech uppercase tracking-wider text-[#6E7D77] truncate">
                                {m.rotulo}
                              </span>
                              <span className="font-editorial text-lg font-semibold text-[#255841]">
                                {m.valor}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="pt-4 border-t border-[#DCE2DD] flex items-center justify-between text-xs text-[#255841] font-semibold">
                          <span>
                            Abrir dossiê completo (impacto, aplicação em obra e
                            riscos)
                          </span>
                          <span className="group-hover:translate-x-1 transition-transform">
                            Ler análise →
                          </span>
                        </div>
                      );
                    })()}
                  </article>

                  {/* Coluna Direita: Giro do Radar (4 colunas) */}
                  {colLateral.length > 0 && (
                    <div className="lg:col-span-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#18221F]">
                          <h3 className="text-xs font-mono-tech uppercase tracking-[0.16em] font-semibold text-[#18221F]">
                            Em Pauta • {aba}
                          </h3>
                          <span className="text-[11px] font-mono-tech text-[#3A7D5E]">
                            {totalRegistros !== null
                              ? `${totalRegistros} sinais`
                              : "Destaques"}
                          </span>
                        </div>

                        <div className="divide-y divide-[#DCE2DD]">
                          {colLateral.map((item, idx) => {
                            const mostrarFoto = temImagemValida(item);
                            return (
                              <article
                                key={item.id}
                                onClick={() => handleSelectNews(item)}
                                className="py-4 first:pt-0 last:pb-0 group cursor-pointer"
                              >
                                <div className="flex items-start gap-3.5">
                                  {!mostrarFoto && (
                                    <span className="font-editorial text-2xl font-medium text-[#3A7D5E]/60 group-hover:text-[#255841] transition-colors leading-none pt-0.5 select-none">
                                      0{idx + 2}
                                    </span>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] font-mono-tech uppercase tracking-wider font-semibold text-[#C86D51] truncate">
                                        {item.category}
                                      </span>
                                      {item.relevance > 0 && (
                                        <>
                                          <span className="text-[#DCE2DD]">
                                            •
                                          </span>
                                          <span className="text-[10px] font-mono-tech text-[#3A7D5E] font-medium shrink-0">
                                            {item.relevance} pts
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    <h4 className="font-editorial text-lg font-medium text-[#18221F] group-hover:text-[#255841] transition-colors leading-snug mb-1.5">
                                      {item.title}
                                    </h4>
                                    <p className="text-xs text-[#5A6862] line-clamp-2 leading-relaxed mb-2">
                                      {item.description}
                                    </p>
                                    <span className="text-[11px] text-[#6E7D77]">
                                      {item.fonte || "Vector-X"} •{" "}
                                      {formatShortDate(
                                        item.pub_date || item.atualizado_em,
                                      )}
                                    </span>
                                  </div>

                                  {mostrarFoto && (
                                    <img
                                      src={item.imageUrl!}
                                      alt={item.title}
                                      onError={() => marcarErroImagem(item.id)}
                                      className="w-20 h-20 rounded-lg object-cover shrink-0 bg-[#E5EAE6] border border-[#DCE2DD] group-hover:opacity-90 transition-opacity"
                                      loading="lazy"
                                    />
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-6 p-4 rounded-xl bg-[#EBF0EC] border border-[#CFE0D6]">
                        <p className="text-[10px] font-mono-tech uppercase tracking-wider text-[#255841] font-semibold mb-1">
                          Dossiê Técnico Vector-X
                        </p>
                        <p className="text-xs text-[#35473F] leading-relaxed">
                          Clique em qualquer matéria para abrir a{" "}
                          <strong>Folha de Leitura</strong> com indicadores de
                          obra, viabilidade e limitações técnicas.
                        </p>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* ── 2ª DOBRA: MAIS MATÉRIAS DA EDIÇÃO (GRID DE 3 COLUNAS) ── */}
              {restantes.length > 0 && (
                <section className="pt-10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-mono-tech uppercase tracking-[0.16em] text-[#4A5853] font-semibold">
                      Mais Sinais & Análises da Edição ({restantes.length})
                    </h3>
                    <div className="h-px flex-1 bg-[#DCE2DD] ml-4" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {restantes.map((item) => {
                      const metricasCard = normalizarMetricas(item.metricas);
                      const mostrarFoto = temImagemValida(item);

                      return (
                        <article
                          key={item.id}
                          onClick={() => handleSelectNews(item)}
                          className="group cursor-pointer bg-white rounded-xl border border-[#DCE2DD] hover:border-[#255841] overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-[0_12px_32px_rgba(24,34,31,0.06)]"
                        >
                          <div>
                            {mostrarFoto && (
                              <div className="relative aspect-[16/10] bg-[#E5EAE6] overflow-hidden border-b border-[#DCE2DD]">
                                <img
                                  src={item.imageUrl!}
                                  alt={item.title}
                                  onError={() => marcarErroImagem(item.id)}
                                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                                  loading="lazy"
                                />
                                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-mono-tech uppercase tracking-wider font-semibold bg-[#F5F6F2]/95 text-[#18221F] backdrop-blur-xs">
                                  {item.category}
                                </span>
                                {item.relevance > 0 && (
                                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-[#18221F]/80 text-white font-mono-tech text-[10px]">
                                    {item.relevance} pts
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="p-5 sm:p-6">
                              {!mostrarFoto && (
                                <div className="flex items-center justify-between gap-2 pb-3 mb-3.5 border-b border-[#EAEDE8]">
                                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono-tech uppercase tracking-wider font-semibold bg-[#EFECE4] text-[#18221F] truncate">
                                    {item.category}
                                  </span>
                                  {item.relevance > 0 && (
                                    <span className="px-2 py-0.5 rounded bg-[#EBF0EC] text-[#255841] font-mono-tech text-[10px] font-semibold shrink-0">
                                      {item.relevance} pts
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center justify-between text-[11px] text-[#6E7D77] mb-2">
                                <span className="font-semibold text-[#C86D51] truncate max-w-[190px]">
                                  {item.fonte || "Fonte Técnica"}
                                </span>
                                <span className="font-mono-tech">
                                  {formatShortDate(
                                    item.pub_date || item.atualizado_em,
                                  )}
                                </span>
                              </div>

                              <h4 className="font-editorial text-xl font-medium text-[#18221F] group-hover:text-[#255841] transition-colors leading-snug mb-2.5 line-clamp-2">
                                {item.title}
                              </h4>

                              <p className="text-xs text-[#5A6862] leading-relaxed line-clamp-3">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          <div className="px-5 py-3.5 bg-[#F9FAF7] border-t border-[#EAEDE8] flex items-center justify-between">
                            {metricasCard[0] ? (
                              <div className="text-xs truncate pr-2">
                                <span className="text-[#6E7D77]">
                                  {metricasCard[0].rotulo}:{" "}
                                </span>
                                <strong className="font-semibold text-[#255841]">
                                  {metricasCard[0].valor}
                                </strong>
                              </div>
                            ) : (
                              <span className="text-[11px] font-mono-tech text-[#6E7D77]">
                                Leitura {estimarTempoLeitura(item)}
                              </span>
                            )}
                            <span className="text-xs font-semibold text-[#255841] group-hover:translate-x-0.5 transition-transform shrink-0">
                              Ler dossiê →
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Botão Carregar Mais (Paginação Supabase) */}
              {hasMore && !loading && (
                <div className="mt-12 flex justify-center">
                  <button
                    onClick={carregarMais}
                    disabled={loadingMore}
                    className="group text-xs sm:text-sm font-semibold border border-[#255841]/30 bg-white hover:bg-[#255841] text-[#18221F] hover:text-white px-7 py-3.5 rounded-full transition-all disabled:opacity-50 flex items-center gap-2.5 shadow-xs"
                  >
                    {loadingMore
                      ? "Sincronizando mais sinais..."
                      : "Carregar mais matérias da edição"}
                    {!loadingMore && (
                      <span className="text-[#3A7D5E] group-hover:text-white group-hover:translate-y-0.5 transition-transform">
                        ↓
                      </span>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── MODAL: FOLHA DE LEITURA EDITORIAL ── */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18221F]/60 backdrop-blur-xs p-3 sm:p-6 font-sans-ui">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedNews(null)}
          />

          <div className="relative z-10 w-full max-w-3xl max-h-[92vh] bg-[#F5F6F2] rounded-2xl border border-[#DCE2DD] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Barra Superior da Folha de Leitura */}
            <div className="px-6 py-3.5 bg-white border-b border-[#DCE2DD] flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono-tech uppercase tracking-wider font-semibold bg-[#255841] text-white truncate">
                  {selectedNews.categoria || selectedNews.category}
                </span>
                {selectedNews.score_tecnico !== undefined &&
                  selectedNews.score_tecnico > 0 && (
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono-tech font-semibold bg-[#EBF0EC] text-[#255841] border border-[#CFE0D6]">
                      Score {selectedNews.score_tecnico}/100
                    </span>
                  )}
                {selectedNews.fonte && (
                  <span className="text-xs text-[#6E7D77] truncate hidden sm:inline border-l border-[#DCE2DD] pl-2.5">
                    {selectedNews.fonte}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() =>
                    indiceModal > 0 &&
                    handleSelectNews(noticiasFiltradas[indiceModal - 1])
                  }
                  disabled={indiceModal <= 0}
                  className="px-2.5 py-1 rounded border border-[#DCE2DD] bg-white text-xs text-[#18221F] disabled:opacity-30 hover:bg-[#EFECE4]"
                  title="Matéria anterior (←)"
                >
                  ←
                </button>
                <span className="text-[11px] font-mono-tech text-[#6E7D77] px-1">
                  {indiceModal + 1}/{noticiasFiltradas.length}
                </span>
                <button
                  onClick={() =>
                    indiceModal < noticiasFiltradas.length - 1 &&
                    handleSelectNews(noticiasFiltradas[indiceModal + 1])
                  }
                  disabled={indiceModal >= noticiasFiltradas.length - 1}
                  className="px-2.5 py-1 rounded border border-[#DCE2DD] bg-white text-xs text-[#18221F] disabled:opacity-30 hover:bg-[#EFECE4]"
                  title="Próxima matéria (→)"
                >
                  →
                </button>
                <button
                  onClick={() => setSelectedNews(null)}
                  aria-label="Fechar"
                  className="ml-2 px-3 py-1 rounded-md bg-[#EFECE4] hover:bg-[#E2DDD2] text-xs font-semibold text-[#18221F]"
                >
                  Fechar ✕
                </button>
              </div>
            </div>

            {/* Corpo do Artigo */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {temImagemValida(selectedNews) && (
                <div className="aspect-[21/9] w-full bg-[#E5EAE6] relative border-b border-[#DCE2DD]">
                  <img
                    src={selectedNews.imageUrl!}
                    alt={selectedNews.title}
                    onError={() => marcarErroImagem(selectedNews.id)}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6 sm:p-10 space-y-6">
                <div className="border-b border-[#DCE2DD] pb-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E7D77] mb-2.5">
                    <span className="font-semibold text-[#C86D51] uppercase tracking-wider">
                      {selectedNews.fonte || "Vector-X Intelligence"}
                    </span>
                    <span>•</span>
                    <span>
                      Indexado em{" "}
                      {formatTime(
                        selectedNews.pub_date || selectedNews.atualizado_em,
                      )}
                    </span>
                    <span>•</span>
                    <span>Leitura {estimarTempoLeitura(selectedNews)}</span>
                  </div>
                  <h2 className="font-editorial text-2xl sm:text-4xl font-medium text-[#18221F] leading-[1.15]">
                    {selectedNews.title}
                  </h2>
                </div>

                {/* Faixa de Indicadores (se houver `metricas` no registro) */}
                {(() => {
                  const metricasModal = normalizarMetricas(
                    selectedNews.metricas,
                  );
                  return (
                    metricasModal.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#EFECE4] p-4 rounded-xl border border-[#E2DDD2]">
                        {metricasModal.map((m, i) => (
                          <div key={i}>
                            <span className="block text-[10px] font-mono-tech uppercase tracking-wider text-[#6E7D77]">
                              {m.rotulo}
                            </span>
                            <span className="font-editorial text-xl font-semibold text-[#255841]">
                              {m.valor}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  );
                })()}

                {/* Lide / Síntese Executiva */}
                <div className="border-l-[3px] border-[#255841] pl-4 py-1">
                  <span className="block text-[10px] font-mono-tech uppercase tracking-widest text-[#255841] font-semibold mb-1">
                    Síntese Executiva
                  </span>
                  <p className="font-editorial text-lg text-[#18221F] leading-relaxed">
                    {selectedNews.resumo_executivo || selectedNews.description}
                  </p>
                </div>

                {/* Carregamento dos campos detalhados do Supabase */}
                {loadingDetalhes ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 opacity-60">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="p-5 rounded-xl border border-[#DCE2DD] bg-white space-y-2.5 animate-pulse"
                      >
                        <div className="h-3 w-28 rounded bg-[#DCE2DD]" />
                        <div className="h-14 rounded bg-[#EBF0EC]" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {selectedNews.o_que_e && (
                      <div className="bg-white p-5 rounded-xl border border-[#DCE2DD]">
                        <h4 className="text-[11px] font-mono-tech uppercase tracking-wider text-[#6E7D77] font-semibold mb-1.5">
                          O que é na prática
                        </h4>
                        <p className="text-sm text-[#35423E] leading-relaxed">
                          {selectedNews.o_que_e}
                        </p>
                      </div>
                    )}

                    {(selectedNews.impacto_real || selectedNews.contras) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedNews.impacto_real && (
                          <div className="bg-[#EBF0EC] p-5 rounded-xl border border-[#CFE0D6]">
                            <h4 className="text-[11px] font-mono-tech uppercase tracking-wider text-[#255841] font-semibold mb-1.5">
                              Impacto Real & ROI
                            </h4>
                            <p className="text-sm text-[#18221F] leading-relaxed">
                              {selectedNews.impacto_real}
                            </p>
                          </div>
                        )}

                        {selectedNews.contras && (
                          <div className="bg-[#FDF4F1] p-5 rounded-xl border border-[#F2D5CC]">
                            <h4 className="text-[11px] font-mono-tech uppercase tracking-wider text-[#C86D51] font-semibold mb-1.5">
                              Limitações, Gargalos & Riscos
                            </h4>
                            <p className="text-sm text-[#4A352F] leading-relaxed">
                              {selectedNews.contras}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedNews.como_aplicar && (
                      <div className="bg-white p-5 rounded-xl border border-[#DCE2DD]">
                        <h4 className="text-[11px] font-mono-tech uppercase tracking-wider text-[#255841] font-semibold mb-1.5">
                          Aplicação em Projeto / Obra
                        </h4>
                        <p className="text-sm text-[#35423E] leading-relaxed">
                          {selectedNews.como_aplicar}
                        </p>
                      </div>
                    )}

                    {(selectedNews.quando_usar || selectedNews.motivo) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedNews.quando_usar && (
                          <div className="bg-white p-5 rounded-xl border border-[#DCE2DD]">
                            <h4 className="text-[11px] font-mono-tech uppercase tracking-wider text-[#6E7D77] font-semibold mb-1.5">
                              Timing & Contexto de Uso
                            </h4>
                            <p className="text-sm text-[#35423E] leading-relaxed">
                              {selectedNews.quando_usar}
                            </p>
                          </div>
                        )}
                        {selectedNews.motivo && (
                          <div className="bg-white p-5 rounded-xl border border-[#DCE2DD]">
                            <h4 className="text-[11px] font-mono-tech uppercase tracking-wider text-[#6E7D77] font-semibold mb-1.5">
                              Relevância Estratégica
                            </h4>
                            <p className="text-sm text-[#35423E] leading-relaxed">
                              {selectedNews.motivo}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="px-6 py-3.5 bg-white border-t border-[#DCE2DD] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => copiarSintese(selectedNews)}
                className="px-4 py-2 rounded-lg border border-[#DCE2DD] bg-[#F5F6F2] hover:bg-[#EFECE4] text-xs font-semibold text-[#18221F] transition-colors"
              >
                {copiado ? "✓ Síntese copiada" : "Copiar síntese executiva"}
              </button>

              {selectedNews.link && (
                <a
                  href={selectedNews.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2 rounded-lg bg-[#255841] hover:bg-[#1D4633] text-white text-xs font-semibold transition-colors inline-flex items-center gap-2"
                >
                  Acessar Fonte Original ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}