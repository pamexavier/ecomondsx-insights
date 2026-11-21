import {
  FONTES_VOC,
  TIPOS_COMODO,
  type FonteVocKey,
  type OrientacaoKey,
  type PosicaoJanelaKey,
  type TipoComodoKey,
  type TipoVidroKey,
} from "@/data/wellness";
import { vocRelativoNoTempo } from "@/lib/wellness";
import { Suspense, lazy, useEffect, useId, useState } from "react";

const SimuladorAr = lazy(() => import("./SimuladoAr"));
const SimuladorLuz = lazy(() => import("./SimuladorLuz"));

export function seloAnchorId(seloId: string) {
  return `selo-${seloId.toLowerCase()}`;
}

export function irParaSelo(seloId: string) {
  window.location.href = `/certificacoes#${seloAnchorId(seloId)}`;
}

export interface TrilhaWellnessProps {
  tipoComodo: TipoComodoKey;
  onSelectTipoComodo: (tipo: TipoComodoKey) => void;
  comprimentoM: number;
  larguraM: number;
  peDireitoM: number;
  larguraFachadaM: number;
  profundidadeComodoM: number;
  areaVidroM2: number;
  percentualVidro: number;
  tipoVidro: TipoVidroKey;
  onChangeTipoVidro: (tipo: TipoVidroKey) => void;
  orientacao: OrientacaoKey;
  reducaoSolarBrise: number;
  posicaoJanelas: PosicaoJanelaKey;
  ocupantes: number;
  onChangeOcupantes: (ocupantes: number) => void;
  ach: number;
  onChangeAch: (ach: number) => void;
  ganhosInternosWm2: number;
  onAplicarGanhoInternoNoTermico: (novoWm2: number) => void;
  modoSimulador: "simples" | "especialista";
  temperaturaExternaC: number;
  setpointC: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ÍCONES VETORIAIS MINIMALISTAS (SEM EMOJIS NA INTERFACE)
═══════════════════════════════════════════════════════════════════════════ */

function IconeSliders({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="2" y1="14" x2="6" y2="14" />
      <line x1="10" y1="8" x2="14" y2="8" />
      <line x1="18" y1="16" x2="22" y2="16" />
    </svg>
  );
}

function IconeOlho({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconeLivro({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function IconeFechar({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconeSeta({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GRADE PROFISSIONAL DE GUIAS PRÁTICOS + MODAL DIVIDIDO (ZERO SCROLL LATERAL)
═══════════════════════════════════════════════════════════════════════════ */

type GuiaPraticoItem = {
  id: string;
  categoria: string;
  botaoCurto: string;
  subtituloCurto: string;
  titulo: string;
  resumo: string;
  passos: { titulo: string; detalhe: string }[];
  dicaOuro: string;
};

function SecaoGuiasPraticos({
  tituloSecao,
  itens,
  ctaSimulador,
  linkExtra,
}: {
  tituloSecao: string;
  itens: GuiaPraticoItem[];
  ctaSimulador?: {
    label: string;
    detalhe: string;
    onClick: () => void;
  };
  linkExtra?: {
    label: string;
    onClick: () => void;
  };
}) {
  const [ativoId, setAtivoId] = useState<string | null>(null);
  const itemAtivo = itens.find((item) => item.id === ativoId) ?? null;

  useEffect(() => {
    if (!ativoId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAtivoId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ativoId]);

  const gridCols =
    itens.length === 3
      ? "sm:grid-cols-3"
      : itens.length === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <>
      <div className="mx-auto w-full max-w-[940px] space-y-3 print:hidden">
        {/* Cabeçalho discreto da seção de guias + botão limpo para o simulador */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IconeLivro className="size-3.5 text-primary" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
              {tituloSecao}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {linkExtra && (
              <button
                type="button"
                onClick={linkExtra.onClick}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary cursor-pointer"
              >
                <span>{linkExtra.label}</span>
                <IconeSeta className="size-3" />
              </button>
            )}
            {ctaSimulador && (
              <button
                type="button"
                onClick={ctaSimulador.onClick}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 cursor-pointer"
              >
                <IconeSliders className="size-3.5" />
                <span>{ctaSimulador.label}</span>
                <span className="hidden sm:inline border-l border-white/25 pl-2 font-mono text-[10px] opacity-90">
                  {ctaSimulador.detalhe}
                </span>
                <IconeSeta className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Grade uniforme de cartões limpos (muito mais profissional que pílulas soltas) */}
        <div className={`grid grid-cols-1 gap-2 ${gridCols}`}>
          {itens.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAtivoId(item.id)}
              className="group flex flex-col justify-between rounded-xl border border-border bg-card p-3.5 text-left transition-all hover:border-primary/50 hover:bg-primary/[0.03] hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <div>
                <span className="block font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-primary">
                  {item.categoria}
                </span>
                <span className="mt-1 block text-xs font-bold leading-snug text-foreground group-hover:text-primary">
                  {item.botaoCurto}
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                  {item.subtituloCurto}
                </span>
              </div>
              <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary/90">
                <span>Ler orientação</span>
                <IconeSeta className="size-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* MODAL EXECUTIVO EM 2 COLUNAS — ZERO SCROLL HORIZONTAL */}
      {itemAtivo && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`wellness-guia-${itemAtivo.id}`}
          onClick={() => setAtivoId(null)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Cabeçalho limpo */}
            <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/25 px-4 py-3 sm:px-6">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  Guia Prático · {itemAtivo.categoria}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAtivoId(null)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground cursor-pointer"
                aria-label="Fechar guia"
              >
                <span>Fechar</span>
                <IconeFechar className="size-3.5" />
              </button>
            </div>

            {/* Corpo dividido: Lista lateral vertical (desktop) / Grade empilhada (mobile) + Conteúdo */}
            <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[230px_1fr] md:overflow-hidden">
              {/* Índice lateral — NUNCA tem scroll horizontal */}
              <aside className="border-b border-border bg-muted/20 p-3 md:overflow-y-auto md:border-r md:border-b-0">
                <p className="mb-2 px-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Tópicos deste tema
                </p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-1">
                  {itens.map((tab) => {
                    const ativa = tab.id === itemAtivo.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setAtivoId(tab.id)}
                        className={`rounded-lg px-3 py-2 text-left transition-colors cursor-pointer ${
                          ativa
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-foreground/80 hover:bg-muted/70 hover:text-foreground"
                        }`}
                      >
                        <span
                          className={`block font-mono text-[9px] uppercase tracking-wider ${
                            ativa ? "text-primary-foreground/80" : "text-muted-foreground"
                          }`}
                        >
                          {tab.categoria}
                        </span>
                        <span className="mt-0.5 block text-xs font-semibold leading-snug">
                          {tab.botaoCurto}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* Área de leitura principal */}
              <div className="space-y-4 p-4 sm:p-6 md:overflow-y-auto">
                <div>
                  <h4
                    id={`wellness-guia-${itemAtivo.id}`}
                    className="text-display text-base sm:text-lg font-extrabold leading-snug text-foreground"
                  >
                    {itemAtivo.titulo}
                  </h4>
                  <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                    {itemAtivo.resumo}
                  </p>
                </div>

                <div className="space-y-2.5">
                  {itemAtivo.passos.map((passo, index) => (
                    <div
                      key={passo.titulo}
                      className="rounded-xl border border-border bg-background/60 p-3.5"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-primary/12 font-mono text-[10px] font-bold text-primary">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-foreground">
                            {passo.titulo}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {passo.detalhe}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 text-xs leading-relaxed text-foreground">
                  <span className="mb-1 block font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-primary">
                    Síntese prática
                  </span>
                  {itemAtivo.dicaOuro}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="hidden print:grid print:grid-cols-3 print:gap-2">
        {itens.map((item) => (
          <div key={item.id} className="rounded-xl border border-border p-2.5 text-[10px]">
            <p className="font-bold">{item.titulo}</p>
            <p className="mt-1">{item.resumo}</p>
          </div>
        ))}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTROLE SEGMENTADO REUTILIZÁVEL (BOTÕES LIMPOS E PROFISSIONAIS)
═══════════════════════════════════════════════════════════════════════════ */

function ModoSwitch({
  modo,
  onChange,
  labelSimulador,
}: {
  modo: "guia" | "simulador";
  onChange: (m: "guia" | "simulador") => void;
  labelSimulador: string;
}) {
  return (
    <div
      className="inline-flex shrink-0 rounded-xl border border-border bg-muted/50 p-1 print:hidden"
      role="group"
      aria-label="Alternar entre guia visual e simulador"
    >
      <button
        type="button"
        onClick={() => onChange("guia")}
        aria-pressed={modo === "guia"}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
          modo === "guia"
            ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <IconeOlho className="size-3.5" />
        <span>Guia visual</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("simulador")}
        aria-pressed={modo === "simulador"}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
          modo === "simulador"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <IconeSliders className="size-3.5" />
        <span>{labelSimulador}</span>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMA 1: CO₂, FOCO E SONO
═══════════════════════════════════════════════════════════════════════════ */

const GUIAS_CO2: GuiaPraticoItem[] = [
  {
    id: "co2-sem-obra",
    categoria: "Sem obra",
    botaoCurto: "Só tenho 1 janela. O que faço?",
    subtituloCurto: "Rotinas de fresta, porta e ventilador.",
    titulo: "Como renovar o ar do quarto ou escritório sem reforma",
    resumo:
      "Mesmo com apenas uma janela, pequenas aberturas combinadas e pausas curtas já derrubam o CO₂ pela metade.",
    passos: [
      {
        titulo: "Ao dormir: fresta de 2 dedos na janela + porta encostada",
        detalhe:
          "Deixar a janela destravada (ou basculante) e a porta sem vedação total cria troca contínua de ar durante a madrugada sem resfriar o ambiente.",
      },
      {
        titulo: "No home office: pausa de 5 minutos a cada 1h30",
        detalhe:
          "Entre reuniões, abra a janela e a porta do cômodo. Cinco minutos de fluxo renovam quase todo o volume de ar de um escritório médio.",
      },
      {
        titulo: "Truque do ventilador virado para fora",
        detalhe:
          "Em dias sem vento e cômodos com apenas uma janela, posicione um ventilador comum a ~1 m soprando para a rua por 3 minutos para puxar o ar viciado para fora.",
      },
    ],
    dicaOuro:
      "Acordar cansado mesmo após 8 horas de sono muitas vezes não é falta de descanso — é o quarto vedado ultrapassando 2.000 ppm de CO₂ de madrugada.",
  },
  {
    id: "co2-ar-condicionado",
    categoria: "Mito comum",
    botaoCurto: "Ar-condicionado split renova o ar?",
    subtituloCurto: "Por que sala gelada ainda dá sono.",
    titulo: "O ar-condicionado split não traz ar novo da rua",
    resumo:
      "O split convencional resfria e recircula sempre o mesmo ar interno — ele não injeta oxigênio nem remove o CO₂ gerado pela respiração.",
    passos: [
      {
        titulo: "O que passa pela tubulação da parede?",
        detalhe:
          "Os tubos que ligam a unidade interna à condensadora externa conduzem gás refrigerante e água de dreno, não ar fresco externo.",
      },
      {
        titulo: "Por que dá sonolência em sala de reunião climatizada?",
        detalhe:
          "Com 4 ou 5 pessoas respirando em sala fechada com split ligado, o ar fica frio mas o CO₂ sobe rapidamente em menos de 40 minutos.",
      },
      {
        titulo: "Como equilibrar conforto térmico e ar limpo?",
        detalhe:
          "Em casa, renove o ar antes de dormir e ao acordar (ou mantenha microfresta). Em escritórios, especifique renovação mecânica filtrada ou recuperador de calor (ERV).",
      },
    ],
    dicaOuro:
      "Ar gelado não significa ar renovado. Se o ambiente parecer abafado ao entrar vindo de fora, a concentração de CO₂ já está elevada.",
  },
  {
    id: "co2-umidade-split",
    categoria: "Saúde respiratória",
    botaoCurto: "Split resseca garganta e olhos?",
    subtituloCurto: "Faixa confortável de 40% a 60% UR.",
    titulo: "Por que dormir com ar-condicionado resseca vias aéreas",
    resumo:
      "Para resfriar o ambiente, o aparelho condensa a umidade do ar interno na serpentina fria e a elimina pelo dreno, podendo derrubar a umidade abaixo de 35%–40%.",
    passos: [
      {
        titulo: "Evite setpoints extremos (18 °C–20 °C)",
        detalhe:
          "Quanto menor a temperatura configurada, mais tempo o compressor opera e mais água retira do ar. Ajustar entre 23 °C e 25 °C reduz bastante o ressecamento.",
      },
      {
        titulo: "Limpeza quinzenal ou mensal das telas",
        detalhe:
          "Filtros empoeirados recirculam partículas num ar já seco, agravando rinite, olho seco e tosse matinal.",
      },
      {
        titulo: "Controle da umidade em climas secos",
        detalhe:
          "Se a umidade cair abaixo de 40%, um umidificador por poucas horas (com água trocada diariamente) ajuda — desligue antes de 60% para evitar mofo.",
      },
    ],
    dicaOuro:
      "A faixa de conforto respiratório fica entre 40% e 60% de umidade relativa: abaixo disso resseca mucosas; acima de 65%–70% favorece ácaros e fungos.",
  },
  {
    id: "co2-o-que-e-ppm",
    categoria: "Referência",
    botaoCurto: "O que significam os ppm?",
    subtituloCurto: "Leitura rápida das faixas de CO₂.",
    titulo: "Como interpretar a escala de CO₂ (ppm)",
    resumo:
      "ppm significa partes por milhão. Nessas faixas, o CO₂ atua como indicador objetivo da taxa de renovação de ar por pessoa.",
    passos: [
      {
        titulo: "420 a 800 ppm — Ar fresco (faixa ideal)",
        detalhe:
          "Próximo ao ar externo (~420 ppm). Favorece clareza cognitiva, tomada de decisão e sensação de ambiente leve.",
      },
      {
        titulo: "800 a 1.000 ppm — Faixa de atenção",
        detalhe:
          "Comum em salas fechadas após 1 a 2 horas. Indica o momento certo de abrir uma janela ou reforçar a troca de ar.",
      },
      {
        titulo: "Acima de 1.500 ppm — Ar carregado",
        detalhe:
          "Frequente em quartos vedados à noite. Associado a sensação de abafamento, fadiga mental e descanso menos restaurador.",
      },
    ],
    dicaOuro:
      "Quando o CO₂ sobe, odores, umidade respiratória e aerossóis se acumulam juntos — ventilar protege foco e saúde simultaneamente.",
  },
];

function CenaCo2Animada({
  onAbrirSimulador,
  resumoComodo,
}: {
  onAbrirSimulador: () => void;
  resumoComodo: string;
}) {
  const uid = useId().replace(/:/g, "");
  const [cenario, setCenario] = useState<"fechado" | "fresta" | "cruzada">("fechado");

  const dados = {
    fechado: {
      ppm: "~2.400 ppm",
      cor: "#dc2626",
      bg: "#fef2f2",
      hazeOpacity: 0.22,
      bannerTitle: "Quarto/sala vedado por horas (ar parado)",
      bannerSub: "Mesmo com ar-condicionado split, o CO₂ acumula.",
      statusLabel: "AR CARREGADO",
      efeito1: "Sono pesado ao acordar",
      efeito2: "Bocejos e foco mais lento",
      efeito3: "Ar abafado ou ressecado",
      bolhas: 10,
      nivelBar: 92,
    },
    fresta: {
      ppm: "~950 ppm",
      cor: "#d97706",
      bg: "#fffbeb",
      hazeOpacity: 0.08,
      bannerTitle: "Sem obra: fresta na janela + porta encostada",
      bannerSub: "Troca suave de ar já corta mais da metade do CO₂.",
      statusLabel: "MODERADO (SEM OBRA)",
      efeito1: "Ar bem menos abafado",
      efeito2: "Boa saída para dormir à noite",
      efeito3: "Renove 10 min ao acordar",
      bolhas: 5,
      nivelBar: 45,
    },
    cruzada: {
      ppm: "~600 ppm",
      cor: "#059669",
      bg: "#ecfdf5",
      hazeOpacity: 0,
      bannerTitle: "Ventilação cruzada (2 aberturas em fluxo)",
      bannerSub: "Ar fresco entra de um lado e leva o CO₂ pelo outro.",
      statusLabel: "AR FRESCO IDEAL",
      efeito1: "Mente clara e alerta",
      efeito2: "Menor fadiga mental",
      efeito3: "Sono mais reparador",
      bolhas: 2,
      nivelBar: 22,
    },
  }[cenario];

  return (
    <div className="space-y-4">
      {/* Seletor segmentado limpo com ponto indicador */}
      <div className="mx-auto flex w-full max-w-[940px] flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Selecione um cenário de ventilação:
        </span>
        <div
          className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-muted/50 p-1"
          role="group"
          aria-label="Cenário de renovação de ar"
        >
          {[
            { id: "fechado" as const, label: "Tudo fechado", dot: "bg-red-500" },
            { id: "fresta" as const, label: "Fresta + porta encostada", dot: "bg-amber-500" },
            { id: "cruzada" as const, label: "Ventilação cruzada", dot: "bg-emerald-600" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setCenario(opt.id)}
              aria-pressed={cenario === opt.id}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                cenario === opt.id
                  ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`size-2 rounded-full ${opt.dot}`} aria-hidden="true" />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Palco SVG */}
      <div className="mx-auto w-full max-w-[940px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3.5 shadow-inner print:print-color-adjust-exact">
        <svg
          viewBox="0 0 800 320"
          className="block h-auto w-full"
          role="img"
          aria-label="Animação mostrando acúmulo de CO₂ em um cômodo fechado comparado a uma fresta na janela e à ventilação cruzada"
        >
          <defs>
            <linearGradient id={`${uid}-skyAir`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#ecfdf5" />
            </linearGradient>
          </defs>

          <rect
            x="14"
            y="14"
            width="106"
            height="292"
            rx="14"
            fill={`url(#${uid}-skyAir)`}
            stroke="#7dd3fc"
            strokeWidth="1.5"
          />
          <text
            x="67"
            y="38"
            textAnchor="middle"
            fill="#0369a1"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            AR LIVRE
          </text>
          <rect x="24" y="48" width="86" height="24" rx="12" fill="#ffffff" stroke="#38bdf8" />
          <text
            x="67"
            y="63.5"
            textAnchor="middle"
            fill="#0284c7"
            fontSize="10.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            ~420 ppm
          </text>

          <rect
            x="120"
            y="14"
            width="402"
            height="292"
            rx="14"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
          {dados.hazeOpacity > 0 && (
            <rect
              x="124"
              y="18"
              width="394"
              height="244"
              rx="10"
              fill={dados.cor}
              opacity={dados.hazeOpacity}
            />
          )}
          <rect x="121" y="264" width="400" height="41" rx="10" fill="#e7d5be" />
          <line x1="121" y1="264" x2="521" y2="264" stroke="#b08968" strokeWidth="2.5" />

          <rect x="114" y="14" width="14" height="86" fill="#64748b" />
          <rect x="114" y="210" width="14" height="96" fill="#64748b" />
          {cenario === "fechado" ? (
            <rect x="118" y="100" width="6" height="110" fill="#94a3b8" stroke="#475569" />
          ) : cenario === "fresta" ? (
            <g>
              <rect x="118" y="100" width="6" height="78" fill="#7dd3fc" stroke="#0284c7" />
              <line x1="118" y1="178" x2="132" y2="206" stroke="#0284c7" strokeWidth="4" />
            </g>
          ) : (
            <g>
              <line x1="118" y1="100" x2="144" y2="120" stroke="#059669" strokeWidth="4" />
              <line x1="118" y1="210" x2="144" y2="190" stroke="#059669" strokeWidth="4" />
            </g>
          )}
          <text
            x="67"
            y="246"
            textAnchor="middle"
            fill={cenario === "fechado" ? "#64748b" : "#047857"}
            fontSize="9.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {cenario === "fechado"
              ? "Janela fechada"
              : cenario === "fresta"
                ? "Fresta aberta"
                : "Janela aberta"}
          </text>

          <rect x="512" y="14" width="12" height="110" fill="#64748b" />
          {cenario === "fechado" ? (
            <rect x="514" y="124" width="8" height="140" fill="#b08968" stroke="#6f4e37" />
          ) : (
            <line
              x1="518"
              y1="124"
              x2={cenario === "cruzada" ? "484" : "504"}
              y2="258"
              stroke="#b08968"
              strokeWidth="6"
              strokeLinecap="round"
            />
          )}

          <g transform="translate(154, 24)">
            <rect width="84" height="22" rx="6" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="10" y1="16" x2="74" y2="16" stroke="#64748b" strokeWidth="1.5" />
            <text
              x="42"
              y="12"
              textAnchor="middle"
              fill="#475569"
              fontSize="8"
              fontFamily="monospace"
              fontWeight="bold"
            >
              SPLIT AC
            </text>
          </g>
          {cenario === "fechado" && (
            <path
              d="M 196 52 C 196 72, 232 72, 232 58 C 232 46, 174 48, 174 62"
              fill="none"
              stroke="#64748b"
              strokeWidth="1.4"
              strokeDasharray="3 3"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="12"
                to="0"
                dur="1.4s"
                repeatCount="indefinite"
              />
            </path>
          )}

          <g transform="translate(248, 22)">
            <rect
              width="256"
              height="48"
              rx="10"
              fill={dados.bg}
              stroke={dados.cor}
              strokeWidth="1.4"
            />
            <text x="12" y="20" fill={dados.cor} fontSize="10.2" fontWeight="bold">
              {dados.bannerTitle}
            </text>
            <text x="12" y="37" fill="#334155" fontSize="9.2">
              {dados.bannerSub}
            </text>
          </g>

          <g transform="translate(254, 168)">
            <circle cx="48" cy="24" r="15" fill="#475569" />
            <path d="M 24 68 C 24 44, 72 44, 72 68 Z" fill="#334155" />
            {cenario === "fechado" && (
              <text
                x="68"
                y="16"
                fill="#dc2626"
                fontSize="12"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Zzz...
                <animate
                  attributeName="opacity"
                  values="0.3;1;0.3"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </text>
            )}
            <rect x="6" y="64" width="114" height="8" rx="3" fill="#b08968" />
            <rect x="14" y="72" width="6" height="24" fill="#6f4e37" />
            <rect x="106" y="72" width="6" height="24" fill="#6f4e37" />
            <polygon points="74,64 102,64 108,42 82,42" fill="#1e293b" />
          </g>

          {Array.from({ length: dados.bolhas }, (_, i) => {
            const startX = 295 + (i % 3) * 8;
            const endX = cenario === "fechado" ? 168 + ((i * 57) % 300) : 496;
            const endY = cenario === "fechado" ? 92 + ((i * 31) % 130) : 135 + ((i * 23) % 80);

            return (
              <g key={`co2-b-${i}`}>
                <circle r={cenario === "fechado" ? "6" : "4.5"} fill={dados.cor} opacity="0.72">
                  <animate
                    attributeName="cx"
                    values={`${startX};${endX}`}
                    dur={`${2.6 + (i % 4) * 0.6}s`}
                    begin={`${i * 0.28}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="cy"
                    values={`188;${endY}`}
                    dur={`${2.6 + (i % 4) * 0.6}s`}
                    begin={`${i * 0.28}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0;0.8;0.6;0"
                    dur={`${2.6 + (i % 4) * 0.6}s`}
                    begin={`${i * 0.28}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            );
          })}

          {cenario !== "fechado" && (
            <g>
              {[136, 174].map((y, idx) => (
                <path
                  key={`fresh-in-${idx}`}
                  d={
                    cenario === "cruzada"
                      ? `M 36 ${y} C 165 ${y - 12}, 330 ${y + 12}, 512 ${y}`
                      : `M 36 ${y + 24} C 145 ${y + 14}, 250 ${y + 6}, 508 ${y + 18}`
                  }
                  fill="none"
                  stroke={cenario === "cruzada" ? "#10b981" : "#0ea5e9"}
                  strokeWidth={cenario === "cruzada" ? "2.6" : "2"}
                  strokeDasharray="8 6"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="28"
                    to="0"
                    dur={cenario === "cruzada" ? "1.3s" : "2.1s"}
                    repeatCount="indefinite"
                  />
                </path>
              ))}
            </g>
          )}

          <text
            x="466"
            y="289"
            textAnchor="middle"
            fill={cenario === "fechado" ? "#64748b" : "#047857"}
            fontSize="9.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {cenario === "fechado" ? "Porta fechada" : "Porta encostada"}
          </text>

          <g transform="translate(534, 14)">
            <rect
              width="252"
              height="292"
              rx="14"
              fill="#ffffff"
              stroke={dados.cor}
              strokeWidth="1.6"
            />
            <rect x="14" y="14" width="224" height="22" rx="11" fill={dados.bg} />
            <text
              x="126"
              y="28.5"
              textAnchor="middle"
              fill={dados.cor}
              fontSize="9.8"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {dados.statusLabel}
            </text>
            <text
              x="126"
              y="60"
              textAnchor="middle"
              fill="#64748b"
              fontSize="10"
              fontWeight="bold"
            >
              CO₂ estimado após horas de uso
            </text>
            <text
              x="126"
              y="92"
              textAnchor="middle"
              fill={dados.cor}
              fontSize="26"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {dados.ppm}
            </text>
            <rect x="18" y="106" width="216" height="12" rx="6" fill="#e2e8f0" />
            <rect
              x="18"
              y="106"
              width={Math.round((216 * dados.nivelBar) / 100)}
              height="12"
              rx="6"
              fill={dados.cor}
            />
            <text x="18" y="132" fill="#059669" fontSize="8.8" fontFamily="monospace">
              420 (Rua)
            </text>
            <text
              x="234"
              y="132"
              textAnchor="end"
              fill="#dc2626"
              fontSize="8.8"
              fontFamily="monospace"
            >
              2.500+
            </text>
            <line x1="18" y1="148" x2="234" y2="148" stroke="#e2e8f0" strokeWidth="1.2" />
            <text
              x="18"
              y="168"
              fill="#0f172a"
              fontSize="10.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              O QUE VOCÊ SENTE:
            </text>
            {[dados.efeito1, dados.efeito2, dados.efeito3].map((ef, idx) => (
              <g key={ef} transform={`translate(18, ${180 + idx * 32})`}>
                <rect width="216" height="26" rx="8" fill={dados.bg} />
                <text x="10" y="17" fill="#1e293b" fontSize="10.2" fontWeight="bold">
                  • {ef}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>

      <SecaoGuiasPraticos
        tituloSecao="Orientações práticas sobre ar, CO₂ e umidade"
        itens={GUIAS_CO2}
        ctaSimulador={{
          label: "Abrir simulador de CO₂",
          detalhe: resumoComodo,
          onClick: onAbrirSimulador,
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMA 2: VOCs E MATERIAIS (GUIA VISUAL + SIMULADOR DEDICADO DE VOCs)
═══════════════════════════════════════════════════════════════════════════ */

const GUIAS_VOC: GuiaPraticoItem[] = [
  {
    id: "voc-reforma-hoje",
    categoria: "Protocolo Flush-Out",
    botaoCurto: "Móvel novo ou reforma: o que fazer?",
    subtituloCurto: "Como acelerar a saída do cheiro forte.",
    titulo: "Como reduzir rápido o cheiro de tinta ou móvel novo",
    resumo:
      "O cheiro de reforma indica solventes e resinas evaporando (VOCs). A ventilação intensa impede que você respire esses gases concentrados.",
    passos: [
      {
        titulo: "Faça um 'flush-out' de 48h a 72h antes de dormir no quarto",
        detalhe:
          "Após pintar ou montar marcenaria, deixe janelas bem abertas por 2 a 3 dias com ventilação cruzada antes de dormir no local — especialmente em quartos de crianças.",
      },
      {
        titulo: "Abra portas e gavetas dos móveis novos",
        detalhe:
          "MDF e colas liberam compostos aos poucos. Deixar gavetas abertas perto da janela (com ventilador soprando para fora) acelera a cura inicial.",
      },
      {
        titulo: "Atenção a produtos de limpeza e aromatizadores",
        detalhe:
          "Sprays perfumados e desinfetantes fortes geram picos rápidos de VOCs. Use sempre com janela aberta e prefira produtos neutros.",
      },
    ],
    dicaOuro:
      "Subir a ventilação de 0,5 ACH (fechado) para 5,0 ACH (janelas abertas) reduz o pico de compostos no ar em até 80%.",
  },
  {
    id: "voc-o-que-sao",
    categoria: "Onde se escondem",
    botaoCurto: "De onde vêm os VOCs no dia a dia?",
    subtituloCurto: "Tintas, MDF, colas e limpeza.",
    titulo: "Principais fontes de Compostos Orgânicos Voláteis em casa",
    resumo:
      "VOCs são gases liberados à temperatura ambiente por acabamentos e produtos químicos comuns. Em espaços fechados, podem irritar olhos, garganta e vias aéreas.",
    passos: [
      {
        titulo: "Tintas, vernizes e impermeabilizantes",
        detalhe:
          "Emitem um pico elevado nas primeiras horas e dias de secagem, caindo após a cura completa.",
      },
      {
        titulo: "Móveis de MDF/MDP, colas e pisos laminados",
        detalhe:
          "Podem liberar pequenas doses de formaldeído e resinas por semanas — motivo pelo qual quartos novos mantêm odor quando ficam fechados.",
      },
      {
        titulo: "Limpeza pesada, velas parafinadas e incensos",
        detalhe:
          "Causam picos agudos logo após o uso. Em banheiros sem janela, vapor quente somado a produtos fortes intensifica a irritação respiratória.",
      },
    ],
    dicaOuro:
      "A ventilação dilui o que já saiu para o ar, mas a primeira linha de defesa é especificar insumos de baixa emissão.",
  },
  {
    id: "voc-como-comprar",
    categoria: "Especificação",
    botaoCurto: "Como comprar tinta e móvel mais seguros?",
    subtituloCurto: "Zero VOC, MDF E0/E1 e fitamento.",
    titulo: "O que verificar na embalagem antes de comprar",
    resumo:
      "Três critérios simples na compra de tintas e marcenaria evitam meses de odor persistente e desconforto respiratório:",
    passos: [
      {
        titulo: "Tintas à base d'água com selo 'Zero VOC' ou 'Baixo Odor'",
        detalhe:
          "Linhas acrílicas base água de baixa emissão substituem solventes derivados de petróleo e reduzem drasticamente o odor de obra.",
      },
      {
        titulo: "MDF/MDP com classificação E0 ou E1 (baixo formaldeído)",
        detalhe:
          "Na marcenaria, especifique chapas de baixa emissão e solicite fitamento completo de todas as bordas expostas — é pelas bordas abertas que mais escapa gás.",
      },
      {
        titulo: "Limpeza cotidiana com menos fragrância sintética",
        detalhe:
          "Sabão neutro e produtos biodegradáveis usados com janela aberta limpam sem saturar o ar interno.",
      },
    ],
    dicaOuro:
      "Certificações de saúde predial como o selo WELL exigem controle na fonte (materiais certificados) somado a taxas adequadas de renovação de ar.",
  },
];

function CenaVocAnimada({
  fonteVoc,
  onChangeFonteVoc,
  intensidadeVoc,
  onChangeIntensidadeVoc,
  onAbrirSimulador,
  resumoComodo,
}: {
  fonteVoc: FonteVocKey;
  onChangeFonteVoc: (f: FonteVocKey) => void;
  intensidadeVoc: 1 | 2 | 3;
  onChangeIntensidadeVoc: (n: 1 | 2 | 3) => void;
  onAbrirSimulador: () => void;
  resumoComodo: string;
}) {
  const [modoVentilacao, setModoVentilacao] = useState<"fechado" | "aberto">("fechado");

  const horasVoc = 12;
  const passosVoc = 48;
  const niveisAchVoc = [
    { rotulo: "0,5 ACH (Fechado)", ach: 0.5, cor: "#dc2626" },
    { rotulo: "2,0 ACH (Média)", ach: 2.0, cor: "#d97706" },
    { rotulo: "5,0 ACH (Aberta)", ach: 5.0, cor: "#059669" },
  ];

  const seriesCalculadasVoc = niveisAchVoc.map((serieInfo) => {
    const pontos = Array.from({ length: passosVoc + 1 }, (_, i) => {
      const t = (horasVoc * i) / passosVoc;
      const val = vocRelativoNoTempo(t, {
        fonte: fonteVoc,
        intensidade: intensidadeVoc,
        ach: serieInfo.ach,
      });
      return { t, val };
    });
    return { ...serieInfo, pontos };
  });

  const maxIndiceVoc = Math.max(
    100,
    Math.ceil(
      Math.max(...seriesCalculadasVoc.flatMap((s) => s.pontos.map((p) => p.val))) / 20,
    ) * 20,
  );

  const chartX = 434;
  const chartY = 54;
  const chartW = 332;
  const chartH = 196;
  const mapVocX = (t: number) => chartX + (t / horasVoc) * chartW;
  const mapVocY = (idx: number) =>
    chartY + chartH - (Math.max(0, idx) / maxIndiceVoc) * chartH;

  const picoFechado = Math.round(Math.max(...seriesCalculadasVoc[0].pontos.map((p) => p.val)));
  const picoAberto = Math.round(Math.max(...seriesCalculadasVoc[2].pontos.map((p) => p.val)));
  const reducaoPct =
    picoFechado > 0 ? Math.round(((picoFechado - picoAberto) / picoFechado) * 100) : 0;

  const particulasCount = intensidadeVoc * 3 + (modoVentilacao === "fechado" ? 3 : 0);

  return (
    <div className="space-y-4">
      {/* Barra segmentada profissional */}
      <div className="mx-auto flex w-full max-w-[940px] flex-wrap items-center justify-between gap-2">
        <div
          className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-muted/50 p-1"
          role="group"
          aria-label="Fonte emissora"
        >
          {(Object.keys(FONTES_VOC) as FonteVocKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onChangeFonteVoc(key)}
              aria-pressed={fonteVoc === key}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                fonteVoc === key
                  ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {FONTES_VOC[key].nome}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-xl border border-border bg-muted/50 p-1"
            role="group"
            aria-label="Intensidade da emissão"
          >
            {(
              [
                { n: 1 as const, l: "Leve" },
                { n: 2 as const, l: "Média" },
                { n: 3 as const, l: "Forte" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.n}
                type="button"
                onClick={() => onChangeIntensidadeVoc(opt.n)}
                aria-pressed={intensidadeVoc === opt.n}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  intensidadeVoc === opt.n
                    ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>

          <div
            className="inline-flex rounded-xl border border-border bg-muted/50 p-1"
            role="group"
            aria-label="Abertura da janela"
          >
            <button
              type="button"
              onClick={() => setModoVentilacao("fechado")}
              aria-pressed={modoVentilacao === "fechado"}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                modoVentilacao === "fechado"
                  ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="size-2 rounded-full bg-red-500" aria-hidden="true" />
              <span>Fechado ({picoFechado})</span>
            </button>
            <button
              type="button"
              onClick={() => setModoVentilacao("aberto")}
              aria-pressed={modoVentilacao === "aberto"}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                modoVentilacao === "aberto"
                  ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="size-2 rounded-full bg-emerald-600" aria-hidden="true" />
              <span>Aberto (-{reducaoPct}%)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Palco SVG */}
      <div className="mx-auto w-full max-w-[940px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3.5 shadow-inner print:print-color-adjust-exact">
        <svg
          viewBox="0 0 800 320"
          className="block h-auto w-full"
          role="img"
          aria-label="Animação de emissão de VOCs no cômodo ao lado do gráfico de diluição relativa em três níveis de ventilação"
        >
          <g transform="translate(14, 14)">
            <rect
              width="360"
              height="292"
              rx="14"
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />
            {modoVentilacao === "fechado" && (
              <rect
                x="4"
                y="4"
                width="352"
                height="244"
                rx="10"
                fill="#f59e0b"
                opacity={0.07 + intensidadeVoc * 0.05}
              />
            )}
            <rect x="2" y="250" width="356" height="40" rx="10" fill="#e7d5be" />
            <line x1="2" y1="250" x2="358" y2="250" stroke="#b08968" strokeWidth="2.5" />

            <rect
              x="12"
              y="12"
              width="336"
              height="44"
              rx="10"
              fill={modoVentilacao === "fechado" ? "#fef2f2" : "#ecfdf5"}
              stroke={modoVentilacao === "fechado" ? "#ef4444" : "#10b981"}
              strokeWidth="1.4"
            />
            <text
              x="24"
              y="30"
              fill={modoVentilacao === "fechado" ? "#b91c1c" : "#047857"}
              fontSize="10.5"
              fontWeight="bold"
            >
              {modoVentilacao === "fechado"
                ? `Cheiro acumulado (${FONTES_VOC[fonteVoc].nome})`
                : "Vento varrendo os gases para fora"}
            </text>
            <text x="24" y="46" fill="#475569" fontSize="9.4">
              {modoVentilacao === "fechado"
                ? "Pode irritar olhos, nariz e dar dor de cabeça."
                : `Pico cai de ${picoFechado} para ${picoAberto} (-${reducaoPct}%).`}
            </text>

            <g transform="translate(26, 134)">
              {fonteVoc === "tinta" ? (
                <g>
                  <rect
                    x="0"
                    y="0"
                    width="24"
                    height="114"
                    rx="3"
                    fill="#fef08a"
                    stroke="#ca8a04"
                    strokeWidth="1.5"
                  />
                  <rect
                    x="36"
                    y="74"
                    width="34"
                    height="40"
                    rx="4"
                    fill="#38bdf8"
                    stroke="#0284c7"
                    strokeWidth="1.5"
                  />
                  <text
                    x="53"
                    y="98"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8.5"
                    fontWeight="bold"
                  >
                    TINTA
                  </text>
                  <line x1="48" y1="74" x2="26" y2="38" stroke="#64748b" strokeWidth="2.5" />
                  <rect x="16" y="28" width="18" height="12" rx="4" fill="#facc15" stroke="#ca8a04" />
                </g>
              ) : fonteVoc === "moveis" ? (
                <g>
                  <rect
                    x="0"
                    y="18"
                    width="76"
                    height="96"
                    rx="4"
                    fill="#d6b48e"
                    stroke="#854d0e"
                    strokeWidth="1.8"
                  />
                  <line x1="0" y1="54" x2="76" y2="54" stroke="#854d0e" strokeWidth="1.4" />
                  <line x1="0" y1="84" x2="76" y2="84" stroke="#854d0e" strokeWidth="1.4" />
                  <rect x="28" y="34" width="20" height="4" rx="2" fill="#78350f" />
                  <rect x="28" y="66" width="20" height="4" rx="2" fill="#78350f" />
                  <rect x="28" y="96" width="20" height="4" rx="2" fill="#78350f" />
                  <text
                    x="38"
                    y="12"
                    textAnchor="middle"
                    fill="#854d0e"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    MDF NOVO
                  </text>
                </g>
              ) : (
                <g>
                  <rect
                    x="8"
                    y="54"
                    width="28"
                    height="60"
                    rx="5"
                    fill="#a855f7"
                    stroke="#6b21a8"
                    strokeWidth="1.5"
                  />
                  <rect x="16" y="42" width="12" height="12" fill="#e9d5ff" stroke="#6b21a8" />
                  <rect
                    x="44"
                    y="66"
                    width="26"
                    height="48"
                    rx="5"
                    fill="#0ea5e9"
                    stroke="#0369a1"
                    strokeWidth="1.5"
                  />
                  <text
                    x="40"
                    y="32"
                    textAnchor="middle"
                    fill="#6b21a8"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    LIMPEZA
                  </text>
                </g>
              )}
            </g>

            <g transform="translate(210, 152)">
              <circle cx="26" cy="24" r="14" fill="#475569" />
              <path d="M 8 98 L 12 44 C 14 38, 38 38, 40 44 L 44 98 Z" fill="#334155" />
            </g>

            <g transform="translate(332, 92)">
              <rect
                x="0"
                y="0"
                width="22"
                height="112"
                rx="4"
                fill={modoVentilacao === "aberto" ? "#d1fae5" : "#e2e8f0"}
                stroke={modoVentilacao === "aberto" ? "#10b981" : "#64748b"}
                strokeWidth="2"
              />
            </g>
            <text
              x="346"
              y="274"
              textAnchor="end"
              fill={modoVentilacao === "aberto" ? "#047857" : "#64748b"}
              fontSize="9.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {modoVentilacao === "aberto" ? "Janela aberta →" : "Janela fechada"}
            </text>

            {Array.from({ length: particulasCount }, (_, i) => {
              const yStart = 152 + (i % 4) * 20;
              const xEnd = modoVentilacao === "aberto" ? 344 : 140 + ((i * 39) % 165);
              const yEnd =
                modoVentilacao === "aberto" ? 116 + (i % 4) * 20 : 88 + ((i * 29) % 120);
              return (
                <circle
                  key={`voc-p-${i}`}
                  r={modoVentilacao === "fechado" ? "5" : "3.8"}
                  fill={modoVentilacao === "fechado" ? "#d97706" : "#10b981"}
                  opacity="0.78"
                >
                  <animate
                    attributeName="cx"
                    values={`96;${xEnd}`}
                    dur={
                      modoVentilacao === "aberto"
                        ? `${1.5 + (i % 3) * 0.3}s`
                        : `${2.8 + (i % 3) * 0.5}s`
                    }
                    begin={`${i * 0.25}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="cy"
                    values={`${yStart};${yEnd}`}
                    dur={
                      modoVentilacao === "aberto"
                        ? `${1.5 + (i % 3) * 0.3}s`
                        : `${2.8 + (i % 3) * 0.5}s`
                    }
                    begin={`${i * 0.25}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0;0.85;0.75;0"
                    dur={
                      modoVentilacao === "aberto"
                        ? `${1.5 + (i % 3) * 0.3}s`
                        : `${2.8 + (i % 3) * 0.5}s`
                    }
                    begin={`${i * 0.25}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              );
            })}

            {modoVentilacao === "aberto" &&
              [126, 162].map((y, idx) => (
                <path
                  key={`voc-wind-${idx}`}
                  d={`M 92 ${y} Q 210 ${y - 12} 336 ${y}`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.4"
                  strokeDasharray="7 6"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="26"
                    to="0"
                    dur="1.3s"
                    repeatCount="indefinite"
                  />
                </path>
              ))}
          </g>

          <g>
            <rect
              x="388"
              y="14"
              width="398"
              height="292"
              rx="14"
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />
            <text
              x="404"
              y="34"
              fontSize="10"
              fill="#0f172a"
              fontFamily="monospace"
              fontWeight="bold"
            >
              ACÚMULO RELATIVO NO AR (0h A 12h)
            </text>
            <text x="404" y="47" fontSize="9.2" fill="#64748b">
              Índice 100 = pico de referência com janela fechada (0,5 ACH)
            </text>

            <line
              x1={chartX}
              y1={chartY}
              x2={chartX}
              y2={chartY + chartH}
              stroke="#94a3b8"
              strokeWidth="1.3"
            />
            <line
              x1={chartX}
              y1={chartY + chartH}
              x2={chartX + chartW}
              y2={chartY + chartH}
              stroke="#94a3b8"
              strokeWidth="1.3"
            />

            {[0, 25, 50, 75, 100].map((idx) => (
              <g key={`grid-y-${idx}`}>
                <line
                  x1={chartX}
                  y1={mapVocY(idx)}
                  x2={chartX + chartW}
                  y2={mapVocY(idx)}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <text
                  x={chartX - 7}
                  y={mapVocY(idx) + 3.5}
                  textAnchor="end"
                  fontSize="9"
                  fill="#64748b"
                  fontFamily="monospace"
                >
                  {idx}
                </text>
              </g>
            ))}

            {[0, 3, 6, 9, 12].map((h) => (
              <text
                key={`grid-x-${h}`}
                x={mapVocX(h)}
                y={chartY + chartH + 15}
                textAnchor="middle"
                fontSize="9"
                fill="#64748b"
                fontFamily="monospace"
              >
                {h}h
              </text>
            ))}

            {seriesCalculadasVoc.map((serieInfo, sIdx) => {
              const pts = serieInfo.pontos
                .map((p) => `${mapVocX(p.t).toFixed(1)},${mapVocY(p.val).toFixed(1)}`)
                .join(" ");
              const destacada =
                (modoVentilacao === "fechado" && sIdx === 0) ||
                (modoVentilacao === "aberto" && sIdx === 2);

              return (
                <polyline
                  key={serieInfo.rotulo}
                  fill="none"
                  stroke={serieInfo.cor}
                  strokeWidth={destacada ? "3.4" : "2"}
                  strokeOpacity={destacada ? 1 : 0.45}
                  points={pts}
                />
              );
            })}

            {niveisAchVoc.map((s, idx) => (
              <g key={s.rotulo} transform={`translate(${402 + idx * 126}, 291)`}>
                <line x1="0" y1="-3.5" x2="12" y2="-3.5" stroke={s.cor} strokeWidth="3" />
                <text x="16" y="0" fontSize="9.2" fill="#334155" fontWeight="bold">
                  {s.rotulo}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>

      <SecaoGuiasPraticos
        tituloSecao="Orientações práticas sobre reforma e VOCs"
        itens={GUIAS_VOC}
        ctaSimulador={{
          label: "Abrir simulador de VOCs",
          detalhe: resumoComodo,
          onClick: onAbrirSimulador,
        }}
        linkExtra={{
          label: "Selo WELL em Certificações",
          onClick: () => irParaSelo("well"),
        }}
      />
    </div>
  );
}

/* ── NOVO SIMULADOR INTERATIVO DE VOCs (SINCRONIZADO COM O CÔMODO E ACH) ── */
function SimuladorVoc({
  tipoComodo,
  comprimentoM,
  larguraM,
  peDireitoM,
  ach,
  onChangeAch,
  fonteVoc,
  onChangeFonteVoc,
  intensidadeVoc,
  onChangeIntensidadeVoc,
}: {
  tipoComodo: TipoComodoKey;
  comprimentoM: number;
  larguraM: number;
  peDireitoM: number;
  ach: number;
  onChangeAch: (ach: number) => void;
  fonteVoc: FonteVocKey;
  onChangeFonteVoc: (f: FonteVocKey) => void;
  intensidadeVoc: 1 | 2 | 3;
  onChangeIntensidadeVoc: (n: 1 | 2 | 3) => void;
}) {
  const [horizonteHoras, setHorizonteHoras] = useState(24);
  const volumeM3 = comprimentoM * larguraM * peDireitoM;
  const passos = 60;

  const pontosAtual = Array.from({ length: passos + 1 }, (_, i) => {
    const t = (horizonteHoras * i) / passos;
    return {
      t,
      val: vocRelativoNoTempo(t, { fonte: fonteVoc, intensidade: intensidadeVoc, ach }),
    };
  });

  const pontosFechado = Array.from({ length: passos + 1 }, (_, i) => {
    const t = (horizonteHoras * i) / passos;
    return {
      t,
      val: vocRelativoNoTempo(t, { fonte: fonteVoc, intensidade: intensidadeVoc, ach: 0.5 }),
    };
  });

  const picoAtual = Math.max(...pontosAtual.map((p) => p.val));
  const picoFechado = Math.max(...pontosFechado.map((p) => p.val));
  const valEm6h = vocRelativoNoTempo(6, { fonte: fonteVoc, intensidade: intensidadeVoc, ach });
  const valFinal = pontosAtual[pontosAtual.length - 1].val;
  const reducaoVsFechado =
    picoFechado > 0 ? Math.round(((picoFechado - picoAtual) / picoFechado) * 100) : 0;

  const maxY = Math.max(100, Math.ceil(Math.max(picoAtual, picoFechado) / 20) * 20);
  const chartX = 52;
  const chartY = 40;
  const chartW = 598;
  const chartH = 160;
  const mapX = (t: number) => chartX + (t / horizonteHoras) * chartW;
  const mapY = (v: number) => chartY + chartH - (Math.max(0, v) / maxY) * chartH;

  const ptsAtualStr = pontosAtual
    .map((p) => `${mapX(p.t).toFixed(1)},${mapY(p.val).toFixed(1)}`)
    .join(" ");
  const ptsFechadoStr = pontosFechado
    .map((p) => `${mapX(p.t).toFixed(1)},${mapY(p.val).toFixed(1)}`)
    .join(" ");

  const diagnostico =
    ach < 1
      ? `Com ${ach.toFixed(1).replace(".", ",")} trocas/h (ambiente quase fechado), o pico chega a ${Math.round(picoAtual)} pontos. Experimente testar "Flush-out (5,0 ACH)" para ver a queda.`
      : `Com ${ach.toFixed(1).replace(".", ",")} trocas/h (${(ach * volumeM3).toFixed(0)} m³/h de ar renovado), você corta ${Math.max(0, reducaoVsFechado)}% do pico em comparação ao ambiente fechado.`;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            Simulador de diluição de VOCs · {TIPOS_COMODO[tipoComodo].nome}
          </p>
          <p className="text-xs text-muted-foreground">
            Volume sincronizado: {volumeM3.toFixed(1).replace(".", ",")} m³ · Vazão atual:{" "}
            {(ach * volumeM3).toFixed(0)} m³/h
          </p>
        </div>
        <span className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 font-mono text-[10px] font-semibold text-foreground">
          Pico atual: {Math.round(picoAtual)} / 100 ref.
        </span>
      </div>

      {/* Controles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-foreground">1. Fonte emissora</span>
          <div className="grid grid-cols-1 gap-1">
            {(Object.keys(FONTES_VOC) as FonteVocKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onChangeFonteVoc(key)}
                aria-pressed={fonteVoc === key}
                className={`rounded-lg border px-2.5 py-1.5 text-left text-xs font-semibold transition-colors cursor-pointer ${
                  fonteVoc === key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                {FONTES_VOC[key].nome}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-foreground">2. Intensidade da fonte</span>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { n: 1 as const, l: "Leve", sub: "Retoque" },
                { n: 2 as const, l: "Média", sub: "1 parede" },
                { n: 3 as const, l: "Alta", sub: "Geral" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.n}
                type="button"
                onClick={() => onChangeIntensidadeVoc(opt.n)}
                aria-pressed={intensidadeVoc === opt.n}
                className={`rounded-lg border px-2 py-2 text-center transition-colors cursor-pointer ${
                  intensidadeVoc === opt.n
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                <span className="block text-xs font-bold">{opt.l}</span>
                <span className="block text-[9.5px] opacity-80">{opt.sub}</span>
              </button>
            ))}
          </div>
          <p className="text-[10.5px] leading-snug text-muted-foreground">
            {FONTES_VOC[fonteVoc].descricao}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block space-y-1">
            <span className="flex items-center justify-between text-xs font-medium text-foreground">
              <span>3. Ventilação (ACH)</span>
              <span className="font-mono text-[10px] text-muted-foreground">trocas/h</span>
            </span>
            <input
              type="number"
              min={0.2}
              max={12}
              step={0.1}
              value={ach}
              onChange={(e) => {
                if (e.currentTarget.value !== "" && e.currentTarget.validity.valid) {
                  onChangeAch(e.currentTarget.valueAsNumber);
                }
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm tabular-nums text-foreground"
            />
          </label>
          <div className="flex flex-wrap gap-1">
            {[
              { label: "Fechado 0,5", v: 0.5 },
              { label: "Fresta 2,0", v: 2.0 },
              { label: "Flush-out 5,0", v: 5.0 },
            ].map((at) => (
              <button
                key={at.label}
                type="button"
                onClick={() => onChangeAch(at.v)}
                className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                  Math.abs(ach - at.v) < 0.05
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                {at.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="flex items-center justify-between text-xs font-medium text-foreground">
            <span>4. Tempo de cura / observação</span>
            <span className="font-mono text-xs font-bold text-primary">{horizonteHoras} h</span>
          </span>
          <input
            type="range"
            min={6}
            max={48}
            step={6}
            value={horizonteHoras}
            onChange={(e) => setHorizonteHoras(Number(e.currentTarget.value))}
            className="w-full accent-primary"
          />
          <span className="block text-[10.5px] leading-snug text-muted-foreground">
            Arraste até 48h para observar o efeito do flush-out pós-reforma.
          </span>
        </label>
      </div>

      {/* Diagnóstico */}
      <div
        className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
          picoAtual <= 35
            ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
            : picoAtual <= 65
              ? "border-amber-200 bg-amber-50/70 text-amber-950"
              : "border-red-200 bg-red-50/70 text-red-950"
        }`}
      >
        <strong>Leitura prática:</strong> {diagnostico}
      </div>

      {/* Métricas */}
      <div className="grid gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <span className="block text-[10.5px] text-muted-foreground">Pico no cenário atual</span>
          <span className="mt-0.5 block font-mono text-base font-bold text-foreground">
            {Math.round(picoAtual)} pts
          </span>
          <span className="block text-[10px] text-muted-foreground">Escala relativa (ref. 100)</span>
        </div>
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <span className="block text-[10.5px] text-muted-foreground">Redução vs. fechado</span>
          <span className="mt-0.5 block font-mono text-base font-bold text-emerald-700">
            {reducaoVsFechado >= 0 ? `-${reducaoVsFechado}%` : `+${Math.abs(reducaoVsFechado)}%`}
          </span>
          <span className="block text-[10px] text-muted-foreground">
            Comparado a 0,5 ACH ({Math.round(picoFechado)} pts)
          </span>
        </div>
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <span className="block text-[10.5px] text-muted-foreground">Índice após 6 horas</span>
          <span className="mt-0.5 block font-mono text-base font-bold text-foreground">
            {Math.round(valEm6h)} pts
          </span>
          <span className="block text-[10px] text-muted-foreground">Com {ach.toFixed(1).replace(".", ",")} trocas/h</span>
        </div>
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <span className="block text-[10.5px] text-muted-foreground">
            Índice ao final ({horizonteHoras}h)
          </span>
          <span className="mt-0.5 block font-mono text-base font-bold text-primary">
            {Math.round(valFinal)} pts
          </span>
          <span className="block text-[10px] text-muted-foreground">Tendência de decaimento</span>
        </div>
      </div>

      {/* Gráfico comparativo claro */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2.5 sm:p-4 shadow-inner">
        <svg
          viewBox="0 0 680 245"
          className="block h-auto w-full"
          role="img"
          aria-label="Comparação da diluição de VOCs no cenário atual frente ao ambiente fechado"
        >
          <text x="16" y="22" fontSize="11" fill="#0f172a" fontWeight="bold">
            Curva de diluição ({FONTES_VOC[fonteVoc].nome}) · 0h a {horizonteHoras}h
          </text>
          <text x="660" y="22" textAnchor="end" fontSize="10" fill="#475569" fontFamily="monospace">
            Atual ({ach.toFixed(1).replace(".", ",")} ACH) vs. Fechado (0,5 ACH)
          </text>

          <rect
            x={chartX}
            y={chartY}
            width={chartW}
            height={chartH}
            rx="6"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="1.2"
          />

          {[0, 25, 50, 75, 100].map((v) => (
            <g key={`voc-sim-y-${v}`}>
              <line
                x1={chartX}
                y1={mapY(v)}
                x2={chartX + chartW}
                y2={mapY(v)}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
              />
              <text
                x={chartX - 8}
                y={mapY(v) + 3.5}
                textAnchor="end"
                fontSize="9.5"
                fill="#64748b"
                fontFamily="monospace"
              >
                {v}
              </text>
            </g>
          ))}

          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const h = Math.round(horizonteHoras * frac);
            return (
              <text
                key={`voc-sim-x-${h}`}
                x={mapX(h)}
                y={chartY + chartH + 16}
                textAnchor="middle"
                fontSize="9.5"
                fill="#475569"
                fontFamily="monospace"
              >
                {h}h
              </text>
            );
          })}

          {/* Curva referência fechada (tracejada vermelha) */}
          <polyline
            fill="none"
            stroke="#dc2626"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeOpacity="0.65"
            points={ptsFechadoStr}
          />

          {/* Curva atual (destaque esmeralda) */}
          <polyline
            fill="none"
            stroke="#059669"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={ptsAtualStr}
          />

          {/* Legenda inferior */}
          <g transform="translate(52, 234)">
            <line x1="0" y1="-3.5" x2="18" y2="-3.5" stroke="#059669" strokeWidth="3.2" />
            <text x="24" y="0" fontSize="10" fill="#047857" fontWeight="bold">
              Seu cenário ({ach.toFixed(1).replace(".", ",")} ACH · pico {Math.round(picoAtual)})
            </text>

            <line
              x1="270"
              y1="-3.5"
              x2="288"
              y2="-3.5"
              stroke="#dc2626"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
            <text x="294" y="0" fontSize="10" fill="#b91c1c" fontWeight="bold">
              Referência fechado (0,5 ACH · pico {Math.round(picoFechado)})
            </text>
          </g>
        </svg>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Nota técnica:</strong> modelo didático normalizado
        (índice 100 = pico de referência a 0,5 ACH no nível 3). Ilustra o impacto relativo da taxa
        de ventilação na diluição e não representa medição em µg/m³.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMA 3: ILUMINAÇÃO (RELÓGIO BIOLÓGICO + MESA 1,20 m + SIMULADOR DE LUZ)
═══════════════════════════════════════════════════════════════════════════ */

const GUIAS_LUZ: GuiaPraticoItem[] = [
  {
    id: "luz-ergonomia-mesa",
    categoria: "Ergonomia",
    botaoCurto: "Mesa, destro/canhoto e 1,20 m",
    subtituloCurto: "Zero sombra na mão e sem reflexo.",
    titulo: "Onde posicionar a mesa, a janela e a luminária linear de 1,20 m",
    resumo:
      "Muita gente instala uma lâmpada forte e ainda sente a mesa escura ou fadiga visual. Quase sempre o problema é a direção da luz.",
    passos: [
      {
        titulo: "Luminária linear horizontal de 1,20 m paralela à mesa",
        detalhe:
          "Uma luminária linear de ~1,20 m alinhada ao comprimento da mesa distribui a luz uniformemente sobre monitor, teclado e papel. Posicione entre 70 cm e 1,00 m acima do tampo (altura padrão de mesa: 0,75 m).",
      },
      {
        titulo: "Regra prática: Destro vs. Canhoto",
        detalhe:
          "Se você é DESTRO, a janela ou luminária auxiliar deve ficar à ESQUERDA. Se é CANHOTO, à DIREITA — evitando que o próprio braço faça sombra sobre a escrita.",
      },
      {
        titulo: "Monitor sempre lateral (90°) em relação à janela",
        detalhe:
          "Janela atrás das costas cria reflexo direto na tela; janela logo atrás do monitor ofusca os olhos por contraste excessivo.",
      },
      {
        titulo: "Ponto central no teto e telas no escuro total",
        detalhe:
          "Ponto único no centro do quarto ou cozinha faz seu corpo sombrear a mesa/pia (use fita LED sob o armário). À noite, mantenha uma luz suave indireta ao lado da TV ou monitor.",
      },
    ],
    dicaOuro:
      "Sente na sua mesa com uma caneta e observe onde cai a sombra da mão e do tronco. Se cobrir o caderno ou o teclado, gire a mesa 90° ou adicione iluminação dedicada.",
  },
  {
    id: "luz-flicker-irc",
    categoria: "Qualidade do LED",
    botaoCurto: "Teste do celular (Flicker) e IRC",
    subtituloCurto: "Como detectar LED que dá dor de cabeça.",
    titulo: "Sua lâmpada LED pode cansar a vista sem você notar",
    resumo:
      "Dois parâmetros técnicos simples — Flicker e IRC — explicam por que certas luminárias causam cansaço ocular no fim do dia.",
    passos: [
      {
        titulo: "O que é Flicker (cintilação invisível)?",
        detalhe:
          "Drivers baratos fazem o LED oscilar dezenas de vezes por segundo. O olho não percebe conscientemente, mas o cérebro compensa continuamente — gerando fadiga visual.",
      },
      {
        titulo: "Teste rápido em 5 segundos com o celular",
        detalhe:
          "Abra a câmera do celular em 'Câmera Lenta' (slow-motion) e aponte para a lâmpada acesa. Faixas escuras correndo na tela indicam flicker acentuado.",
      },
      {
        titulo: "O que é IRC (Índice de Reprodução de Cor)?",
        detalhe:
          "Mede a fidelidade das cores de 0 a 100. Escolha IRC ≥ 80 para uso geral e IRC ≥ 90 para leitura, cozinha e bancadas de precisão.",
      },
    ],
    dicaOuro:
      "Priorize luminárias com indicação 'Flicker-Free' (sem cintilação) e IRC ≥ 80/90 nos ambientes onde você passa mais horas.",
  },
  {
    id: "luz-escolher-lampada",
    categoria: "Temperatura de cor",
    botaoCurto: "2700K vs 4000K vs 6500K",
    subtituloCurto: "Qual cor escolher em cada cômodo.",
    titulo: "Como ler o valor em Kelvin (K) na caixa da lâmpada",
    resumo:
      "O número seguido de 'K' não indica consumo nem aquecimento — ele define a tonalidade da luz e seu impacto no ciclo circadiano.",
    passos: [
      {
        titulo: "2700K a 3000K — Branco Quente (amarelada)",
        detalhe:
          "Remete ao entardecer. Ideal para dormitórios, estar e jantar: promove relaxamento e preserva a liberação noturna de melatonina.",
      },
      {
        titulo: "4000K — Branco Neutro (equilibrada)",
        detalhe:
          "Ideal para home office, luminária linear de 1,20 m, cozinha e banheiro: entrega clareza sem o aspecto azulado excessivo.",
      },
      {
        titulo: "6500K — Branco Frio (azulada)",
        detalhe:
          "À noite pode atrasar a sinalização de sono ao cérebro — reserve para garagens, depósitos ou áreas de serviço.",
      },
    ],
    dicaOuro:
      "A mudança mais simples em casa: substituir lâmpadas 6500K nos quartos por 2700K–3000K em luminárias indiretas.",
  },
  {
    id: "luz-e-calor",
    categoria: "Luz e calor",
    botaoCurto: "Por que vidro escuro pesa no calor?",
    subtituloCurto: "Equilíbrio entre claridade e ganho solar.",
    titulo: "A relação entre luz natural, lâmpadas acesas e carga térmica",
    resumo:
      "Escurecer demais a janela obriga o uso de iluminação artificial durante o dia — e quase toda potência elétrica das lâmpadas vira calor no ambiente.",
    passos: [
      {
        titulo: "Luz natural é mais eficiente por watt",
        detalhe:
          "Oferece maior claridade com menor carga térmica equivalente, além de sincronizar o relógio biológico.",
      },
      {
        titulo: "Superfícies internas claras multiplicam a luz",
        detalhe:
          "Teto e paredes claras levam a claridade da janela mais fundo no cômodo sem aumentar o calor solar.",
      },
      {
        titulo: "Combinação ideal de projeto",
        detalhe:
          "Sombreamento externo (brise/beiral) + vidro com boa transmissão luminosa e baixo fator solar garantem claridade sem ofuscamento.",
      },
    ],
    dicaOuro:
      "Use a aba Simulador no topo para testar como o vidro e a cor das paredes alteram a claridade no fundo da sala.",
  },
];

function CenaLuzGuia({
  onAbrirSimulador,
  resumoComodo,
}: {
  onAbrirSimulador: () => void;
  resumoComodo: string;
}) {
  const uid = useId().replace(/:/g, "");
  const [subCena, setSubCena] = useState<"circadiano" | "ergonomia">("circadiano");
  const [cenaCirc, setCenaCirc] = useState<"manha" | "noite_fria" | "noite_quente">("manha");
  const [perfilMesa, setPerfilMesa] = useState<"destro" | "canhoto" | "erro">("destro");

  const cfgCirc = {
    manha: {
      skyTop: "#38bdf8",
      skyBot: "#fef3c7",
      roomBg: "#fffbeb",
      badgeBg: "#ecfdf5",
      badgeBorder: "#10b981",
      badgeColor: "#047857",
      badgeTitle: "08h · Luz natural entrando pela janela",
      badgeSub: "Acerta o relógio biológico e desperta o cérebro.",
      clockColor: "#059669",
      clockTag: "RITMO ALINHADO",
      alertaPct: 90,
      melatoninaPct: 12,
      olhosLabel: "Confortável (luz difusa)",
      resumo1: "Sinaliza início do dia",
      resumo2: "Melhora foco e humor",
    },
    noite_fria: {
      skyTop: "#0f172a",
      skyBot: "#1e293b",
      roomBg: "#eff6ff",
      badgeBg: "#fef2f2",
      badgeBorder: "#ef4444",
      badgeColor: "#b91c1c",
      badgeTitle: "22h · Luz branca fria (6500K) forte no teto",
      badgeSub: "Engana a retina achando que ainda é meio-dia.",
      clockColor: "#dc2626",
      clockTag: "SONO ATRASADO",
      alertaPct: 82,
      melatoninaPct: 18,
      olhosLabel: "Cansaço visual e alerta",
      resumo1: "Bloqueia a melatonina",
      resumo2: "Dificulta pegar no sono",
    },
    noite_quente: {
      skyTop: "#0f172a",
      skyBot: "#1e293b",
      roomBg: "#fef9ec",
      badgeBg: "#fffbeb",
      badgeBorder: "#d97706",
      badgeColor: "#b45309",
      badgeTitle: "22h · Abajur quente (2700K) + luz indireta",
      badgeSub: "Imita o pôr do sol e prepara o corpo para dormir.",
      clockColor: "#059669",
      clockTag: "PRONTO PARA DORMIR",
      alertaPct: 22,
      melatoninaPct: 88,
      olhosLabel: "Olhos relaxados",
      resumo1: "Libera melatonina natural",
      resumo2: "Sono mais profundo",
    },
  }[cenaCirc];

  const cfgMesa = {
    destro: {
      cor: "#059669",
      bg: "#ecfdf5",
      selo: "DESTRO · CONFIGURAÇÃO IDEAL",
      titulo: "Luz pela ESQUERDA + linear 1,20 m",
      item1: "Mão direita escreve sem sombra",
      item2: "Janela a 90°: zero reflexo na tela",
      item3: "Linear 1,20 m cobre toda a mesa",
      rodape1: "Luminária 1,20 m paralela à mesa",
      rodape2: "Altura: 70 cm–1 m acima do tampo",
    },
    canhoto: {
      cor: "#0284c7",
      bg: "#eff6ff",
      selo: "CANHOTO · CONFIGURAÇÃO IDEAL",
      titulo: "Luz pela DIREITA + linear 1,20 m",
      item1: "Mão esquerda escreve sem sombra",
      item2: "Janela a 90°: zero reflexo na tela",
      item3: "Linear 1,20 m cobre toda a mesa",
      rodape1: "Luminária 1,20 m paralela à mesa",
      rodape2: "Altura: 70 cm–1 m acima do tampo",
    },
    erro: {
      cor: "#dc2626",
      bg: "#fef2f2",
      selo: "ERRO COMUM EM PROJETOS",
      titulo: "Luz nas costas + janela na tela",
      item1: "Seu corpo faz sombra na mesa",
      item2: "Janela atrás cria reflexo no monitor",
      item3: "Ponto único central não basta",
      rodape1: "Solução rápida: gire a mesa 90°",
      rodape2: "ou adote luminária linear / de mesa",
    },
  }[perfilMesa];

  return (
    <div className="space-y-4">
      {/* Barra segmentada limpa: sub-tema à esquerda, cenário à direita */}
      <div className="mx-auto flex w-full max-w-[940px] flex-wrap items-center justify-between gap-2">
        <div
          className="inline-flex rounded-xl border border-border bg-muted/50 p-1"
          role="group"
          aria-label="Aspecto da iluminação"
        >
          <button
            type="button"
            onClick={() => setSubCena("circadiano")}
            aria-pressed={subCena === "circadiano"}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              subCena === "circadiano"
                ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Relógio biológico
          </button>
          <button
            type="button"
            onClick={() => setSubCena("ergonomia")}
            aria-pressed={subCena === "ergonomia"}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              subCena === "ergonomia"
                ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mesa, destro/canhoto e 1,20 m
          </button>
        </div>

        {subCena === "circadiano" ? (
          <div
            className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-muted/50 p-1"
            role="group"
            aria-label="Cenário circadiano"
          >
            {[
              { id: "manha" as const, label: "Manhã (natural)", dot: "bg-amber-500" },
              { id: "noite_fria" as const, label: "Noite 6500K", dot: "bg-red-500" },
              { id: "noite_quente" as const, label: "Noite 2700K", dot: "bg-emerald-600" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCenaCirc(opt.id)}
                aria-pressed={cenaCirc === opt.id}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  cenaCirc === opt.id
                    ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className={`size-2 rounded-full ${opt.dot}`} aria-hidden="true" />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div
            className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-muted/50 p-1"
            role="group"
            aria-label="Ergonomia da mesa"
          >
            {[
              { id: "destro" as const, label: "Destro (esq.)", dot: "bg-emerald-600" },
              { id: "canhoto" as const, label: "Canhoto (dir.)", dot: "bg-sky-600" },
              { id: "erro" as const, label: "Erro comum", dot: "bg-red-500" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPerfilMesa(opt.id)}
                aria-pressed={perfilMesa === opt.id}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  perfilMesa === opt.id
                    ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className={`size-2 rounded-full ${opt.dot}`} aria-hidden="true" />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Palco SVG em tamanho confortável */}
      <div className="mx-auto w-full max-w-[940px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3.5 shadow-inner print:print-color-adjust-exact">
        {subCena === "circadiano" ? (
          <svg
            viewBox="0 0 800 320"
            className="block h-auto w-full"
            role="img"
            aria-label="Animação mostrando o efeito da luz natural da manhã, luz branca fria à noite e luz quente indireta à noite no ciclo circadiano"
          >
            <defs>
              <linearGradient id={`${uid}-skyCirc`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cfgCirc.skyTop} />
                <stop offset="100%" stopColor={cfgCirc.skyBot} />
              </linearGradient>
              <linearGradient id={`${uid}-coldCone`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.04" />
              </linearGradient>
              <radialGradient id={`${uid}-warmGlow`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.58" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
              </radialGradient>
              <linearGradient id={`${uid}-sunRay`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fde047" stopOpacity="0.48" />
                <stop offset="100%" stopColor="#fef08a" stopOpacity="0.04" />
              </linearGradient>
            </defs>

            <g>
              <rect
                x="14"
                y="14"
                width="98"
                height="292"
                rx="14"
                fill={`url(#${uid}-skyCirc)`}
                stroke="#94a3b8"
                strokeWidth="1.2"
              />
              {cenaCirc === "manha" ? (
                <g transform="translate(63, 74)">
                  <circle r="24" fill="#fbbf24" opacity="0.28" />
                  <circle r="17" fill="#f59e0b">
                    <animate
                      attributeName="r"
                      values="16;18.5;16"
                      dur="2.6s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <text
                    x="0"
                    y="40"
                    textAnchor="middle"
                    fill="#92400e"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    08h MANHÃ
                  </text>
                </g>
              ) : (
                <g transform="translate(63, 74)">
                  <circle r="15" fill="#f8fafc" />
                  <circle cx="6" cy="-3" r="13" fill="#0f172a" />
                  <circle cx="-22" cy="-18" r="2" fill="#fde68a" />
                  <circle cx="24" cy="-8" r="1.5" fill="#fde68a" />
                  <text
                    x="0"
                    y="40"
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    22h NOITE
                  </text>
                </g>
              )}

              <rect
                x="112"
                y="14"
                width="384"
                height="292"
                rx="14"
                fill={cfgCirc.roomBg}
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              <rect x="113" y="264" width="382" height="41" rx="10" fill="#e7d5be" />
              <line x1="113" y1="264" x2="495" y2="264" stroke="#b08968" strokeWidth="2.5" />

              <rect x="106" y="14" width="14" height="72" fill="#64748b" />
              <rect x="106" y="206" width="14" height="100" fill="#64748b" />
              <rect x="110" y="86" width="6" height="120" fill="#7dd3fc" stroke="#0284c7" />

              {cenaCirc === "manha" && (
                <g>
                  <polygon
                    points="116,88 390,262 248,262 116,204"
                    fill={`url(#${uid}-sunRay)`}
                  />
                  {[114, 150].map((y, idx) => (
                    <line
                      key={`morn-ray-${idx}`}
                      x1="88"
                      y1={y - 14}
                      x2={310 + idx * 35}
                      y2={236 + idx * 14}
                      stroke="#f59e0b"
                      strokeWidth="2.2"
                      strokeDasharray="8 7"
                      opacity="0.7"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="30"
                        to="0"
                        dur="1.6s"
                        repeatCount="indefinite"
                      />
                    </line>
                  ))}
                </g>
              )}

              <g transform="translate(262, 14)">
                <rect
                  x="0"
                  y="0"
                  width="84"
                  height="12"
                  rx="4"
                  fill={cenaCirc === "noite_fria" ? "#3b82f6" : "#cbd5e1"}
                  stroke="#64748b"
                />
                {cenaCirc === "noite_fria" && (
                  <polygon points="6,12 78,12 168,250 -84,250" fill={`url(#${uid}-coldCone)`}>
                    <animate
                      attributeName="opacity"
                      values="0.82;1;0.82"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </polygon>
                )}
              </g>

              <g transform="translate(132, 34)">
                <rect
                  width="352"
                  height="48"
                  rx="10"
                  fill={cfgCirc.badgeBg}
                  stroke={cfgCirc.badgeBorder}
                  strokeWidth="1.4"
                />
                <text x="12" y="20" fill={cfgCirc.badgeColor} fontSize="10.8" fontWeight="bold">
                  {cfgCirc.badgeTitle}
                </text>
                <text x="12" y="37" fill="#334155" fontSize="9.5">
                  {cfgCirc.badgeSub}
                </text>
              </g>

              <g transform="translate(388, 174)">
                {cenaCirc === "noite_quente" && (
                  <circle cx="28" cy="24" r="90" fill={`url(#${uid}-warmGlow)`}>
                    <animate
                      attributeName="r"
                      values="84;96;84"
                      dur="3s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <rect x="6" y="48" width="44" height="42" rx="4" fill="#b08968" stroke="#6f4e37" />
                <rect x="24" y="34" width="8" height="14" fill="#475569" />
                <polygon
                  points="14,34 42,34 36,12 20,12"
                  fill={cenaCirc === "noite_quente" ? "#fbbf24" : "#e2e8f0"}
                  stroke={cenaCirc === "noite_quente" ? "#d97706" : "#94a3b8"}
                  strokeWidth="1.5"
                />
                <text
                  x="28"
                  y="106"
                  textAnchor="middle"
                  fill={cenaCirc === "noite_quente" ? "#b45309" : "#64748b"}
                  fontSize="8.8"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {cenaCirc === "noite_quente" ? "Abajur 2700K" : "Abajur"}
                </text>
              </g>

              <g transform="translate(226, 166)">
                <circle cx="48" cy="26" r="15" fill="#475569" />
                <path d="M 24 70 C 24 46, 72 46, 72 70 Z" fill="#334155" />
                <rect x="6" y="66" width="114" height="8" rx="3" fill="#b08968" />
                <rect x="14" y="74" width="6" height="24" fill="#6f4e37" />
                <rect x="106" y="74" width="6" height="24" fill="#6f4e37" />
                <polygon
                  points="74,66 102,66 108,44 82,44"
                  fill={cenaCirc === "noite_fria" ? "#3b82f6" : "#1e293b"}
                />
              </g>
            </g>

            <g transform="translate(510, 14)">
              <rect
                width="276"
                height="292"
                rx="14"
                fill="#ffffff"
                stroke={cfgCirc.clockColor}
                strokeWidth="1.6"
              />
              <rect x="16" y="14" width="244" height="22" rx="11" fill={cfgCirc.badgeBg} />
              <text
                x="138"
                y="28.5"
                textAnchor="middle"
                fill={cfgCirc.clockColor}
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {cfgCirc.clockTag}
              </text>
              <text
                x="138"
                y="56"
                textAnchor="middle"
                fill="#0f172a"
                fontSize="12"
                fontWeight="bold"
              >
                Resposta do relógio biológico
              </text>
              <g transform="translate(18, 74)">
                <text x="0" y="10" fill="#475569" fontSize="9.8" fontWeight="bold">
                  Estado de alerta (foco)
                </text>
                <text
                  x="240"
                  y="10"
                  textAnchor="end"
                  fill="#0284c7"
                  fontSize="9.8"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {cfgCirc.alertaPct}%
                </text>
                <rect x="0" y="18" width="240" height="12" rx="6" fill="#e2e8f0" />
                <rect
                  x="0"
                  y="18"
                  width={Math.round((240 * cfgCirc.alertaPct) / 100)}
                  height="12"
                  rx="6"
                  fill="#0284c7"
                />
              </g>
              <g transform="translate(18, 122)">
                <text x="0" y="10" fill="#475569" fontSize="9.8" fontWeight="bold">
                  Melatonina (hormônio do sono)
                </text>
                <text
                  x="240"
                  y="10"
                  textAnchor="end"
                  fill="#7c3aed"
                  fontSize="9.8"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {cfgCirc.melatoninaPct}%
                </text>
                <rect x="0" y="18" width="240" height="12" rx="6" fill="#e2e8f0" />
                <rect
                  x="0"
                  y="18"
                  width={Math.round((240 * cfgCirc.melatoninaPct) / 100)}
                  height="12"
                  rx="6"
                  fill="#7c3aed"
                />
              </g>
              <line x1="18" y1="168" x2="258" y2="168" stroke="#e2e8f0" strokeWidth="1.2" />
              <g transform="translate(18, 180)">
                <rect width="240" height="28" rx="8" fill="#f1f5f9" />
                <text x="10" y="18" fill="#0f172a" fontSize="10" fontWeight="bold">
                  Conforto visual: {cfgCirc.olhosLabel}
                </text>
              </g>
              <g transform="translate(18, 216)">
                <rect width="240" height="26" rx="8" fill={cfgCirc.badgeBg} />
                <text x="10" y="17" fill="#1e293b" fontSize="10" fontWeight="bold">
                  • {cfgCirc.resumo1}
                </text>
              </g>
              <g transform="translate(18, 250)">
                <rect width="240" height="26" rx="8" fill={cfgCirc.badgeBg} />
                <text x="10" y="17" fill="#1e293b" fontSize="10" fontWeight="bold">
                  • {cfgCirc.resumo2}
                </text>
              </g>
            </g>
          </svg>
        ) : (
          <svg
            viewBox="0 0 800 310"
            className="block h-auto w-full"
            role="img"
            aria-label="Planta vista de cima da mesa de trabalho mostrando posicionamento para destros, canhotos, luminária linear de 1,20 m e erro comum"
          >
            <defs>
              <linearGradient id={`${uid}-linearGlow`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fde047" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#fef08a" stopOpacity="0.12" />
              </linearGradient>
              <radialGradient id={`${uid}-badBulb`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
              </radialGradient>
            </defs>

            <g transform="translate(14, 14)">
              <rect
                width="486"
                height="282"
                rx="14"
                fill="#ffffff"
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              <rect
                x="28"
                y="34"
                width="430"
                height="226"
                rx="6"
                fill="#f8fafc"
                stroke="#64748b"
                strokeWidth="6"
              />
              <text
                x="243"
                y="22"
                textAnchor="middle"
                fill="#475569"
                fontSize="9.8"
                fontFamily="monospace"
                fontWeight="bold"
              >
                VISTA DE CIMA (PLANTA DA MESA DE TRABALHO)
              </text>

              {perfilMesa === "destro" && (
                <g>
                  <rect
                    x="24"
                    y="64"
                    width="8"
                    height="106"
                    fill="#38bdf8"
                    stroke="#0284c7"
                    strokeWidth="1.5"
                  />
                  <text
                    x="16"
                    y="117"
                    textAnchor="middle"
                    fill="#0369a1"
                    fontSize="8.8"
                    fontFamily="monospace"
                    fontWeight="bold"
                    transform="rotate(-90 16 117)"
                  >
                    JANELA 90°
                  </text>
                  {[82, 114, 146].map((y, idx) => (
                    <line
                      key={`l-ray-${idx}`}
                      x1="36"
                      y1={y}
                      x2="246"
                      y2={y + 8}
                      stroke="#f59e0b"
                      strokeWidth="2.2"
                      strokeDasharray="7 6"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="26"
                        to="0"
                        dur="1.4s"
                        repeatCount="indefinite"
                      />
                    </line>
                  ))}
                </g>
              )}

              {perfilMesa === "canhoto" && (
                <g>
                  <rect
                    x="454"
                    y="64"
                    width="8"
                    height="106"
                    fill="#38bdf8"
                    stroke="#0284c7"
                    strokeWidth="1.5"
                  />
                  <text
                    x="472"
                    y="117"
                    textAnchor="middle"
                    fill="#0369a1"
                    fontSize="8.8"
                    fontFamily="monospace"
                    fontWeight="bold"
                    transform="rotate(90 472 117)"
                  >
                    JANELA 90°
                  </text>
                  {[82, 114, 146].map((y, idx) => (
                    <line
                      key={`r-ray-${idx}`}
                      x1="450"
                      y1={y}
                      x2="240"
                      y2={y + 8}
                      stroke="#f59e0b"
                      strokeWidth="2.2"
                      strokeDasharray="7 6"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="26"
                        to="0"
                        dur="1.4s"
                        repeatCount="indefinite"
                      />
                    </line>
                  ))}
                </g>
              )}

              {perfilMesa === "erro" && (
                <g>
                  <rect
                    x="168"
                    y="256"
                    width="150"
                    height="8"
                    fill="#38bdf8"
                    stroke="#0284c7"
                    strokeWidth="1.5"
                  />
                  <text
                    x="243"
                    y="276"
                    textAnchor="middle"
                    fill="#dc2626"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    JANELA ATRÁS DAS COSTAS (REFLEXO NA TELA)
                  </text>
                  <circle cx="243" cy="226" r="46" fill={`url(#${uid}-badBulb)`} />
                  <circle cx="243" cy="226" r="10" fill="#f59e0b" stroke="#b45309" strokeWidth="1.8" />
                  <text
                    x="330"
                    y="230"
                    fill="#b45309"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    ← Luz no centro
                  </text>
                </g>
              )}

              <rect
                x="128"
                y="44"
                width="230"
                height="94"
                rx="6"
                fill="#e7d5be"
                stroke="#854d0e"
                strokeWidth="2"
              />

              {perfilMesa === "erro" && (
                <polygon points="174,138 312,138 334,62 152,62" fill="#0f172a" opacity="0.34" />
              )}

              <rect x="198" y="54" width="90" height="12" rx="3" fill="#1e293b" />
              <rect x="234" y="66" width="18" height="8" fill="#475569" />

              {perfilMesa === "erro" && (
                <g>
                  <path
                    d="M 218 252 L 222 68 L 236 146"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.2"
                    strokeDasharray="6 5"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="22"
                      to="0"
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                  </path>
                  <rect x="150" y="74" width="186" height="22" rx="11" fill="#fee2e2" stroke="#ef4444" />
                  <text
                    x="243"
                    y="88.5"
                    textAnchor="middle"
                    fill="#b91c1c"
                    fontSize="9.5"
                    fontWeight="bold"
                  >
                    Sombra do corpo + reflexo
                  </text>
                </g>
              )}

              <g transform={`translate(${perfilMesa === "canhoto" ? 142 : 294}, 80)`}>
                <rect
                  width="48"
                  height="44"
                  rx="3"
                  fill={perfilMesa === "erro" ? "#cbd5e1" : "#ffffff"}
                  stroke="#64748b"
                  strokeWidth="1.2"
                />
                <line x1="8" y1="12" x2="40" y2="12" stroke="#94a3b8" strokeWidth="1.4" />
                <line x1="8" y1="22" x2="40" y2="22" stroke="#94a3b8" strokeWidth="1.4" />
                <line x1="8" y1="32" x2="32" y2="32" stroke="#94a3b8" strokeWidth="1.4" />
              </g>

              <rect x="206" y="92" width="74" height="22" rx="3" fill="#cbd5e1" stroke="#64748b" />

              {perfilMesa !== "erro" && (
                <g>
                  <rect
                    x="136"
                    y="52"
                    width="214"
                    height="80"
                    rx="8"
                    fill={`url(#${uid}-linearGlow)`}
                  />
                  <rect
                    x="148"
                    y="68"
                    width="190"
                    height="12"
                    rx="6"
                    fill="#fef08a"
                    stroke="#ca8a04"
                    strokeWidth="2"
                  />
                  <line x1="148" y1="54" x2="338" y2="54" stroke="#854d0e" strokeWidth="1.2" />
                  <line x1="148" y1="50" x2="148" y2="58" stroke="#854d0e" strokeWidth="1.2" />
                  <line x1="338" y1="50" x2="338" y2="58" stroke="#854d0e" strokeWidth="1.2" />
                  <rect x="174" y="44" width="138" height="17" rx="8.5" fill="#ffffff" stroke="#ca8a04" />
                  <text
                    x="243"
                    y="56"
                    textAnchor="middle"
                    fill="#854d0e"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    Luminária linear 1,20 m
                  </text>
                </g>
              )}

              <g transform="translate(243, 174)">
                <path
                  d="M -34 18 Q 0 34 34 18"
                  fill="none"
                  stroke="#475569"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <ellipse cx="0" cy="4" rx="34" ry="16" fill="#334155" />
                {perfilMesa === "canhoto" ? (
                  <path
                    d="M -26 -4 Q -46 -32 -66 -62"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="11"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M 26 -4 Q 46 -32 66 -62"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="11"
                    strokeLinecap="round"
                  />
                )}
                <circle cx="0" cy="-2" r="16" fill="#1e293b" stroke="#f8fafc" strokeWidth="1.5" />
              </g>

              <text
                x="243"
                y="224"
                textAnchor="middle"
                fill={cfgMesa.cor}
                fontSize="9.8"
                fontWeight="bold"
              >
                {perfilMesa === "destro"
                  ? "Luz entra pela esquerda — folha 100% iluminada"
                  : perfilMesa === "canhoto"
                    ? "Luz entra pela direita — folha 100% iluminada"
                    : ""}
              </text>
            </g>

            <g transform="translate(514, 14)">
              <rect
                width="272"
                height="282"
                rx="14"
                fill="#ffffff"
                stroke={cfgMesa.cor}
                strokeWidth="1.6"
              />
              <rect x="14" y="14" width="244" height="22" rx="11" fill={cfgMesa.bg} />
              <text
                x="136"
                y="28.5"
                textAnchor="middle"
                fill={cfgMesa.cor}
                fontSize="9.2"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {cfgMesa.selo}
              </text>
              <text
                x="136"
                y="56"
                textAnchor="middle"
                fill="#0f172a"
                fontSize="11.5"
                fontWeight="bold"
              >
                {cfgMesa.titulo}
              </text>
              {[cfgMesa.item1, cfgMesa.item2, cfgMesa.item3].map((txt, idx) => (
                <g key={txt} transform={`translate(16, ${72 + idx * 36})`}>
                  <rect width="240" height="28" rx="8" fill={cfgMesa.bg} />
                  <text x="10" y="18" fill="#1e293b" fontSize="10" fontWeight="bold">
                    • {txt}
                  </text>
                </g>
              ))}
              <line x1="16" y1="194" x2="256" y2="194" stroke="#e2e8f0" strokeWidth="1.2" />
              <rect x="16" y="206" width="240" height="60" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
              <text
                x="136"
                y="224"
                textAnchor="middle"
                fill="#0f172a"
                fontSize="9.8"
                fontWeight="bold"
              >
                {cfgMesa.rodape1}
              </text>
              <text x="136" y="242" textAnchor="middle" fill="#475569" fontSize="9.4">
                {cfgMesa.rodape2}
              </text>
              <text
                x="136"
                y="257"
                textAnchor="middle"
                fill="#047857"
                fontSize="8.8"
                fontFamily="monospace"
              >
                Cor ideal p/ trabalho: 4000K · IRC ≥ 80
              </text>
            </g>
          </svg>
        )}
      </div>

      <SecaoGuiasPraticos
        tituloSecao="Orientações práticas sobre luz, mesa e conforto visual"
        itens={GUIAS_LUZ}
        ctaSimulador={{
          label: "Abrir simulador de luz",
          detalhe: resumoComodo,
          onClick: onAbrirSimulador,
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL DA TRILHA WELLNESS (3 TEMAS · TODOS COM SIMULADOR)
═══════════════════════════════════════════════════════════════════════════ */

export default function TrilhaWellness(props: TrilhaWellnessProps) {
  const [fenomenoWellness, setFenomenoWellness] = useState<"co2" | "voc" | "luz">("co2");
  const [modoPorTema, setModoPorTema] = useState<
    Record<"co2" | "voc" | "luz", "guia" | "simulador">
  >({
    co2: "guia",
    voc: "guia",
    luz: "guia",
  });
  const [fonteVoc, setFonteVoc] = useState<FonteVocKey>("tinta");
  const [intensidadeVoc, setIntensidadeVoc] = useState<1 | 2 | 3>(3);

  const setModoAtual = (tema: "co2" | "voc" | "luz", modo: "guia" | "simulador") => {
    setModoPorTema((prev) => ({ ...prev, [tema]: modo }));
  };

  const resumoComodoCurto = `${TIPOS_COMODO[props.tipoComodo].nome} · ${props.comprimentoM.toFixed(0)}×${props.larguraM.toFixed(0)} m`;

  return (
    <div className="mt-4 rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
      {/* Cabeçalho e 3 abas numeradas limpas */}
      <div className="flex flex-col gap-4 border-b border-border/70 pb-4 print:hidden">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Wellness na Prática · Saúde, Foco e Sono
          </span>
          <h3 className="mt-1 text-display text-lg sm:text-xl font-extrabold text-foreground">
            Qualidade do ar, materiais e iluminação aplicada ao dia a dia
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            {
              id: "co2" as const,
              num: "01",
              titulo: "Ar e CO₂",
              sub: "Renovação, foco e sono",
            },
            {
              id: "voc" as const,
              num: "02",
              titulo: "Materiais e VOCs",
              sub: "Reforma, tintas e diluição",
            },
            {
              id: "luz" as const,
              num: "03",
              titulo: "Iluminação e Ergonomia",
              sub: "Ciclo circadiano e mesa 1,20 m",
            },
          ].map((item) => {
            const ativo = fenomenoWellness === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFenomenoWellness(item.id)}
                aria-pressed={ativo}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                  ativo
                    ? "border-primary bg-primary/[0.07] shadow-xs ring-1 ring-primary/20"
                    : "border-border bg-background/60 hover:border-primary/40 hover:bg-background"
                }`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg font-mono text-xs font-bold ${
                    ativo
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.num}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-xs font-bold ${
                      ativo ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {item.titulo}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {item.sub}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TEMA 1: AR E CO₂ (GUIA VISUAL + SIMULADOR DE AR)
      ══════════════════════════════════════════════════════════════ */}
      <div
        className={
          fenomenoWellness === "co2"
            ? "mt-5 space-y-4 print:break-inside-avoid"
            : "hidden print:block print:mt-6 print:space-y-4 print:break-inside-avoid"
        }
      >
        <div className="mx-auto flex w-full max-w-[940px] flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h4 className="text-display text-base sm:text-lg font-extrabold text-foreground">
              Por que uma sala fechada dá sono — mesmo com ar-condicionado ligado?
            </h4>
            <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
              O split recircula o mesmo ar sem trazer ar novo da rua. Explore o desenho animado ou
              abra o simulador para calcular o CO₂ no seu cômodo.
            </p>
          </div>
          <ModoSwitch
            modo={modoPorTema.co2}
            onChange={(m) => setModoAtual("co2", m)}
            labelSimulador="Simulador de CO₂"
          />
        </div>

        {modoPorTema.co2 === "guia" ? (
          <CenaCo2Animada
            resumoComodo={resumoComodoCurto}
            onAbrirSimulador={() => setModoAtual("co2", "simulador")}
          />
        ) : (
          <div className="mx-auto w-full max-w-[940px]">
            <Suspense
              fallback={
                <div className="rounded-2xl border border-border bg-background/50 p-6 text-center text-xs text-muted-foreground">
                  Carregando simulador de renovação de ar...
                </div>
              }
            >
              <SimuladorAr
                tipoComodo={props.tipoComodo}
                onSelectTipoComodo={props.onSelectTipoComodo}
                comprimentoM={props.comprimentoM}
                larguraM={props.larguraM}
                peDireitoM={props.peDireitoM}
                ocupantes={props.ocupantes}
                onChangeOcupantes={props.onChangeOcupantes}
                ach={props.ach}
                onChangeAch={props.onChangeAch}
                modoSimulador={props.modoSimulador}
                temperaturaExternaC={props.temperaturaExternaC}
                setpointC={props.setpointC}
              />
            </Suspense>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TEMA 2: MATERIAIS E VOCs (GUIA VISUAL + SIMULADOR DE VOCs)
      ══════════════════════════════════════════════════════════════ */}
      <div
        className={
          fenomenoWellness === "voc"
            ? "mt-5 space-y-4 print:break-inside-avoid"
            : "hidden print:block print:mt-6 print:space-y-4 print:break-inside-avoid"
        }
      >
        <div className="mx-auto flex w-full max-w-[940px] flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h4 className="text-display text-base sm:text-lg font-extrabold text-foreground">
              Por que tinta e móvel novo irritam olhos e garganta em ambientes fechados?
            </h4>
            <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
              Solventes, colas de MDF e produtos de limpeza liberam VOCs. Compare no desenho ou
              simule o tempo de ventilação pós-reforma no seu cômodo.
            </p>
          </div>
          <ModoSwitch
            modo={modoPorTema.voc}
            onChange={(m) => setModoAtual("voc", m)}
            labelSimulador="Simulador de VOCs"
          />
        </div>

        {modoPorTema.voc === "guia" ? (
          <CenaVocAnimada
            fonteVoc={fonteVoc}
            onChangeFonteVoc={setFonteVoc}
            intensidadeVoc={intensidadeVoc}
            onChangeIntensidadeVoc={setIntensidadeVoc}
            resumoComodo={resumoComodoCurto}
            onAbrirSimulador={() => setModoAtual("voc", "simulador")}
          />
        ) : (
          <div className="mx-auto w-full max-w-[940px]">
            <SimuladorVoc
              tipoComodo={props.tipoComodo}
              comprimentoM={props.comprimentoM}
              larguraM={props.larguraM}
              peDireitoM={props.peDireitoM}
              ach={props.ach}
              onChangeAch={props.onChangeAch}
              fonteVoc={fonteVoc}
              onChangeFonteVoc={setFonteVoc}
              intensidadeVoc={intensidadeVoc}
              onChangeIntensidadeVoc={setIntensidadeVoc}
            />
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TEMA 3: ILUMINAÇÃO (GUIA VISUAL + SIMULADOR DE LUZ)
      ══════════════════════════════════════════════════════════════ */}
      <div
        className={
          fenomenoWellness === "luz"
            ? "mt-5 space-y-4 print:break-inside-avoid"
            : "hidden print:block print:mt-6 print:space-y-4 print:break-inside-avoid"
        }
      >
        <div className="mx-auto flex w-full max-w-[940px] flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h4 className="text-display text-base sm:text-lg font-extrabold text-foreground">
              Como a cor da luz e a posição da mesa mudam seu sono e sua vista?
            </h4>
            <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
              Explore o relógio biológico e a ergonomia da mesa (destro/canhoto + linear 1,20 m), ou
              abra o simulador de iluminação natural e LED.
            </p>
          </div>
          <ModoSwitch
            modo={modoPorTema.luz}
            onChange={(m) => setModoAtual("luz", m)}
            labelSimulador="Simulador de Luz"
          />
        </div>

        {modoPorTema.luz === "guia" ? (
          <CenaLuzGuia
            resumoComodo={resumoComodoCurto}
            onAbrirSimulador={() => setModoAtual("luz", "simulador")}
          />
        ) : (
          <div className="mx-auto w-full max-w-[940px]">
            <Suspense
              fallback={
                <div className="rounded-2xl border border-border bg-background/50 p-6 text-center text-xs text-muted-foreground">
                  Carregando simulador de iluminação...
                </div>
              }
            >
              <SimuladorLuz
                tipoComodo={props.tipoComodo}
                comprimentoM={props.comprimentoM}
                larguraM={props.larguraM}
                peDireitoM={props.peDireitoM}
                larguraFachadaM={props.larguraFachadaM}
                profundidadeComodoM={props.profundidadeComodoM}
                areaVidroM2={props.areaVidroM2}
                percentualVidro={props.percentualVidro}
                tipoVidro={props.tipoVidro}
                onChangeTipoVidro={props.onChangeTipoVidro}
                orientacao={props.orientacao}
                reducaoSolarBrise={props.reducaoSolarBrise}
                posicaoJanelas={props.posicaoJanelas}
                ganhosInternosWm2={props.ganhosInternosWm2}
                onAplicarGanhoInternoNoTermico={props.onAplicarGanhoInternoNoTermico}
              />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}