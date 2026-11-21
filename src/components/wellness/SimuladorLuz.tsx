import {
  CONSTANTES_LUZ,
  TIPOS_COMODO,
  VIDROS,
  type OrientacaoKey,
  type PosicaoJanelaKey,
  type TipoComodoKey,
  type TipoVidroKey,
} from "@/data/wellness";
import {
  alcanceLuzUtilM,
  avaliarOfuscamentoQualitativo,
  fatorLuzDiaMedio,
  fluxoNecessario,
  iluminanciaMedia,
  perfilIlustrativoProfundidade,
} from "@/lib/wellness";
import { useId, useState } from "react";

export interface SimuladorLuzProps {
  tipoComodo: TipoComodoKey;
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
  ganhosInternosWm2: number;
  onAplicarGanhoInternoNoTermico: (novoWm2: number) => void;
}

export default function SimuladorLuz({
  tipoComodo,
  comprimentoM,
  larguraM,
  peDireitoM,
  profundidadeComodoM,
  areaVidroM2,
  percentualVidro,
  tipoVidro,
  onChangeTipoVidro,
  orientacao,
  reducaoSolarBrise,
  posicaoJanelas,
  ganhosInternosWm2,
  onAplicarGanhoInternoNoTermico,
}: SimuladorLuzProps) {
  const uid = useId().replace(/:/g, "");
  const [anguloCeuGraus, setAnguloCeuGraus] = useState<number>(
    CONSTANTES_LUZ.anguloCeuPadraoGraus.valor,
  );
  const [refletanciaMedia, setRefletanciaMedia] = useState<number>(
    CONSTANTES_LUZ.refletanciaMediaInterna.valor,
  );
  const [eExtLux, setEExtLux] = useState<number>(
    CONSTANTES_LUZ.iluminanciaExternaCeuEncobertoLux.valor,
  );
  const [eAlvoArtificialLux, setEAlvoArtificialLux] = useState<number>(
    CONSTANTES_LUZ.faixasDidaticasTarefaLux.valor.geral,
  );
  const [eficaciaLedLmW, setEficaciaLedLmW] = useState<number>(
    CONSTANTES_LUZ.eficaciaLedPadraoLmW.valor,
  );
  const [feedbackAplicado, setFeedbackAplicado] = useState<string | null>(null);

  const vidroAtual = VIDROS[tipoVidro];
  const seletividadeTvFs = vidroAtual.tv / vidroAtual.fs;
  const areaPisoM2 = comprimentoM * larguraM;

  // Parte A: Luz Natural (BRE)
  const fldPercent = fatorLuzDiaMedio({
    comprimentoM,
    larguraM,
    peDireitoM,
    areaVidroM2,
    tvVidro: vidroAtual.tv,
    anguloCeuGraus,
    refletanciaMedia,
  });
  const eMediaInternaLux = iluminanciaMedia(fldPercent, eExtLux);
  const perfil = perfilIlustrativoProfundidade(
    profundidadeComodoM,
    eMediaInternaLux,
    24,
  );
  const alcanceUtil = alcanceLuzUtilM(peDireitoM, posicaoJanelas, 0.75);

  // Parte B: Luz Artificial (Método dos Lúmens)
  const artificial = fluxoNecessario({
    iluminanciaAlvoLux: eAlvoArtificialLux,
    areaPisoM2,
    eficaciaLmW: eficaciaLedLmW,
  });
  const lampadasLed9w = Math.max(1, Math.round(artificial.potenciaTotalW / 9));

  const parcelaEquipamentosRefWm2 =
    CONSTANTES_LUZ.parcelaEquipamentosPadraoPorComodoWm2.valor[tipoComodo];
  const ganhoPadraoTotalComodoWm2 = TIPOS_COMODO[tipoComodo].ganhosInternosPadraoWm2;
  const parcelaLuzPadraoEstimadaWm2 = Math.max(
    0,
    ganhoPadraoTotalComodoWm2 - parcelaEquipamentosRefWm2,
  );
  const novoTotalSubstituindoParcelaLuzWm2 = Number(
    (parcelaEquipamentosRefWm2 + artificial.densidadePotenciaWm2).toFixed(1),
  );
  const apenasLuzWm2 = Number(artificial.densidadePotenciaWm2.toFixed(1));

  // Parte C: Ofuscamento qualitativo
  const ofuscamento = avaliarOfuscamentoQualitativo({
    orientacao,
    percentualVidro,
    reducaoSolarBrise,
    posicaoJanelas,
    tvVidro: vidroAtual.tv,
  });

  // Geometria do corte claro SVG (viewBox 680x255) — zero texto vazando
  const roomX = 82;
  const roomY = 44;
  const roomW = 574;
  const roomH = 158;
  const planoTrabalhoY = roomY + roomH - (0.75 / Math.max(2.2, peDireitoM)) * roomH;
  const fracaoAlcance = Math.min(1, alcanceUtil.alcanceMaxM / Math.max(1, profundidadeComodoM));
  const alcanceUtilPx = roomX + fracaoAlcance * roomW;

  const janelaY1 =
    posicaoJanelas === "altas"
      ? roomY + 12
      : posicaoJanelas === "baixas"
        ? roomY + 46
        : roomY + 28;
  const janelaY2 =
    posicaoJanelas === "altas"
      ? roomY + 68
      : posicaoJanelas === "baixas"
        ? roomY + roomH - 12
        : roomY + roomH - 36;

  const maxLuxCurva = Math.max(300, ...perfil.map((p) => p.lux));
  const curvaPoints = perfil
    .map((p) => {
      const x = roomX + (p.distanciaM / Math.max(1, profundidadeComodoM)) * roomW;
      const y =
        roomY +
        roomH -
        10 -
        Math.min(1, p.lux / maxLuxCurva) * (roomH - 34);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // Posição inteligente da etiqueta de alcance para nunca cortar na direita
  const textoAlcanceAEsquerda = alcanceUtilPx > roomX + roomW - 210;

  function aplicarNoTermico(valorWm2: number, descricao: string) {
    onAplicarGanhoInternoNoTermico(valorWm2);
    setFeedbackAplicado(descricao);
    window.setTimeout(() => setFeedbackAplicado(null), 3000);
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-5 shadow-xs">
      {/* 1. Escolha do vidro explicada em português claro */}
      <div>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
          <div>
            <p className="text-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              1. Luz natural pela janela · {TIPOS_COMODO[tipoComodo].nome}
            </p>
            <p className="text-xs text-muted-foreground">
              Janela de {areaVidroM2.toFixed(1).replace(".", ",")} m² ({Math.round(percentualVidro)}% da fachada) · Profundidade do cômodo:{" "}
              {profundidadeComodoM.toFixed(1).replace(".", ",")} m
            </p>
          </div>
          <span className="rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
            Sincronizado com o Simulador Térmico
          </span>
        </div>

        <span className="mb-1.5 block text-xs font-medium text-foreground">
          Escolha o tipo de vidro (repare na troca entre claridade e calor solar):
        </span>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(VIDROS) as TipoVidroKey[]).map((key) => {
            const v = VIDROS[key];
            const ativo = tipoVidro === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChangeTipoVidro(key)}
                aria-pressed={ativo}
                className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                  ativo
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                <span className="block text-xs font-bold text-foreground">{v.nome}</span>
                <span className="mt-1 block text-[11px] text-foreground/90">
                  Entra <strong>{Math.round(v.tv * 100)}%</strong> da luz ·{" "}
                  <strong>{Math.round(v.fs * 100)}%</strong> do calor
                </span>
                <span className="mt-0.5 block font-mono text-[9.5px] text-muted-foreground">
                  Tv = {v.tv.toFixed(2).replace(".", ",")} · FS = {v.fs.toFixed(2).replace(".", ",")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controles com atalhos do dia a dia */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5 rounded-xl border border-border bg-background/60 p-3">
          <label className="block space-y-1">
            <span className="flex items-center justify-between text-xs font-medium text-foreground">
              <span>Quanto de céu se vê?</span>
              <span className="font-mono text-[10px] text-muted-foreground">{anguloCeuGraus}°</span>
            </span>
            <input
              type="range"
              min={15}
              max={90}
              step={5}
              value={anguloCeuGraus}
              onChange={(e) => setAnguloCeuGraus(Number(e.currentTarget.value))}
              className="w-full accent-primary"
            />
          </label>
          <div className="flex flex-wrap gap-1">
            {[
              { l: "Prédio colado", v: 30 },
              { l: "Rua normal", v: 60 },
              { l: "Vista livre", v: 85 },
            ].map((opt) => (
              <button
                key={opt.l}
                type="button"
                onClick={() => setAnguloCeuGraus(opt.v)}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                  Math.abs(anguloCeuGraus - opt.v) <= 5
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 rounded-xl border border-border bg-background/60 p-3">
          <label className="block space-y-1">
            <span className="flex items-center justify-between text-xs font-medium text-foreground">
              <span>Cor das paredes internas</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                R = {refletanciaMedia.toFixed(2).replace(".", ",")}
              </span>
            </span>
            <input
              type="range"
              min={0.2}
              max={0.8}
              step={0.05}
              value={refletanciaMedia}
              onChange={(e) => setRefletanciaMedia(Number(e.currentTarget.value))}
              className="w-full accent-primary"
            />
          </label>
          <div className="flex flex-wrap gap-1">
            {[
              { l: "Escuras", v: 0.3 },
              { l: "Médias", v: 0.5 },
              { l: "Brancas", v: 0.75 },
            ].map((opt) => (
              <button
                key={opt.l}
                type="button"
                onClick={() => setRefletanciaMedia(opt.v)}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                  Math.abs(refletanciaMedia - opt.v) <= 0.05
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 rounded-xl border border-border bg-background/60 p-3">
          <label className="block space-y-1">
            <span className="flex items-center justify-between text-xs font-medium text-foreground">
              <span>Luz do céu lá fora</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {eExtLux.toLocaleString("pt-BR")} lux
              </span>
            </span>
            <input
              type="range"
              min={3000}
              max={30000}
              step={1000}
              value={eExtLux}
              onChange={(e) => setEExtLux(Number(e.currentTarget.value))}
              className="w-full accent-primary"
            />
          </label>
          <div className="flex flex-wrap gap-1">
            {[
              { l: "Chuvoso", v: 5000 },
              { l: "Nublado", v: 10000 },
              { l: "Céu claro", v: 25000 },
            ].map((opt) => (
              <button
                key={opt.l}
                type="button"
                onClick={() => setEExtLux(opt.v)}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                  Math.abs(eExtLux - opt.v) <= 1000
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards de resultado em linguagem simples */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <span className="block text-[10.5px] text-muted-foreground">Claridade média interna</span>
          <span className="mt-0.5 block font-mono text-base font-bold text-primary">
            {Math.round(eMediaInternaLux)} lux
          </span>
          <span className="mt-0.5 block text-[10px] text-muted-foreground">
            {eMediaInternaLux >= 300
              ? "Ótima p/ trabalhar sem lâmpada"
              : eMediaInternaLux >= 120
                ? "Boa claridade geral de dia"
                : "Fundo pede apoio de luminária"}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-background/60 p-3">
          <span className="block text-[10.5px] text-muted-foreground">
            Até onde a luz natural chega bem
          </span>
          <span className="mt-0.5 block font-mono text-base font-bold text-foreground">
            {alcanceUtil.alcanceMinM.toFixed(1).replace(".", ",")} a{" "}
            {alcanceUtil.alcanceMaxM.toFixed(1).replace(".", ",")} m
          </span>
          <span className="mt-0.5 block text-[10px] text-muted-foreground">
            {alcanceUtil.alcanceMaxM >= profundidadeComodoM
              ? "Cobre o cômodo inteiro!"
              : `Depois de ${alcanceUtil.alcanceMaxM.toFixed(1).replace(".", ",")} m fica mais sombreado.`}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-background/60 p-3">
          <span className="block text-[10.5px] text-muted-foreground">
            Risco de ofuscamento na tela
          </span>
          <span
            className={`mt-0.5 block font-mono text-base font-bold ${
              ofuscamento.nivel === "Alto"
                ? "text-red-600"
                : ofuscamento.nivel === "Médio"
                  ? "text-amber-600"
                  : "text-emerald-700"
            }`}
          >
            {ofuscamento.nivel}
          </span>
          <span className="mt-0.5 block text-[10px] text-muted-foreground">
            Fachada {orientacao} · {Math.round(percentualVidro)}% vidro · Brise -{reducaoSolarBrise}%
          </span>
        </div>

        <div className="rounded-xl border border-border bg-background/60 p-3">
          <span className="block text-[10.5px] text-muted-foreground">
            Fator de Luz do Dia (FLD)
          </span>
          <span className="mt-0.5 block font-mono text-base font-bold text-foreground">
            {fldPercent.toFixed(2).replace(".", ",")}%
          </span>
          <span className="mt-0.5 block text-[10px] text-muted-foreground">
            % da luz da rua que alcança o piso
          </span>
        </div>
      </div>

      {/* Corte Arquitetônico Claro SVG — Com mesa de trabalho e textos protegidos contra corte */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2.5 sm:p-4 shadow-inner print:print-color-adjust-exact">
        <svg
          viewBox="0 0 680 250"
          className="w-full h-auto"
          role="img"
          aria-label="Corte arquitetônico do cômodo mostrando até onde a luz natural alcança na altura da mesa de trabalho"
        >
          <defs>
            <linearGradient id={`${uid}-daylightFade`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fde047" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#fde047" stopOpacity="0.06" />
            </linearGradient>
            <linearGradient id={`${uid}-skyOut`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
          </defs>

          {/* Cabeçalho fora da área do desenho */}
          <text x="16" y="22" fontSize="11" fill="#0f172a" fontWeight="bold">
            Corte lateral do cômodo · Como a luz natural cai da janela até o fundo
          </text>
          <text x="662" y="22" textAnchor="end" fontSize="10" fill="#047857" fontFamily="monospace" fontWeight="bold">
            Média: {Math.round(eMediaInternaLux)} lux
          </text>

          {/* Lado externo (céu) */}
          <rect
            x="16"
            y={roomY}
            width="64"
            height={roomH}
            rx="8"
            fill={`url(#${uid}-skyOut)`}
            stroke="#bae6fd"
          />
          <circle cx="48" cy={roomY + 38} r="14" fill="#f59e0b" />
          <text
            x="48"
            y={roomY + 72}
            textAnchor="middle"
            fill="#0369a1"
            fontSize="8.8"
            fontFamily="monospace"
            fontWeight="bold"
          >
            JANELA
          </text>
          <text
            x="48"
            y={roomY + 84}
            textAnchor="middle"
            fill="#0369a1"
            fontSize="8.5"
            fontFamily="monospace"
          >
            ({orientacao})
          </text>

          {/* Caixa do cômodo */}
          <rect
            x={roomX}
            y={roomY}
            width={roomW}
            height={roomH}
            fill="#ffffff"
            stroke="#475569"
            strokeWidth="2"
          />
          {/* Teto e piso */}
          <rect x={roomX - 4} y={roomY - 6} width={roomW + 8} height="6" fill="#64748b" />
          <rect x={roomX - 4} y={roomY + roomH} width={roomW + 8} height="8" fill="#d6b48e" />

          {/* Faixa de luz útil */}
          <rect
            x={roomX + 1}
            y={roomY + 1}
            width={Math.max(0, alcanceUtilPx - roomX - 1)}
            height={roomH - 2}
            fill={`url(#${uid}-daylightFade)`}
          />

          {/* Vidro da janela na parede esquerda */}
          <line
            x1={roomX}
            y1={janelaY1}
            x2={roomX}
            y2={janelaY2}
            stroke="#0284c7"
            strokeWidth="6"
          />

          {/* Mesa ilustrativa posicionada exatamente na altura do plano de trabalho (0,75 m) */}
          <g>
            <rect
              x={roomX + 86}
              y={planoTrabalhoY}
              width="74"
              height="6"
              rx="2"
              fill="#b08968"
              stroke="#6f4e37"
              strokeWidth="1"
            />
            <line
              x1={roomX + 94}
              y1={planoTrabalhoY + 6}
              x2={roomX + 94}
              y2={roomY + roomH}
              stroke="#6f4e37"
              strokeWidth="3"
            />
            <line
              x1={roomX + 152}
              y1={planoTrabalhoY + 6}
              x2={roomX + 152}
              y2={roomY + roomH}
              stroke="#6f4e37"
              strokeWidth="3"
            />
            {/* Notebook na mesa */}
            <polygon
              points={`${roomX + 114},${planoTrabalhoY} ${roomX + 136},${planoTrabalhoY} ${roomX + 141},${planoTrabalhoY - 14} ${roomX + 120},${planoTrabalhoY - 14}`}
              fill="#1e293b"
            />
          </g>

          {/* Linha tracejada da altura da mesa (0,75 m) */}
          <line
            x1={roomX}
            y1={planoTrabalhoY}
            x2={roomX + roomW}
            y2={planoTrabalhoY}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            strokeWidth="1.1"
          />
          <text
            x={roomX + roomW - 8}
            y={planoTrabalhoY - 5}
            textAnchor="end"
            fontSize="9"
            fill="#64748b"
            fontFamily="monospace"
          >
            Altura da mesa (0,75 m)
          </text>

          {/* Linha vertical do alcance útil + etiqueta com alinhamento seguro */}
          <line
            x1={alcanceUtilPx}
            y1={roomY}
            x2={alcanceUtilPx}
            y2={roomY + roomH}
            stroke="#d97706"
            strokeDasharray="5 4"
            strokeWidth="1.6"
          />
          <text
            x={textoAlcanceAEsquerda ? alcanceUtilPx - 8 : alcanceUtilPx + 8}
            y={roomY + 18}
            textAnchor={textoAlcanceAEsquerda ? "end" : "start"}
            fontSize="9.8"
            fill="#b45309"
            fontWeight="bold"
          >
            Luz útil até ~{alcanceUtil.alcanceMaxM.toFixed(1).replace(".", ",")} m
          </text>

          {/* Curva ilustrativa de queda da luz */}
          <polyline
            fill="none"
            stroke="#0284c7"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={curvaPoints}
          />

          {/* Eixo de distância no rodapé */}
          <text x={roomX} y={roomY + roomH + 24} fontSize="9.5" fill="#475569" fontFamily="monospace">
            0 m (Perto da janela)
          </text>
          <text
            x={roomX + roomW / 2}
            y={roomY + roomH + 24}
            textAnchor="middle"
            fontSize="9.5"
            fill="#64748b"
            fontFamily="monospace"
          >
            {(profundidadeComodoM / 2).toFixed(1).replace(".", ",")} m
          </text>
          <text
            x={roomX + roomW}
            y={roomY + roomH + 24}
            textAnchor="end"
            fontSize="9.5"
            fill="#475569"
            fontFamily="monospace"
          >
            Fundo: {profundidadeComodoM.toFixed(1).replace(".", ",")} m
          </text>
        </svg>
      </div>

      {/* Nota prática sobre ofuscamento */}
      <p className="rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Dica de conforto visual:</strong> {ofuscamento.resumo}
      </p>

      {/* 2. Luz Artificial (Lâmpadas LED) e conexão com o calor */}
      <div className="rounded-xl border border-border bg-background/50 p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            2. Apoio de luz artificial (lâmpadas LED) e impacto no calor
          </p>
          <span className="text-[10.5px] text-muted-foreground">
            Área do piso: {areaPisoM2.toFixed(1).replace(".", ",")} m²
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1">
            <span className="block text-xs font-medium text-foreground">
              Para qual atividade você usa este cômodo?
            </span>
            <select
              value={eAlvoArtificialLux}
              onChange={(e) => setEAlvoArtificialLux(Number(e.currentTarget.value))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
            >
              <option value={150}>Descanso / quarto / circulação (150 lux)</option>
              <option value={300}>Uso geral / sala / cozinha (300 lux)</option>
              <option value={500}>Leitura intensa / home office (500 lux)</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="flex items-center justify-between text-xs font-medium text-foreground">
              <span>Eficiência da lâmpada LED</span>
              <span className="font-mono text-[10px] text-muted-foreground">lm/W</span>
            </span>
            <input
              type="number"
              min={40}
              max={180}
              step={5}
              value={eficaciaLedLmW}
              onChange={(e) => {
                if (e.currentTarget.value !== "" && e.currentTarget.validity.valid) {
                  setEficaciaLedLmW(e.currentTarget.valueAsNumber);
                }
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
            />
            <span className="block text-[10px] text-muted-foreground">
              LED comum: ~90–100 lm/W · LED premium: 120+ lm/W
            </span>
          </label>

          <div className="flex flex-col justify-center rounded-xl border border-primary/25 bg-card p-3">
            <span className="text-[10.5px] text-muted-foreground">
              Estimativa para iluminar o cômodo todo:
            </span>
            <span className="mt-0.5 font-mono text-sm font-bold text-primary">
              ~{lampadasLed9w} {lampadasLed9w === 1 ? "lâmpada" : "lâmpadas"} LED de 9 W (
              {artificial.potenciaTotalW.toFixed(0)} W)
            </span>
            <span className="mt-0.5 text-[10px] text-muted-foreground">
              Calor gerado pelas luzes: <strong>{apenasLuzWm2.toFixed(1).replace(".", ",")} W/m²</strong> (
              {Math.round(artificial.fluxoLumens).toLocaleString("pt-BR")} lúmens)
            </span>
          </div>
        </div>

        <div className="space-y-2.5 border-t border-border pt-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Quer ver quanto essas lâmpadas pesam no calor da sala? No Simulador Térmico, o{" "}
            <strong>{TIPOS_COMODO[tipoComodo].nome.toLowerCase()}</strong> usa{" "}
            <strong className="font-mono text-foreground">{ganhosInternosWm2} W/m²</strong> de
            cargas internas (~{parcelaLuzPadraoEstimadaWm2} W/m² de luz + {parcelaEquipamentosRefWm2}{" "}
            W/m² de aparelhos). Envie este novo cálculo de LED para lá:
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                aplicarNoTermico(
                  novoTotalSubstituindoParcelaLuzWm2,
                  `Atualizado no térmico: ${novoTotalSubstituindoParcelaLuzWm2.toFixed(1).replace(".", ",")} W/m² (LED + aparelhos) ✓`,
                )
              }
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 cursor-pointer"
            >
              Aplicar no térmico ({apenasLuzWm2.toFixed(1).replace(".", ",")} luz +{" "}
              {parcelaEquipamentosRefWm2} aparelhos ={" "}
              {novoTotalSubstituindoParcelaLuzWm2.toFixed(1).replace(".", ",")} W/m²)
            </button>

            <button
              type="button"
              onClick={() =>
                aplicarNoTermico(
                  apenasLuzWm2,
                  `Atualizado no térmico: ${apenasLuzWm2.toFixed(1).replace(".", ",")} W/m² (só iluminação) ✓`,
                )
              }
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 cursor-pointer"
            >
              Aplicar só iluminação ({apenasLuzWm2.toFixed(1).replace(".", ",")} W/m²)
            </button>

            {feedbackAplicado && (
              <span className="font-mono text-xs font-bold text-emerald-700">
                {feedbackAplicado}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Detalhes técnicos recolhíveis */}
      <details className="rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-[11px] text-muted-foreground">
        <summary className="cursor-pointer font-semibold text-foreground hover:text-primary">
          Ver fórmulas e detalhes técnicos (BRE, Lúmens e razão Tv/FS)
        </summary>
        <div className="mt-2 space-y-1.5 leading-relaxed">
          <p>
            <strong>Seletividade do vidro (Tv/FS):</strong>{" "}
            {seletividadeTvFs.toFixed(2).replace(".", ",")} · Transmitância efetiva T = Tv × 0,8 ={" "}
            {(vidroAtual.tv * 0.8).toFixed(2).replace(".", ",")}.
          </p>
          <p>
            <strong>Luz natural (método BRE):</strong> alcance útil estimado por 2 a 2,5 × H_verga (
            {alcanceUtil.alturaVergaAcimaPlanoM.toFixed(2).replace(".", ",")} m acima do plano de
            trabalho de 0,75 m). A curva no corte tem perfil ilustrativo escalonado pela média
            calculada.
          </p>
          <p>
            <strong>Luz artificial (Método dos Lúmens):</strong> Φ = E_alvo · A_piso / (UF · MF),
            com UF = {CONSTANTES_LUZ.fatorUtilizacaoLumens.valor} e MF ={" "}
            {CONSTANTES_LUZ.fatorManutencaoLumens.valor}. Esquema conceitual; não substitui projeto
            luminotécnico.
          </p>
        </div>
      </details>
    </div>
  );
}