import {
  FONTES_VOC,
  type FonteVocKey,
  type OrientacaoKey,
  type PosicaoJanelaKey,
  type TipoComodoKey,
  type TipoVidroKey,
} from "@/data/wellness";
import { vocRelativoNoTempo } from "@/lib/wellness";
import { Suspense, lazy, useState } from "react";

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

export default function TrilhaWellness(props: TrilhaWellnessProps) {
  const [fenomenoWellness, setFenomenoWellness] = useState<"co2" | "voc" | "luz">("co2");
  const [fonteVoc, setFonteVoc] = useState<FonteVocKey>("tinta");
  const [intensidadeVoc, setIntensidadeVoc] = useState<1 | 2 | 3>(3);

  // Curvas para o mini-gráfico do Fenômeno 2 (VOCs partindo de 0, normalizadas pelo pico 100 em ACH 0,5)
  const horasVoc = 12;
  const passosVoc = 48;
  const niveisAchVoc = [
    { rotulo: "Ventilação baixa (0,5 ACH)", ach: 0.5, cor: "#EF4444" },
    { rotulo: "Ventilação média (2,0 ACH)", ach: 2.0, cor: "#FBBF24" },
    { rotulo: "Ventilação alta (5,0 ACH)", ach: 5.0, cor: "#00C67A" },
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

  const chartX = 46;
  const chartY = 24;
  const chartW = 385;
  const chartH = 150;
  const mapVocX = (t: number) => chartX + (t / horasVoc) * chartW;
  const mapVocY = (idx: number) =>
    chartY + chartH - (Math.max(0, idx) / maxIndiceVoc) * chartH;

  return (
    <div className="mt-10 rounded-3xl border border-border bg-card p-4 sm:p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-5 print:hidden">
        <div>
          <span className="text-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            Wellness, Saúde Ocupacional e Qualidade Ambiental
          </span>
          <h3 className="mt-1 text-display text-xl sm:text-2xl font-extrabold text-foreground">
            Como o ar que respiramos e a luz que recebemos afetam corpo, foco e descanso?
          </h3>
          <p className="mt-1.5 max-w-3xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
            No conceito de <strong>Wellness aplicado à arquitetura</strong>, o ambiente
            construído não é apenas um abrigo térmico: a renovação de ar, a química dos
            materiais e o espectro da iluminação interagem diariamente com a atenção
            cognitiva, o conforto respiratório e o <strong>ciclo circadiano</strong> dos
            ocupantes.
          </p>
        </div>

        {/* Seletor de 3 botões no mesmo formato da trilha "fisica" */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {[
            { id: "co2" as const, label: "1. CO₂, foco e sono" },
            { id: "voc" as const, label: "2. VOCs e saúde do ar" },
            { id: "luz" as const, label: "3. Luz e ciclo circadiano" },
          ].map((item) => {
            const ativo = fenomenoWellness === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFenomenoWellness(item.id)}
                aria-pressed={ativo}
                className={`min-h-8 rounded-lg border px-2 py-1 text-center text-mono text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.04em] transition-all cursor-pointer ${
                  ativo
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FENÔMENO 1: AR PARADO ACUMULA CO₂ (IMPACTO COGNITIVO E SONO)
      ══════════════════════════════════════════════════════════════ */}
      <div
        className={
          fenomenoWellness === "co2"
            ? "mt-6 grid grid-cols-1 gap-5 items-start print:break-inside-avoid"
            : "hidden print:grid print:grid-cols-1 print:gap-5 print:break-inside-avoid"
        }
      >
        <div className="mx-auto w-full max-w-5xl space-y-3.5">
          <p className="text-mono text-[10px] font-bold uppercase tracking-[0.14em] text-sky-600 print:block">
            Fenômeno 1 de 3 · Renovação de ar, cognição e qualidade do descanso
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <h4 className="min-w-0 flex-1 max-w-3xl text-display text-lg sm:text-xl font-extrabold text-foreground">
              Por que um ambiente sem renovação de ar pode dar sensação de cansaço, queda de foco e sono pesado?
            </h4>
            <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-mono text-[9px] font-bold uppercase tracking-wider text-sky-500">
              Balanço de Massa · Cognição & Vigília
            </div>
          </div>
          <p className="max-w-3xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
            Em ambientes ocupados, a respiração humana consome oxigênio e adiciona CO₂ e
            outros bioefluentes continuamente, enquanto a renovação de ar (ACH) dilui essa
            concentração com ar externo. Quando um dormitório ou escritório permanece muito
            fechado, o acúmulo de CO₂ funciona como um termômetro de que o ar parou de
            circular. Embora a resposta varie entre indivíduos, ambientes com baixa
            renovação de ar e CO₂ elevado <strong>podem</strong> favorecer a sensação de
            ar abafado, sonolência diurna, lentidão na tomada de decisão e percepção de
            descanso menos restaurador ao acordar.
          </p>

          {/* Cards de impacto no Wellness: O que piora vs O que ajuda */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-3">
              <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-red-500">
                O que piora (implicações da não renovação)
              </span>
              <p className="mt-1 text-xs text-foreground">
                Quartos ou salas de estudo totalmente vedados por muitas horas acumulam CO₂
                e bioefluentes, o que pode contribuir para dor de cabeça leve, fadiga mental,
                queda de concentração e sensação de peso ao despertar.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
              <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-primary">
                O que ajuda a proteger o bem-estar
              </span>
              <p className="mt-1 text-xs text-foreground">
                Manter frestas operáveis, ventilação cruzada ou renovação mecânica filtrada
                dilui o CO₂ continuamente. O desafio de projeto é equilibrar ar fresco com o
                consumo de climatização. Esquema conceitual; não substitui medição ou projeto.
              </p>
            </div>
          </div>

          {/* Síntese Wellness para o ocupante */}
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              [
                "Atenção e trabalho cognitivo",
                "Em escritórios e estúdios, a falta de renovação de ar ao longo de horas pode acentuar a sensação de fadiga mental e reduzir a disposição para tarefas complexas.",
              ],
              [
                "Qualidade do sono no dormitório",
                "Duas pessoas dormindo por 8 h com porta e janela fechadas podem elevar o CO₂ para mais de 2.000 ppm no modelo didático, associando-se à sensação de quarto abafado pela manhã.",
              ],
              [
                "CO₂ como marcador indireto",
                "O CO₂ em si é um indicador da taxa de troca de ar por pessoa: quando ele sobe, odores, umidade respiratória e outros poluentes internos também tendem a se acumular.",
              ],
            ].map(([titulo, texto]) => (
              <div
                key={titulo}
                className="rounded-xl border border-border bg-background/50 p-3"
              >
                <p className="text-xs font-bold text-foreground">{titulo}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {texto}
                </p>
              </div>
            ))}
          </div>

          <Suspense
            fallback={
              <div className="rounded-2xl border border-border bg-background/50 p-4 text-xs text-muted-foreground">
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
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FENÔMENO 2: VOCs, DE ONDE VÊM E COMO DILUEM (SAÚDE RESPIRATÓRIA)
      ══════════════════════════════════════════════════════════════ */}
      <div
        className={
          fenomenoWellness === "voc"
            ? "mt-6 grid grid-cols-1 gap-5 items-start print:break-inside-avoid"
            : "hidden print:grid print:grid-cols-1 print:gap-5 print:break-inside-avoid"
        }
      >
        <div className="mx-auto w-full max-w-5xl space-y-3.5">
          <p className="text-mono text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600 print:block">
            Fenômeno 2 de 3 · Química dos materiais, VOCs e conforto respiratório
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <h4 className="min-w-0 flex-1 max-w-3xl text-display text-lg sm:text-xl font-extrabold text-foreground">
              Como tintas, móveis novos e produtos químicos afetam o ar interno e o conforto das vias aéreas?
            </h4>
            <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-mono text-[9px] font-bold uppercase tracking-wider text-amber-500">
              Índice Relativo (Pico Ref. = 100) · Saúde do Ar
            </div>
          </div>
          <p className="max-w-3xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
            Aquele "cheiro de reforma" ou de móvel recém-instalado frequentemente indica a
            liberação de compostos orgânicos voláteis (VOCs) por solventes, resinas,
            adesivos e agentes de limpeza. Do ponto de vista de <strong>wellness</strong>, a
            exposição a esses compostos em locais pouco ventilados <strong>pode</strong>{" "}
            causar irritação nos olhos, nariz e garganta, desconforto olfativo, náusea leve
            ou dor de cabeça em pessoas mais sensíveis. A ventilação dilui o que já foi
            liberado no ar, mas não interrompe a emissão do material — por isso, a escolha
            de insumos de baixa emissão é a primeira barreira de proteção à saúde.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-3">
              <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-red-500">
                O que piora a exposição ocupacional
              </span>
              <p className="mt-1 text-xs text-foreground">
                Ocupar imediatamente ambientes recém-pintados ou com marcenaria nova mantendo
                janelas fechadas faz a concentração subir a picos elevados e prolonga o
                contato respiratório com os compostos.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
              <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-primary">
                O que ajuda (controle na fonte + diluição)
              </span>
              <p className="mt-1 text-xs text-foreground">
                Especificar tintas à base d’água e painéis com baixa emissão de formaldeído/VOCs,
                além de manter ventilação intensa de cura ("flush-out") antes do uso contínuo.
                Esquema conceitual; não substitui medição ou projeto.
              </p>
            </div>
          </div>

          {/* Controles qualitativos de Fonte e Intensidade de VOCs */}
          <div className="grid gap-3 rounded-2xl border border-border bg-background/60 p-4 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-foreground">
                Fonte emissora predominante (perfil conceitual)
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {(Object.keys(FONTES_VOC) as FonteVocKey[]).map((key) => {
                  const item = FONTES_VOC[key];
                  const ativo = fonteVoc === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFonteVoc(key)}
                      aria-pressed={ativo}
                      className={`rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                        ativo
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <span className="block text-xs font-bold text-foreground">
                        {item.nome}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {item.descricao} ({item.kDecaimentoHora.status})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col justify-between space-y-3">
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-foreground">
                  Intensidade relativa da fonte (qualitativa: 1 a 3)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {([1, 2, 3] as const).map((nivel) => (
                    <button
                      key={nivel}
                      type="button"
                      onClick={() => setIntensidadeVoc(nivel)}
                      aria-pressed={intensidadeVoc === nivel}
                      className={`rounded-lg border py-2 text-xs font-bold transition-colors cursor-pointer ${
                        intensidadeVoc === nivel
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      Nível {nivel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-3 text-[11px] leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Leitura do esquema:</strong> todas as
                curvas partem de 0 em t = 0 h. O índice 100 representa o pico atingido pela
                fonte de referência em ventilação baixa (0,5 ACH, nível 3). Não representa
                limite normativo nem concentração em µg/m³.
              </div>
            </div>
          </div>
        </div>

        {/* Diagrama SVG: Índice Relativo de VOCs × Tempo para 3 níveis de ventilação */}
        <div className="w-full max-w-[640px] justify-self-center overflow-hidden rounded-2xl border border-border bg-[#09100D] p-3">
          <svg
            viewBox="0 0 460 215"
            className="w-full h-auto"
            role="img"
            aria-label="Esquema conceitual de diluição relativa de VOCs para três níveis de ventilação"
          >
            <text
              x={chartX}
              y="15"
              fontSize="8.5"
              fill="#FBBF24"
              fontFamily="monospace"
              fontWeight="bold"
            >
              ÍNDICE RELATIVO (PICO REF. = 100) × TEMPO · {FONTES_VOC[fonteVoc].nome.toUpperCase()}
            </text>

            <line
              x1={chartX}
              y1={chartY}
              x2={chartX}
              y2={chartY + chartH}
              stroke="#475569"
              strokeWidth="1.2"
            />
            <line
              x1={chartX}
              y1={chartY + chartH}
              x2={chartX + chartW}
              y2={chartY + chartH}
              stroke="#475569"
              strokeWidth="1.2"
            />

            {[0, 25, 50, 75, 100].map((idx) => (
              <g key={idx}>
                <line
                  x1={chartX}
                  y1={mapVocY(idx)}
                  x2={chartX + chartW}
                  y2={mapVocY(idx)}
                  stroke="#1E293B"
                  strokeDasharray="3 3"
                />
                <text
                  x={chartX - 6}
                  y={mapVocY(idx) + 3}
                  textAnchor="end"
                  fontSize="8"
                  fill="#94A3B8"
                  fontFamily="monospace"
                >
                  {idx}
                </text>
              </g>
            ))}

            {[0, 3, 6, 9, 12].map((h) => (
              <text
                key={h}
                x={mapVocX(h)}
                y={chartY + chartH + 14}
                textAnchor="middle"
                fontSize="8"
                fill="#94A3B8"
                fontFamily="monospace"
              >
                {h}h
              </text>
            ))}

            {seriesCalculadasVoc.map((serieInfo) => {
              const pts = serieInfo.pontos
                .map((p) => `${mapVocX(p.t).toFixed(1)},${mapVocY(p.val).toFixed(1)}`)
                .join(" ");

              return (
                <polyline
                  key={serieInfo.rotulo}
                  fill="none"
                  stroke={serieInfo.cor}
                  strokeWidth="2.3"
                  points={pts}
                />
              );
            })}

            {niveisAchVoc.map((s, idx) => (
              <g
                key={s.rotulo}
                transform={`translate(${chartX + 8 + idx * 128}, ${chartY + chartH + 28})`}
              >
                <line x1="0" y1="-3" x2="12" y2="-3" stroke={s.cor} strokeWidth="2.4" />
                <text x="16" y="0" fontSize="7.5" fill="#CBD5E1" fontFamily="monospace">
                  {s.rotulo}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Rodapé com link para Certificações / Selo WELL */}
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Certificações focadas na saúde e bem-estar do ocupante, como o selo{" "}
            <strong className="text-foreground">WELL Building Standard</strong> (conceitos
            Air e Materials), estabelecem critérios para controle de fontes de VOCs e taxas
            de ventilação. Esquema conceitual; não substitui medição ou projeto.
          </p>
          <a
            href={`/certificacoes#${seloAnchorId("well")}`}
            onClick={(e) => {
              e.preventDefault();
              irParaSelo("well");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
          >
            Ver selo WELL em Certificações <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FENÔMENO 3: LUZ NATURAL, CICLO CIRCADIANO, OFUSCAMENTO E CALOR
      ══════════════════════════════════════════════════════════════ */}
      <div
        className={
          fenomenoWellness === "luz"
            ? "mt-6 grid grid-cols-1 gap-5 items-start print:break-inside-avoid"
            : "hidden print:grid print:grid-cols-1 print:gap-5 print:break-inside-avoid"
        }
      >
        <div className="mx-auto w-full max-w-5xl space-y-3.5">
          <p className="text-mono text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 print:block">
            Fenômeno 3 de 3 · Iluminação, ciclo circadiano, conforto visual e calor
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <h4 className="min-w-0 flex-1 max-w-3xl text-display text-lg sm:text-xl font-extrabold text-foreground">
              Por que a má iluminação e a falta de luz natural afetam o ciclo circadiano, a fadiga visual e o conforto térmico?
            </h4>
            <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-mono text-[9px] font-bold uppercase tracking-wider text-primary">
              Ciclo Circadiano · FLD (BRE) · Ofuscamento
            </div>
          </div>
          <p className="max-w-3xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
            A luz não serve apenas para enxergar tarefas: células fotorreceptoras na retina
            respondem à intensidade e ao espectro da luz para sincronizar o{" "}
            <strong>ciclo circadiano</strong> — o relógio biológico que regula o ritmo entre
            estado de alerta diurno, humor e produção noturna de melatonina. Ambientes com
            pouca luz natural durante o dia <strong>podem</strong> reduzir o estímulo de
            vigília pela manhã, enquanto a má iluminação (seja por penumbra no fundo do
            cômodo, seja por ofuscamento direto na janela ou excesso de luz fria e intensa à
            noite) pode gerar fadiga ocular, dor de cabeça e dificultar o desacelerar
            noturno. Ao mesmo tempo, acender lâmpadas para compensar um ambiente escuro
            adiciona carga térmica ao espaço.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-3">
              <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-red-500">
                O que piora (má iluminação e desalinhamento circadiano)
              </span>
              <p className="mt-1 text-xs text-foreground">
                Passar o dia sem acesso à luz natural (ou atrás de vidros muito escuros),
                trabalhar sob forte contraste/ofuscamento nas telas e manter luz branca fria
                e intensa à noite pode causar cansaço visual e atrasar a sinalização
                biológica de descanso.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
              <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-primary">
                O que ajuda (ritmo de luz, proteção solar e eficiência)
              </span>
              <p className="mt-1 text-xs text-foreground">
                Favorecer luz natural bem distribuída durante o dia (com brises e cores
                internas claras para evitar ofuscamento) e transitar para iluminação
                artificial mais suave, quente e indireta à noite. Esquema conceitual; não
                substitui medição ou projeto.
              </p>
            </div>
          </div>

          {/* Cards de conexão entre Ciclo Circadiano, Fadiga Visual e Termodinâmica */}
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              [
                "Manhã e dia · Estímulo circadiano",
                "A luz natural diurna oferece intensidade e espectro que ajudam a sinalizar vigília e foco ao organismo. A profundidade que essa luz alcança depende da altura da janela e das refletâncias internas.",
              ],
              [
                "Noite · Desaceleração e luz quente",
                "No período noturno, luzes artificiais muito intensas ou de espectro frio podem inibir a preparação para o sono; iluminação indireta e de tonalidade mais quente tende a apoiar o relaxamento.",
              ],
              [
                "Conforto visual vs. calor interno",
                "Mais vidro nem sempre significa melhor luz: sem proteção solar, o sol direto causa ofuscamento; e se o vidro for escuro demais, obriga o uso de luz artificial, que vira calor no cômodo.",
              ],
            ].map(([titulo, texto]) => (
              <div
                key={titulo}
                className="rounded-xl border border-border bg-background/50 p-3"
              >
                <p className="text-xs font-bold text-foreground">{titulo}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {texto}
                </p>
              </div>
            ))}
          </div>

          <Suspense
            fallback={
              <div className="rounded-2xl border border-border bg-background/50 p-4 text-xs text-muted-foreground">
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
      </div>
    </div>
  );
}