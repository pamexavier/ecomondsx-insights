import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useId, useState } from "react";
import { InstitutionalLayout } from "@/components/InstitutionalLayout";
import {
  TIPOS_COMODO,
  VIDROS,
  type CorTintaKey,
  type EnvoltoriaKey,
  type OrientacaoKey,
  type PosicaoJanelaKey,
  type TipoComodoKey,
  type TipoVidroKey,
} from "@/data/wellness";
import CenaBioclimatica from "@/components/CenaBioclimatica";

const TrilhaWellness = lazy(() => import("@/components/wellness/TrilhaWellness"));

const FATOR_CARGA_PADRAO = 0.5;

const ORIENTACOES: Record<
  OrientacaoKey,
  {
    nome: string;
    irradianciaReferenciaWm2: number;
    horaPico: number;
    anguloSolarRelativo: string;
    dicaPratica: string;
  }
> = {
  N: {
    nome: "Norte",
    irradianciaReferenciaWm2: 550,
    horaPico: 12,
    anguloSolarRelativo: "Sol alto no céu ao longo do dia (Hemisfério Sul)",
    dicaPratica: "Um beiral simples acima da janela já bloqueia grande parte do sol do meio-dia.",
  },
  L: {
    nome: "Leste",
    irradianciaReferenciaWm2: 500,
    horaPico: 9,
    anguloSolarRelativo: "Sol direto pela manhã (ar externo ainda mais ameno)",
    dicaPratica: "Esquenta cedo, mas o ar da rua ainda está fresco — ótima face para quartos.",
  },
  O: {
    nome: "Oeste",
    irradianciaReferenciaWm2: 680,
    horaPico: 16,
    anguloSolarRelativo: "Sol baixo e forte da tarde somado ao ar externo no pico de calor",
    dicaPratica:
      "É a fachada mais crítica no verão: pede proteção solar externa (brise, toldo ou vegetação).",
  },
  S: {
    nome: "Sul",
    irradianciaReferenciaWm2: 220,
    horaPico: 12,
    anguloSolarRelativo: "Predomínio de luz difusa e quase sem sol direto",
    dicaPratica:
      "Esquenta pouco no verão, mas no inverno fica mais fria e exige atenção à umidade e mofo.",
  },
};

function temperaturaArNaHora(hora: number, tMinC: number, tMaxC: number) {
  const horaNormalizada = ((hora % 24) + 24) % 24;
  const faseDeAquecimento = horaNormalizada >= 5 && horaNormalizada < 15;
  const fracaoDoCiclo = faseDeAquecimento
    ? (horaNormalizada - 5) / 10
    : horaNormalizada >= 15
      ? (horaNormalizada - 15) / 14
      : (horaNormalizada + 24 - 15) / 14;
  const progresso = faseDeAquecimento
    ? (1 - Math.cos(Math.PI * fracaoDoCiclo)) / 2
    : (1 + Math.cos(Math.PI * fracaoDoCiclo)) / 2;

  return tMinC + (tMaxC - tMinC) * progresso;
}

const ENVOLTORIAS: Record<
  EnvoltoriaKey,
  {
    nome: string;
    espessuraLabel: string;
    detalhe: string;
    explicacaoPratica: string;
    transmitancia: string;
    u: number;
  }
> = {
  concreto: {
    nome: "Concreto maciço (12 cm)",
    espessuraLabel: "12 cm total",
    detalhe: "Parede fina de concreto sem isolamento térmico (NBR 15220)",
    explicacaoPratica: "Deixa o calor passar muito rápido — como uma parede fina sem barreira.",
    transmitancia: "U = 3,70 W/(m²·K)",
    u: 3.7,
  },
  ceramica: {
    nome: "Bloco cerâmico + reboco (18 cm)",
    espessuraLabel: "18 cm total",
    detalhe: "Bloco cerâmico furado de 14 cm + 2 cm de argamassa em cada face",
    explicacaoPratica: "Os furos de ar no tijolo barram quase metade do calor frente ao concreto.",
    transmitancia: "U = 2,10 W/(m²·K)",
    u: 2.1,
  },
  termica: {
    nome: "Alvenaria + isolante (23 cm)",
    espessuraLabel: "23 cm total",
    detalhe:
      "Parede existente + camada de 5 cm de EPS, lã de PET ou lã mineral (por fora ou por dentro)",
    explicacaoPratica: "Age como uma caixa térmica: reduz em mais de 4× a passagem de calor.",
    transmitancia: "U = 0,85 W/(m²·K)",
    u: 0.85,
  },
};

const CORES_TINTA: Record<
  CorTintaKey,
  {
    nome: string;
    alpha: number;
    hex: string;
    explicacaoPratica: string;
  }
> = {
  branca: {
    nome: "Branco Neve",
    alpha: 0.2,
    hex: "#E2E8F0",
    explicacaoPratica: "Reflete 80% do sol (como camiseta branca ao meio-dia).",
  },
  terracota: {
    nome: "Terracota Natural",
    alpha: 0.55,
    hex: "#C26D4A",
    explicacaoPratica: "Absorve 55% do sol — aquecimento intermediário.",
  },
  grafite: {
    nome: "Grafite Escuro",
    alpha: 0.85,
    hex: "#334155",
    explicacaoPratica: "Absorve 85% do sol (como camiseta preta no sol forte).",
  },
};

type ParametrosSimulacao = {
  corTinta: CorTintaKey;
  comprimentoM: number;
  larguraM: number;
  larguraFachadaM: number;
  peDireitoM: number;
  uParede: number;
  temperaturaExternaC: number;
  irradianciaVerticalWm2: number;
  areaVidroInformadaM2: number;
  uVidro: number;
  fatorSolarVidro: number;
  reducaoSolarBrise: number;
  renovacoesArHora: number;
  ocupantes: number;
  ganhosInternosWm2: number;
  setpointC: number;
  horasOperacaoDia: number;
  cop: number;
  fatorCarga: number;
};

function calcularSimulacao({
  corTinta,
  comprimentoM,
  larguraM,
  larguraFachadaM,
  peDireitoM,
  uParede,
  temperaturaExternaC,
  irradianciaVerticalWm2,
  areaVidroInformadaM2,
  uVidro,
  fatorSolarVidro,
  reducaoSolarBrise,
  renovacoesArHora,
  ocupantes,
  ganhosInternosWm2,
  setpointC,
  horasOperacaoDia,
  cop,
  fatorCarga,
}: ParametrosSimulacao) {
  const cor = CORES_TINTA[corTinta];
  const hExt = 25;
  const areaPisoM2 = comprimentoM * larguraM;
  const volumeM3 = areaPisoM2 * peDireitoM;
  const areaFachadaM2 = larguraFachadaM * peDireitoM;
  const areaVidroM2 = Math.max(0, Math.min(areaFachadaM2 * 0.85, areaVidroInformadaM2));
  const areaOpacaM2 = Math.max(0, areaFachadaM2 - areaVidroM2);

  const diferencaTemperaturaC = Math.max(0, temperaturaExternaC - setpointC);
  const elevacaoSolArC = (cor.alpha * irradianciaVerticalWm2) / hExt;
  const temperaturaSolArC = temperaturaExternaC + elevacaoSolArC;
  const deltaTSolArEfetivo = Math.max(0, temperaturaSolArC - setpointC);

  const cargaConducaoParedeW = uParede * areaOpacaM2 * diferencaTemperaturaC;
  const cargaTotalParedeSolArW = uParede * areaOpacaM2 * deltaTSolArEfetivo;
  const reducaoSolarParede = reducaoSolarBrise * 0.5;
  const ganhoSolarParedeW =
    Math.max(0, cargaTotalParedeSolArW - cargaConducaoParedeW) * (1 - reducaoSolarParede / 100);

  const cargaVidroConducaoW = uVidro * areaVidroM2 * diferencaTemperaturaC;
  const ganhoSolarVidroW =
    areaVidroM2 * irradianciaVerticalWm2 * fatorSolarVidro * (1 - reducaoSolarBrise / 100);

  const fatorCalorVolumetricoAr = 1200 / 3600;
  const cargaRenovacaoArW =
    fatorCalorVolumetricoAr * renovacoesArHora * volumeM3 * diferencaTemperaturaC;

  const cargaOcupantesW = ocupantes * 75;
  const cargaEquipamentosIluminacaoW = areaPisoM2 * ganhosInternosWm2;
  const cargaInternaW = cargaOcupantesW + cargaEquipamentosIluminacaoW;

  const cargaSensibleTotalW =
    cargaConducaoParedeW +
    ganhoSolarParedeW +
    cargaVidroConducaoW +
    ganhoSolarVidroW +
    cargaRenovacaoArW +
    cargaInternaW;

  const densidadeCargaWm2 = areaPisoM2 > 0 ? cargaSensibleTotalW / areaPisoM2 : 0;
  const capacidadeTermicaBtuH = cargaSensibleTotalW * 3.41214;
  const consumoMensalEstimadoKwh =
    (cargaSensibleTotalW / 1000 / cop) * horasOperacaoDia * 30 * fatorCarga;

  return {
    areaPisoM2,
    volumeM3,
    areaFachadaM2,
    areaVidroM2,
    areaOpacaM2,
    temperaturaSolArC,
    cargaConducaoParedeW,
    ganhoSolarParedeW,
    cargaVidroConducaoW,
    ganhoSolarVidroW,
    cargaRenovacaoArW,
    cargaInternaW,
    cargaSensibleTotalW,
    densidadeCargaWm2,
    capacidadeTermicaBtuH,
    consumoMensalEstimadoKwh,
  };
}

function splitComercialEquivalente(btuH: number) {
  if (btuH <= 500) return "Praticamente sem necessidade de refrigeração";
  const faixas = [9000, 12000, 18000, 24000, 30000, 36000];
  const faixa = faixas.find((cap) => btuH <= cap);
  if (faixa) {
    return `Referência: 1 ar-condicionado de ${faixa.toLocaleString("pt-BR")} BTU/h`;
  }
  const qtd = Math.ceil(btuH / 18000);
  return `Referência: ~${qtd} aparelhos de 18.000 BTU/h`;
}

function equivalenciaDomesticaCalor(watts: number) {
  if (watts < 120) return "Calor bem baixo — parecido com 1 pessoa sentada no cômodo.";
  if (watts < 900) {
    const lampadas = Math.max(1, Math.round(watts / 100));
    return `Equivale a ~${lampadas} ${lampadas === 1 ? "lâmpada antiga" : "lâmpadas antigas"} de 100 W esquentando o espaço.`;
  }
  const secadores = (watts / 1200).toFixed(1).replace(".", ",");
  return `É como manter ~${secadores} secador(es) de cabelo (1.200 W) soprando ar quente no cômodo.`;
}

function NumberControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  hint?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground">{unit}</span>
      </span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const input = event.currentTarget;
          if (input.value !== "" && input.validity.valid) {
            onChange(input.valueAsNumber);
          }
        }}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm tabular-nums text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-label={label}
      />
      {hint && <span className="block text-[10px] leading-snug text-muted-foreground">{hint}</span>}
    </label>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LISTA LIMPA DE ORIENTAÇÕES PRÁTICAS + MODAL EM 2 COLUNAS (ZERO POLUIÇÃO)
═══════════════════════════════════════════════════════════════════════════ */

type GuiaPraticoItem = {
  id: string;
  selo: string;
  botaoCurto: string;
  titulo: string;
  resumo: string;
  passos: { titulo: string; detalhe: string }[];
  dicaOuro: string;
};

