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
  const [intensidadeVoc, setIntensidadeVoc] = useState<1 | 2 | 3>(2);

  // Curvas para o mini-gráfico do Fenômeno 2 (VOCs para 3 níveis de ventilação)
  const horasVoc = 12;
  const passosVoc = 36;
  const niveisAchVoc = [
    { rotulo: "Ventilação baixa (0,5 ACH)", ach: 0.5, cor: "#EF4444" },
    { rotulo: "Ventilação média (2,0 ACH)", ach: 2.0, cor: "#FBBF24" },
    { rotulo: "Ventilação alta (5,0 ACH)", ach: 5.0, cor: "#00C67A" },
  ];

  const chartX = 46;
  const chartY = 24;
  const chartW = 385;
  const chartH = 150;
  const mapVocX = (t: number) => chartX + (t / horasVoc) * chartW;
  const mapVocY = (idx: number) =>
    chartY + chartH - (Math.max(0, Math.min(100, idx)) / 100) * chartH;

  return (
    <div className="mt-10 rounded-3xl border border-border bg-card p-4 sm:p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-5 print:hidden">
        <div>
          <span className="text-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            Wellness e Qualidade Ambiental Interna
          </span>
          <h3 className="mt-1 text-display text-xl sm:text-2xl font-extrabold text-foreground">
            Como renovação de ar, materiais e luz moldam o conforto do ambiente?
          </h3>
        </div>

        {/* Seletor de 3 botões no mesmo formato da trilha "fisica" */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {[
            { id: "co2" as const, label: "1. Ar parado e CO₂" },
            { id: "voc" as const, label: "2. VOCs e diluição" },
            { id: "luz" as const, label: "3. Luz, ofuscamento e calor" },
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
          FENÔMENO 1: AR PARADO ACUMULA CO₂
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
            Fenômeno 1 de 3 · Renovação de ar e balanço de CO₂
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <h4 className="min-w-0 flex-1 max-w-3xl text-display text-lg sm:text-xl font-extrabold text-foreground">
              Por que um quarto fechado acumula CO₂ ao longo da noite — e qual o custo energético de ventilar?
            </h4>
            <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-mono text-[9px] font-bold uppercase tracking-wider text-sky-500">
              Balanço de Massa · Mistura Perfeita
            </div>
          </div>
          <p className="max-w-3xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
            Em ambientes ocupados, a respiração adiciona CO₂ continuamente enquanto a
            renovação de ar (ACH) dilui essa concentração com ar externo. Quando o ambiente
            permanece muito fechado, a concentração tende a subir até atingir um patamar de
            equilíbrio que depende do volume do cômodo, do número de pessoas e da taxa de
            troca de ar. Aumentar a ventilação reduz o CO₂ acumulado, mas também pode elevar
            a carga térmica caso o ar externo esteja quente.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-3">
              <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-red-500">
                O que piora o acúmulo
              </span>
              <p className="mt-1 text-xs text-foreground">
                Baixa taxa de renovação de ar (frestas mínimas), volume reduzido e ocupação
                prolongada podem elevar rapidamente o CO₂. Esquema conceitual; não substitui
                medição ou projeto.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
              <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-primary">
                O que ajuda a diluir
              </span>
              <p className="mt-1 text-xs text-foreground">
                Aberturas graduais, ventilação cruzada ou renovação mecânica controlada
                renovam o ar interno; o dimensionamento real depende da rotina e do clima.
              </p>
            </div>
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
          FENÔMENO 2: VOCs, DE ONDE VÊM E COMO DILUEM
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
            Fenômeno 2 de 3 · Fontes de VOCs e diluição relativa
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <h4 className="min-w-0 flex-1 max-w-3xl text-display text-lg sm:text-xl font-extrabold text-foreground">
              De onde vêm os compostos orgânicos voláteis (VOCs) e por que ventilar não substitui escolher bons materiais?
            </h4>
            <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-mono text-[9px] font-bold uppercase tracking-wider text-amber-500">
              Índice Relativo (0–100) · Decaimento 1ª Ordem
            </div>
          </div>
          <p className="max-w-3xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
            Tintas, vernizes, adesivos de mobiliário e produtos de limpeza podem liberar
            compostos orgânicos voláteis (VOCs) em taxas que variam bastante conforme a
            formulação do produto e a idade do material. A ventilação dilui a concentração
            presente no ar, mas não elimina a fonte emissora — por isso, especificar
            materiais de baixa emissão na origem é fundamental. O gráfico abaixo utiliza um{" "}
            <strong>índice relativo adimensional (base 100)</strong> apenas para comparar o
            efeito da ventilação sobre diferentes perfis de emissão, sem estimar valores em
            µg/m³.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-3">
              <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-red-500">
                O que piora a exposição
              </span>
              <p className="mt-1 text-xs text-foreground">
                Aplicar acabamentos ou instalar painéis com alta emissão em ambientes sem
                circulação de ar pode prolongar a permanência dos compostos no recinto.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
              <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-primary">
                O que ajuda no controle
              </span>
              <p className="mt-1 text-xs text-foreground">
                Priorizar materiais com baixa emissão comprovada e intensificar a ventilação
                durante e após reformas ou limpezas. Esquema conceitual; não substitui
                medição ou projeto.
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
                <strong className="text-foreground">Leitura do esquema:</strong> o índice
                100 representa a concentração relativa inicial no cenário de referência com
                ventilação baixa (0,5 ACH) e intensidade 3. Não representa limite normativo
                nem concentração em µg/m³.
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
              ÍNDICE RELATIVO (0–100) × TEMPO · {FONTES_VOC[fonteVoc].nome.toUpperCase()}
            </text>

            {/* Eixos */}
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

            {niveisAchVoc.map((serieInfo) => {
              const pts = Array.from({ length: passosVoc + 1 }, (_, i) => {
                const t = (horasVoc * i) / passosVoc;
                const val = vocRelativoNoTempo(t, {
                  fonte: fonteVoc,
                  intensidade: intensidadeVoc,
                  ach: serieInfo.ach,
                });
                return `${mapVocX(t).toFixed(1)},${mapVocY(val).toFixed(1)}`;
              }).join(" ");

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

            {/* Legenda das 3 curvas */}
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
            Certificações focadas na saúde do ocupante, como o selo{" "}
            <strong className="text-foreground">WELL Building Standard</strong>, abordam
            controle de fontes de VOCs e taxas de renovação de ar. Esquema conceitual; não
            substitui medição ou projeto.
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
          FENÔMENO 3: LUZ NATURAL, ENCANDECIMENTO E CALOR
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
            Fenômeno 3 de 3 · Luz natural, ofuscamento e carga térmica da iluminação
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <h4 className="min-w-0 flex-1 max-w-3xl text-display text-lg sm:text-xl font-extrabold text-foreground">
              Como aproveitar a luz natural até o fundo do cômodo sem aumentar o ofuscamento nem o calor interno?
            </h4>
            <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-mono text-[9px] font-bold uppercase tracking-wider text-primary">
              FLD (BRE) · Método dos Lúmens · Tv/FS
            </div>
          </div>
          <p className="max-w-3xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
            A disponibilidade de luz natural depende da área de vidro, da transmitância
            visível (Tv), do ângulo de céu visível (θ) e da refletância das superfícies
            internas (R). Enquanto a altura da verga da janela ajuda a determinar até que
            profundidade a luz útil alcança, janelas muito amplas ou mal sombreadas em
            orientações Leste/Oeste podem causar ofuscamento. Quando a luz natural não é
            suficiente, a iluminação artificial complementa a tarefa — mas toda potência
            elétrica das lâmpadas também se converte em ganho térmico dentro do cômodo.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-3">
              <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-red-500">
                O que piora o conforto visual e térmico
              </span>
              <p className="mt-1 text-xs text-foreground">
                Vidros escuros com baixa seletividade podem escurecer o cômodo e exigir
                lâmpadas acesas durante o dia, enquanto fachadas sem brise podem gerar
                contraste excessivo e ofuscamento.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
              <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-primary">
                O que ajuda no equilíbrio
              </span>
              <p className="mt-1 text-xs text-foreground">
                Combinar proteção solar externa, cores internas claras, altura de verga
                adequada e iluminação artificial eficiente (LED). Esquema conceitual; não
                substitui medição ou projeto.
              </p>
            </div>
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