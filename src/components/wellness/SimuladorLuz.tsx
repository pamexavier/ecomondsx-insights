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
import { useState } from "react";

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

  // Parte A: Luz Natural (BRE) com θ limitado a 90°
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

  // Geometria do corte esquemático SVG
  const roomX = 56;
  const roomY = 34;
  const roomW = 480;
  const roomH = 132;
  const planoTrabalhoY = roomY + roomH - (0.75 / Math.max(2.2, peDireitoM)) * roomH;
  const alcanceUtilPx =
    roomX +
    Math.min(1, alcanceUtil.alcanceMaxM / Math.max(1, profundidadeComodoM)) * roomW;

  const maxLuxCurva = Math.max(300, ...perfil.map((p) => p.lux));
  const curvaPoints = perfil
    .map((p) => {
      const x = roomX + (p.distanciaM / Math.max(1, profundidadeComodoM)) * roomW;
      const y =
        roomY +
        roomH -
        8 -
        Math.min(1, p.lux / maxLuxCurva) * (roomH - 26);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  function aplicarNoTermico(valorWm2: number, descricao: string) {
    onAplicarGanhoInternoNoTermico(valorWm2);
    setFeedbackAplicado(descricao);
    window.setTimeout(() => setFeedbackAplicado(null), 3000);
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4 sm:p-5 space-y-5">
      {/* Seleção de vidro com Tv e razão Tv/FS */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            Parte A · Luz natural (FLD médio pelo método do BRE) e seletividade do vidro
          </p>
          <span className="font-mono text-[10px] text-muted-foreground">
            {TIPOS_COMODO[tipoComodo].nome} · A_vidro ={" "}
            {areaVidroM2.toFixed(1).replace(".", ",")} m² ({Math.round(percentualVidro)}% da fachada) · Prof. ={" "}
            {profundidadeComodoM.toFixed(1).replace(".", ",")} m
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(VIDROS) as TipoVidroKey[]).map((key) => {
            const v = VIDROS[key];
            const ativo = tipoVidro === key;
            const razao = (v.tv / v.fs).toFixed(2).replace(".", ",");
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChangeTipoVidro(key)}
                aria-pressed={ativo}
                className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                  ativo
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <span className="block text-xs font-bold text-foreground">{v.nome}</span>
                <span className="mt-1 block font-mono text-[10px] text-primary">
                  Tv = {v.tv.toFixed(2).replace(".", ",")} · FS ={" "}
                  {v.fs.toFixed(2).replace(".", ",")} · Tv/FS = {razao}
                </span>
                <span className="mt-0.5 block text-[9px] text-muted-foreground">
                  {v.status}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          A razão <strong>Tv/FS</strong> ({seletividadeTvFs.toFixed(2).replace(".", ",")}{" "}
          no vidro atual) mostra o equilíbrio entre luz visível transmitida (Tv) e ganho de
          calor solar (FS): vidros de controle solar podem reduzir a luz natural junto com
          o calor. A escolha acima atualiza simultaneamente U, FS e Tv no simulador térmico.
        </p>
      </div>

      {/* Controles de Luz Natural */}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-1">
          <span className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Ângulo de céu visível (θ)</span>
            <span className="font-mono text-[10px]">5° a 90°</span>
          </span>
          <input
            type="number"
            min={5}
            max={90}
            step={5}
            value={anguloCeuGraus}
            onChange={(e) => {
              if (e.currentTarget.value !== "" && e.currentTarget.validity.valid) {
                setAnguloCeuGraus(Math.min(90, Math.max(5, e.currentTarget.valueAsNumber)));
              }
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground"
          />
          <span className="block text-[9px] text-muted-foreground">
            Máx. físico 90° para janela vertical ({CONSTANTES_LUZ.anguloCeuPadraoGraus.status})
          </span>
        </label>

        <label className="block space-y-1">
          <span className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Refletância média interna (R)</span>
            <span className="font-mono text-[10px]">0,2 a 0,8</span>
          </span>
          <input
            type="number"
            min={0.2}
            max={0.8}
            step={0.05}
            value={refletanciaMedia}
            onChange={(e) => {
              if (e.currentTarget.value !== "" && e.currentTarget.validity.valid) {
                setRefletanciaMedia(e.currentTarget.valueAsNumber);
              }
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground"
          />
          <span className="block text-[9px] text-muted-foreground">
            Padrão 0,5 ({CONSTANTES_LUZ.refletanciaMediaInterna.status})
          </span>
        </label>

        <label className="block space-y-1">
          <span className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Iluminância externa (E_ext)</span>
            <span className="font-mono text-[10px]">lux</span>
          </span>
          <input
            type="number"
            min={2000}
            max={50000}
            step={500}
            value={eExtLux}
            onChange={(e) => {
              if (e.currentTarget.value !== "" && e.currentTarget.validity.valid) {
                setEExtLux(e.currentTarget.valueAsNumber);
              }
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground"
          />
          <span className="block text-[9px] text-muted-foreground">
            Céu encoberto = 10.000 lux ({CONSTANTES_LUZ.iluminanciaExternaCeuEncobertoLux.status})
          </span>
        </label>
      </div>

      {/* Resultados Luz Natural + Faixas Didáticas */}
      <div className="grid gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3">
          <span className="block text-[10px] text-muted-foreground">
            Fator de Luz do Dia (FLD médio)
          </span>
          <span className="mt-0.5 block font-mono text-base font-bold text-primary">
            {fldPercent.toFixed(2).replace(".", ",")}%
          </span>
          <span className="mt-0.5 block font-mono text-[9px] text-muted-foreground">
            T = Tv × 0,8 = {(vidroAtual.tv * 0.8).toFixed(2).replace(".", ",")}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <span className="block text-[10px] text-muted-foreground">
            Iluminância média interna
          </span>
          <span className="mt-0.5 block font-mono text-base font-bold text-foreground">
            {Math.round(eMediaInternaLux)} lux
          </span>
          <span className="mt-0.5 block text-[9px] text-muted-foreground">
            Faixa didática natural: 60 / 90 / 120 lux
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <span className="block text-[10px] text-muted-foreground">
            Alcance estimado de luz útil
          </span>
          <span className="mt-0.5 block font-mono text-base font-bold text-foreground">
            {alcanceUtil.alcanceMinM.toFixed(1).replace(".", ",")} a{" "}
            {alcanceUtil.alcanceMaxM.toFixed(1).replace(".", ",")} m
          </span>
          <span className="mt-0.5 block text-[9px] text-muted-foreground">
            ≈ 2 a 2,5 × H_verga ({alcanceUtil.alturaVergaAcimaPlanoM.toFixed(2).replace(".", ",")} m)
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <span className="block text-[10px] text-muted-foreground">
            Risco de ofuscamento (Parte C)
          </span>
          <span
            className={`mt-0.5 block font-mono text-base font-bold ${
              ofuscamento.nivel === "Alto"
                ? "text-red-500"
                : ofuscamento.nivel === "Médio"
                  ? "text-amber-500"
                  : "text-emerald-600"
            }`}
          >
            {ofuscamento.nivel} (qualitativo)
          </span>
          <span className="mt-0.5 block text-[9px] text-muted-foreground">
            Fachada {orientacao} · WWR {Math.round(percentualVidro)}% · Brise -{reducaoSolarBrise}%
          </span>
        </div>
      </div>

      {/* Diagrama SVG: Corte do Cômodo com Janela, Curva de Luz Ilustrativa e Plano de Trabalho */}
      <div className="overflow-hidden rounded-2xl border border-border bg-[#09100D] p-3">
        <svg
          viewBox="0 0 600 210"
          className="w-full h-auto"
          role="img"
          aria-label="Corte esquemático do cômodo mostrando janela, curva ilustrativa de decaimento da luz natural e plano de trabalho"
        >
          <text
            x={roomX}
            y="18"
            fontSize="8.5"
            fill="#00C67A"
            fontFamily="monospace"
            fontWeight="bold"
          >
            PERFIL ILUSTRATIVO (FORMA FIXA), NORMALIZADO PELA MÉDIA CALCULADA ({Math.round(eMediaInternaLux)} LUX)
          </text>

          <rect
            x={roomX}
            y={roomY}
            width={roomW}
            height={roomH}
            fill="#111C17"
            stroke="#475569"
            strokeWidth="2"
          />

          <line
            x1={roomX}
            y1={
              posicaoJanelas === "altas"
                ? roomY + 12
                : posicaoJanelas === "baixas"
                  ? roomY + 42
                  : roomY + 26
            }
            x2={roomX}
            y2={
              posicaoJanelas === "altas"
                ? roomY + 58
                : posicaoJanelas === "baixas"
                  ? roomY + roomH - 12
                  : roomY + roomH - 34
            }
            stroke="#38BDF8"
            strokeWidth="5"
          />

          <rect
            x={roomX}
            y={roomY}
            width={Math.max(0, alcanceUtilPx - roomX)}
            height={roomH}
            fill="#FBBF24"
            fillOpacity="0.09"
          />
          <line
            x1={alcanceUtilPx}
            y1={roomY}
            x2={alcanceUtilPx}
            y2={roomY + roomH}
            stroke="#FBBF24"
            strokeDasharray="4 3"
            strokeWidth="1.3"
          />
          <text
            x={Math.min(roomX + roomW - 8, alcanceUtilPx + 6)}
            y={roomY + 16}
            fontSize="8.5"
            fill="#FDE68A"
            fontFamily="monospace"
          >
            Luz útil até ~{alcanceUtil.alcanceMaxM.toFixed(1).replace(".", ",")} m (2,5×H_verga)
          </text>

          <line
            x1={roomX}
            y1={planoTrabalhoY}
            x2={roomX + roomW}
            y2={planoTrabalhoY}
            stroke="#94A3B8"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <text
            x={roomX + roomW - 6}
            y={planoTrabalhoY - 5}
            textAnchor="end"
            fontSize="8"
            fill="#CBD5E1"
            fontFamily="monospace"
          >
            Plano de trabalho (0,75 m)
          </text>

          <polyline
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.5"
            points={curvaPoints}
          />

          <text
            x={roomX}
            y={roomY + roomH + 18}
            fontSize="8.5"
            fill="#94A3B8"
            fontFamily="monospace"
          >
            0 m (Janela)
          </text>
          <text
            x={roomX + roomW}
            y={roomY + roomH + 18}
            textAnchor="end"
            fontSize="8.5"
            fill="#94A3B8"
            fontFamily="monospace"
          >
            Fundo: {profundidadeComodoM.toFixed(1).replace(".", ",")} m
          </text>
        </svg>
      </div>

      {/* Parte B: Luz Artificial (Método dos Lúmens) e integração transparente com Simulador Térmico */}
      <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            Parte B · Luz artificial (Método dos Lúmens: Φ = E_alvo · A_piso / (UF · MF))
          </p>
          <span className="font-mono text-[9px] text-muted-foreground">
            UF = {CONSTANTES_LUZ.fatorUtilizacaoLumens.valor} · MF ={" "}
            {CONSTANTES_LUZ.fatorManutencaoLumens.valor} (didáticos)
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1">
            <span className="block text-xs text-muted-foreground">
              Iluminância alvo (faixa didática de tarefa)
            </span>
            <select
              value={eAlvoArtificialLux}
              onChange={(e) => setEAlvoArtificialLux(Number(e.currentTarget.value))}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground"
            >
              <option value={150}>150 lux (circulação / descanso — faixa didática)</option>
              <option value={300}>300 lux (uso geral — faixa didática)</option>
              <option value={500}>500 lux (leitura / escritório — faixa didática)</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Eficácia luminosa (LED)</span>
              <span className="font-mono text-[10px]">lm/W</span>
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
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-xs text-foreground"
            />
          </label>

          <div className="flex flex-col justify-between rounded-lg border border-border bg-background/60 p-2.5">
            <span className="text-[10px] text-muted-foreground">
              Fluxo Φ = {Math.round(artificial.fluxoLumens).toLocaleString("pt-BR")} lm ·
              Potência = {artificial.potenciaTotalW.toFixed(0)} W
            </span>
            <span className="font-mono text-sm font-bold text-primary">
              Só iluminação: {apenasLuzWm2.toFixed(1).replace(".", ",")} W/m²
            </span>
          </div>
        </div>

        <div className="space-y-2.5 border-t border-border pt-2.5">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            No simulador térmico, o ganho interno padrão de{" "}
            <strong>{TIPOS_COMODO[tipoComodo].nome.toLowerCase()}</strong> (
            <span className="font-mono">{ganhoPadraoTotalComodoWm2} W/m²</span>; atual:{" "}
            <strong className="font-mono text-foreground">{ganhosInternosWm2} W/m²</strong>)
            já inclui iluminação (~
            <span className="font-mono">{parcelaLuzPadraoEstimadaWm2} W/m²</span>) +
            equipamentos (~
            <span className="font-mono">{parcelaEquipamentosRefWm2} W/m²</span>,{" "}
            <span className="font-mono">
              {CONSTANTES_LUZ.parcelaEquipamentosPadraoPorComodoWm2.status}
            </span>
            ). Escolha como deseja enviar este valor ao simulador térmico para não contar a
            luz duas vezes:
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                aplicarNoTermico(
                  novoTotalSubstituindoParcelaLuzWm2,
                  `Aplicado ${novoTotalSubstituindoParcelaLuzWm2.toFixed(1).replace(".", ",")} W/m² (luz + equip.) ✓`,
                )
              }
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 cursor-pointer"
            >
              Substituir só parcela de luz ({apenasLuzWm2.toFixed(1).replace(".", ",")} +{" "}
              {parcelaEquipamentosRefWm2} equip. ={" "}
              {novoTotalSubstituindoParcelaLuzWm2.toFixed(1).replace(".", ",")} W/m²)
            </button>

            <button
              type="button"
              onClick={() =>
                aplicarNoTermico(
                  apenasLuzWm2,
                  `Aplicado ${apenasLuzWm2.toFixed(1).replace(".", ",")} W/m² (apenas iluminação) ✓`,
                )
              }
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 cursor-pointer"
            >
              Usar apenas iluminação ({apenasLuzWm2.toFixed(1).replace(".", ",")} W/m², sem
              equipamentos)
            </button>

            {feedbackAplicado && (
              <span className="font-mono text-xs font-bold text-emerald-600">
                {feedbackAplicado}
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Parte C · Sobre ofuscamento e curva de luz:</strong>{" "}
        {ofuscamento.resumo} A curva no corte acima tem formato ilustrativo fixo (apenas
        escalonado pela média calculada) e o indicador de ofuscamento é conceitual; a
        avaliação real exige projeto luminotécnico. Esquema conceitual; não substitui
        medição ou projeto.
      </p>
    </div>
  );
}