function ListaOrientacoesPraticas({
  tituloSecao,
  itens,
}: {
  tituloSecao: string;
  itens: GuiaPraticoItem[];
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

  const colsClass = itens.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3";

  return (
    <>
      <div className="mx-auto w-full max-w-[920px] space-y-2 pt-2 print:hidden">
        <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {tituloSecao}
        </span>

        <div
          className={`divide-y divide-border overflow-hidden rounded-xl border border-border bg-card sm:grid ${colsClass} sm:divide-x sm:divide-y-0`}
        >
          {itens.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAtivoId(item.id)}
              className="group flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:flex-col sm:items-start sm:justify-between cursor-pointer"
            >
              <div className="min-w-0">
                <span className="block font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">
                  {item.selo}
                </span>
                <span className="mt-0.5 block text-xs font-semibold leading-snug text-foreground group-hover:text-primary">
                  {item.botaoCurto}
                </span>
              </div>
              <span
                aria-hidden="true"
                className="shrink-0 text-sm text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary sm:mt-2 sm:text-[11px] sm:font-semibold sm:text-primary/85"
              >
                <span className="sm:hidden">›</span>
                <span className="hidden sm:inline">Ler guia →</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Modal em 2 colunas (desktop) / empilhado (mobile) — zero scroll horizontal */}
      {itemAtivo && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`guia-titulo-${itemAtivo.id}`}
          onClick={() => setAtivoId(null)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/25 px-4 py-3 sm:px-6">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                Guia Prático · {itemAtivo.selo}
              </span>
              <button
                type="button"
                onClick={() => setAtivoId(null)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground cursor-pointer"
                aria-label="Fechar guia"
              >
                Fechar ✕
              </button>
            </div>

            <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[220px_1fr] md:overflow-hidden">
              <aside className="border-b border-border bg-muted/20 p-3 md:overflow-y-auto md:border-r md:border-b-0">
                <p className="mb-2 px-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Tópicos deste tema
                </p>
                <div className="grid grid-cols-1 gap-1">
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
                          {tab.selo}
                        </span>
                        <span className="mt-0.5 block text-xs font-semibold leading-snug">
                          {tab.botaoCurto}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <div className="space-y-4 p-4 sm:p-6 md:overflow-y-auto">
                <div>
                  <h4
                    id={`guia-titulo-${itemAtivo.id}`}
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

      <div className="hidden print:grid print:grid-cols-2 print:gap-2">
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
   CENAS ANIMADAS INTERATIVAS — FÍSICA DESCOMPLICADA
═══════════════════════════════════════════════════════════════════════════ */

const GUIAS_MOFO: GuiaPraticoItem[] = [
  {
    id: "mofo-desumidificador",
    selo: "Solução p/ parede suando",
    botaoCurto: "Desumidificador resolve a parede suando?",
    titulo: "Sim! Como o desumidificador elétrico faz a parede parar de 'suar'",
    resumo:
      "Em semanas frias e chuvosas (muito comuns no Sul do Brasil), abrir a janela deixa entrar ar igualmente úmido. O desumidificador elétrico ataca diretamente a umidade do ar interno e derruba o ponto de orvalho.",
    passos: [
      {
        titulo: "A física simples por trás (abaixa o ponto de orvalho)",
        detalhe:
          "Num quarto a 21 °C com 75% de umidade, o vapor vira água em qualquer parede abaixo de 16 °C. Ao ligar o desumidificador e baixar a umidade para 50%, o ponto de orvalho cai para ~10 °C — a parede de 14 °C para de suar na hora, mesmo sem obra!",
      },
      {
        titulo: "Desumidificador elétrico vs. potinho descartável",
        detalhe:
          "Os potinhos de mercado (cloreto de cálcio) servem apenas para espaços minúsculos e fechados como dentro de uma gaveta ou sapateira. Para secar um quarto inteiro e evitar mofo nas paredes, é preciso um desumidificador elétrico (com compressor ou dessecante) de 10 a 20 litros/dia.",
      },
      {
        titulo: "Modo 'Dry' do ar-condicionado também ajuda",
        detalhe:
          "Se você já tem ar-condicionado split no quarto, a função 'Dry' (desumidificar) retira bastante umidade em dias chuvosos — só cuide para não deixar o quarto gelado demais no inverno.",
      },
      {
        titulo: "Meta ideal de umidade: entre 45% e 55%",
        detalhe:
          "Regule o desumidificador para desligar perto de 50% de umidade relativa. Assim você evita mofo e ácaros sem ressecar a garganta e os olhos.",
      },
    ],
    dicaOuro:
      "Em regiões úmidas e chuvosas no inverno, o desumidificador elétrico é a solução sem obra mais eficaz contra parede 'suando' — retire água do ar antes que ela condense na parede fria.",
  },
  {
    id: "mofo-sem-obra",
    selo: "Hábitos sem obra",
    botaoCurto: "Não posso fazer obra. O que faço?",
    titulo: "Como frear o mofo hoje mesmo sem reforma",
    resumo:
      "Mesmo sem mexer na parede, você corta o mofo atacando o excesso de vapor no ar e os cantos abafados onde o ar não circula.",
    passos: [
      {
        titulo: "Afaste guarda-roupas e camas 5 cm da parede externa",
        detalhe:
          "Quando o móvel fica colado na parede fria, cria-se uma câmara gelada e sem vento. Só desencostar 5 cm já muda o microclima daquele canto.",
      },
      {
        titulo: "Regra dos 15 minutos em dias secos (após banho ou acordar)",
        detalhe:
          "Um banho quente joga cerca de 1 litro de vapor no ar. Em dias sem chuva, abrir janelas opostas por 10 a 15 minutos troca o ar úmido sem esfriar a casa inteira.",
      },
      {
        titulo: "Não seque roupas em quarto fechado",
        detalhe:
          "Uma máquina de roupas secando no varal interno libera de 2 a 3 litros de água direto no ar. Se estiver chovendo, use um desumidificador elétrico junto ao varal.",
      },
      {
        titulo: "Limpeza certa (evite só pintar por cima)",
        detalhe:
          "Tinta antimofo sozinha não segura parede molhada. Limpe os focos com pano úmido e vinagre branco ou água sanitária diluída (com janela aberta) e mantenha a umidade controlada.",
      },
    ],
    dicaOuro:
      "Mofo precisa de 3 fatores juntos: parede fria + umidade alta + ar parado. Controlando a umidade (ventilação em dia seco ou desumidificador na chuva) e afastando móveis, ele para de voltar.",
  },
  {
    id: "mofo-isolar-sem-quebrar",
    selo: "Reforma seca",
    botaoCurto: "Isolar sem quebrar a parede",
    titulo: "Como aquecer a parede fria sem demolir nada",
    resumo:
      "Você não precisa quebrar tijolo nem mexer na fachada do prédio: basta aplicar uma camada isolante fina pelo lado de dentro para que o vapor não encoste no concreto gelado.",
    passos: [
      {
        titulo: "Placas de EPS (isopor técnico) ou XPS coladas por dentro",
        detalhe:
          "Placas rígidas de 2 a 4 cm são coladas diretamente sobre a parede existente com argamassa própria, tela e acabamento. O quarto perde só ~4 cm e a parede deixa de suar.",
      },
      {
        titulo: "Parede seca (drywall fino + lã de PET)",
        detalhe:
          "Estrutura fina rente à parede fria, preenchida com lã de PET reciclada (não solta pó nem coça) e fechada com placa de gesso acartonado.",
      },
      {
        titulo: "Revestimento de cortiça natural",
        detalhe:
          "Material isolante cheio de microbolhas de ar. Em paredes frias sem infiltração de chuva, deixa a superfície bem mais morna ao toque.",
      },
    ],
    dicaOuro:
      "Antes de isolar, confirme se a umidade vem do ar interno (condensação) e não de vazamento ou infiltração externa — infiltração exige impermeabilização primeiro.",
  },
  {
    id: "mofo-exemplos",
    selo: "No dia a dia",
    botaoCurto: "Outros exemplos do mesmo efeito",
    titulo: "Onde mais você vê o ponto de orvalho acontecer",
    resumo:
      "Ponto de orvalho é a temperatura em que o vapor invisível do ar não consegue mais ficar gasoso e vira gotículas de água.",
    passos: [
      {
        titulo: "Copo de bebida gelada na mesa",
        detalhe:
          "O líquido não vazou. O vapor quente da cozinha encostou no vidro frio e virou água na casca externa.",
      },
      {
        titulo: "Espelho do banheiro embaçando no banho",
        detalhe:
          "O espelho está mais frio que o vapor do chuveiro e fica coberto de microgotículas em segundos — o mesmo que acontece devagar na parede fria.",
      },
      {
        titulo: "Para-brisa do carro embaçando na chuva",
        detalhe:
          "O vidro esfria com a chuva e a umidade da respiração condensa nele. Quando você liga o ar-condicionado do carro (que desumidifica o ar), o vidro limpa na hora.",
      },
    ],
    dicaOuro:
      "Gotículas nos vidros das janelas pela manhã no inverno são aviso direto de que a umidade interna está alta — hora de ventilar ou ligar o desumidificador.",
  },
];

function CenaMofoAnimada() {
  const uid = useId().replace(/:/g, "");
  const [modo, setModo] = useState<"problema" | "sem_obra" | "desumidificador" | "isolado">(
    "problema",
  );

  const statusBanner =
    modo === "problema"
      ? {
          bg: "#fef2f2",
          border: "#ef4444",
          titleColor: "#b91c1c",
          title: "Parede: 14 °C · Ar úmido (75% UR)",
          sub: "Orvalho a 16 °C: vapor encosta na parede e vira água.",
        }
      : modo === "sem_obra"
        ? {
            bg: "#eff6ff",
            border: "#3b82f6",
            titleColor: "#1d4ed8",
            title: "Dia seco: móvel afastado + janela aberta",
            sub: "A parede segue fria, mas o vento leva o vapor embora.",
          }
        : modo === "desumidificador"
          ? {
              bg: "#f0fdfa",
              border: "#0d9488",
              titleColor: "#0f766e",
              title: "Desumidificador: ar cai para 50% UR",
              sub: "Orvalho cai p/ 10 °C — parede (14 °C) para de suar!",
            }
          : {
              bg: "#ecfdf5",
              border: "#10b981",
              titleColor: "#047857",
              title: "Isolante interno: parede sobe p/ ~19,5 °C",
              sub: "Superfície morna fica acima do orvalho — seca!",
            };

  return (
    <div className="space-y-3.5">
      {/* Grade 2x2 limpa no mobile / 4 colunas no desktop */}
      <div
        className="mx-auto grid w-full max-w-[920px] grid-cols-2 gap-1 rounded-xl border border-border bg-muted/50 p-1 sm:grid-cols-4"
        role="group"
        aria-label="Cenário de umidade e mofo"
      >
        {[
          { id: "problema" as const, label: "1. Sem cuidados", dot: "bg-red-500" },
          { id: "sem_obra" as const, label: "2. Ventilar (dia seco)", dot: "bg-sky-500" },
          { id: "desumidificador" as const, label: "3. Desumidificador", dot: "bg-teal-600" },
          { id: "isolado" as const, label: "4. Isolante interno", dot: "bg-emerald-600" },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setModo(opt.id)}
            aria-pressed={modo === opt.id}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              modo === opt.id
                ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`size-2 shrink-0 rounded-full ${opt.dot}`} aria-hidden="true" />
            <span className="truncate">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Ilustração Arquitetônica 100% desobstruída */}
      <div className="mx-auto w-full max-w-[920px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:p-3.5 shadow-inner print:print-color-adjust-exact">
        <svg
          viewBox="0 0 800 360"
          className="block h-auto w-full"
          role="img"
          aria-label="Ilustração animada comparando um copo gelado suando com a parede de um quarto em quatro situações: sem cuidados, ventilando, com desumidificador elétrico e com placa isolante interna"
        >
          <defs>
            <linearGradient id={`${uid}-skyCold`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={modo === "desumidificador" ? "#94a3b8" : "#bae6fd"} />
              <stop offset="100%" stopColor={modo === "desumidificador" ? "#cbd5e1" : "#e0f2fe"} />
            </linearGradient>
            <linearGradient id={`${uid}-roomWall`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>
            <linearGradient id={`${uid}-drink`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <radialGradient id={`${uid}-moldSpot`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3f6212" stopOpacity="0.85" />
              <stop offset="65%" stopColor="#65a30d" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#65a30d" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* BLOCO ESQUERDO: ANALOGIA DO COPO GELADO */}
          <g transform="translate(14, 14)">
            <rect
              width="210"
              height="332"
              rx="16"
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />
            <rect x="26" y="14" width="158" height="22" rx="11" fill="#e0f2fe" />
            <text
              x="105"
              y="29"
              textAnchor="middle"
              fill="#0369a1"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
            >
              PENSE NO DIA A DIA
            </text>
            <text
              x="105"
              y="55"
              textAnchor="middle"
              fill="#0f172a"
              fontSize="13.5"
              fontWeight="bold"
            >
              O copo gelado "suando"
            </text>

            <rect x="24" y="226" width="162" height="10" rx="4" fill="#d6b48e" />
            <ellipse cx="105" cy="226" rx="46" ry="5" fill="#7dd3fc" opacity="0.55" />

            {[0, 1, 2].map((i) => (
              <path
                key={`cup-vap-${i}`}
                d={`M ${22 + i * 4} ${128 + i * 24} Q 46 ${118 + i * 24} 62 ${134 + i * 24}`}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity="0.7"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="16"
                  to="0"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              </path>
            ))}

            <line
              x1="118"
              y1="80"
              x2="108"
              y2="132"
              stroke="#f97316"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <polygon
              points="66,104 144,104 134,224 76,224"
              fill="#f0f9ff"
              stroke="#64748b"
              strokeWidth="2.2"
            />
            <polygon points="70,126 140,126 131,221 79,221" fill={`url(#${uid}-drink)`} />

            <rect
              x="80"
              y="132"
              width="20"
              height="18"
              rx="3"
              fill="#e0f2fe"
              stroke="#bae6fd"
              strokeWidth="1.2"
              transform="rotate(-12 90 141)"
            />
            <rect
              x="105"
              y="138"
              width="19"
              height="17"
              rx="3"
              fill="#e0f2fe"
              stroke="#bae6fd"
              strokeWidth="1.2"
              transform="rotate(15 114 146)"
            />

            {[
              { x: 64, y1: 126, y2: 214, dur: "2.2s", begin: "0s" },
              { x: 145, y1: 134, y2: 216, dur: "2.6s", begin: "0.7s" },
              { x: 70, y1: 158, y2: 220, dur: "2.0s", begin: "1.3s" },
            ].map((drop, idx) => (
              <circle key={`drop-cup-${idx}`} cx={drop.x} cy={drop.y1} r="3.6" fill="#0284c7">
                <animate
                  attributeName="cy"
                  values={`${drop.y1};${drop.y2}`}
                  dur={drop.dur}
                  begin={drop.begin}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  dur={drop.dur}
                  begin={drop.begin}
                  repeatCount="indefinite"
                />
              </circle>
            ))}

            <text
              x="105"
              y="260"
              textAnchor="middle"
              fill="#0f172a"
              fontSize="11.5"
              fontWeight="bold"
            >
              O copo não tem vazamento
            </text>
            <text x="105" y="279" textAnchor="middle" fill="#475569" fontSize="10.2">
              O vapor invisível do ar encosta
            </text>
            <text x="105" y="294" textAnchor="middle" fill="#475569" fontSize="10.2">
              no vidro gelado e vira água.
            </text>
            <text
              x="105"
              y="314"
              textAnchor="middle"
              fill="#0369a1"
              fontSize="10.2"
              fontWeight="bold"
            >
              Com a parede acontece igual →
            </text>
          </g>

          {/* BLOCO DIREITO: CORTE REAL DO QUARTO */}
          <g transform="translate(238, 14)">
            <rect
              width="548"
              height="332"
              rx="16"
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />
            <path
              d="M 16 1 H 124 V 331 H 16 A 15 15 0 0 1 1 316 V 16 A 15 15 0 0 1 16 1 Z"
              fill={`url(#${uid}-skyCold)`}
            />
            <text
              x="62"
              y="28"
              textAnchor="middle"
              fill={modo === "desumidificador" ? "#1e293b" : "#0369a1"}
              fontSize="9.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {modo === "desumidificador" ? "CHUVA FORA (90%)" : "RUA FRIA (SUL)"}
            </text>

            <g transform="translate(32, 42)">
              <rect width="60" height="28" rx="8" fill="#ffffff" stroke="#7dd3fc" strokeWidth="1.5" />
              <text
                x="30"
                y="19"
                textAnchor="middle"
                fill="#0284c7"
                fontSize="13"
                fontFamily="monospace"
                fontWeight="bold"
              >
                12 °C
              </text>
            </g>

            {/* Nuvem externa + gotas de chuva no modo desumidificador */}
            <g fill={modo === "desumidificador" ? "#64748b" : "#ffffff"} opacity="0.9">
              <circle cx="42" cy="108" r="14" />
              <circle cx="58" cy="102" r="17" />
              <circle cx="76" cy="108" r="13" />
            </g>
            {modo === "desumidificador" &&
              [34, 54, 74].map((rx, idx) => (
                <line
                  key={`rain-${idx}`}
                  x1={rx}
                  y1="126"
                  x2={rx - 6}
                  y2="146"
                  stroke="#0284c7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="6 8"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="14"
                    to="0"
                    dur="0.8s"
                    repeatCount="indefinite"
                  />
                </line>
              ))}

            {[164, 206, 248].map((y, idx) => (
              <g key={`wind-cold-${idx}`}>
                <line
                  x1="18"
                  y1={y}
                  x2={modo === "isolado" ? "114" : "136"}
                  y2={y}
                  stroke="#0284c7"
                  strokeWidth="2.4"
                  strokeDasharray="6 5"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="22"
                    to="0"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </line>
                <polygon
                  points={`${modo === "isolado" ? 118 : 142},${y} ${modo === "isolado" ? 110 : 134},${y - 4.5} ${modo === "isolado" ? 110 : 134},${y + 4.5}`}
                  fill="#0284c7"
                />
              </g>
            ))}

            <rect x="124" y="2" width="422" height="284" fill={`url(#${uid}-roomWall)`} />
            <path
              d="M 124 286 H 546 V 316 A 15 15 0 0 1 531 331 H 124 Z"
              fill="#e7d5be"
              stroke="#cbd5e1"
              strokeWidth="1"
            />
            <line x1="124" y1="286" x2="546" y2="286" stroke="#b08968" strokeWidth="2.5" />

            {/* PAREDE 12 CM */}
            <rect
              x="124"
              y="22"
              width="34"
              height="264"
              fill="#94a3b8"
              stroke="#475569"
              strokeWidth="2"
            />
            <circle cx="136" cy="80" r="2" fill="#64748b" />
            <circle cx="146" cy="145" r="2.2" fill="#64748b" />
            <circle cx="134" cy="215" r="2" fill="#64748b" />

            {modo !== "isolado" && (
              <rect x="153" y="24" width="5" height="260" fill="#0284c7" opacity="0.75" />
            )}

            {/* CAMADA ISOLANTE INTERNA (Modo 4) */}
            {modo === "isolado" && (
              <g>
                <rect
                  x="158"
                  y="22"
                  width="22"
                  height="264"
                  fill="#fef08a"
                  stroke="#ca8a04"
                  strokeWidth="1.5"
                />
                <rect
                  x="180"
                  y="22"
                  width="10"
                  height="264"
                  fill="#f8fafc"
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                <text
                  x="169"
                  y="156"
                  textAnchor="middle"
                  fill="#854d0e"
                  fontSize="8.8"
                  fontFamily="monospace"
                  fontWeight="bold"
                  transform="rotate(-90 169 156)"
                >
                  ISOLANTE COLADO (4-5 cm)
                </text>
              </g>
            )}

            <text
              x={modo === "isolado" ? "157" : "141"}
              y="314"
              textAnchor="middle"
              fill={modo === "isolado" ? "#047857" : "#475569"}
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {modo === "isolado" ? "Parede + placa" : "Parede 12 cm"}
            </text>

            {/* BANNER SUPERIOR */}
            <g transform="translate(202, 14)">
              <rect
                width="332"
                height="54"
                rx="12"
                fill={statusBanner.bg}
                stroke={statusBanner.border}
                strokeWidth="1.5"
              />
              <text x="14" y="23" fill={statusBanner.titleColor} fontSize="11.2" fontWeight="bold">
                {statusBanner.title}
              </text>
              <text x="14" y="41" fill="#334155" fontSize="9.8">
                {statusBanner.sub}
              </text>
            </g>

            {/* GUARDA-ROUPA */}
            <g
              transform={`translate(${
                modo === "problema"
                  ? 160
                  : modo === "sem_obra" || modo === "desumidificador"
                    ? 192
                    : 206
              }, 152)`}
            >
              <rect
                x="0"
                y="0"
                width="94"
                height="126"
                rx="5"
                fill="#b08968"
                stroke="#6f4e37"
                strokeWidth="2"
              />
              <line x1="47" y1="4" x2="47" y2="122" stroke="#6f4e37" strokeWidth="1.5" />
              <rect x="39" y="54" width="4" height="16" rx="2" fill="#4a3525" />
              <rect x="51" y="54" width="4" height="16" rx="2" fill="#4a3525" />
              <rect x="8" y="126" width="8" height="8" fill="#6f4e37" />
              <rect x="78" y="126" width="8" height="8" fill="#6f4e37" />
              <rect x="10" y="14" width="74" height="22" rx="6" fill="#ffffff" fillOpacity="0.9" />
              <text
                x="47"
                y="29"
                textAnchor="middle"
                fill="#4a3525"
                fontSize="10.2"
                fontWeight="bold"
              >
                Armário
              </text>
            </g>

            {modo === "sem_obra" && (
              <g>
                <line x1="160" y1="142" x2="190" y2="142" stroke="#0284c7" strokeWidth="1.8" />
                <line x1="160" y1="137" x2="160" y2="147" stroke="#0284c7" strokeWidth="1.8" />
                <line x1="190" y1="137" x2="190" y2="147" stroke="#0284c7" strokeWidth="1.8" />
                <text
                  x="175"
                  y="132"
                  textAnchor="middle"
                  fill="#0369a1"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  5 cm
                </text>
              </g>
            )}

            {/* DESUMIDIFICADOR ELÉTRICO (Modo 3) OU CAIXA DE VAPOR (demais modos) */}
            {modo === "desumidificador" ? (
              <g transform="translate(334, 178)">
                {/* Corpo do aparelho desumidificador */}
                <rect
                  x="12"
                  y="0"
                  width="92"
                  height="104"
                  rx="10"
                  fill="#ffffff"
                  stroke="#0f766e"
                  strokeWidth="2"
                />
                {/* Grade de saída de ar seco no topo */}
                <rect x="24" y="10" width="68" height="10" rx="4" fill="#ccfbf1" stroke="#14b8a6" />
                {/* Visor digital 50% UR */}
                <rect x="30" y="28" width="56" height="24" rx="5" fill="#0f172a" />
                <text
                  x="58"
                  y="44"
                  textAnchor="middle"
                  fill="#2dd4bf"
                  fontSize="11.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  50% UR
                </text>
                {/* Reservatório de água coletada embaixo */}
                <rect x="22" y="62" width="72" height="32" rx="5" fill="#e0f2fe" stroke="#38bdf8" />
                <rect x="24" y="76" width="68" height="16" rx="3" fill="#0ea5e9" opacity="0.7" />
                <text
                  x="58"
                  y="88"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  Água no tanque
                </text>
                <text
                  x="58"
                  y="120"
                  textAnchor="middle"
                  fill="#0f766e"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  Desumidificador
                </text>
              </g>
            ) : (
              <g transform="translate(334, 218)">
                <rect
                  width="164"
                  height="56"
                  rx="12"
                  fill="#f1f5f9"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                />
                <text
                  x="82"
                  y="20"
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize="10.8"
                  fontWeight="bold"
                >
                  Vapor do dia a dia
                </text>
                <text x="82" y="36" textAnchor="middle" fill="#475569" fontSize="9.5">
                  Banho, respiração, cozinha
                </text>
                <text x="82" y="49" textAnchor="middle" fill="#475569" fontSize="9.5">
                  e roupa secando dentro
                </text>
              </g>
            )}

            {/* JANELA NA PAREDE DIREITA */}
            <g transform="translate(518, 122)">
              <rect
                x="0"
                y="0"
                width="26"
                height="86"
                rx="4"
                fill={modo === "sem_obra" || modo === "isolado" ? "#d1fae5" : "#e2e8f0"}
                stroke={modo === "sem_obra" || modo === "isolado" ? "#10b981" : "#64748b"}
                strokeWidth="2"
              />
              {modo === "sem_obra" || modo === "isolado" ? (
                <g
                  fill="#047857"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="end"
                >
                  <text x="-8" y="36">
                    Janela aberta
                  </text>
                  <text x="-8" y="49">
                    15 min →
                  </text>
                </g>
              ) : (
                <g
                  fill="#64748b"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="end"
                >
                  <text x="-8" y="38">
                    Janela
                  </text>
                  <text x="-8" y="51">
                    {modo === "desumidificador" ? "fechada (chuva)" : "fechada"}
                  </text>
                </g>
              )}
            </g>

            {/* ANIMAÇÕES ESPECÍFICAS */}
            {modo === "problema" && (
              <g>
                {[0, 1, 2, 3].map((i) => (
                  <circle key={`vap-prob-${i}`} r="4.5" fill="#0284c7" opacity="0.75">
                    <animateMotion
                      dur={`${2.6 + i * 0.35}s`}
                      repeatCount="indefinite"
                      path={`M ${355 + i * 24},216 Q 260,${125 + i * 16} 162,${112 + i * 24}`}
                    />
                    <animate
                      attributeName="opacity"
                      values="0;0.9;0.9;0"
                      dur={`${2.6 + i * 0.35}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                ))}

                {[
                  { y1: 108, y2: 198, dur: "2.2s", begin: "0s" },
                  { y1: 132, y2: 238, dur: "2.6s", begin: "0.7s" },
                  { y1: 164, y2: 268, dur: "2.3s", begin: "1.3s" },
                ].map((d, i) => (
                  <circle key={`drop-wall-${i}`} cx="161" cy={d.y1} r="3.6" fill="#0284c7">
                    <animate
                      attributeName="cy"
                      values={`${d.y1};${d.y2}`}
                      dur={d.dur}
                      begin={d.begin}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      dur={d.dur}
                      begin={d.begin}
                      repeatCount="indefinite"
                    />
                  </circle>
                ))}

                <circle cx="168" cy="224" r="24" fill={`url(#${uid}-moldSpot)`}>
                  <animate attributeName="r" values="18;26;18" dur="2.8s" repeatCount="indefinite" />
                </circle>
                <circle cx="164" cy="214" r="5" fill="#3f6212" />
                <circle cx="171" cy="230" r="6.5" fill="#365314" />
                <circle cx="163" cy="242" r="4" fill="#4d7c0f" />

                <g transform="translate(202, 78)">
                  <rect
                    width="212"
                    height="26"
                    rx="13"
                    fill="#fee2e2"
                    stroke="#ef4444"
                    strokeWidth="1.2"
                  />
                  <text
                    x="106"
                    y="17"
                    textAnchor="middle"
                    fill="#b91c1c"
                    fontSize="10.2"
                    fontWeight="bold"
                  >
                    Água + ar parado = MOFO
                  </text>
                </g>
              </g>
            )}

            {modo === "sem_obra" && (
              <g>
                {[0, 1, 2].map((i) => (
                  <path
                    key={`air-clean-${i}`}
                    d={`M 176 ${262 - i * 30} C 176 154, 280 ${150 + i * 14}, 516 ${148 + i * 18}`}
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="2.4"
                    strokeDasharray="7 6"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="26"
                      to="0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </path>
                ))}

                <g transform="translate(202, 78)">
                  <rect
                    width="242"
                    height="26"
                    rx="13"
                    fill="#dbeafe"
                    stroke="#3b82f6"
                    strokeWidth="1.2"
                  />
                  <text
                    x="121"
                    y="17"
                    textAnchor="middle"
                    fill="#1d4ed8"
                    fontSize="10.2"
                    fontWeight="bold"
                  >
                    Ar circula atrás e seca o canto
                  </text>
                </g>
              </g>
            )}

            {modo === "desumidificador" && (
              <g>
                {/* Vapor do quarto sendo puxado para dentro do desumidificador */}
                {[0, 1].map((i) => (
                  <path
                    key={`dehum-pull-l-${i}`}
                    d={`M 294 ${194 + i * 28} Q 320 ${192 + i * 24} 344 ${206 + i * 18}`}
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="2.2"
                    strokeDasharray="5 5"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="20"
                      to="0"
                      dur="1.4s"
                      repeatCount="indefinite"
                    />
                  </path>
                ))}
                {/* Ar seco saindo por cima do desumidificador */}
                {[0, 1].map((i) => (
                  <path
                    key={`dehum-out-${i}`}
                    d={`M ${376 + i * 32} 174 Q ${370 + i * 44} 134, ${332 + i * 96} 122`}
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="2.2"
                    strokeDasharray="6 5"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="22"
                      to="0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </path>
                ))}

                <g transform="translate(202, 78)">
                  <rect
                    width="268"
                    height="26"
                    rx="13"
                    fill="#ccfbf1"
                    stroke="#0d9488"
                    strokeWidth="1.2"
                  />
                  <text
                    x="134"
                    y="17"
                    textAnchor="middle"
                    fill="#0f766e"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    Mesmo fria (14 °C), a parede fica seca
                  </text>
                </g>
              </g>
            )}

            {modo === "isolado" && (
              <g>
                {[0, 1].map((i) => (
                  <path
                    key={`iso-air-${i}`}
                    d={`M 380 214 Q 440 ${186 + i * 14} 516 ${160 + i * 20}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.4"
                    strokeDasharray="7 6"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="26"
                      to="0"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </path>
                ))}

                <g transform="translate(202, 78)">
                  <rect
                    width="242"
                    height="26"
                    rx="13"
                    fill="#d1fae5"
                    stroke="#10b981"
                    strokeWidth="1.2"
                  />
                  <text
                    x="121"
                    y="17"
                    textAnchor="middle"
                    fill="#047857"
                    fontSize="10.2"
                    fontWeight="bold"
                  >
                    Face morna: não cria gotas
                  </text>
                </g>
              </g>
            )}
          </g>
        </svg>
      </div>

      <ListaOrientacoesPraticas
        tituloSecao="Dúvidas práticas sobre mofo e desumidificador (toque para ler)"
        itens={GUIAS_MOFO}
      />
    </div>
  );
}

const GUIAS_PAREDE: GuiaPraticoItem[] = [
  {
    id: "parede-o-que-e-isolante",
    selo: "Sem jargão",
    botaoCurto: "O que é isolante térmico na prática?",
    titulo: "O que realmente é um isolante térmico na construção",
    resumo:
      "O segredo do isolamento não é peso — é prender ar parado em milhares de microbolhas, igual a uma caixa térmica na praia.",
    passos: [
      {
        titulo: "EPS (isopor técnico para obra)",
        detalhe:
          "Leve, acessível e com aditivo antichamas. Pode ser colado sobre a parede existente e receber reboco ou gesso.",
      },
      {
        titulo: "Lã de PET (feita de garrafas recicladas)",
        detalhe:
          "Muito usada em reformas internas com drywall: não solta poeira, não causa coceira e ainda melhora o isolamento acústico.",
      },
      {
        titulo: "Lã de rocha / lã de vidro e cortiça",
        detalhe:
          "A lã de rocha entrega ótimo conforto térmico e acústico; a cortiça natural pode ficar até aparente como revestimento decorativo.",
      },
    ],
    dicaOuro:
      "Concreto é pesado mas conduz calor rápido. Apenas 5 cm de isolante leve seguram mais calor que 25 cm de concreto maciço.",
  },
  {
    id: "parede-fora-ou-dentro",
    selo: "Casa vs. Prédio",
    botaoCurto: "Preciso quebrar? Por fora ou por dentro?",
    titulo: "Por fora ou por dentro: como isolar sem demolir",
    resumo:
      "Não precisa quebrar tijolo. O lado da instalação depende se você pode alterar a fachada (casa) ou apenas o interior (apartamento).",
    passos: [
      {
        titulo: "Pelo lado de fora (ideal para casas e obra nova)",
        detalhe:
          "Barra o sol antes de aquecer a alvenaria, evita acúmulo de calor para a noite e não reduz área interna.",
      },
      {
        titulo: "Pelo lado de dentro (ideal para apartamentos)",
        detalhe:
          "Aplica-se placa isolante colada ou drywall fino (4–5 cm) com lã de PET direto sobre a parede atual — reforma seca, rápida e sem alterar a fachada.",
      },
      {
        titulo: "Por qual parede começar?",
        detalhe:
          "Priorize a parede Oeste (sol da tarde) ou a laje do último andar — são os pontos que mais irradiam calor à noite.",
      },
    ],
    dicaOuro:
      "Perder 5 cm numa parede de 4 metros custa apenas 0,2 m² de piso e transforma o conforto térmico na hora de dormir.",
  },
  {
    id: "parede-sem-obra",
    selo: "Sem reforma",
    botaoCurto: "Não posso fazer obra nenhuma!",
    titulo: "Atalhos físicos para aliviar a parede quente sem obra",
    resumo:
      "Em imóveis alugados ou sem orçamento para reforma, três ações simples já trazem alívio real:",
    passos: [
      {
        titulo: "Pintar a face externa de branco (se tiver acesso)",
        detalhe:
          "Uma parede grafite ao sol passa de 54 °C; pintada de branco cai para perto de 39 °C — cerca de 15 °C a menos na casca externa.",
      },
      {
        titulo: "Fazer sombra antes do sol tocar o tijolo",
        detalhe:
          "Vasos altos, trepadeiras em treliça ou toldo na face Oeste impedem a parede de acumular calor para a noite.",
      },
      {
        titulo: "Barreira inteligente pelo lado de dentro",
        detalhe:
          "Estante cheia de livros ou painel ripado na parede que pega sol forte funcionam como camada extra de atraso térmico.",
      },
    ],
    dicaOuro:
      "Assim que o ar externo refrescar à noite (após 20h), abra duas janelas opostas para lavar o calor acumulado das paredes.",
  },
];

function CenaParedeAnimada() {
  const [horario, setHorario] = useState<"tarde" | "noite">("tarde");
  const [corExterna, setCorExterna] = useState<"escura" | "clara">("escura");

  const tempSuperficieTarde = corExterna === "escura" ? "~54 °C" : "~39 °C";
  const corTintaSvg = corExterna === "escura" ? "#334155" : "#f8fafc";

  const paredes = [
    {
      titulo: "1. Concreto maciço — 12 cm",
      analogia: "Como uma colher de metal na panela (conduz rápido)",
      uLabel: "U = 3,70",
      cor: "#dc2626",
      bgTag: "#fef2f2",
      larguraPx: 54,
      tipo: "concreto" as const,
      tardeStatus:
        corExterna === "escura"
          ? "Calor entra rápido → sala esquenta logo"
          : "Tinta branca alivia, mas parede fina aquece",
      noiteStatus:
        corExterna === "escura"
          ? "Devolve calor acumulado até de madrugada"
          : "Acumulou menos sol → esfria mais rápido",
      velocidade: corExterna === "escura" ? "1.3s" : "2.0s",
      particulas: corExterna === "escura" ? 5 : 3,
    },
    {
      titulo: "2. Bloco cerâmico — 18 cm",
      analogia: "Furos de ar no tijolo freiam quase metade do calor",
      uLabel: "U = 2,10",
      cor: "#d97706",
      bgTag: "#fffbeb",
      larguraPx: 84,
      tipo: "ceramica" as const,
      tardeStatus:
        corExterna === "escura"
          ? "Furos de ar freiam e atrasam o calor"
          : "Cor clara + furos de ar reduzem muito",
      noiteStatus:
        corExterna === "escura"
          ? "Ainda libera calor morno à noite"
          : "Noite bem mais fresca dentro do cômodo",
      velocidade: corExterna === "escura" ? "2.4s" : "3.3s",
      particulas: corExterna === "escura" ? 3 : 2,
    },
    {
      titulo: "3. Parede + Isolante — 23 cm",
      analogia: "Igual a uma caixa térmica (ar preso em microbolhas)",
      uLabel: "U = 0,85",
      cor: "#059669",
      bgTag: "#ecfdf5",
      larguraPx: 112,
      tipo: "termica" as const,
      tardeStatus: "Isolante segura o calor antes de entrar",
      noiteStatus: "Interior estável e fresco para dormir",
      velocidade: "4.8s",
      particulas: 1,
    },
  ];

  return (
    <div className="space-y-3.5">
      <div className="mx-auto flex w-full max-w-[920px] flex-wrap items-center justify-between gap-2">
        <div
          className="inline-flex w-full sm:w-auto rounded-xl border border-border bg-muted/50 p-1"
          role="group"
          aria-label="Horário do dia"
        >
          <button
            type="button"
            onClick={() => setHorario("tarde")}
            aria-pressed={horario === "tarde"}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              horario === "tarde"
                ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
            <span>14h · Sol forte (34 °C)</span>
          </button>
          <button
            type="button"
            onClick={() => setHorario("noite")}
            aria-pressed={horario === "noite"}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              horario === "noite"
                ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="size-2 rounded-full bg-indigo-500" aria-hidden="true" />
            <span>22h · Noite (22 °C)</span>
          </button>
        </div>

        <div
          className="inline-flex w-full sm:w-auto rounded-xl border border-border bg-muted/50 p-1"
          role="group"
          aria-label="Cor da tinta externa"
        >
          <button
            type="button"
            onClick={() => setCorExterna("escura")}
            aria-pressed={corExterna === "escura"}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              corExterna === "escura"
                ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="size-2.5 rounded-full bg-slate-700" aria-hidden="true" />
            <span>Tinta grafite</span>
          </button>
          <button
            type="button"
            onClick={() => setCorExterna("clara")}
            aria-pressed={corExterna === "clara"}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              corExterna === "clara"
                ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span
              className="size-2.5 rounded-full border border-slate-400 bg-white"
              aria-hidden="true"
            />
            <span>Tinta branca</span>
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[920px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:p-3.5 shadow-inner print:print-color-adjust-exact">
        <svg
          viewBox="0 0 800 365"
          className="block h-auto w-full"
          role="img"
          aria-label="Comparação animada da passagem de calor em três paredes com espessuras reais de 12 cm, 18 cm e 23 cm"
        >
          <rect
            x="12"
            y="12"
            width="138"
            height="341"
            rx="14"
            fill={horario === "tarde" ? "#fef3c7" : "#1e293b"}
            stroke={horario === "tarde" ? "#fcd34d" : "#334155"}
            strokeWidth="1.5"
          />

          {horario === "tarde" ? (
            <g transform="translate(81, 92)">
              <circle r="34" fill="#f59e0b" opacity="0.2" />
              <circle r="23" fill="#f59e0b">
                <animate attributeName="r" values="21;24;21" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <text
                x="0"
                y="56"
                textAnchor="middle"
                fill="#92400e"
                fontSize="11.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                TARDE · 14h
              </text>
              <text x="0" y="74" textAnchor="middle" fill="#b45309" fontSize="10.5">
                Ar na rua: 34 °C
              </text>
              <rect x="-56" y="88" width="112" height="52" rx="10" fill="#ffffff" stroke="#f59e0b" />
              <text x="0" y="106" textAnchor="middle" fill="#64748b" fontSize="9.5">
                Casca da parede:
              </text>
              <text
                x="0"
                y="128"
                textAnchor="middle"
                fill={corExterna === "escura" ? "#dc2626" : "#d97706"}
                fontSize="15"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {tempSuperficieTarde}
              </text>
              <text x="0" y="160" textAnchor="middle" fill="#78350f" fontSize="9.5">
                {corExterna === "escura" ? "Camiseta preta no sol" : "Camiseta branca no sol"}
              </text>
            </g>
          ) : (
            <g transform="translate(81, 92)">
              <circle r="20" fill="#f8fafc" />
              <circle cx="8" cy="-4" r="18" fill="#1e293b" />
              <text
                x="0"
                y="56"
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="11.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                NOITE · 22h
              </text>
              <text x="0" y="74" textAnchor="middle" fill="#93c5fd" fontSize="10.5">
                Rua fresca: 22 °C
              </text>
              <rect x="-56" y="88" width="112" height="56" rx="10" fill="#0f172a" stroke="#475569" />
              <text x="0" y="107" textAnchor="middle" fill="#cbd5e1" fontSize="9.5">
                Igual ao asfalto
              </text>
              <text x="0" y="121" textAnchor="middle" fill="#cbd5e1" fontSize="9.5">
                quente depois que
              </text>
              <text
                x="0"
                y="135"
                textAnchor="middle"
                fill="#fbbf24"
                fontSize="9.5"
                fontWeight="bold"
              >
                o sol já se pôs
              </text>
            </g>
          )}

          <text
            x="248"
            y="26"
            textAnchor="middle"
            fill="#475569"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            CORTE DA PAREDE (ESPESSURA REAL)
          </text>
          <text
            x="588"
            y="26"
            textAnchor="middle"
            fill="#475569"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            O QUE ACONTECE DENTRO DE CASA
          </text>

          {paredes.map((p, idx) => {
            const yBase = 40 + idx * 106;
            const wallX = 186;
            const wallEnd = wallX + p.larguraPx;

            return (
              <g key={p.titulo} transform={`translate(0, ${yBase})`}>
                <rect
                  x="160"
                  y="0"
                  width="628"
                  height="96"
                  rx="14"
                  fill="#ffffff"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                />

                {horario === "tarde" ? (
                  <g>
                    {[26, 46, 66].map((ly) => (
                      <line
                        key={`in-heat-${idx}-${ly}`}
                        x1="150"
                        y1={ly}
                        x2={wallX - 4}
                        y2={ly}
                        stroke={corExterna === "escura" ? "#ea580c" : "#f59e0b"}
                        strokeWidth="2.4"
                        strokeDasharray="4 4"
                      >
                        <animate
                          attributeName="stroke-dashoffset"
                          from="16"
                          to="0"
                          dur="1s"
                          repeatCount="indefinite"
                        />
                      </line>
                    ))}

                    {Array.from({ length: p.particulas }, (_, pi) => {
                      const py = 24 + ((pi * 17) % 44);
                      return (
                        <circle key={`heat-dot-${idx}-${pi}`} r="4.5" fill={p.cor}>
                          <animate
                            attributeName="cx"
                            values={`${wallX + 6};${wallEnd + 78}`}
                            dur={p.velocidade}
                            begin={`${pi * 0.35}s`}
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="cy"
                            values={`${py};${py + (pi % 2 === 0 ? 5 : -5)};${py}`}
                            dur={p.velocidade}
                            begin={`${pi * 0.35}s`}
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            values="0.9;1;0"
                            dur={p.velocidade}
                            begin={`${pi * 0.35}s`}
                            repeatCount="indefinite"
                          />
                        </circle>
                      );
                    })}
                  </g>
                ) : (
                  <g>
                    {p.tipo !== "termica" ? (
                      Array.from({ length: p.tipo === "concreto" ? 4 : 2 }, (_, pi) => {
                        const py = 24 + pi * 15;
                        return (
                          <path
                            key={`night-wave-${idx}-${pi}`}
                            d={`M ${wallEnd + 6} ${py} Q ${wallEnd + 24} ${py - 6}, ${wallEnd + 42} ${py} T ${wallEnd + 76} ${py}`}
                            fill="none"
                            stroke={p.cor}
                            strokeWidth="2.4"
                            strokeDasharray="6 5"
                          >
                            <animate
                              attributeName="stroke-dashoffset"
                              from="22"
                              to="0"
                              dur={p.tipo === "concreto" ? "1.3s" : "2.1s"}
                              repeatCount="indefinite"
                            />
                          </path>
                        );
                      })
                    ) : (
                      <text x={wallEnd + 8} y="50" fill="#059669" fontSize="10" fontWeight="bold">
                        Calor retido fora
                      </text>
                    )}
                  </g>
                )}

                <rect
                  x={wallX - 5}
                  y="14"
                  width="5"
                  height="58"
                  fill={corTintaSvg}
                  stroke="#94a3b8"
                  strokeWidth="0.8"
                />

                {p.tipo === "concreto" && (
                  <g>
                    <rect
                      x={wallX}
                      y="14"
                      width={p.larguraPx}
                      height="58"
                      rx="2"
                      fill={horario === "noite" && corExterna === "escura" ? "#fca5a5" : "#cbd5e1"}
                      stroke="#475569"
                      strokeWidth="1.5"
                    />
                    <circle cx={wallX + 14} cy="28" r="2.4" fill="#64748b" />
                    <circle cx={wallX + 36} cy="40" r="2.6" fill="#475569" />
                    <circle cx={wallX + 20} cy="54" r="2.2" fill="#64748b" />
                    <circle cx={wallX + 42} cy="25" r="2" fill="#475569" />
                  </g>
                )}

                {p.tipo === "ceramica" && (
                  <g>
                    <rect x={wallX} y="14" width="10" height="58" fill="#cbd5e1" stroke="#64748b" />
                    <rect
                      x={wallX + 10}
                      y="14"
                      width="64"
                      height="58"
                      fill="#ea580c"
                      stroke="#9a3412"
                      strokeWidth="1.2"
                    />
                    {[18, 37, 56].map((fx) => (
                      <g key={`brick-hole-${fx}`}>
                        <rect x={wallX + fx} y="21" width="12" height="17" rx="2" fill="#fff7ed" />
                        <rect x={wallX + fx} y="46" width="12" height="17" rx="2" fill="#fff7ed" />
                      </g>
                    ))}
                    <rect
                      x={wallX + 74}
                      y="14"
                      width="10"
                      height="58"
                      fill="#cbd5e1"
                      stroke="#64748b"
                    />
                  </g>
                )}

                {p.tipo === "termica" && (
                  <g>
                    <rect x={wallX} y="14" width="60" height="58" fill="#fdba74" stroke="#9a3412" />
                    {[10, 32].map((fx) => (
                      <g key={`iso-brick-${fx}`}>
                        <rect x={wallX + fx} y="21" width="13" height="17" rx="2" fill="#fff7ed" />
                        <rect x={wallX + fx} y="46" width="13" height="17" rx="2" fill="#fff7ed" />
                      </g>
                    ))}
                    <rect
                      x={wallX + 60}
                      y="14"
                      width="36"
                      height="58"
                      fill="#fef08a"
                      stroke="#ca8a04"
                      strokeWidth="1.5"
                    />
                    <text
                      x={wallX + 78}
                      y="40"
                      textAnchor="middle"
                      fill="#854d0e"
                      fontSize="8.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      ISOL.
                    </text>
                    <text
                      x={wallX + 78}
                      y="52"
                      textAnchor="middle"
                      fill="#854d0e"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      5 cm
                    </text>
                    <rect
                      x={wallX + 96}
                      y="14"
                      width="16"
                      height="58"
                      fill="#e2e8f0"
                      stroke="#64748b"
                    />
                  </g>
                )}

                <line x1={wallX} y1="79" x2={wallEnd} y2="79" stroke={p.cor} strokeWidth="1.5" />
                <text
                  x={wallX + p.larguraPx / 2}
                  y="90"
                  textAnchor="middle"
                  fill={p.cor}
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {p.tipo === "concreto" ? "12 cm" : p.tipo === "ceramica" ? "18 cm" : "23 cm"}
                </text>

                <g transform="translate(402, 14)">
                  <text x="0" y="13" fill="#0f172a" fontSize="12" fontWeight="bold">
                    {p.titulo}
                  </text>
                  <rect x="304" y="0" width="68" height="18" rx="9" fill={p.bgTag} stroke={p.cor} />
                  <text
                    x="338"
                    y="12.5"
                    textAnchor="middle"
                    fill={p.cor}
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {p.uLabel}
                  </text>
                  <text x="0" y="32" fill="#475569" fontSize="9.8">
                    {p.analogia}
                  </text>
                  <rect
                    x="0"
                    y="42"
                    width="372"
                    height="28"
                    rx="8"
                    fill={p.bgTag}
                    stroke={p.cor}
                    strokeOpacity="0.45"
                    strokeWidth="1.2"
                  />
                  <text x="12" y="60" fill={p.cor} fontSize="10.2" fontWeight="bold">
                    {horario === "tarde" ? p.tardeStatus : p.noiteStatus}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <ListaOrientacoesPraticas
        tituloSecao="Dúvidas práticas sobre paredes e isolantes (toque para ler)"
        itens={GUIAS_PAREDE}
      />
    </div>
  );
}

const GUIAS_VIDRO: GuiaPraticoItem[] = [
  {
    id: "vidro-apartamento",
    selo: "Sem alterar fachada",
    botaoCurto: "Moro em prédio e não posso pôr brise",
    titulo: "Como reduzir o efeito estufa em apartamentos ou aluguel",
    resumo:
      "Quando o condomínio não permite instalar toldo ou brise externo, combine duas barreiras internas para devolver o máximo de radiação antes de virar calor.",
    passos: [
      {
        titulo: "Película térmica de controle solar (nanocerâmica)",
        detalhe:
          "Películas nanocerâmicas claras barram grande parte do infravermelho (calor) mantendo a visão da rua e sem mudar a cor da fachada.",
      },
      {
        titulo: "Cortina ou persiana com face externa branca",
        detalhe:
          "Cortina escura absorve o sol e vira um aquecedor atrás do vidro. Face branca voltada para a rua reflete parte da radiação de volta.",
      },
      {
        titulo: "Feche a cortina antes do sol bater",
        detalhe:
          "Em janelas Oeste, feche por volta das 13h antes que piso e móveis aqueçam, e reabra quando o sol baixar.",
      },
    ],
    dicaOuro:
      "Teste rápido: num dia de sol, ponha a mão entre o vidro e uma cortina escura — você sente imediatamente o bolsão de ar quente preso ali.",
  },
  {
    id: "vidro-sombrinha",
    selo: "Analogia",
    botaoCurto: "Sombrinha vs. Óculos escuros",
    titulo: "Por que barrar o sol fora funciona muito melhor que cortina",
    resumo:
      "A luz solar atravessa o vidro comum facilmente. Ao aquecer sofá ou cortina, vira calor em ondas longas que o vidro dificulta sair.",
    passos: [
      {
        titulo: "Cortina interna = Óculos escuros no sol",
        detalhe:
          "Alivia o incômodo nos olhos, mas o calor já entrou no ambiente e sobe aquecendo o ar da sala inteira.",
      },
      {
        titulo: "Brise, beiral ou toldo externo = Sombrinha",
        detalhe:
          "Intercepta o raio solar fora do vidro — o calor se dissipa no ar aberto com o vento sem entrar em casa.",
      },
      {
        titulo: "Luz natural preservada",
        detalhe:
          "Brises bem angulados bloqueiam o sol direto (calor e ofuscamento) deixando a claridade difusa do céu entrar.",
      },
    ],
    dicaOuro:
      "1 m² de janela pegando sol direto da tarde pode jogar para dentro tanto calor quanto 6 a 8 m² de parede de alvenaria.",
  },
  {
    id: "vidro-fator-solar",
    selo: "Guia de compra",
    botaoCurto: "O que olhar ao comprar vidro (FS)?",
    titulo: "Como escolher o vidro certo na obra ou reforma",
    resumo:
      "Espessura em milímetros quase não muda o calor solar. Olhe estes dois números na especificação:",
    passos: [
      {
        titulo: "Fator Solar (FS) — quanto menor, mais fresco",
        detalhe:
          "Vidro comum incolor tem FS = 0,87 (87% do calor entra). Vidros de controle solar caem para FS = 0,35 a 0,45.",
      },
      {
        titulo: "Transmissão Luminosa (Tv) — quanto maior, mais claro",
        detalhe:
          "Um bom vidro seletivo combina FS baixo (~0,40) com Tv alta (~0,65–0,70): entra luz natural sem metade do calor.",
      },
      {
        titulo: "Vidro duplo (insulado)",
        detalhe:
          "Duas chapas com câmara de ar selada reduzem trocas de calor por condução e melhoram muito o isolamento acústico.",
      },
    ],
    dicaOuro:
      "Com orçamento enxuto, priorize sombreamento externo ou vidro de controle solar nas faces Oeste e Norte.",
  },
];

function CenaVidroAnimada() {
  const uid = useId().replace(/:/g, "");
  const [protecao, setProtecao] = useState<"sem" | "cortina" | "pelicula" | "brise">("sem");

  const config = {
    sem: {
      tempSala: "36 °C",
      tempColor: "#dc2626",
      calorBarPct: 87,
      calorLabel: "~87% (Forno)",
      sofaCor: "#b91c1c",
      sofaTexto: "Sofá/piso fervendo",
      boxBg: "#fef2f2",
      boxBorder: "#ef4444",
      boxTitleColor: "#b91c1c",
      boxTitle: "Igual a um carro fechado no sol",
      boxL1: "1. A luz atravessa o vidro comum fácil.",
      boxL2: "2. Piso e móveis absorvem e viram calor.",
      boxL3: "3. O calor fica preso dentro da sala.",
    },
    cortina: {
      tempSala: "33 °C",
      tempColor: "#d97706",
      calorBarPct: 65,
      calorLabel: "~65% (Ainda alto)",
      sofaCor: "#b45309",
      sofaTexto: "Sombra, mas abafado",
      boxBg: "#fffbeb",
      boxBorder: "#f59e0b",
      boxTitleColor: "#b45309",
      boxTitle: "Tira o brilho, mas não o calor",
      boxL1: "O sol já atravessou o vidro para dentro.",
      boxL2: "A cortina esquenta (ponha a mão atrás)",
      boxL3: "e joga ar quente por cima para a sala.",
    },
    pelicula: {
      tempSala: "29 °C",
      tempColor: "#0284c7",
      calorBarPct: 42,
      calorLabel: "~42% (Alívio parcial)",
      sofaCor: "#475569",
      sofaTexto: "Bem mais confortável",
      boxBg: "#eff6ff",
      boxBorder: "#3b82f6",
      boxTitleColor: "#1d4ed8",
      boxTitle: "Saída prática para apartamentos",
      boxL1: "Não altera a fachada do condomínio.",
      boxL2: "Película solar + cortina face branca",
      boxL3: "devolvem parte do sol para fora.",
    },
    brise: {
      tempSala: "25 °C",
      tempColor: "#059669",
      calorBarPct: 15,
      calorLabel: "~15% (Ideal)",
      sofaCor: "#334155",
      sofaTexto: "Sala clara e fresca",
      boxBg: "#ecfdf5",
      boxBorder: "#10b981",
      boxTitleColor: "#047857",
      boxTitle: "Luz entra, calor fica lá fora",
      boxL1: "Brise ou toldo barra o sol ANTES do vidro.",
      boxL2: "O vidro de controle solar filtra o resto,",
      boxL3: "mantendo claridade natural sem estufa.",
    },
  }[protecao];

  return (
    <div className="space-y-3.5">
      <div
        className="mx-auto grid w-full max-w-[920px] grid-cols-2 gap-1 rounded-xl border border-border bg-muted/50 p-1 sm:grid-cols-4"
        role="group"
        aria-label="Tipo de proteção solar na janela"
      >
        {[
          { id: "sem" as const, label: "1. Vidro comum", dot: "bg-red-500" },
          { id: "cortina" as const, label: "2. Só cortina", dot: "bg-amber-500" },
          { id: "pelicula" as const, label: "3. Película (prédio)", dot: "bg-sky-500" },
          { id: "brise" as const, label: "4. Brise externo", dot: "bg-emerald-600" },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setProtecao(opt.id)}
            aria-pressed={protecao === opt.id}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              protecao === opt.id
                ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`size-2 shrink-0 rounded-full ${opt.dot}`} aria-hidden="true" />
            <span className="truncate">{opt.label}</span>
          </button>
        ))}
      </div>

      <div className="mx-auto w-full max-w-[920px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:p-3.5 shadow-inner print:print-color-adjust-exact">
        <svg
          viewBox="0 0 800 340"
          className="block h-auto w-full"
          role="img"
          aria-label="Animação interativa comparando vidro comum, cortina interna, película para apartamento e brise externo"
        >
          <defs>
            <linearGradient id={`${uid}-skyDay`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
            <linearGradient id={`${uid}-roomTint`} x1="0" y1="0" x2="1" y2="0">
              <stop
                offset="0%"
                stopColor={
                  protecao === "sem"
                    ? "#fee2e2"
                    : protecao === "cortina"
                      ? "#fef3c7"
                      : protecao === "pelicula"
                        ? "#f0f9ff"
                        : "#ecfdf5"
                }
              />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
          </defs>

          <rect
            x="12"
            y="12"
            width="234"
            height="316"
            rx="14"
            fill={`url(#${uid}-skyDay)`}
            stroke="#bae6fd"
            strokeWidth="1.5"
          />
          <rect x="13" y="280" width="232" height="47" rx="12" fill="#86efac" opacity="0.6" />

          <rect
            x="246"
            y="12"
            width="542"
            height="316"
            rx="14"
            fill={`url(#${uid}-roomTint)`}
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
          <rect x="247" y="276" width="540" height="51" rx="12" fill="#e7d5be" />
          <line x1="247" y1="276" x2="787" y2="276" stroke="#b08968" strokeWidth="2.5" />

          <g transform="translate(76, 74)">
            <circle r="34" fill="#f59e0b" opacity="0.22" />
            <circle r="23" fill="#f59e0b">
              <animate attributeName="r" values="21;24;21" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <text
              x="0"
              y="48"
              textAnchor="middle"
              fill="#92400e"
              fontSize="10.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              SOL DA TARDE
            </text>
          </g>

          <rect x="234" y="12" width="24" height="58" fill="#64748b" stroke="#475569" />
          <rect x="234" y="230" width="24" height="98" fill="#64748b" stroke="#475569" />

          {protecao === "brise" ? (
            <g>
              <rect x="240" y="70" width="5" height="160" fill="#0284c7" opacity="0.7" />
              <rect x="248" y="70" width="5" height="160" fill="#38bdf8" opacity="0.6" />
              {[82, 114, 146, 178, 210].map((y) => (
                <line
                  key={`brise-slat-${y}`}
                  x1="202"
                  y1={y + 12}
                  x2="232"
                  y2={y - 6}
                  stroke="#059669"
                  strokeWidth="6.5"
                  strokeLinecap="round"
                />
              ))}
              <rect x="144" y="246" width="86" height="22" rx="11" fill="#d1fae5" stroke="#10b981" />
              <text
                x="187"
                y="260.5"
                textAnchor="middle"
                fill="#047857"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                BRISE FORA
              </text>
            </g>
          ) : protecao === "pelicula" ? (
            <g>
              <rect x="242" y="70" width="8" height="160" fill="#38bdf8" opacity="0.7" />
              <rect x="250" y="70" width="4" height="160" fill="#0369a1" />
              <rect
                x="282"
                y="68"
                width="10"
                height="174"
                rx="4"
                fill="#ffffff"
                stroke="#94a3b8"
                strokeWidth="1.5"
              />
              <text
                x="298"
                y="260"
                fill="#0369a1"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Película + cortina clara
              </text>
            </g>
          ) : (
            <rect
              x="242"
              y="70"
              width="9"
              height="160"
              fill="#7dd3fc"
              stroke="#0284c7"
              strokeWidth="1"
            />
          )}

          {protecao === "cortina" && (
            <g>
              <rect
                x="284"
                y="68"
                width="12"
                height="176"
                rx="4"
                fill="#fcd34d"
                stroke="#d97706"
                strokeWidth="1.5"
              />
              <rect x="252" y="72" width="31" height="158" fill="#ef4444" opacity="0.24">
                <animate
                  attributeName="opacity"
                  values="0.16;0.38;0.16"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
              </rect>
              <text
                x="298"
                y="260"
                fill="#b45309"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Cortina interna (esquenta)
              </text>
            </g>
          )}

          <g transform="translate(464, 212)">
            <rect x="12" y="0" width="144" height="26" rx="7" fill={config.sofaCor} />
            <rect
              x="0"
              y="22"
              width="168"
              height="36"
              rx="8"
              fill={config.sofaCor}
              stroke="#1e293b"
              strokeWidth="1.2"
            />
            <rect x="16" y="58" width="10" height="6" fill="#475569" />
            <rect x="142" y="58" width="10" height="6" fill="#475569" />
            <text x="84" y="44" textAnchor="middle" fill="#ffffff" fontSize="9.8" fontWeight="bold">
              {config.sofaTexto}
            </text>
          </g>

          <g transform="translate(664, 166)">
            <rect
              width="104"
              height="60"
              rx="12"
              fill="#ffffff"
              stroke={config.tempColor}
              strokeWidth="1.8"
            />
            <text
              x="52"
              y="20"
              textAnchor="middle"
              fill="#64748b"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              SALA ÀS 16h
            </text>
            <text
              x="52"
              y="46"
              textAnchor="middle"
              fill={config.tempColor}
              fontSize="20"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {config.tempSala}
            </text>
          </g>

          {protecao === "sem" && (
            <g>
              {[94, 134, 174].map((y, idx) => (
                <line
                  key={`ray-direct-${idx}`}
                  x1="108"
                  y1={y - 16}
                  x2={474 + idx * 24}
                  y2={214 + idx * 14}
                  stroke="#f59e0b"
                  strokeWidth="3.2"
                  strokeDasharray="10 6"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="32"
                    to="0"
                    dur="1.1s"
                    repeatCount="indefinite"
                  />
                </line>
              ))}
              {[0, 1, 2].map((i) => (
                <path
                  key={`trap-wave-${i}`}
                  d={`M ${484 + i * 32} 208 C ${425 + i * 16} 150, 300 ${134 + i * 20}, 264 ${144 + i * 16} C 296 ${162 + i * 12}, 372 130, ${436 + i * 24} 116`}
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="2.4"
                  strokeDasharray="6 6"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="24"
                    to="0"
                    dur="1.7s"
                    repeatCount="indefinite"
                  />
                </path>
              ))}
            </g>
          )}

          {protecao === "cortina" && (
            <g>
              {[94, 136, 178].map((y, idx) => (
                <line
                  key={`ray-cortina-${idx}`}
                  x1="108"
                  y1={y - 16}
                  x2="282"
                  y2={y + 20}
                  stroke="#f59e0b"
                  strokeWidth="3.2"
                  strokeDasharray="10 6"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="32"
                    to="0"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                </line>
              ))}
              {[0, 1, 2].map((i) => (
                <path
                  key={`hot-plume-${i}`}
                  d={`M 268 ${170 - i * 24} C 268 62, 318 48, ${392 + i * 38} ${102 + i * 20}`}
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="2.6"
                  strokeDasharray="7 6"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="26"
                    to="0"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </path>
              ))}
            </g>
          )}

          {protecao === "pelicula" && (
            <g>
              {[94, 136, 178].map((y, idx) => (
                <path
                  key={`ray-pel-${idx}`}
                  d={`M 108 ${y - 16} L 246 ${y + 12} L 176 ${y + 42}`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.6"
                  strokeDasharray="8 6"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="28"
                    to="0"
                    dur="1.3s"
                    repeatCount="indefinite"
                  />
                </path>
              ))}
              {[116, 162].map((y, idx) => (
                <line
                  key={`ray-pel-in-${idx}`}
                  x1="296"
                  y1={y}
                  x2="458"
                  y2={y + 26}
                  stroke="#0284c7"
                  strokeWidth="2.2"
                  strokeDasharray="6 7"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="26"
                    to="0"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                </line>
              ))}
            </g>
          )}

          {protecao === "brise" && (
            <g>
              {[88, 130, 172].map((y, idx) => (
                <path
                  key={`ray-brise-out-${idx}`}
                  d={`M 108 ${y - 16} L 214 ${y + 6} L 146 ${y + 38}`}
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="2.8"
                  strokeDasharray="8 6"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="28"
                    to="0"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                </path>
              ))}
              {[106, 146, 186].map((y, idx) => (
                <line
                  key={`soft-beam-${idx}`}
                  x1="262"
                  y1={y}
                  x2="462"
                  y2={y + 22}
                  stroke="#059669"
                  strokeWidth="2.2"
                  strokeDasharray="6 8"
                  opacity="0.8"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="28"
                    to="0"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </line>
              ))}
            </g>
          )}

          <g transform="translate(474, 26)">
            <rect
              width="298"
              height="96"
              rx="12"
              fill={config.boxBg}
              stroke={config.boxBorder}
              strokeWidth="1.5"
            />
            <text x="14" y="24" fill={config.boxTitleColor} fontSize="11.2" fontWeight="bold">
              {config.boxTitle}
            </text>
            <text x="14" y="45" fill="#1e293b" fontSize="10">
              {config.boxL1}
            </text>
            <text x="14" y="63" fill="#1e293b" fontSize="10">
              {config.boxL2}
            </text>
            <text x="14" y="81" fill={config.boxTitleColor} fontSize="10" fontWeight="bold">
              {config.boxL3}
            </text>
          </g>

          <g transform="translate(262, 292)">
            <text x="0" y="14" fill="#475569" fontSize="9.8" fontWeight="bold">
              CALOR SOLAR QUE ENTRA:
            </text>
            <rect x="148" y="4" width="182" height="13" rx="6.5" fill="#cbd5e1" />
            <rect
              x="148"
              y="4"
              width={Math.round((182 * config.calorBarPct) / 100)}
              height="13"
              rx="6.5"
              fill={config.tempColor}
            />
            <text x="342" y="14" fill={config.tempColor} fontSize="10.5" fontWeight="bold">
              {config.calorLabel}
            </text>
          </g>
        </svg>
      </div>

      <ListaOrientacoesPraticas
        tituloSecao="Dúvidas práticas sobre janelas e sol (toque para ler)"
        itens={GUIAS_VIDRO}
      />
    </div>
  );
}

/* ── Metadados dos 3 cards da Trilha 02 (Navegação Progressiva) ── */
const TEMAS_FISICA = [
  {
    id: "mofo" as const,
    numero: "01",
    etiqueta: "Condensação",
    titulo: "Por que dá mofo?",
    resumoCard: "Parede 'suando', desumidificador elétrico e como evitar sem reforma.",
    headline: 'A parede não precisa ter vazamento para mofar — ela "sua" igual a um copo gelado.',
    intro:
      "Vapor do banho, da respiração e da cozinha condensa na parede fria. Teste abaixo a diferença entre ventilar, usar desumidificador elétrico ou isolar por dentro.",
  },
  {
    id: "parede" as const,
    numero: "02",
    etiqueta: "Isolamento e cor",
    titulo: "Parede quente à noite",
    resumoCard: "Por que a casa segue abafada às 22h, o que é isolante e como aplicar.",
    headline: "Por que o quarto continua abafado às 22h se lá fora já esfriou?",
    intro:
      "Concreto fino (12 cm) aquece rápido; bloco furado (18 cm) freia quase metade; parede isolada (23 cm) age como caixa térmica.",
  },
  {
    id: "estufa" as const,
    numero: "03",
    etiqueta: "Janelas e sol",
    titulo: "Efeito estufa no vidro",
    resumoCard: "Por que fechar a cortina por dentro não resolve e o que fazer em prédio.",
    headline: "Por que fechar a cortina por dentro não resolve o calor da janela?",
    intro:
      "O vidro deixa o sol entrar e prende o calor lá dentro — igual a um carro fechado no sol. O segredo é barrar o sol antes do vidro.",
  },
];

/* ── Componente Principal: Simulador Mobile-First + Física Progressiva + Wellness ── */
function LaboratorioInterativo() {
  const [hora, setHora] = useState(16);
  const [trilhaAtiva, setTrilhaAtiva] = useState<"inicio" | "simulador" | "fisica" | "wellness">(
    "inicio",
  );
  const [fenomenoAtivo, setFenomenoAtivo] = useState<"mofo" | "parede" | "estufa" | null>(null);

  useEffect(() => {
    if (window.location.hash !== "#laboratorio-3d") return;
    setTrilhaAtiva("simulador");
    const timer = window.setTimeout(() => {
      document.getElementById("laboratorio-3d")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, []);

  const [abaAjusteAtiva, setAbaAjusteAtiva] = useState<
    "dimensoes" | "envoltoria" | "hvac" | "memoria"
  >("envoltoria");

  const [tipoComodo, setTipoComodo] = useState<TipoComodoKey>("sala");
  const [orientacao, setOrientacao] = useState<OrientacaoKey>("O");
  const [modoSimulador, setModoSimulador] = useState<"simples" | "especialista">("simples");
  const [condicaoClimatica, setCondicaoClimatica] = useState<"amena" | "quente">("quente");
  const [percentualVidroSimples, setPercentualVidroSimples] = useState(
    TIPOS_COMODO.sala.percentualVidroPadrao,
  );
  const [tipoVidro, setTipoVidro] = useState<TipoVidroKey>("comum");
  const [posicaoJanelas, setPosicaoJanelas] = useState<PosicaoJanelaKey>(
    TIPOS_COMODO.sala.posicaoJanelasPadrao,
  );
  const [envoltoria, setEnvoltoria] = useState<EnvoltoriaKey>("concreto");
  const [corTinta, setCorTinta] = useState<CorTintaKey>("grafite");
  const [comprimentoM, setComprimentoM] = useState(TIPOS_COMODO.sala.comprimentoPadraoM);
  const [larguraM, setLarguraM] = useState(TIPOS_COMODO.sala.larguraPadraoM);
  const [ladoFachada, setLadoFachada] = useState<"comprimento" | "largura">("largura");
  const [peDireitoM, setPeDireitoM] = useState(TIPOS_COMODO.sala.peDireitoPadraoM);
  const [uParede, setUParede] = useState(3.7);
  const [temperaturaExternaC, setTemperaturaExternaC] = useState(33);
  const [irradianciaVerticalWm2, setIrradianciaVerticalWm2] = useState(
    ORIENTACOES.O.irradianciaReferenciaWm2,
  );
  const [areaVidroInformadaM2, setAreaVidroInformadaM2] = useState(5.0);
  const [uVidro, setUVidro] = useState<number>(VIDROS.comum.u);
  const [fatorSolarVidro, setFatorSolarVidro] = useState<number>(VIDROS.comum.fs);
  const [reducaoSolarBrise, setReducaoSolarBrise] = useState(0);
  const [renovacoesArHora, setRenovacoesArHora] = useState(TIPOS_COMODO.sala.renovacoesArPadraoAch);
  const [ocupantes, setOcupantes] = useState(TIPOS_COMODO.sala.ocupantesPadrao);
  const [ganhosInternosWm2, setGanhosInternosWm2] = useState(
    TIPOS_COMODO.sala.ganhosInternosPadraoWm2,
  );
  const [setpointC, setSetpointC] = useState(24);
  const [horasOperacaoDia, setHorasOperacaoDia] = useState(TIPOS_COMODO.sala.horasOperacaoPadrao);
  const [cop, setCop] = useState(3.2);
  const [fatorCarga, setFatorCarga] = useState(FATOR_CARGA_PADRAO);
  const [cenarioBase, setCenarioBase] = useState<{
    cargaW: number;
    energiaKwh: number;
    descricao: string;
  } | null>(null);

  function irradianciaNaHora(horaAtual: number, o: OrientacaoKey, fator = 1) {
    if (horaAtual < 6 || horaAtual > 18) return 0;
    const { irradianciaReferenciaWm2: ref, horaPico } = ORIENTACOES[o];
    return ref * fator * Math.exp(-(((horaAtual - horaPico) / 3) ** 2));
  }

  function selecionarTipoComodo(novoTipo: TipoComodoKey) {
    const preset = TIPOS_COMODO[novoTipo];
    setTipoComodo(novoTipo);
    setComprimentoM(preset.comprimentoPadraoM);
    setLarguraM(preset.larguraPadraoM);
    setPeDireitoM(preset.peDireitoPadraoM);
    setPercentualVidroSimples(preset.percentualVidroPadrao);
    setPosicaoJanelas(preset.posicaoJanelasPadrao);
    setOcupantes(preset.ocupantesPadrao);
    setGanhosInternosWm2(preset.ganhosInternosPadraoWm2);
    setRenovacoesArHora(preset.renovacoesArPadraoAch);
    setHorasOperacaoDia(preset.horasOperacaoPadrao);

    const novaLarguraFachada =
      ladoFachada === "largura" ? preset.larguraPadraoM : preset.comprimentoPadraoM;
    const novaAreaFachada = novaLarguraFachada * preset.peDireitoPadraoM;
    setAreaVidroInformadaM2(
      Number(((novaAreaFachada * preset.percentualVidroPadrao) / 100).toFixed(1)),
    );
  }

  function selecionarTipoVidro(novoVidro: TipoVidroKey) {
    setTipoVidro(novoVidro);
    setUVidro(VIDROS[novoVidro].u);
    setFatorSolarVidro(VIDROS[novoVidro].fs);
  }

  const dadosComodo = TIPOS_COMODO[tipoComodo];
  const dadosOri = ORIENTACOES[orientacao];
  const dadosEnv = ENVOLTORIAS[envoltoria];
  const dadosCor = CORES_TINTA[corTinta];

  const larguraFachadaM = ladoFachada === "largura" ? larguraM : comprimentoM;
  const profundidadeComodoM = ladoFachada === "largura" ? comprimentoM : larguraM;
  const areaPisoM2 = comprimentoM * larguraM;
  const areaFachadaM2 = larguraFachadaM * peDireitoM;
  const areaVidroM2 =
    modoSimulador === "simples"
      ? areaFachadaM2 * (percentualVidroSimples / 100)
      : areaVidroInformadaM2;
  const percentualVidroEfetivo =
    areaFachadaM2 > 0 ? (areaVidroM2 / areaFachadaM2) * 100 : percentualVidroSimples;

  const temperaturaMinimaModelo = condicaoClimatica === "quente" ? 24 : 21;
  const temperaturaMaximaModelo = condicaoClimatica === "quente" ? 34 : 29;
  const temperaturaModelo =
    modoSimulador === "simples"
      ? temperaturaArNaHora(hora, temperaturaMinimaModelo, temperaturaMaximaModelo)
      : temperaturaExternaC;

  const irradianciaModelo =
    modoSimulador === "simples"
      ? Math.round(irradianciaNaHora(hora, orientacao, condicaoClimatica === "quente" ? 1 : 0.75))
      : irradianciaVerticalWm2;
  const fatorCargaModelo = modoSimulador === "especialista" ? fatorCarga : FATOR_CARGA_PADRAO;
  const horarioConsiderado =
    modoSimulador === "simples" ? `${Math.floor(hora)}h` : "horário manual";

  const simulacaoValida = areaVidroM2 <= areaFachadaM2 * 0.8 + 0.01;
  const simulacao = simulacaoValida
    ? calcularSimulacao({
        corTinta,
        comprimentoM,
        larguraM,
        larguraFachadaM,
        peDireitoM,
        uParede,
        temperaturaExternaC: temperaturaModelo,
        irradianciaVerticalWm2: irradianciaModelo,
        areaVidroInformadaM2: areaVidroM2,
        uVidro,
        fatorSolarVidro,
        reducaoSolarBrise,
        renovacoesArHora,
        ocupantes,
        ganhosInternosWm2,
        setpointC,
        horasOperacaoDia,
        cop,
        fatorCarga: fatorCargaModelo,
      })
    : null;

  const cargaConducaoParedeW = simulacao?.cargaConducaoParedeW ?? 0;
  const ganhoSolarParedeW = simulacao?.ganhoSolarParedeW ?? 0;
  const cargaVidroConducaoW = simulacao?.cargaVidroConducaoW ?? 0;
  const ganhoSolarVidroW = simulacao?.ganhoSolarVidroW ?? 0;
  const cargaRenovacaoArW = simulacao?.cargaRenovacaoArW ?? 0;
  const cargaInternaW = simulacao?.cargaInternaW ?? 0;
  const cargaSensibleTotalW = simulacao?.cargaSensibleTotalW ?? 0;
  const temperaturaSolArC = simulacao?.temperaturaSolArC ?? temperaturaModelo;
  const densidadeCargaWm2 = simulacao?.densidadeCargaWm2 ?? 0;
  const capacidadeTermicaBtuH = simulacao?.capacidadeTermicaBtuH ?? 0;
  const consumoMensalEstimadoKwh = simulacao?.consumoMensalEstimadoKwh ?? 0;

  const ganhoSolarTotalW = ganhoSolarParedeW + ganhoSolarVidroW;

  const diagnosticoVilao = (() => {
    if (!simulacao || cargaSensibleTotalW <= 1) return null;
    const grupos = [
      {
        id: "sol-vidro",
        titulo: "Sol direto entrando pelas janelas",
        valor: ganhoSolarVidroW,
        dica:
          reducaoSolarBrise < 40
            ? "Ativar um brise externo (-70%) ou trocar para vidro de controle solar derruba essa carga na hora."
            : "Mesmo com brise, a área envidraçada ou o tipo de vidro ainda puxa calor — teste reduzir a proporção de vidro.",
      },
      {
        id: "parede",
        titulo: `Calor atravessando a parede (${dadosEnv.nome})`,
        valor: cargaConducaoParedeW + ganhoSolarParedeW,
        dica:
          corTinta !== "branca"
            ? "Pintar a fachada de cor clara (Branco Neve) ou aplicar isolante (por fora ou por dentro) traz o maior alívio."
            : "Como a cor já é clara, o ganho maior agora vem de adicionar camada isolante na parede (EPS/lã).",
      },
      {
        id: "vidro-conducao",
        titulo: "Calor do ar externo passando pelo vidro",
        valor: cargaVidroConducaoW,
        dica: "Vidros duplos/insulados reduzem bastante a troca de calor com o ar quente da rua.",
      },
      {
        id: "ventilacao",
        titulo: "Ar quente da rua entrando na ventilação",
        valor: cargaRenovacaoArW,
        dica: "Nas horas mais quentes da tarde, reduza a entrada de ar externo e ventile mais cedo ou à noite.",
      },
      {
        id: "internas",
        titulo: "Pessoas, iluminação e eletrônicos internos",
        valor: cargaInternaW,
        dica: "Neste horário sem sol forte na fachada, o calor vem principalmente de dentro do ambiente (ocupantes e aparelhos).",
      },
    ];

    const maior = grupos.reduce((acc, item) => (item.valor > acc.valor ? item : acc), grupos[0]);
    const percentual = Math.round((maior.valor / cargaSensibleTotalW) * 100);
    return { ...maior, percentual };
  })();

  const rotulosSimples: Record<string, string> = {
    "Condução na parede": "Calor conduzido pela parede",
    "Sol absorvido pela parede": "Sol aquecendo a parede externa",
    "Condução no vidro": "Calor do ar passando pelo vidro",
    "Sol pelo vidro": "Sol entrando direto pelas janelas",
    "Renovação de ar": "Ar quente da rua (ventilação)",
    "Cargas internas": "Pessoas, luzes e aparelhos",
  };

  function trocarModo(novo: "simples" | "especialista") {
    setModoSimulador(novo);
    if (novo === "simples") {
      setUVidro(VIDROS[tipoVidro].u);
      setFatorSolarVidro(VIDROS[tipoVidro].fs);
      if (abaAjusteAtiva === "hvac") {
        setAbaAjusteAtiva("envoltoria");
      }
    } else {
      setAreaVidroInformadaM2(Number(((areaFachadaM2 * percentualVidroSimples) / 100).toFixed(1)));
    }
  }

  const temaFisicaSelecionado = TEMAS_FISICA.find((t) => t.id === fenomenoAtivo) ?? null;
  const indiceTemaFisica = temaFisicaSelecionado
    ? TEMAS_FISICA.findIndex((t) => t.id === temaFisicaSelecionado.id)
    : -1;
  const proximoTemaFisica =
    indiceTemaFisica >= 0 ? TEMAS_FISICA[(indiceTemaFisica + 1) % TEMAS_FISICA.length] : null;

  return (
    <section id="laboratorio-3d" className="mb-16 sm:mb-24 scroll-mt-24">
      {trilhaAtiva !== "inicio" && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
          <button
            type="button"
            onClick={() => {
              setTrilhaAtiva("inicio");
              setFenomenoAtivo(null);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary cursor-pointer"
          >
            <span aria-hidden="true">←</span>
            <span>Todos os temas</span>
          </button>

          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {trilhaAtiva === "simulador"
              ? "01 · Simulador Bioclimático"
              : trilhaAtiva === "fisica"
                ? "02 · Física Descomplicada"
                : "03 · Wellness"}
          </span>
        </div>
      )}

      {trilhaAtiva === "inicio" && (
        <>
          <div className="mb-2 flex items-center gap-3">
            <span className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-primary">
              Espaço educativo · arquitetura e bem-estar
            </span>
            <span className="hidden sm:inline-block h-px w-16 bg-border" />
          </div>
          <h2 className="mb-3 max-w-3xl text-display text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
            Aprenda, explore e entenda os ambientes.
          </h2>
          <p className="mb-6 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Escolha uma trilha abaixo para começar. Um assunto de cada vez, com animações e
            simuladores práticos.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                id: "simulador" as const,
                number: "01",
                title: "Simulador bioclimático de cômodos",
                description:
                  "Teste paredes com espessuras reais, cor, vidro e brise e descubra na hora o maior vilão do calor.",
                status: "Interativo",
                color: "#0f8a5f",
              },
              {
                id: "fisica" as const,
                number: "02",
                title: "Física descomplicada",
                description:
                  "Entenda com animações o mofo (e o papel do desumidificador), a parede quente à noite e o efeito estufa no vidro.",
                status: "3 temas",
                color: "#2563eb",
              },
              {
                id: "wellness" as const,
                number: "03",
                title: "Wellness e qualidade dos ambientes",
                description:
                  "Explore ar parado (CO₂), cheiro de reforma (VOCs) e iluminação (relógio biológico e ergonomia da mesa).",
                status: "3 temas",
                color: "#7c3aed",
              },
            ].map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setTrilhaAtiva(card.id);
                  if (card.id === "fisica") setFenomenoAtivo(null);
                }}
                className="group flex min-h-44 flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                <span className="flex w-full items-center justify-between">
                  <span
                    className="grid size-10 place-items-center rounded-xl font-mono text-xs font-bold"
                    style={{ color: card.color, backgroundColor: `${card.color}15` }}
                  >
                    {card.number}
                  </span>
                  <span
                    className="rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide"
                    style={{ color: card.color, borderColor: `${card.color}40` }}
                  >
                    {card.status}
                  </span>
                </span>
                <span className="mt-4 block text-base font-bold text-foreground">{card.title}</span>
                <span className="mt-1.5 block flex-1 text-xs leading-relaxed text-muted-foreground">
                  {card.description}
                </span>
                <span className="mt-4 text-xs font-semibold text-primary">
                  Abrir trilha <span aria-hidden="true">→</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {trilhaAtiva === "wellness" && (
        <Suspense
          fallback={
            <div className="mt-4 rounded-3xl border border-border bg-card p-6 text-xs text-muted-foreground">
              Carregando trilha Wellness e simuladores...
            </div>
          }
        >
          <TrilhaWellness
            tipoComodo={tipoComodo}
            onSelectTipoComodo={selecionarTipoComodo}
            comprimentoM={comprimentoM}
            larguraM={larguraM}
            peDireitoM={peDireitoM}
            larguraFachadaM={larguraFachadaM}
            profundidadeComodoM={profundidadeComodoM}
            areaVidroM2={areaVidroM2}
            percentualVidro={percentualVidroEfetivo}
            tipoVidro={tipoVidro}
            onChangeTipoVidro={selecionarTipoVidro}
            orientacao={orientacao}
            reducaoSolarBrise={reducaoSolarBrise}
            posicaoJanelas={posicaoJanelas}
            ocupantes={ocupantes}
            onChangeOcupantes={setOcupantes}
            ach={renovacoesArHora}
            onChangeAch={setRenovacoesArHora}
            ganhosInternosWm2={ganhosInternosWm2}
            onAplicarGanhoInternoNoTermico={setGanhosInternosWm2}
            modoSimulador={modoSimulador}
            temperaturaExternaC={temperaturaModelo}
            setpointC={setpointC}
          />
        </Suspense>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TRILHA 01: SIMULADOR BIOCLIMÁTICO (ZERO SOBREPOSIÇÃO NO CELULAR)
      ══════════════════════════════════════════════════════════════════ */}
      {trilhaAtiva === "simulador" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-display text-xl sm:text-2xl font-extrabold text-foreground">
                Simulador bioclimático de cômodos
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {comprimentoM.toFixed(1).replace(".", ",")} ×{" "}
                {larguraM.toFixed(1).replace(".", ",")} m ({areaPisoM2.toFixed(1).replace(".", ",")}{" "}
                m²) · parede {dadosEnv.espessuraLabel}
              </p>
            </div>

            <div
              className="inline-flex w-fit rounded-xl border border-border bg-muted/50 p-1"
              role="group"
              aria-label="Modo do simulador"
            >
              {[
                { k: "simples" as const, l: "Guiado" },
                { k: "especialista" as const, l: "Engenharia" },
              ].map((modo) => (
                <button
                  key={modo.k}
                  type="button"
                  onClick={() => trocarModo(modo.k)}
                  aria-pressed={modoSimulador === modo.k}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    modoSimulador === modo.k
                      ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {modo.l}
                </button>
              ))}
            </div>
          </div>

          {/* Seletor de cômodo em grade 2x2 no celular / linha no desktop */}
          <div
            className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/50 p-1 sm:inline-grid sm:grid-cols-4"
            role="group"
            aria-label="Tipo de cômodo"
          >
            {(Object.keys(TIPOS_COMODO) as TipoComodoKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => selecionarTipoComodo(key)}
                aria-pressed={tipoComodo === key}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  tipoComodo === key
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {TIPOS_COMODO[key].nome}
              </button>
            ))}
          </div>

          {/* IMPORTANTE: sticky APENAS no desktop (lg:sticky). No celular rola livre sem nunca cobrir o formulário! */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
            <div id="simulador-preview" className="scroll-mt-24 lg:sticky lg:top-20 lg:self-start">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <CenaBioclimatica
                  hora={hora}
                  orientacao={orientacao}
                  tipoComodo={tipoComodo}
                  corParede={dadosCor.hex}
                  envoltoria={envoltoria}
                  percentualVidro={percentualVidroEfetivo}
                  reducaoSolarBrise={reducaoSolarBrise}
                  intensidadeSolar={Math.min(1, irradianciaModelo / 700)}
                  calor={Math.min(1, Math.max(0, (densidadeCargaWm2 - 40) / 120))}
                />

                <div className="space-y-3 p-3.5 sm:p-4">
                  {/* Cabeçalho do resultado + atalho no mobile para ir editar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                        Resultado ao vivo · {dadosComodo.nome}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {`${horarioConsiderado} · Rua ${temperaturaModelo.toFixed(1).replace(".", ",")} °C · Meta ${setpointC} °C · Casca ~${temperaturaSolArC.toFixed(0)} °C`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        document.getElementById("simulador-controles")?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        })
                      }
                      className="shrink-0 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary lg:hidden cursor-pointer"
                    >
                      Alterar dados ↓
                    </button>
                  </div>

                  {/* Slider de hora em 1 linha limpa (sem quebra esquisita no celular) */}
                  <label className="block space-y-1">
                    <span className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-foreground">
                        Hora do dia:{" "}
                        <span className="font-mono text-primary">
                          {String(Math.floor(hora)).padStart(2, "0")}h
                        </span>
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        Sol na fachada: {irradianciaModelo} W/m²
                      </span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={24}
                      step={0.5}
                      value={hora}
                      onChange={(event) => setHora(Number(event.currentTarget.value))}
                      className="w-full accent-primary"
                      aria-label="Hora do dia"
                    />
                  </label>

                  {/* 4 indicadores limpos */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        label: "Calor total a remover",
                        value: simulacao ? `${Math.round(cargaSensibleTotalW)} W` : "—",
                        sub: simulacao
                          ? `${Math.round(capacidadeTermicaBtuH).toLocaleString("pt-BR")} BTU/h`
                          : "",
                        color: "text-orange-600",
                      },
                      {
                        label: "Densidade no piso",
                        value: simulacao
                          ? `${densidadeCargaWm2.toFixed(1).replace(".", ",")} W/m²`
                          : "—",
                        sub: `${areaPisoM2.toFixed(1).replace(".", ",")} m²`,
                        color: "text-emerald-700",
                      },
                      {
                        label: "Calor vindo só do sol",
                        value: simulacao ? `${Math.round(ganhoSolarTotalW)} W` : "—",
                        sub: `Fachada ${dadosOri.nome}`,
                        color: "text-amber-600",
                      },
                      {
                        label: "Energia estimada (AC)",
                        value: simulacao ? `${consumoMensalEstimadoKwh.toFixed(0)} kWh/mês` : "—",
                        sub: `${horasOperacaoDia}h/dia`,
                        color: "text-sky-700",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-border bg-background/60 px-2.5 py-2"
                      >
                        <span className="block text-[10px] text-muted-foreground">
                          {item.label}
                        </span>
                        <span
                          className={`mt-0.5 block font-mono text-sm font-bold tabular-nums ${item.color}`}
                        >
                          {item.value}
                        </span>
                        {item.sub && (
                          <span className="block font-mono text-[9.5px] text-muted-foreground">
                            {item.sub}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {simulacao && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[11px] leading-snug text-emerald-950">
                      <p className="font-semibold">
                        {splitComercialEquivalente(capacidadeTermicaBtuH)}
                      </p>
                      <p className="mt-0.5 text-emerald-900/80">
                        {equivalenciaDomesticaCalor(cargaSensibleTotalW)}
                      </p>
                    </div>
                  )}

                  {diagnosticoVilao && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-[11px] leading-snug text-amber-950">
                      <p className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-amber-800">
                        Maior vilão do calor agora ({diagnosticoVilao.percentual}%)
                      </p>
                      <p className="mt-0.5 font-semibold">{diagnosticoVilao.titulo}</p>
                      <p className="mt-0.5 text-amber-900/90">{diagnosticoVilao.dica}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => selecionarTipoComodo(tipoComodo)}
                      className="flex-1 rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-semibold text-foreground hover:border-primary/50 cursor-pointer"
                    >
                      Restaurar padrão
                    </button>
                    <button
                      type="button"
                      disabled={!simulacao}
                      onClick={() => {
                        if (simulacao) {
                          setCenarioBase({
                            cargaW: simulacao.cargaSensibleTotalW,
                            energiaKwh: simulacao.consumoMensalEstimadoKwh,
                            descricao: `${dadosComodo.nome} · ${dadosEnv.nome} · ${dadosCor.nome}`,
                          });
                        }
                      }}
                      className="flex-1 rounded-lg bg-primary px-2.5 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                    >
                      {cenarioBase ? "Atualizar base" : "Fixar p/ comparar"}
                    </button>
                    {cenarioBase && (
                      <button
                        type="button"
                        onClick={() => setCenarioBase(null)}
                        className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {cenarioBase && simulacao && (
                    <p className="rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px] text-foreground">
                      Comparado a <strong>{cenarioBase.descricao}</strong>:{" "}
                      <strong className="font-mono">
                        {simulacao.cargaSensibleTotalW - cenarioBase.cargaW > 0 ? "+" : ""}
                        {(simulacao.cargaSensibleTotalW - cenarioBase.cargaW).toFixed(0)} W
                      </strong>
                      {" · "}
                      <strong className="font-mono">
                        {simulacao.consumoMensalEstimadoKwh - cenarioBase.energiaKwh > 0 ? "+" : ""}
                        {(simulacao.consumoMensalEstimadoKwh - cenarioBase.energiaKwh).toFixed(
                          1,
                        )}{" "}
                        kWh/mês
                      </strong>
                    </p>
                  )}

                  <details className="border-t border-border pt-2 text-[11px] text-muted-foreground">
                    <summary className="cursor-pointer font-semibold text-foreground hover:text-primary">
                      Entender os valores técnicos (U, α, FS e T_sol-ar)
                    </summary>
                    <div className="mt-2 space-y-1.5 leading-relaxed">
                      <p>
                        <strong>U da parede ({uParede.toFixed(2).replace(".", ",")} W/m²·K):</strong>{" "}
                        mede quanto calor atravessa a parede ({dadosEnv.espessuraLabel}). Quanto{" "}
                        <strong>menor</strong>, melhor o isolamento.
                      </p>
                      <p>
                        <strong>α da tinta ({dadosCor.alpha.toFixed(2).replace(".", ",")}):</strong>{" "}
                        fração do sol absorvida pela cor externa ({Math.round(dadosCor.alpha * 100)}
                        %).
                      </p>
                      <p>
                        <strong>FS do vidro ({fatorSolarVidro.toFixed(2).replace(".", ",")}):</strong>{" "}
                        percentual do calor solar que entra pelo vidro (
                        {Math.round(fatorSolarVidro * 100)}%).
                      </p>
                      <p>
                        <strong>
                          T_sol-ar ({temperaturaSolArC.toFixed(1).replace(".", ",")} °C):
                        </strong>{" "}
                        temperatura equivalente na face externa ao somar ar quente + sol na tinta.
                      </p>
                      <p className="pt-1 opacity-80">{dadosComodo.notaTecnica}</p>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            {/* COLUNA DE CONTROLES — SEMPRE 100% VISÍVEL E ACESSÍVEL */}
            <div id="simulador-controles" className="scroll-mt-24 space-y-3">
              {/* Resumo inline exclusivo do celular: você vê os Watts reagirem enquanto mexe nos botões! */}
              {simulacao && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 lg:hidden">
                  <div className="min-w-0">
                    <span className="block font-mono text-[9.5px] font-bold uppercase tracking-wider text-primary">
                      Resultado enquanto você edita
                    </span>
                    <span className="block font-mono text-xs font-bold text-foreground">
                      {Math.round(cargaSensibleTotalW)} W ·{" "}
                      {Math.round(capacidadeTermicaBtuH).toLocaleString("pt-BR")} BTU/h ·{" "}
                      {consumoMensalEstimadoKwh.toFixed(0)} kWh/mês
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("simulador-preview")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                    }
                    className="shrink-0 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground cursor-pointer"
                  >
                    ↑ Ver casa
                  </button>
                </div>
              )}

              {/* Abas segmentadas limpas */}
              <div
                className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/50 p-1 sm:flex sm:flex-wrap"
                role="tablist"
                aria-label="Seções de ajuste do simulador"
              >
                {[
                  { id: "envoltoria" as const, titulo: "Parede e janelas" },
                  { id: "dimensoes" as const, titulo: "Medidas e clima" },
                  ...(modoSimulador === "especialista"
                    ? [{ id: "hvac" as const, titulo: "Ar e energia" }]
                    : []),
                  { id: "memoria" as const, titulo: "De onde vem o calor" },
                ].map((aba) => (
                  <button
                    key={aba.id}
                    type="button"
                    role="tab"
                    aria-selected={abaAjusteAtiva === aba.id}
                    onClick={() => setAbaAjusteAtiva(aba.id)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                      abaAjusteAtiva === aba.id
                        ? "bg-card text-foreground shadow-xs ring-1 ring-border/70"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {aba.titulo}
                  </button>
                ))}
              </div>

              {/* Painel 1: Dimensões, Orientação e Clima */}
              {abaAjusteAtiva === "dimensoes" && (
                <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <h3 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-primary">
                      Medidas, orientação solar e clima
                    </h3>
                    <span className="font-mono text-xs text-muted-foreground">
                      {areaPisoM2.toFixed(1).replace(".", ",")} m² ·{" "}
                      {(areaPisoM2 * peDireitoM).toFixed(1).replace(".", ",")} m³
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <NumberControl
                      label="Comprimento"
                      value={comprimentoM}
                      min={1.2}
                      max={30}
                      step={0.1}
                      unit="m"
                      onChange={setComprimentoM}
                    />
                    <NumberControl
                      label="Largura"
                      value={larguraM}
                      min={1.2}
                      max={30}
                      step={0.1}
                      unit="m"
                      onChange={setLarguraM}
                    />
                    <NumberControl
                      label="Pé-direito (altura)"
                      value={peDireitoM}
                      min={2.2}
                      max={10}
                      step={0.1}
                      unit="m"
                      onChange={setPeDireitoM}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-medium text-foreground">
                        Qual parede dá para a rua?
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          {
                            key: "largura" as const,
                            label: `Largura (${larguraM.toFixed(1).replace(".", ",")} m)`,
                          },
                          {
                            key: "comprimento" as const,
                            label: `Comprimento (${comprimentoM.toFixed(1).replace(".", ",")} m)`,
                          },
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setLadoFachada(item.key)}
                            aria-pressed={ladoFachada === item.key}
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                              ladoFachada === item.key
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium text-foreground">
                        Orientação solar da fachada
                      </p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(Object.keys(ORIENTACOES) as OrientacaoKey[]).map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setOrientacao(key);
                              setIrradianciaVerticalWm2(ORIENTACOES[key].irradianciaReferenciaWm2);
                            }}
                            aria-pressed={orientacao === key}
                            className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                              orientacao === key
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                        <strong className="text-foreground">{dadosOri.nome}:</strong>{" "}
                        {dadosOri.dicaPratica}
                      </p>
                    </div>
                  </div>

                  {modoSimulador === "simples" ? (
                    <div className="grid gap-4 sm:grid-cols-2 pt-1">
                      <div>
                        <p className="mb-2 text-xs font-medium text-foreground">
                          Como está o dia lá fora?
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            {
                              key: "amena" as const,
                              label: "Dia ameno (29 °C)",
                              detail: `Pico ~${temperaturaArNaHora(dadosOri.horaPico, 21, 29).toFixed(1).replace(".", ",")} °C`,
                            },
                            {
                              key: "quente" as const,
                              label: "Dia quente (34 °C)",
                              detail: `Pico ~${temperaturaArNaHora(dadosOri.horaPico, 24, 34).toFixed(1).replace(".", ",")} °C`,
                            },
                          ].map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setCondicaoClimatica(item.key)}
                              aria-pressed={condicaoClimatica === item.key}
                              className={`rounded-xl border p-2.5 text-left cursor-pointer ${
                                condicaoClimatica === item.key
                                  ? "border-primary bg-primary/10"
                                  : "border-border bg-background hover:border-primary/40"
                              }`}
                            >
                              <span className="block text-xs font-semibold text-foreground">
                                {item.label}
                              </span>
                              <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                                {item.detail}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <NumberControl
                          label="Pessoas no cômodo"
                          value={ocupantes}
                          min={0}
                          max={30}
                          step={1}
                          unit="pessoas"
                          hint="~75 W por pessoa."
                          onChange={setOcupantes}
                        />
                        <NumberControl
                          label="Uso do ar (h/dia)"
                          value={horasOperacaoDia}
                          min={0}
                          max={24}
                          step={1}
                          unit="h/dia"
                          hint="Para kWh/mês."
                          onChange={setHorasOperacaoDia}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 pt-1">
                      <NumberControl
                        label="Temperatura externa do ar"
                        value={temperaturaExternaC}
                        min={-10}
                        max={50}
                        step={0.5}
                        unit="°C"
                        onChange={setTemperaturaExternaC}
                      />
                      <NumberControl
                        label={`Irradiância vertical (${dadosOri.nome})`}
                        value={irradianciaVerticalWm2}
                        min={0}
                        max={1200}
                        step={10}
                        unit="W/m²"
                        onChange={setIrradianciaVerticalWm2}
                      />
                    </div>
                  )}
                </section>
              )}

              {/* Painel 2: Parede, Cor e Janelas */}
              {abaAjusteAtiva === "envoltoria" && (
                <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <h3 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-primary">
                      Parede externa, cor e janelas
                    </h3>
                    <span className="font-mono text-xs text-muted-foreground">
                      Vidro: {areaVidroM2.toFixed(1).replace(".", ",")} m² (
                      {Math.round(percentualVidroEfetivo)}%)
                    </span>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          1. Material e espessura da parede
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          A transmitância (<strong>U</strong>) depende do material e da{" "}
                          <strong>espessura</strong>: quanto menor o U, menos calor atravessa.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {(Object.keys(ENVOLTORIAS) as EnvoltoriaKey[]).map((key) => {
                          const item = ENVOLTORIAS[key];
                          const ativo = envoltoria === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                setEnvoltoria(key);
                                setUParede(item.u);
                              }}
                              aria-pressed={ativo}
                              className={`rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                                ativo
                                  ? "border-primary bg-primary/10"
                                  : "border-border bg-background hover:border-primary/40"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  {item.nome}
                                </span>
                                <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                                  {item.transmitancia}
                                </span>
                              </div>
                              <span className="mt-0.5 block text-[10.5px] text-muted-foreground">
                                {item.detalhe}
                              </span>
                              <span className="mt-1 block text-[10.5px] font-medium text-foreground/85">
                                → {item.explicacaoPratica}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-1">
                        <p className="mb-1.5 text-xs font-semibold text-foreground">
                          2. Cor da tinta externa
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {(Object.keys(CORES_TINTA) as CorTintaKey[]).map((key) => {
                            const item = CORES_TINTA[key];
                            const ativo = corTinta === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setCorTinta(key)}
                                aria-pressed={ativo}
                                className={`flex min-w-0 items-center gap-2 rounded-lg border p-2 text-left cursor-pointer ${
                                  ativo
                                    ? "border-primary bg-primary/10"
                                    : "border-border bg-background hover:border-primary/40"
                                }`}
                              >
                                <span
                                  className="size-4 shrink-0 rounded-full border border-black/20"
                                  style={{ backgroundColor: item.hex }}
                                />
                                <span className="min-w-0">
                                  <span className="block truncate text-[10px] font-semibold text-foreground">
                                    {item.nome}
                                  </span>
                                  <span className="block font-mono text-[9px] text-muted-foreground">
                                    {Math.round(item.alpha * 100)}% sol
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          {dadosCor.explicacaoPratica}
                        </p>
                      </div>
                    </div>

                    {modoSimulador === "simples" ? (
                      <div className="space-y-3.5">
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            3. Janelas, proteção solar e vidro
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Sem sombra externa, janelas costumam ser a maior porta de entrada do
                            calor.
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block space-y-1">
                            <span className="block text-xs text-muted-foreground">
                              Tamanho da área de vidro
                            </span>
                            <select
                              value={percentualVidroSimples}
                              onChange={(event) =>
                                setPercentualVidroSimples(Number(event.currentTarget.value))
                              }
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                            >
                              <option value={12}>Pequena (banheiro) · 12%</option>
                              <option value={25}>Padrão de quarto · 25%</option>
                              <option value={30}>Média de sala · 30%</option>
                              <option value={35}>Ampla (escritório) · 35%</option>
                              <option value={50}>Bastante vidro · 50%</option>
                              <option value={70}>Pano de vidro · 70%</option>
                            </select>
                          </label>
                          <label className="block space-y-1">
                            <span className="block text-xs text-muted-foreground">
                              Posição na parede
                            </span>
                            <select
                              value={posicaoJanelas}
                              onChange={(event) =>
                                setPosicaoJanelas(event.currentTarget.value as PosicaoJanelaKey)
                              }
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                            >
                              <option value="centro">Centralizadas (meia altura)</option>
                              <option value="altas">Altas (próximas ao teto)</option>
                              <option value="baixas">Peitoril baixo / porta-janela</option>
                              <option value="distribuidas">Distribuídas</option>
                            </select>
                          </label>
                        </div>

                        <div>
                          <p className="mb-1.5 text-xs text-muted-foreground">
                            Proteção solar do lado de fora
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: "Sem sombra", sub: "0%", value: 0 },
                              { label: "Beiral", sub: "-40% sol", value: 40 },
                              { label: "Brise", sub: "-70% sol", value: 70 },
                            ].map((item) => (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => setReducaoSolarBrise(item.value)}
                                aria-pressed={reducaoSolarBrise === item.value}
                                className={`rounded-lg border px-2 py-2 text-center cursor-pointer ${
                                  reducaoSolarBrise === item.value
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                                }`}
                              >
                                <span className="block text-xs font-bold">{item.label}</span>
                                <span className="block font-mono text-[10px] opacity-80">
                                  {item.sub}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="mb-1.5 text-xs text-muted-foreground">
                            Tipo de vidro (quanto menor o FS, menos calor solar entra)
                          </p>
                          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                            {(Object.keys(VIDROS) as TipoVidroKey[]).map((tipo) => {
                              const vidro = VIDROS[tipo];
                              const ativo = tipoVidro === tipo;
                              return (
                                <button
                                  key={tipo}
                                  type="button"
                                  onClick={() => selecionarTipoVidro(tipo)}
                                  aria-pressed={ativo}
                                  className={`rounded-lg border px-2.5 py-2 text-left text-xs cursor-pointer ${
                                    ativo
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border bg-background text-muted-foreground hover:border-primary/40"
                                  }`}
                                >
                                  <span className="block font-bold">{vidro.nome}</span>
                                  <span className="mt-0.5 block text-[10px]">
                                    Entra <strong>{Math.round(vidro.fs * 100)}%</strong> do sol
                                  </span>
                                  <span className="mt-0.5 block font-mono text-[9.5px] opacity-75">
                                    U={vidro.u} · FS={vidro.fs}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <NumberControl
                          label="Transmitância da parede (U)"
                          value={uParede}
                          min={0.15}
                          max={6}
                          step={0.05}
                          unit="W/(m²·K)"
                          hint={`Preset atual: ${dadosEnv.espessuraLabel}`}
                          onChange={setUParede}
                        />
                        <NumberControl
                          label="Área total das janelas"
                          value={areaVidroInformadaM2}
                          min={0}
                          max={Number((areaFachadaM2 * 0.8).toFixed(1))}
                          step={0.1}
                          unit="m²"
                          onChange={setAreaVidroInformadaM2}
                        />
                        <NumberControl
                          label="Transmitância do vidro (U)"
                          value={uVidro}
                          min={0.5}
                          max={7}
                          step={0.1}
                          unit="W/(m²·K)"
                          onChange={setUVidro}
                        />
                        <NumberControl
                          label="Fator solar do vidro (FS / g)"
                          value={fatorSolarVidro}
                          min={0.05}
                          max={0.95}
                          step={0.01}
                          unit="adim."
                          onChange={setFatorSolarVidro}
                        />
                        <NumberControl
                          label="Bloqueio solar por brise/beiral"
                          value={reducaoSolarBrise}
                          min={0}
                          max={95}
                          step={5}
                          unit="%"
                          onChange={setReducaoSolarBrise}
                        />
                        <label className="block space-y-1.5">
                          <span className="block text-xs text-muted-foreground">
                            Posição das janelas
                          </span>
                          <select
                            value={posicaoJanelas}
                            onChange={(event) =>
                              setPosicaoJanelas(event.currentTarget.value as PosicaoJanelaKey)
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                          >
                            <option value="centro">Centralizadas</option>
                            <option value="altas">Altas (junto ao teto)</option>
                            <option value="baixas">Baixas (peitoril baixo)</option>
                            <option value="distribuidas">Distribuídas</option>
                          </select>
                        </label>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Painel 3: HVAC (Modo Engenharia) */}
              {abaAjusteAtiva === "hvac" && modoSimulador === "especialista" && (
                <section className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Renovação de ar, cargas internas e eficiência do HVAC
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    <NumberControl
                      label="Renovação de ar"
                      value={renovacoesArHora}
                      min={0}
                      max={15}
                      step={0.1}
                      unit="ACH"
                      onChange={setRenovacoesArHora}
                    />
                    <NumberControl
                      label="Ocupantes (75 W/p)"
                      value={ocupantes}
                      min={0}
                      max={100}
                      step={1}
                      unit="pessoas"
                      onChange={setOcupantes}
                    />
                    <NumberControl
                      label="Luz e equipamentos"
                      value={ganhosInternosWm2}
                      min={0}
                      max={120}
                      step={1}
                      unit="W/m²"
                      onChange={setGanhosInternosWm2}
                    />
                    <NumberControl
                      label="Setpoint interno"
                      value={setpointC}
                      min={18}
                      max={28}
                      step={0.5}
                      unit="°C"
                      onChange={setSetpointC}
                    />
                    <NumberControl
                      label="Operação diária"
                      value={horasOperacaoDia}
                      min={0}
                      max={24}
                      step={1}
                      unit="h/dia"
                      onChange={setHorasOperacaoDia}
                    />
                    <NumberControl
                      label="Eficiência (COP)"
                      value={cop}
                      min={1.5}
                      max={6.5}
                      step={0.1}
                      unit="W/W"
                      onChange={setCop}
                    />
                    <NumberControl
                      label="Fator de carga mensal"
                      value={fatorCarga}
                      min={0.1}
                      max={1}
                      step={0.05}
                      unit="0 a 1"
                      hint="Média parcial frente ao pico."
                      onChange={setFatorCarga}
                    />
                  </div>
                </section>
              )}

              {/* Painel 4: De onde vem cada watt */}
              {abaAjusteAtiva === "memoria" && (
                <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="text-mono text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                        Decomposição térmica · Regime estacionário
                      </p>
                      <h3 className="mt-1 text-display text-lg font-bold text-foreground">
                        De onde vem cada watt no cômodo ({dadosComodo.nome})
                      </h3>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {`Piso: ${areaPisoM2.toFixed(1)} m² · Fachada: ${areaFachadaM2.toFixed(1)} m² · Vidro: ${areaVidroM2.toFixed(1)} m²`}
                    </p>
                  </div>
                  {simulacao ? (
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        {
                          label: "Condução na parede",
                          value: cargaConducaoParedeW,
                          explicacao: `Calor do ar externo passando pela parede (${dadosEnv.espessuraLabel}).`,
                          formula: `U (${uParede}) × A_opaca (${simulacao.areaOpacaM2.toFixed(1)} m²) × ΔT (${Math.max(0, temperaturaModelo - setpointC).toFixed(1)} K)`,
                        },
                        {
                          label: "Sol absorvido pela parede",
                          value: ganhoSolarParedeW,
                          explicacao: `Extra de calor gerado pelo sol batendo na tinta ${dadosCor.nome}.`,
                          formula: `U (${uParede}) × A_opaca (${simulacao.areaOpacaM2.toFixed(1)} m²) × [α (${dadosCor.alpha}) × I (${irradianciaModelo}) / 25] × (1 - 0,5 × ${reducaoSolarBrise}%)`,
                        },
                        {
                          label: "Condução no vidro",
                          value: cargaVidroConducaoW,
                          explicacao: "Calor conduzido pelo vidro só pela diferença de temperatura.",
                          formula: `U_vid (${uVidro}) × A_vid (${areaVidroM2.toFixed(1)} m²) × ΔT (${Math.max(0, temperaturaModelo - setpointC).toFixed(1)} K)`,
                        },
                        {
                          label: "Sol pelo vidro",
                          value: ganhoSolarVidroW,
                          explicacao: "Radiação solar atravessando o vidro direto para dentro.",
                          formula: `A_vid (${areaVidroM2.toFixed(1)} m²) × I (${irradianciaModelo}) × FS (${fatorSolarVidro}) × (1 - ${reducaoSolarBrise}%)`,
                        },
                        {
                          label: "Renovação de ar",
                          value: cargaRenovacaoArW,
                          explicacao: "Calor trazido pelo ar externo que renova o ambiente.",
                          formula: `0,333 × ACH (${renovacoesArHora}) × Vol (${simulacao.volumeM3.toFixed(1)} m³) × ΔT (${Math.max(0, temperaturaModelo - setpointC).toFixed(1)} K)`,
                        },
                        {
                          label: "Cargas internas",
                          value: cargaInternaW,
                          explicacao: "Calor gerado dentro do cômodo por pessoas, luzes e aparelhos.",
                          formula: `${ocupantes} p × 75 W + ${areaPisoM2.toFixed(1)} m² × ${ganhosInternosWm2} W/m²`,
                        },
                      ].map((parcela) => {
                        const percentualTotal =
                          cargaSensibleTotalW > 0
                            ? Math.round((parcela.value / cargaSensibleTotalW) * 100)
                            : 0;
                        return (
                          <article
                            key={parcela.label}
                            className="rounded-xl border border-border bg-background/60 p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-foreground">
                                {modoSimulador === "simples"
                                  ? rotulosSimples[parcela.label]
                                  : parcela.label}
                              </p>
                              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                                {percentualTotal}%
                              </span>
                            </div>
                            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-primary">
                              {parcela.value.toFixed(0)} W
                            </p>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${Math.min(100, percentualTotal)}%` }}
                              />
                            </div>
                            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                              {parcela.explicacao}
                            </p>
                            {modoSimulador === "especialista" && (
                              <p className="mt-1 font-mono text-[9.5px] leading-relaxed text-muted-foreground/80">
                                {parcela.formula}
                              </p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700">
                      A área das janelas deve respeitar o limite de 80% da área da fachada.
                    </p>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TRILHA 02: FÍSICA DESCOMPLICADA — NAVEGAÇÃO PROGRESSIVA (1 POR VEZ)
      ══════════════════════════════════════════════════════════════════ */}
      {trilhaAtiva === "fisica" && (
        <div className="space-y-5">
          {!temaFisicaSelecionado ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-display text-xl sm:text-2xl font-extrabold text-foreground">
                  Física descomplicada
                </h2>
                <p className="mt-1 max-w-2xl text-xs sm:text-sm text-muted-foreground">
                  Escolha um assunto abaixo para abrir a animação interativa e ver o que fazer na
                  prática.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {TEMAS_FISICA.map((tema) => (
                  <button
                    key={tema.id}
                    type="button"
                    onClick={() => setFenomenoAtivo(tema.id)}
                    className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary">
                          {tema.numero}
                        </span>
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {tema.etiqueta}
                        </span>
                      </div>
                      <h3 className="mt-4 text-base font-bold text-foreground group-hover:text-primary">
                        {tema.titulo}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {tema.resumoCard}
                      </p>
                    </div>
                    <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      <span>Explorar tema</span>
                      <span
                        aria-hidden="true"
                        className="transition-transform group-hover:translate-x-0.5"
                      >
                        →
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-4">
              <div className="mx-auto flex w-full max-w-[920px] items-center justify-between gap-2 border-b border-border/70 pb-3">
                <button
                  type="button"
                  onClick={() => setFenomenoAtivo(null)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary cursor-pointer"
                >
                  <span aria-hidden="true">←</span>
                  <span>Outros temas de Física</span>
                </button>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {temaFisicaSelecionado.numero} de 03 · {temaFisicaSelecionado.etiqueta}
                </span>
              </div>

              <div className="mx-auto w-full max-w-[920px]">
                <h3 className="text-display text-lg sm:text-xl font-extrabold leading-snug text-foreground">
                  {temaFisicaSelecionado.headline}
                </h3>
                <p className="mt-1.5 max-w-3xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  {temaFisicaSelecionado.intro}
                </p>
              </div>

              {fenomenoAtivo === "mofo" && <CenaMofoAnimada />}
              {fenomenoAtivo === "parede" && <CenaParedeAnimada />}
              {fenomenoAtivo === "estufa" && <CenaVidroAnimada />}

              {proximoTemaFisica && (
                <div className="mx-auto flex w-full max-w-[920px] items-center justify-between gap-3 border-t border-border/70 pt-3">
                  <button
                    type="button"
                    onClick={() => setFenomenoAtivo(null)}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Ver todos os 3 temas
                  </button>
                  <button
                    type="button"
                    onClick={() => setFenomenoAtivo(proximoTemaFisica.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground cursor-pointer"
                  >
                    <span>Próximo: {proximoTemaFisica.titulo}</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function EducativoPage() {
  return (
    <InstitutionalLayout>
      <LaboratorioInterativo />
    </InstitutionalLayout>
  );
}

export const Route = createFileRoute("/educativo")({
  component: EducativoPage,
});