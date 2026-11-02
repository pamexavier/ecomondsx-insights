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

type IrradianciaPorCidade = Partial<Record<string, Partial<Record<OrientacaoKey, number>>>>;

const FATOR_CARGA_PADRAO = 0.5;

const ORIENTACOES: Record<
  OrientacaoKey,
  {
    nome: string;
    irradianciaReferenciaWm2: number;
    horaPico: number;
    fonte: string;
    status: string;
    anguloSolarRelativo: string;
    sunPos: { cx: number; cy: number };
  }
> = {
  N: {
    nome: "Norte",
    irradianciaReferenciaWm2: 550,
    horaPico: 12,
    fonte: "Sem fonte confirmada",
    status: "valor didático — validar com INMET/EPW ou NBR 15220-3",
    anguloSolarRelativo: "Incidência alta ao longo do dia (Hemisfério Sul)",
    sunPos: { cx: 365, cy: 58 },
  },
  L: {
    nome: "Leste",
    irradianciaReferenciaWm2: 500,
    horaPico: 9,
    fonte: "Sem fonte confirmada",
    status: "valor didático — validar com INMET/EPW ou NBR 15220-3",
    anguloSolarRelativo: "Sol direto da manhã (ângulo baixo a médio)",
    sunPos: { cx: 475, cy: 88 },
  },
  O: {
    nome: "Oeste",
    irradianciaReferenciaWm2: 680,
    horaPico: 16,
    fonte: "Sem fonte confirmada",
    status: "valor didático — validar com INMET/EPW ou NBR 15220-3",
    anguloSolarRelativo: "Sol da tarde somado ao ar externo já aquecido",
    sunPos: { cx: 515, cy: 165 },
  },
  S: {
    nome: "Sul",
    irradianciaReferenciaWm2: 220,
    horaPico: 12,
    fonte: "Sem fonte confirmada",
    status: "valor didático — validar com INMET/EPW ou NBR 15220-3",
    anguloSolarRelativo: "Predomínio de luz difusa e menor radiação direta",
    sunPos: { cx: 205, cy: 62 },
  },
};

// TODO: preencher com dados climáticos por cidade, validados em INMET/EPW ou NBR 15220-3.
const IRRADIANCIA_POR_CIDADE: IrradianciaPorCidade = {};

function irradianciaReferencia(orientacao: OrientacaoKey, cidade?: string) {
  return (
    (cidade ? IRRADIANCIA_POR_CIDADE[cidade]?.[orientacao] : undefined) ??
    ORIENTACOES[orientacao].irradianciaReferenciaWm2
  );
}

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
    detalhe: string;
    transmitancia: string;
    u: number;
    espessuraVisualPx: number;
  }
> = {
  concreto: {
    nome: "Parede maciça (sem isolamento)",
    detalhe: "Concreto ou alvenaria delgada de alta transmitância (NBR 15220)",
    transmitancia: "U = 3,70 W/(m²·K)",
    u: 3.7,
    espessuraVisualPx: 14,
  },
  ceramica: {
    nome: "Alvenaria de bloco cerâmico",
    detalhe: "Bloco cerâmico furado 14 cm com argamassa em ambas as faces",
    transmitancia: "U = 2,10 W/(m²·K)",
    u: 2.1,
    espessuraVisualPx: 20,
  },
  termica: {
    nome: "Parede com isolamento térmico",
    detalhe: "Composição dupla ou fachada com camada isolante (EPS / lã mineral)",
    transmitancia: "U = 0,85 W/(m²·K)",
    u: 0.85,
    espessuraVisualPx: 26,
  },
};

const CORES_TINTA: Record<
  CorTintaKey,
  {
    nome: string;
    alpha: number;
    hex: string;
    hexInterno: string;
    hexSombra: string;
  }
> = {
  branca: {
    nome: "Branco Neve",
    alpha: 0.2,
    hex: "#E2E8F0",
    hexInterno: "#F1F5F9",
    hexSombra: "#CBD5E1",
  },
  terracota: {
    nome: "Terracota Natural",
    alpha: 0.55,
    hex: "#C26D4A",
    hexInterno: "#E6C7B8",
    hexSombra: "#9C5234",
  },
  grafite: {
    nome: "Grafite Escuro",
    alpha: 0.85,
    hex: "#334155",
    hexInterno: "#94A3B8",
    hexSombra: "#1E293B",
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

function NumberControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
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
    </label>
  );
}

/* ── Visualização Arquitetônica Profissional: Corte em Perspectiva do Cômodo + Elevação Técnica ── */
function ComodoTecnico({
  tipoComodo,
  corExterna,
  corInterna,
  corSombra,
  orientacao,
  envoltoria,
  larguraFachadaM,
  profundidadeM,
  alturaM,
  areaEnvidracada,
  areaFachada,
  quantidadeJanelas,
  sombreamento,
  posicaoJanelas,
  temperaturaSolArC,
}: {
  tipoComodo: TipoComodoKey;
  corExterna: string;
  corInterna: string;
  corSombra: string;
  orientacao: OrientacaoKey;
  envoltoria: EnvoltoriaKey;
  larguraFachadaM: number;
  profundidadeM: number;
  alturaM: number;
  areaEnvidracada: number;
  areaFachada: number;
  quantidadeJanelas: number;
  sombreamento: number;
  posicaoJanelas: PosicaoJanelaKey;
  temperaturaSolArC: number;
}) {
  const uid = useId().replace(/:/g, "");
  const percentualVidro = Math.min(0.8, Math.max(0, areaEnvidracada / Math.max(0.1, areaFachada)));
  const infoComodo = TIPOS_COMODO[tipoComodo];
  const espessuraParede = ENVOLTORIAS[envoltoria].espessuraVisualPx;

  const roomBackX = 88;
  const roomBackY = 104;
  const roomBackW = Math.min(256, Math.max(176, (170 * larguraFachadaM) / Math.max(2.2, alturaM)));
  const roomBackH = 178;

  const depthFactor = Math.min(1.25, Math.max(0.55, profundidadeM / 4.5));
  const frontPadX = Math.round(46 * depthFactor);
  const frontPadTop = Math.round(32 * depthFactor);
  const frontPadBottom = Math.round(52 * depthFactor);

  const roomFrontX = roomBackX - frontPadX;
  const roomFrontY = roomBackY - frontPadTop;
  const roomFrontW = roomBackW + frontPadX * 2;
  const roomFrontH = roomBackH + frontPadTop + frontPadBottom;

  const wFracao = percentualVidro === 0 ? 0 : Math.min(0.88, Math.sqrt(percentualVidro * 1.55));
  const wTotalLargura = wFracao * roomBackW;
  const wAltura =
    wFracao === 0 ? 0 : Math.min(roomBackH * 0.82, (percentualVidro / wFracao) * roomBackH);
  const wStartX = roomBackX + (roomBackW - wTotalLargura) / 2;
  const wStartY =
    posicaoJanelas === "altas"
      ? roomBackY + 14
      : posicaoJanelas === "baixas"
        ? roomBackY + roomBackH - wAltura - 16
        : roomBackY + (roomBackH - wAltura) / 2;
  const wCadaLargura = quantidadeJanelas > 0 ? wTotalLargura / quantidadeJanelas : 0;

  const alcanceSolBase =
    orientacao === "O" ? 0.85 : orientacao === "L" ? 0.72 : orientacao === "N" ? 0.55 : 0.22;
  const alcanceSolEfetivo = alcanceSolBase * (1 - (sombreamento / 100) * 0.75);

  const elevW = Math.min(265, Math.max(165, (148 * larguraFachadaM) / Math.max(2.2, alturaM)));
  const elevH = 152;
  const elevX = 485 + (330 - elevW) / 2;
  const elevY = 128;
  const elevJanelaTotalW = wFracao * elevW;
  const elevJanelaH =
    wFracao === 0 ? 0 : Math.min(elevH * 0.82, (percentualVidro / wFracao) * elevH);
  const elevJanelaX = elevX + (elevW - elevJanelaTotalW) / 2;
  const elevJanelaY =
    posicaoJanelas === "altas"
      ? elevY + 12
      : posicaoJanelas === "baixas"
        ? elevY + elevH - elevJanelaH - 14
        : elevY + (elevH - elevJanelaH) / 2;
  const elevCadaJanelaW = quantidadeJanelas > 0 ? elevJanelaTotalW / quantidadeJanelas : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f6f8f7]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-800">
            Prancha técnica · Corte em perspectiva do cômodo + Elevação da fachada
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            {infoComodo.nome} ({larguraFachadaM.toFixed(1).replace(".", ",")} m ×{" "}
            {profundidadeM.toFixed(1).replace(".", ",")} m · pé-direito{" "}
            {alturaM.toFixed(1).replace(".", ",")} m) · Envoltória: {ENVOLTORIAS[envoltoria].nome}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-700">
            Área: {(larguraFachadaM * profundidadeM).toFixed(1).replace(".", ",")} m²
          </span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-[10px] font-semibold text-emerald-800">
            Fachada {orientacao} · {ORIENTACOES[orientacao].nome}
          </span>
        </div>
      </div>

      <svg
        viewBox="0 0 860 440"
        className="block h-auto w-full"
        role="img"
        aria-label={`Representação técnica do cômodo (${infoComodo.nome}) com fachada orientada a ${ORIENTACOES[orientacao].nome}`}
      >
        <defs>
          <linearGradient id={`${uid}-skyExt`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#f0fdf4" />
          </linearGradient>
          <linearGradient id={`${uid}-glassPane`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.72" />
            <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.68" />
          </linearGradient>
          <linearGradient id={`${uid}-floorGrad`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d6d3d1" />
            <stop offset="100%" stopColor="#e7e5e4" />
          </linearGradient>
          <linearGradient id={`${uid}-sunPatch`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        <rect width="860" height="440" fill="#f6f8f7" />

        <g stroke="#e2e8f0" strokeWidth="0.7">
          {[60, 120, 180, 240, 300, 360].map((y) => (
            <line key={`hy-${y}`} x1="0" y1={y} x2="860" y2={y} />
          ))}
          {[100, 200, 300, 400, 500, 600, 700, 800].map((x) => (
            <line key={`vx-${x}`} x1={x} y1="0" x2={x} y2="440" />
          ))}
        </g>

        <line
          x1="448"
          y1="24"
          x2="448"
          y2="416"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />

        <g>
          <text
            x="34"
            y="36"
            fill="#065f46"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
            letterSpacing="1.2"
          >
            01 · PERSPECTIVA INTERNA DO CÔMODO ({infoComodo.nome.toUpperCase()})
          </text>
          <text x="34" y="52" fill="#64748b" fontSize="10" fontFamily="monospace">
            Parede de fundo = fachada externa ({corExterna}) · Corte mostrando camadas e insolação
          </text>

          <polygon
            points={`${roomFrontX},${roomFrontY} ${roomFrontX + roomFrontW},${roomFrontY} ${roomBackX + roomBackW},${roomBackY} ${roomBackX},${roomBackY}`}
            fill="#f8fafc"
            stroke="#64748b"
            strokeWidth="1.5"
          />

          <polygon
            points={`${roomFrontX},${roomFrontY} ${roomBackX},${roomBackY} ${roomBackX},${roomBackY + roomBackH} ${roomFrontX},${roomFrontY + roomFrontH}`}
            fill="#e2e8f0"
            stroke="#64748b"
            strokeWidth="1.5"
          />

          <polygon
            points={`${roomBackX + roomBackW},${roomBackY} ${roomFrontX + roomFrontW},${roomFrontY} ${roomFrontX + roomFrontW},${roomFrontY + roomFrontH} ${roomBackX + roomBackW},${roomBackY + roomBackH}`}
            fill="#cbd5e1"
            stroke="#64748b"
            strokeWidth="1.5"
          />

          <polygon
            points={`${roomBackX},${roomBackY + roomBackH} ${roomBackX + roomBackW},${roomBackY + roomBackH} ${roomFrontX + roomFrontW},${roomFrontY + roomFrontH} ${roomFrontX},${roomFrontY + roomFrontH}`}
            fill={`url(#${uid}-floorGrad)`}
            stroke="#475569"
            strokeWidth="1.8"
          />

          {[0.25, 0.5, 0.75].map((frac) => {
            const bx = roomBackX + roomBackW * frac;
            const fx = roomFrontX + roomFrontW * frac;
            return (
              <line
                key={`piso-v-${frac}`}
                x1={bx}
                y1={roomBackY + roomBackH}
                x2={fx}
                y2={roomFrontY + roomFrontH}
                stroke="#a8a29e"
                strokeOpacity="0.45"
                strokeWidth="1"
              />
            );
          })}

          <rect
            x={roomBackX - espessuraParede / 2}
            y={roomBackY - espessuraParede / 2}
            width={roomBackW + espessuraParede}
            height={roomBackH + espessuraParede}
            fill={corExterna}
            stroke="#334155"
            strokeWidth="2"
          />
          {envoltoria === "termica" && (
            <rect
              x={roomBackX - espessuraParede / 4}
              y={roomBackY - espessuraParede / 4}
              width={roomBackW + espessuraParede / 2}
              height={roomBackH + espessuraParede / 2}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="3"
              strokeDasharray="6 3"
            />
          )}
          <rect
            x={roomBackX}
            y={roomBackY}
            width={roomBackW}
            height={roomBackH}
            fill={corInterna}
            stroke="#334155"
            strokeWidth="2"
          />

          {Array.from({ length: quantidadeJanelas }, (_, index) => {
            const x =
              posicaoJanelas === "distribuidas" && quantidadeJanelas > 1
                ? roomBackX + ((index + 1) * roomBackW) / (quantidadeJanelas + 1) - wCadaLargura / 2
                : wStartX + index * wCadaLargura;
            const wWidth = Math.max(0, wCadaLargura - 6);

            const floorYStart = roomBackY + roomBackH;
            const floorYEnd =
              floorYStart + (roomFrontY + roomFrontH - floorYStart) * alcanceSolEfetivo;
            const skewX = orientacao === "L" ? -18 : orientacao === "O" ? 18 : 0;

            return (
              <g key={`room-win-${index}`}>
                <rect
                  x={x}
                  y={wStartY}
                  width={wWidth}
                  height={wAltura}
                  fill={`url(#${uid}-skyExt)`}
                />
                <rect
                  x={x}
                  y={wStartY}
                  width={wWidth}
                  height={wAltura}
                  fill={`url(#${uid}-glassPane)`}
                  stroke="#1e293b"
                  strokeWidth="3.5"
                />
                <line
                  x1={x + wWidth / 2}
                  y1={wStartY}
                  x2={x + wWidth / 2}
                  y2={wStartY + wAltura}
                  stroke="#334155"
                  strokeWidth="1.8"
                />
                {sombreamento > 0 && (
                  <g>
                    <rect x={x - 2} y={wStartY - 3} width={wWidth + 4} height={7} fill="#334155" />
                    {sombreamento > 50 && (
                      <>
                        <line
                          x1={x}
                          y1={wStartY + wAltura * 0.35}
                          x2={x + wWidth}
                          y2={wStartY + wAltura * 0.35}
                          stroke="#334155"
                          strokeWidth="2.5"
                        />
                        <line
                          x1={x}
                          y1={wStartY + wAltura * 0.68}
                          x2={x + wWidth}
                          y2={wStartY + wAltura * 0.68}
                          stroke="#334155"
                          strokeWidth="2.5"
                        />
                      </>
                    )}
                  </g>
                )}

                {percentualVidro > 0 && alcanceSolEfetivo > 0.08 && (
                  <polygon
                    points={`${x},${floorYStart + 2} ${x + wWidth},${floorYStart + 2} ${x + wWidth + skewX + 10},${floorYEnd} ${x + skewX - 10},${floorYEnd}`}
                    fill={`url(#${uid}-sunPatch)`}
                  />
                )}
              </g>
            );
          })}

          {tipoComodo === "sala" && (
            <g stroke="#334155" strokeWidth="1.6" fill="#ffffff" fillOpacity="0.82">
              <rect
                x={roomBackX + 26}
                y={roomBackY + roomBackH - 18}
                width={Math.min(115, roomBackW * 0.52)}
                height="26"
                rx="4"
              />
              <rect
                x={roomBackX + 22}
                y={roomBackY + roomBackH - 6}
                width={Math.min(123, roomBackW * 0.52 + 8)}
                height="16"
                rx="3"
                fill="#e2e8f0"
              />
              <rect
                x={roomBackX + 46}
                y={roomBackY + roomBackH + 18}
                width="68"
                height="16"
                rx="2"
                fill="#f8fafc"
              />
              <line
                x1={roomBackX + roomBackW - 26}
                y1={roomBackY + roomBackH + 6}
                x2={roomBackX + roomBackW - 26}
                y2={roomBackY + roomBackH - 36}
              />
              <polygon
                points={`${roomBackX + roomBackW - 36},${roomBackY + roomBackH - 36} ${roomBackX + roomBackW - 16},${roomBackY + roomBackH - 36} ${roomBackX + roomBackW - 20},${roomBackY + roomBackH - 48} ${roomBackX + roomBackW - 32},${roomBackY + roomBackH - 48}`}
                fill="#fef3c7"
              />
            </g>
          )}

          {tipoComodo === "quarto" && (
            <g stroke="#334155" strokeWidth="1.6" fill="#ffffff" fillOpacity="0.88">
              <rect
                x={roomBackX + roomBackW / 2 - 48}
                y={roomBackY + roomBackH - 22}
                width="96"
                height="18"
                rx="3"
                fill="#cbd5e1"
              />
              <polygon
                points={`${roomBackX + roomBackW / 2 - 48},${roomBackY + roomBackH - 6} ${roomBackX + roomBackW / 2 + 48},${roomBackY + roomBackH - 6} ${roomBackX + roomBackW / 2 + 60},${roomBackY + roomBackH + 28} ${roomBackX + roomBackW / 2 - 60},${roomBackY + roomBackH + 28}`}
                fill="#f8fafc"
              />
              <rect
                x={roomBackX + roomBackW / 2 - 38}
                y={roomBackY + roomBackH - 12}
                width="32"
                height="10"
                rx="2"
              />
              <rect
                x={roomBackX + roomBackW / 2 + 6}
                y={roomBackY + roomBackH - 12}
                width="32"
                height="10"
                rx="2"
              />
            </g>
          )}

          {tipoComodo === "escritorio" && (
            <g stroke="#334155" strokeWidth="1.6" fill="#ffffff" fillOpacity="0.88">
              <rect
                x={roomBackX + roomBackW / 2 - 58}
                y={roomBackY + roomBackH - 8}
                width="116"
                height="12"
                rx="2"
                fill="#e2e8f0"
              />
              <line
                x1={roomBackX + roomBackW / 2 - 48}
                y1={roomBackY + roomBackH + 4}
                x2={roomBackX + roomBackW / 2 - 48}
                y2={roomBackY + roomBackH + 24}
              />
              <line
                x1={roomBackX + roomBackW / 2 + 48}
                y1={roomBackY + roomBackH + 4}
                x2={roomBackX + roomBackW / 2 + 48}
                y2={roomBackY + roomBackH + 24}
              />
              <rect
                x={roomBackX + roomBackW / 2 - 34}
                y={roomBackY + roomBackH - 28}
                width="30"
                height="18"
                rx="2"
                fill="#0f172a"
              />
              <rect
                x={roomBackX + roomBackW / 2 + 2}
                y={roomBackY + roomBackH - 28}
                width="30"
                height="18"
                rx="2"
                fill="#0f172a"
              />
            </g>
          )}

          {tipoComodo === "banheiro" && (
            <g stroke="#334155" strokeWidth="1.6" fill="#ffffff" fillOpacity="0.9">
              <rect
                x={roomBackX + 18}
                y={roomBackY + roomBackH - 18}
                width="62"
                height="24"
                rx="2"
                fill="#e2e8f0"
              />
              <ellipse
                cx={roomBackX + 49}
                cy={roomBackY + roomBackH - 20}
                rx="16"
                ry="5"
                fill="#ffffff"
              />
              <rect
                x={roomBackX + roomBackW - 64}
                y={roomBackY + 24}
                width="52"
                height={roomBackH - 24}
                fill="#bae6fd"
                fillOpacity="0.22"
                stroke="#0284c7"
                strokeDasharray="4 3"
              />
              <circle cx={roomBackX + roomBackW - 38} cy={roomBackY + 38} r="6" fill="#94a3b8" />
            </g>
          )}

          <g stroke="#0f172a" strokeWidth="1.2" fill="#0f172a" fontFamily="monospace" fontSize="11">
            <line
              x1={roomBackX}
              y1={roomFrontY + roomFrontH + 18}
              x2={roomBackX + roomBackW}
              y2={roomFrontY + roomFrontH + 18}
            />
            <line
              x1={roomBackX}
              y1={roomFrontY + roomFrontH + 13}
              x2={roomBackX}
              y2={roomFrontY + roomFrontH + 23}
            />
            <line
              x1={roomBackX + roomBackW}
              y1={roomFrontY + roomFrontH + 13}
              x2={roomBackX + roomBackW}
              y2={roomFrontY + roomFrontH + 23}
            />
            <text
              x={roomBackX + roomBackW / 2}
              y={roomFrontY + roomFrontH + 33}
              textAnchor="middle"
              stroke="none"
              fontWeight="bold"
            >
              Fachada: {larguraFachadaM.toFixed(1).replace(".", ",")} m
            </text>

            <line
              x1={roomFrontX - 10}
              y1={roomFrontY + roomFrontH}
              x2={roomBackX - 10}
              y2={roomBackY + roomBackH}
            />
            <text
              x={roomFrontX - 16}
              y={(roomFrontY + roomFrontH + roomBackY + roomBackH) / 2 + 10}
              textAnchor="end"
              stroke="none"
              fontSize="10"
            >
              Prof.: {profundidadeM.toFixed(1).replace(".", ",")} m
            </text>
          </g>

          <g transform="translate(34, 388)">
            <rect width="380" height="34" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
            <circle cx="16" cy="17" r="6" fill={corExterna} stroke="#334155" strokeWidth="1.2" />
            <text
              x="30"
              y="15"
              fontSize="9.5"
              fontFamily="monospace"
              fill="#334155"
              fontWeight="bold"
            >
              T_sol-ar na superfície externa (
              {
                CORES_TINTA[
                  corExterna === CORES_TINTA.branca.hex
                    ? "branca"
                    : corExterna === CORES_TINTA.terracota.hex
                      ? "terracota"
                      : "grafite"
                ].nome
              }
              ): {temperaturaSolArC.toFixed(1).replace(".", ",")} °C
            </text>
            <text x="30" y="27" fontSize="8.5" fontFamily="monospace" fill="#64748b">
              Calculada por T_ext + (α · I_vertical / 25 W/m²K) · ABNT NBR 15220
            </text>
          </g>
        </g>

        <g>
          <text
            x="472"
            y="36"
            fill="#065f46"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
            letterSpacing="1.2"
          >
            02 · ELEVAÇÃO EXTERNA DA FACHADA
          </text>
          <text x="472" y="52" fill="#64748b" fontSize="10" fontFamily="monospace">
            Proporção janela/parede (WWR): {Math.round(percentualVidro * 100)}% ·{" "}
            {areaEnvidracada.toFixed(1).replace(".", ",")} m² de vidro
          </text>

          <line
            x1="472"
            y1={elevY + elevH + 6}
            x2="830"
            y2={elevY + elevH + 6}
            stroke="#475569"
            strokeWidth="2"
          />

          <polygon
            points={`${elevX - 14},${elevY - 14} ${elevX + elevW + 14},${elevY - 14} ${elevX + elevW + 22},${elevY} ${elevX - 6},${elevY}`}
            fill="#475569"
          />

          <rect
            x={elevX}
            y={elevY}
            width={elevW}
            height={elevH}
            fill={corExterna}
            stroke="#1e293b"
            strokeWidth="2.5"
          />

          <rect
            x={elevX + 2}
            y={elevY + 2}
            width={elevW - 4}
            height="9"
            fill={corSombra}
            fillOpacity="0.65"
          />

          {Array.from({ length: quantidadeJanelas }, (_, index) => {
            const x =
              posicaoJanelas === "distribuidas" && quantidadeJanelas > 1
                ? elevX + ((index + 1) * elevW) / (quantidadeJanelas + 1) - elevCadaJanelaW / 2
                : elevJanelaX + index * elevCadaJanelaW;
            const w = Math.max(0, elevCadaJanelaW - 5);
            return (
              <g key={`elev-win-${index}`}>
                <rect
                  x={x}
                  y={elevJanelaY}
                  width={w}
                  height={elevJanelaH}
                  fill={`url(#${uid}-glassPane)`}
                  stroke="#1e293b"
                  strokeWidth="3.5"
                />
                <line
                  x1={x + w / 2}
                  y1={elevJanelaY}
                  x2={x + w / 2}
                  y2={elevJanelaY + elevJanelaH}
                  stroke="#334155"
                  strokeWidth="1.5"
                />
                {sombreamento > 0 && (
                  <g>
                    <polygon
                      points={`${x - 4},${elevJanelaY - 4} ${x + w + 4},${elevJanelaY - 4} ${x + w},${elevJanelaY + 6} ${x - 2},${elevJanelaY + 6}`}
                      fill="#334155"
                    />
                    {sombreamento > 50 && (
                      <>
                        <line
                          x1={x - 2}
                          y1={elevJanelaY + elevJanelaH * 0.38}
                          x2={x + w + 2}
                          y2={elevJanelaY + elevJanelaH * 0.38}
                          stroke="#334155"
                          strokeWidth="3.5"
                        />
                        <line
                          x1={x - 2}
                          y1={elevJanelaY + elevJanelaH * 0.7}
                          x2={x + w + 2}
                          y2={elevJanelaY + elevJanelaH * 0.7}
                          stroke="#334155"
                          strokeWidth="3.5"
                        />
                      </>
                    )}
                  </g>
                )}
              </g>
            );
          })}

          <g stroke="#334155" strokeWidth="1.2" fill="#334155" fontFamily="monospace" fontSize="11">
            <line x1={elevX} y1={elevY + elevH + 22} x2={elevX + elevW} y2={elevY + elevH + 22} />
            <line x1={elevX} y1={elevY + elevH + 17} x2={elevX} y2={elevY + elevH + 27} />
            <line
              x1={elevX + elevW}
              y1={elevY + elevH + 17}
              x2={elevX + elevW}
              y2={elevY + elevH + 27}
            />
            <text
              x={elevX + elevW / 2}
              y={elevY + elevH + 38}
              textAnchor="middle"
              stroke="none"
              fontWeight="bold"
            >
              {larguraFachadaM.toFixed(1).replace(".", ",")} m
            </text>

            <line x1={elevX + elevW + 18} y1={elevY} x2={elevX + elevW + 18} y2={elevY + elevH} />
            <line x1={elevX + elevW + 13} y1={elevY} x2={elevX + elevW + 23} y2={elevY} />
            <line
              x1={elevX + elevW + 13}
              y1={elevY + elevH}
              x2={elevX + elevW + 23}
              y2={elevY + elevH}
            />
            <text x={elevX + elevW + 32} y={elevY + elevH / 2 + 4} stroke="none" fontWeight="bold">
              {alturaM.toFixed(1).replace(".", ",")} m
            </text>
          </g>

          <g transform="translate(792, 92)">
            <circle r="28" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
            <path d="M0 -18V18M-18 0H18" stroke="#94a3b8" strokeWidth="1.2" />
            <path d="M0 -20L-4 -10H4Z" fill="#0f172a" />
            <text
              x="0"
              y="-32"
              textAnchor="middle"
              fill="#0f172a"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              N
            </text>
            <text
              x="0"
              y="40"
              textAnchor="middle"
              fill="#64748b"
              fontSize="8.5"
              fontFamily="monospace"
            >
              S
            </text>
            <text
              x="-35"
              y="3"
              textAnchor="middle"
              fill="#64748b"
              fontSize="8.5"
              fontFamily="monospace"
            >
              O
            </text>
            <text
              x="35"
              y="3"
              textAnchor="middle"
              fill="#64748b"
              fontSize="8.5"
              fontFamily="monospace"
            >
              L
            </text>
            <circle
              cx={orientacao === "N" ? 0 : orientacao === "S" ? 0 : orientacao === "L" ? 18 : -18}
              cy={orientacao === "N" ? -18 : orientacao === "S" ? 18 : 0}
              r="5"
              fill="#f59e0b"
              stroke="#ffffff"
              strokeWidth="1.8"
            />
          </g>

          <g transform="translate(472, 388)">
            <rect width="362" height="34" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
            <text
              x="14"
              y="15"
              fontSize="9.5"
              fontFamily="monospace"
              fill="#0f172a"
              fontWeight="bold"
            >
              {quantidadeJanelas} {quantidadeJanelas === 1 ? "janela" : "janelas"} ({posicaoJanelas}
              ) ·{" "}
              {sombreamento > 0 ? `Proteção solar externa (-${sombreamento}%)` : "Sem brise/beiral"}
            </text>
            <text x="14" y="27" fontSize="8.5" fontFamily="monospace" fill="#64748b">
              {ORIENTACOES[orientacao].anguloSolarRelativo}
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}

/* ── Componente do Simulador de Cômodos + Guia Visual de Patologias, Física e Wellness ── */
function LaboratorioInterativo() {
  const [hora, setHora] = useState(16);
  const [trilhaAtiva, setTrilhaAtiva] = useState<"inicio" | "simulador" | "fisica" | "wellness">(
    "inicio",
  );
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
    "dimensoes" | "envoltoria" | "hvac" | "memoria" | null
  >("envoltoria");

  const [tipoComodo, setTipoComodo] = useState<TipoComodoKey>("sala");
  const [orientacao, setOrientacao] = useState<OrientacaoKey>("O");
  const [modoSimulador, setModoSimulador] = useState<"simples" | "especialista">("simples");
  const [condicaoClimatica, setCondicaoClimatica] = useState<"amena" | "quente">("quente");
  const [percentualVidroSimples, setPercentualVidroSimples] = useState(
    TIPOS_COMODO.sala.percentualVidroPadrao,
  );
  const [quantidadeJanelas, setQuantidadeJanelas] = useState(
    TIPOS_COMODO.sala.quantidadeJanelasPadrao,
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
  const [fenomenoAtivo, setFenomenoAtivo] = useState<"mofo" | "parede" | "estufa">("mofo");
  const [cenarioBase, setCenarioBase] = useState<{
    cargaW: number;
    energiaKwh: number;
    descricao: string;
  } | null>(null);

  function irradianciaNaHora(hora: number, o: OrientacaoKey, fator = 1) {
    if (hora < 6 || hora > 18) return 0;
    const { irradianciaReferenciaWm2: ref, horaPico } = ORIENTACOES[o];
    return ref * fator * Math.exp(-(((hora - horaPico) / 3) ** 2));
  }

  function selecionarTipoComodo(novoTipo: TipoComodoKey) {
    const preset = TIPOS_COMODO[novoTipo];
    setTipoComodo(novoTipo);
    setComprimentoM(preset.comprimentoPadraoM);
    setLarguraM(preset.larguraPadraoM);
    setPeDireitoM(preset.peDireitoPadraoM);
    setPercentualVidroSimples(preset.percentualVidroPadrao);
    setQuantidadeJanelas(preset.quantidadeJanelasPadrao);
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
  const rotulosSimples: Record<string, string> = {
    "Condução na parede": "Calor conduzido pela parede",
    "Sol absorvido pela parede": "Radiação solar na parede opaca",
    "Condução no vidro": "Calor conduzido pelo vidro",
    "Sol pelo vidro": "Radiação solar pelas janelas",
    "Renovação de ar": "Troca de ar externo (ventilação)",
    "Cargas internas": "Pessoas, iluminação e aparelhos",
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

  const pill = (ativo: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
      ativo
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
    }`;

  return (
    <section id="laboratorio-3d" className="mb-16 sm:mb-24 scroll-mt-24">
      {/* 1. BOTÃO VOLTAR "TODOS OS TEMAS" EM DESTAQUE NO TOPO QUANDO DENTRO DE UMA TRILHA */}
      {trilhaAtiva !== "inicio" && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
          <button
            type="button"
            onClick={() => setTrilhaAtiva("inicio")}
            className="inline-flex items-center gap-2.5 rounded-full border-2 border-primary/40 bg-primary/10 px-4 py-2 text-xs sm:text-sm font-bold text-primary shadow-sm transition-all hover:-translate-x-0.5 hover:border-primary hover:bg-primary hover:text-primary-foreground cursor-pointer"
          >
            <span aria-hidden="true" className="text-base leading-none">
              ←
            </span>
            Todos os temas
          </button>

          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {trilhaAtiva === "simulador"
              ? "Trilha 01 · Simulador Bioclimático"
              : trilhaAtiva === "fisica"
                ? "Trilha 02 · Física Descomplicada"
                : "Trilha 03 · Wellness e Ambientes"}
          </span>
        </div>
      )}

      {trilhaAtiva === "inicio" && (
        <div className="mb-2 flex items-center gap-3">
          <span className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-primary">
            Espaço educativo · arquitetura e bem-estar
          </span>
          <span className="hidden sm:inline-block h-px w-16 bg-border" />
        </div>
      )}

      <h2
        className={`mb-3 max-w-3xl text-display font-extrabold leading-tight ${
          trilhaAtiva === "inicio" ? "text-2xl sm:text-3xl md:text-4xl" : "text-xl sm:text-2xl"
        }`}
      >
        {trilhaAtiva === "inicio"
          ? "Aprenda, explore e entenda os ambientes."
          : trilhaAtiva === "simulador"
            ? "Simulador bioclimático de cômodos"
            : trilhaAtiva === "fisica"
              ? "Física descomplicada"
              : "Wellness e qualidade dos ambientes"}
      </h2>
      {trilhaAtiva === "inicio" && (
        <p className="mb-6 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Escolha um tema para começar. Explore o balanço térmico do cômodo, fenômenos físicos da
          envoltória ou qualidade do ar e iluminação.
        </p>
      )}

      {trilhaAtiva === "inicio" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              id: "simulador" as const,
              number: "01",
              title: "Simulador bioclimático de cômodos",
              description:
                "Escolha entre sala, quarto, escritório ou banheiro, ajuste medidas reais e simule orientação, cor, parede e janelas.",
              status: "Interativo",
              color: "#0f8a5f",
            },
            {
              id: "fisica" as const,
              number: "02",
              title: "Física descomplicada",
              description:
                "Entenda condensação, calor atravessando paredes e a entrada de energia solar pelo vidro.",
              status: "3 temas",
              color: "#2563eb",
            },
            {
              id: "wellness" as const,
              number: "03",
              title: "Wellness e qualidade dos ambientes",
              description:
                "Explore acúmulo de CO₂ por balanço de massa, diluição relativa de VOCs e iluminação natural e artificial no mesmo cômodo.",
              status: "3 temas",
              color: "#7c3aed",
            },
          ].map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setTrilhaAtiva(card.id)}
              className="group flex min-h-48 flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
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
                Abrir conteúdo <span aria-hidden="true">→</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {trilhaAtiva === "wellness" && (
        <Suspense
          fallback={
            <div className="mt-6 rounded-3xl border border-border bg-card p-6 text-xs text-muted-foreground">
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

      {trilhaAtiva === "simulador" && (
        <div className="space-y-5">
          {/* Faixa compacta de cômodo e modo de simulação */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="C&#244;modo">
              {(Object.keys(TIPOS_COMODO) as TipoComodoKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => selecionarTipoComodo(key)}
                  aria-pressed={tipoComodo === key}
                  className={pill(tipoComodo === key)}
                >
                  {TIPOS_COMODO[key].nome}
                </button>
              ))}
            </div>

            <div
              className="inline-flex gap-0.5 rounded-full border border-border bg-card p-0.5"
              role="group"
              aria-label="Modo"
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
                  className={`rounded-full px-3 py-1 text-xs font-semibold cursor-pointer ${
                    modoSimulador === modo.k
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {modo.l}
                </button>
              ))}
            </div>

            <span className="text-xs text-muted-foreground">
              {comprimentoM.toFixed(1).replace(".", ",")} &times;{" "}
              {larguraM.toFixed(1).replace(".", ",")} m · {areaPisoM2.toFixed(1).replace(".", ",")}{" "}
              m&#178;
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
            <div className="sticky top-20 z-20 self-start">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md">
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

                <div className="space-y-3 p-3">
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-800">
                      Resultado ao vivo · {dadosComodo.nome} (
                      {areaPisoM2.toFixed(1).replace(".", ",")} m²)
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {`${horarioConsiderado} · T_ext ${temperaturaModelo.toFixed(1).replace(".", ",")} °C · Setpoint ${setpointC} °C · I_fachada ${irradianciaModelo} W/m²`}
                    </p>
                  </div>

                  <label className="flex items-center gap-3 text-sm">
                    <span className="w-10 font-bold tabular-nums">
                      {String(Math.floor(hora)).padStart(2, "0")}h
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

                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      {
                        label: "Carga térmica de pico",
                        value: simulacao
                          ? `${Math.round(cargaSensibleTotalW)} W (${Math.round(capacidadeTermicaBtuH).toLocaleString("pt-BR")} BTU/h)`
                          : "—",
                        color: "text-orange-600",
                      },
                      {
                        label: "Densidade por área",
                        value: simulacao
                          ? `${densidadeCargaWm2.toFixed(1).replace(".", ",")} W/m²`
                          : "—",
                        color: "text-emerald-700",
                      },
                      {
                        label: "Ganho solar total",
                        value: simulacao ? `${Math.round(ganhoSolarTotalW)} W` : "—",
                        color: "text-amber-600",
                      },
                      {
                        label: "Consumo estimado",
                        value: simulacao ? `${consumoMensalEstimadoKwh.toFixed(0)} kWh/mês` : "—",
                        color: "text-sky-700",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-slate-200 bg-white px-2 py-1.5"
                      >
                        <span className="block text-[10px] font-medium text-slate-500">
                          {item.label}
                        </span>
                        <span
                          className={`mt-0.5 block font-mono text-xs font-bold tabular-nums ${item.color}`}
                        >
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => selecionarTipoComodo(tipoComodo)}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-600 cursor-pointer"
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
                            descricao: `${dadosComodo.nome} · fachada ${dadosOri.nome} · ${dadosCor.nome}`,
                          });
                        }
                      }}
                      className="flex-1 rounded-lg bg-emerald-700 px-2 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                    >
                      {cenarioBase ? "Atualizar base" : "Comparar cenário"}
                    </button>
                    {cenarioBase && (
                      <button
                        type="button"
                        onClick={() => setCenarioBase(null)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {cenarioBase && simulacao && (
                    <p className="text-[11px] text-slate-600">
                      Diferença para a base ({cenarioBase.descricao}):{" "}
                      <strong className="font-mono text-slate-900">
                        {simulacao.cargaSensibleTotalW - cenarioBase.cargaW > 0 ? "+" : ""}
                        {(simulacao.cargaSensibleTotalW - cenarioBase.cargaW).toFixed(0)} W
                      </strong>
                      {" · "}
                      <strong className="font-mono text-slate-900">
                        {simulacao.consumoMensalEstimadoKwh - cenarioBase.energiaKwh > 0 ? "+" : ""}
                        {(simulacao.consumoMensalEstimadoKwh - cenarioBase.energiaKwh).toFixed(
                          1,
                        )}{" "}
                        kWh/mês
                      </strong>
                    </p>
                  )}

                  <div className="border-t border-slate-200 pt-2 text-[10px] text-slate-600">
                    <p>{dadosComodo.notaTecnica}</p>
                    <p className="mt-1 font-mono">
                      U_parede: {uParede.toFixed(2).replace(".", ",")} · α_tinta:{" "}
                      {dadosCor.alpha.toFixed(2).replace(".", ",")} · U_vidro:{" "}
                      {uVidro.toFixed(2).replace(".", ",")} · FS:{" "}
                      {fatorSolarVidro.toFixed(2).replace(".", ",")} · Tv:{" "}
                      {VIDROS[tipoVidro].tv.toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "envoltoria" as const, titulo: "Parede e janelas" },
                  { id: "dimensoes" as const, titulo: "Medidas e clima" },
                  ...(modoSimulador === "especialista"
                    ? [{ id: "hvac" as const, titulo: "Ar e energia" }]
                    : []),
                  { id: "memoria" as const, titulo: "Como foi calculado" },
                ].map((aba) => (
                  <button
                    key={aba.id}
                    type="button"
                    onClick={() => setAbaAjusteAtiva(aba.id)}
                    aria-pressed={abaAjusteAtiva === aba.id}
                    className={pill(abaAjusteAtiva === aba.id)}
                  >
                    {aba.titulo}
                  </button>
                ))}
              </div>

              {/* Painel 1: Dimensões, Orientação e Clima */}
              {abaAjusteAtiva === "dimensoes" && (
                <section className="space-y-4 rounded-2xl border border-primary/30 bg-card p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                    <h3 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-primary">
                      Dimensões do cômodo, orientação solar e clima
                    </h3>
                    <span className="font-mono text-xs text-muted-foreground">
                      Área: {areaPisoM2.toFixed(1).replace(".", ",")} m² · Vol.:{" "}
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
                      label="Pé-direito"
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
                      <p className="mb-2 text-xs text-muted-foreground">
                        Qual parede está voltada para o exterior (fachada)?
                      </p>
                      <div className="grid grid-cols-2 gap-2">
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
                                : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">
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
                                : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {key} · {ORIENTACOES[key].nome}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {modoSimulador === "simples" ? (
                    <div className="grid gap-4 sm:grid-cols-2 pt-2">
                      <div>
                        <p className="mb-2 text-xs font-medium text-foreground">
                          Condição climática externa
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            {
                              key: "amena" as const,
                              label: "Dia ameno (máx. 29 °C)",
                              detail: `T_ext ${temperaturaArNaHora(dadosOri.horaPico, 21, 29).toFixed(1).replace(".", ",")} °C`,
                            },
                            {
                              key: "quente" as const,
                              label: "Dia quente (máx. 34 °C)",
                              detail: `T_ext ${temperaturaArNaHora(dadosOri.horaPico, 24, 34).toFixed(1).replace(".", ",")} °C`,
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
                                  : "border-border hover:border-primary/40"
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
                          onChange={setOcupantes}
                        />
                        <NumberControl
                          label="Uso do ar-condicionado"
                          value={horasOperacaoDia}
                          min={0}
                          max={24}
                          step={1}
                          unit="h/dia"
                          onChange={setHorasOperacaoDia}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 pt-2">
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
                <section className="space-y-4 rounded-2xl border border-primary/30 bg-card p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                    <h3 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-primary">
                      Envoltória (parede), cor externa e janelas
                    </h3>
                    <span className="font-mono text-xs text-muted-foreground">
                      Vidro: {areaVidroM2.toFixed(1).replace(".", ",")} m² (
                      {Math.round(percentualVidroEfetivo)}%)
                    </span>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-foreground">
                        Composição da parede e cor externa
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
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
                              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                                ativo
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/40"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block text-xs font-semibold text-foreground">
                                  {item.nome}
                                </span>
                                <span className="block text-[10px] text-muted-foreground">
                                  {item.detalhe}
                                </span>
                              </span>
                              <span className="shrink-0 font-mono text-[10px] font-bold text-primary">
                                {item.transmitancia}
                              </span>
                            </button>
                          );
                        })}
                      </div>

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
                                  : "border-border hover:border-primary/40"
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
                                  α = {item.alpha.toFixed(2).replace(".", ",")}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {modoSimulador === "simples" ? (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-foreground">
                          Aberturas, proteção solar e vidro
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block space-y-1">
                            <span className="block text-xs text-muted-foreground">
                              Proporção de janelas
                            </span>
                            <select
                              value={percentualVidroSimples}
                              onChange={(event) =>
                                setPercentualVidroSimples(Number(event.currentTarget.value))
                              }
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                            >
                              <option value={12}>Reduzida / banheiro · 12%</option>
                              <option value={25}>Padrão de quarto · 25%</option>
                              <option value={30}>Média de sala · 30%</option>
                              <option value={35}>Ampla de escritório · 35%</option>
                              <option value={50}>Bastante envidraçada · 50%</option>
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
                            Sombreamento externo (beiral ou brise)
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: "Sem brise (0%)", value: 0 },
                              { label: "Beiral (-40%)", value: 40 },
                              { label: "Brise (-70%)", value: 70 },
                            ].map((item) => (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => setReducaoSolarBrise(item.value)}
                                aria-pressed={reducaoSolarBrise === item.value}
                                className={`rounded-lg border px-2 py-2 text-xs font-medium cursor-pointer ${
                                  reducaoSolarBrise === item.value
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground hover:border-primary/40"
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="mb-1.5 text-xs text-muted-foreground">Tipo de vidro</p>
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
                                  className={`rounded-lg border px-2.5 py-2 text-left text-xs font-medium cursor-pointer ${
                                    ativo
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border text-muted-foreground hover:border-primary/40"
                                  }`}
                                >
                                  <span className="block font-bold">{vidro.nome}</span>
                                  <span className="font-mono text-[10px]">
                                    U={vidro.u} · FS={vidro.fs} · Tv={vidro.tv}
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

              {/* Painel 3: Parâmetros Avançados de HVAC (Modo Engenharia) */}
              {abaAjusteAtiva === "hvac" && modoSimulador === "especialista" && (
                <section className="space-y-3 rounded-2xl border border-primary/30 bg-card p-4 sm:p-5 shadow-sm">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Renovação de ar, cargas internas e eficiência do HVAC
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <NumberControl
                      label="Renovação de ar"
                      value={renovacoesArHora}
                      min={0}
                      max={15}
                      step={0.1}
                      unit="ACH (trocas/h)"
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
                  </div>
                </section>
              )}

              {/* Painel 4: Memória Física de Cálculo Auditável */}
              {abaAjusteAtiva === "memoria" && (
                <section className="rounded-2xl border border-primary/30 bg-card p-4 sm:p-5 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="text-mono text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                        Memória física de cálculo · Regime estacionário
                      </p>
                      <h3 className="mt-1 text-display text-lg font-bold text-foreground">
                        Decomposição das 6 parcelas térmicas ({dadosComodo.nome})
                      </h3>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {`A_piso: ${areaPisoM2.toFixed(1)} m² · A_fachada: ${areaFachadaM2.toFixed(1)} m² · A_vidro: ${areaVidroM2.toFixed(1)} m²`}
                    </p>
                  </div>
                  {simulacao ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        {
                          label: "Condução na parede",
                          value: cargaConducaoParedeW,
                          formula: `U_par (${uParede}) × A_opaca (${simulacao.areaOpacaM2.toFixed(1)} m²) × ΔT (${Math.max(0, temperaturaModelo - setpointC).toFixed(1)} K)`,
                        },
                        {
                          label: "Sol absorvido pela parede",
                          value: ganhoSolarParedeW,
                          formula: `U_par (${uParede}) × A_opaca (${simulacao.areaOpacaM2.toFixed(1)} m²) × [α (${dadosCor.alpha}) × I (${irradianciaModelo}) / 25] × (1 - 0,5 × ${reducaoSolarBrise}%)`,
                        },
                        {
                          label: "Condução no vidro",
                          value: cargaVidroConducaoW,
                          formula: `U_vid (${uVidro}) × A_vid (${areaVidroM2.toFixed(1)} m²) × ΔT (${Math.max(0, temperaturaModelo - setpointC).toFixed(1)} K)`,
                        },
                        {
                          label: "Sol pelo vidro",
                          value: ganhoSolarVidroW,
                          formula: `A_vid (${areaVidroM2.toFixed(1)} m²) × I (${irradianciaModelo}) × FS (${fatorSolarVidro}) × (1 - ${reducaoSolarBrise}%)`,
                        },
                        {
                          label: "Renovação de ar",
                          value: cargaRenovacaoArW,
                          formula: `0,333 × ACH (${renovacoesArHora}) × Vol (${simulacao.volumeM3.toFixed(1)} m³) × ΔT (${Math.max(0, temperaturaModelo - setpointC).toFixed(1)} K)`,
                        },
                        {
                          label: "Cargas internas",
                          value: cargaInternaW,
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
                            <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted-foreground">
                              {parcela.formula}
                            </p>
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
          GUIA VISUAL DE FÍSICA CONSTRUTIVA (MOFO, PAREDE & EFEITO ESTUFA)
      ══════════════════════════════════════════════════════════════════ */}
      {trilhaAtiva === "fisica" && (
        <>
          <div className="mt-6 rounded-3xl border border-border bg-card p-4 sm:p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
            <div className="flex flex-col gap-4 border-b border-border/70 pb-5 print:hidden">
              <div>
                <span className="text-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  Física da Construção Descomplicada
                </span>
                <h3 className="mt-1 text-display text-xl sm:text-2xl font-extrabold text-foreground">
                  O que acontece invisivelmente dentro da parede e do vidro?
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {[
                  { id: "mofo", label: "1. Mofo" },
                  { id: "parede", label: "2. Calor na parede" },
                  { id: "estufa", label: "3. Estufa no vidro" },
                ].map((item) => {
                  const ativo = fenomenoAtivo === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFenomenoAtivo(item.id as typeof fenomenoAtivo)}
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

            {/* ── FENÔMENO 1: COMO ACONTECE O MOFO ── */}
            <div
              className={
                fenomenoAtivo === "mofo"
                  ? "mt-6 grid grid-cols-1 gap-5 items-start print:break-inside-avoid"
                  : "hidden print:grid print:grid-cols-1 print:gap-5 print:break-inside-avoid"
              }
            >
              <div className="mx-auto w-full max-w-5xl space-y-3.5">
                <p className="text-mono text-[10px] font-bold uppercase tracking-[0.14em] text-sky-600 print:block">
                  Fenômeno 1 de 3 · Mofo e condensação
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <h4 className="min-w-0 flex-1 max-w-3xl text-display text-lg sm:text-xl font-extrabold text-foreground">
                    Umidade e superfícies frias podem favorecer o mofo — mas não são a única causa.
                  </h4>
                  <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-mono text-[9px] font-bold uppercase tracking-wider text-sky-500">
                    Ponte Térmica + Ponto de Orvalho
                  </div>
                </div>
                <p className="max-w-3xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  Banhos, cozinha, respiração e infiltrações podem elevar a umidade. Se a superfície
                  de uma parede estiver fria o bastante, o vapor pode condensar ao atingir o{" "}
                  <strong>ponto de orvalho</strong>; pontes térmicas e pouca circulação de ar podem
                  contribuir para condições favoráveis ao crescimento de fungos. Mofo também pode
                  surgir sem condensação visível, e sua causa e evolução dependem do conjunto de
                  condições do local.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-3">
                    <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-red-500">
                      Parede fria ou ponte térmica
                    </span>
                    <p className="mt-1 text-xs text-foreground">
                      Pode haver maior risco de condensação quando a superfície fica abaixo do ponto
                      de orvalho do ar interno. A temperatura real depende da parede e do clima.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
                    <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-primary">
                      Controle da umidade e da superfície
                    </span>
                    <p className="mt-1 text-xs text-foreground">
                      Isolamento adequado pode elevar a temperatura superficial; ventilação e
                      correção de infiltrações ajudam a controlar a umidade. O resultado depende do
                      projeto.
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full max-w-[640px] justify-self-center overflow-hidden rounded-2xl border border-border bg-[#09100D] p-3 print:p-2 print:print-color-adjust-exact">
                <svg
                  viewBox="0 0 460 220"
                  className="w-full h-auto"
                  role="img"
                  aria-label="Esquema conceitual de superfícies frias, umidade e isolamento"
                >
                  <g transform="translate(15, 18)">
                    <text
                      x="95"
                      y="12"
                      textAnchor="middle"
                      fontSize="9.5"
                      fill="#F87171"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      PAREDE MACIÇA FRIA (SUL)
                    </text>
                    <text x="22" y="95" fontSize="9" fill="#38BDF8" fontFamily="monospace">
                      LADO EXTERNO
                    </text>
                    <rect
                      x="75"
                      y="26"
                      width="32"
                      height="145"
                      rx="3"
                      fill="#475569"
                      stroke="#94A3B8"
                    />
                    {[45, 68, 92, 115, 138].map((y, i) => (
                      <g key={i}>
                        <circle cx="112" cy={y} r="3" fill="#38BDF8" />
                        <circle
                          cx="106"
                          cy={y + 8}
                          r="4.5"
                          fill="#1E293B"
                          stroke="#EF4444"
                          strokeWidth="0.8"
                        />
                      </g>
                    ))}
                    <path
                      d="M168 65 Q138 65 116 75"
                      fill="none"
                      stroke="#FBBF24"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <path
                      d="M168 115 Q138 115 116 105"
                      fill="none"
                      stroke="#FBBF24"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <text x="122" y="52" fontSize="8.5" fill="#F8FAFC" fontFamily="monospace">
                      Face fria
                    </text>
                    <text
                      x="122"
                      y="138"
                      fontSize="8.5"
                      fill="#F87171"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      Pode condensar
                    </text>
                    <text x="122" y="150" fontSize="8" fill="#FCA5A5" fontFamily="monospace">
                      Risco de umidade
                    </text>
                  </g>

                  <line x1="230" y1="20" x2="230" y2="200" stroke="#1E3028" strokeDasharray="4 4" />

                  <g transform="translate(245, 18)">
                    <text
                      x="100"
                      y="12"
                      textAnchor="middle"
                      fontSize="9.5"
                      fill="#00C67A"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      PAREDE ISOLADA
                    </text>
                    <text x="12" y="95" fontSize="9" fill="#38BDF8" fontFamily="monospace">
                      LADO EXTERNO
                    </text>
                    <rect x="65" y="26" width="14" height="145" fill="#475569" />
                    <rect x="79" y="26" width="14" height="145" fill="#38BDF8" fillOpacity="0.85" />
                    <rect x="93" y="26" width="14" height="145" fill="#64748B" />
                    <text
                      x="116"
                      y="52"
                      fontSize="8.5"
                      fill="#00C67A"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      Face potencialmente mais aquecida
                    </text>
                    <text x="116" y="66" fontSize="8" fill="#CBD5E1" fontFamily="monospace">
                      Depende das condições
                    </text>
                    <path
                      d="M122 115 C145 95 165 125 185 100"
                      fill="none"
                      stroke="#00C67A"
                      strokeWidth="1.8"
                      strokeDasharray="4 4"
                    />
                    <text
                      x="116"
                      y="142"
                      fontSize="8.5"
                      fill="#00C67A"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      MENOR FLUXO DE CALOR
                    </text>
                    <text x="116" y="154" fontSize="8" fill="#A7F3D0" fontFamily="monospace">
                      Não elimina todo risco
                    </text>
                  </g>
                </svg>
              </div>
            </div>

            {/* ── FENÔMENO 2: COMO O CALOR ATRAVESSA CADA PAREDE ── */}
            <div
              className={
                fenomenoAtivo === "parede"
                  ? "mt-6 grid grid-cols-1 gap-5 items-start print:break-inside-avoid"
                  : "hidden print:grid print:grid-cols-1 print:gap-5 print:break-inside-avoid"
              }
            >
              <div className="mx-auto w-full max-w-5xl space-y-3.5">
                <p className="text-mono text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600 print:block">
                  Fenômeno 2 de 3 · Calor atravessando a parede
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <h4 className="min-w-0 flex-1 max-w-3xl text-display text-lg sm:text-xl font-extrabold text-foreground">
                    Por que a casa continua quente às 22h mesmo quando a noite já está fresca?
                  </h4>
                  <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-mono text-[9px] font-bold uppercase tracking-wider text-amber-500">
                    Transmitância (U) & Atraso Térmico (φ)
                  </div>
                </div>
                <p className="max-w-3xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  A energia solar absorvida pela fachada e a diferença de temperatura entre os lados
                  influenciam o fluxo de calor. A transmitância térmica (U) descreve a transferência
                  em regime estacionário; a capacidade térmica e a composição das camadas também
                  afetam o atraso e a amplitude da variação ao longo do tempo. Cor, orientação,
                  clima, sombreamento e detalhes construtivos mudam o resultado — por isso, os
                  desenhos abaixo são conceituais e não representam temperaturas calculadas.
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="rounded-xl border border-border bg-background/60 p-2.5">
                    <span className="text-mono text-[8px] font-bold uppercase text-red-500">
                      1. Concreto 12cm
                    </span>
                    <p className="mt-1 text-xs font-extrabold text-foreground">
                      Resposta mais direta
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      O comportamento depende da massa, das camadas e das condições externas.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background/60 p-2.5">
                    <span className="text-mono text-[8px] font-bold uppercase text-amber-500">
                      2. Bloco Cerâmico
                    </span>
                    <p className="mt-1 text-xs font-extrabold text-foreground">
                      Camadas e cavidades
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Geometria dos blocos e execução alteram a resistência térmica.
                    </p>
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-2.5">
                    <span className="text-mono text-[8px] font-bold uppercase text-primary">
                      3. Dupla + EPS
                    </span>
                    <p className="mt-1 text-xs font-extrabold text-foreground">
                      Isolamento contínuo
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Pode reduzir o fluxo; desempenho requer cálculo do conjunto.
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full max-w-[640px] justify-self-center overflow-hidden rounded-2xl border border-border bg-[#09100D] p-3 print:p-2 print:print-color-adjust-exact">
                <svg
                  viewBox="0 0 460 220"
                  className="w-full h-auto"
                  role="img"
                  aria-label="Esquema conceitual de fluxo de calor em composições de parede"
                >
                  {[
                    {
                      y: 16,
                      titulo: "CONCRETO MACIÇO · ESQUEMA CONCEITUAL",
                      corOnda: "#EF4444",
                      ondaPath: "M25 38 Q55 18 85 38 T145 38 T205 38 L295 38",
                      resultado: "sem escala",
                    },
                    {
                      y: 84,
                      titulo: "BLOCO CERÂMICO · ESQUEMA CONCEITUAL",
                      corOnda: "#FBBF24",
                      ondaPath: "M25 38 Q55 20 85 38 T145 38 Q180 46 225 38 L275 38",
                      resultado: "sem escala",
                    },
                    {
                      y: 152,
                      titulo: "PAREDE COM ISOLAMENTO · ESQUEMA CONCEITUAL",
                      corOnda: "#00C67A",
                      ondaPath: "M25 38 Q55 28 85 38 Q115 41 155 38 L245 38",
                      resultado: "sem escala",
                    },
                  ].map((row, idx) => (
                    <g key={row.titulo} transform={`translate(18, ${row.y})`}>
                      <text
                        x="0"
                        y="11"
                        fontSize="8.5"
                        fill={row.corOnda}
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {row.titulo}
                      </text>
                      <rect
                        x="135"
                        y="18"
                        width="44"
                        height="36"
                        rx="3"
                        fill="#334155"
                        stroke="#64748B"
                      />
                      {idx === 1 && (
                        <line
                          x1="157"
                          y1="20"
                          x2="157"
                          y2="52"
                          stroke="#F59E0B"
                          strokeWidth="2"
                          strokeDasharray="4 3"
                        />
                      )}
                      {idx === 2 && <rect x="151" y="19" width="12" height="34" fill="#38BDF8" />}
                      <path d={row.ondaPath} fill="none" stroke={row.corOnda} strokeWidth="2.4" />
                      <polygon
                        points={`${idx === 0 ? 298 : idx === 1 ? 278 : 248},38 ${
                          idx === 0 ? 290 : idx === 1 ? 270 : 240
                        },33 ${idx === 0 ? 290 : idx === 1 ? 270 : 240},43`}
                        fill={row.corOnda}
                      />
                      <text
                        x="335"
                        y="42"
                        fontSize="13"
                        fill={row.corOnda}
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {row.resultado}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* ── FENÔMENO 3: EFEITO ESTUFA NO VIDRO ── */}
            <div
              className={
                fenomenoAtivo === "estufa"
                  ? "mt-6 grid grid-cols-1 gap-5 items-start print:break-inside-avoid"
                  : "hidden print:grid print:grid-cols-1 print:gap-5 print:break-inside-avoid"
              }
            >
              <div className="mx-auto w-full max-w-5xl space-y-3.5">
                <p className="text-mono text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 print:block">
                  Fenômeno 3 de 3 · Efeito estufa no vidro
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <h4 className="min-w-0 flex-1 max-w-3xl text-display text-lg sm:text-xl font-extrabold text-foreground">
                    Luz não precisa significar calor: como separar iluminação natural de radiação
                    térmica.
                  </h4>
                  <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                    Fator Solar (FS) & Seletividade Espectral
                  </div>
                </div>
                <p className="max-w-3xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  Parte da radiação solar atravessa o vidro e é absorvida por superfícies internas,
                  aquecendo o ambiente. O vidro também troca energia com o exterior; a quantidade de
                  calor transmitida depende do tipo de vidro, do ângulo do sol e das condições de
                  uso. Sombreamento externo reduz a incidência direta antes de chegar à janela.
                  Vidros de controle solar e unidades duplas podem alterar a transmissão de energia
                  e luz, mas o desempenho e o conforto visual dependem da especificação e do
                  projeto.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-3">
                    <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-red-500">
                      Vidro simples · exemplo esquemático
                    </span>
                    <p className="mt-1 text-xs text-foreground">
                      A transmissão solar varia conforme o produto, o ângulo de incidência e as
                      condições do ambiente.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
                    <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-primary">
                      Sombreamento + vidro especificado
                    </span>
                    <p className="mt-1 text-xs text-foreground">
                      Pode reduzir ganhos solares. A luz disponível e o risco de ofuscamento também
                      precisam ser considerados no projeto.
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full max-w-[640px] justify-self-center overflow-hidden rounded-2xl border border-border bg-[#09100D] p-3 print:p-2 print:print-color-adjust-exact">
                <svg
                  viewBox="0 0 460 220"
                  className="w-full h-auto"
                  role="img"
                  aria-label="Esquema conceitual de incidência solar em janela com e sem sombreamento"
                >
                  <g transform="translate(15, 18)">
                    <text
                      x="95"
                      y="12"
                      textAnchor="middle"
                      fontSize="9.5"
                      fill="#F87171"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      VIDRO SIMPLES · ESQUEMA
                    </text>
                    <line x1="85" y1="28" x2="85" y2="170" stroke="#93C5FD" strokeWidth="4" />
                    <path
                      d="M18 55 L85 85 L155 125 L88 145 L155 162"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="2.2"
                    />
                    <text x="100" y="65" fontSize="8.5" fill="#FCA5A5" fontFamily="monospace">
                      Radiação transmitida
                    </text>
                    <text
                      x="100"
                      y="80"
                      fontSize="8.5"
                      fill="#EF4444"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      Há troca de calor ↺
                    </text>
                  </g>

                  <line x1="230" y1="20" x2="230" y2="200" stroke="#1E3028" strokeDasharray="4 4" />

                  <g transform="translate(245, 18)">
                    <text
                      x="100"
                      y="12"
                      textAnchor="middle"
                      fontSize="9.5"
                      fill="#00C67A"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      SOMBREAMENTO + VIDRO
                    </text>
                    {[42, 66, 90].map((y, i) => (
                      <line
                        key={i}
                        x1="56"
                        y1={y}
                        x2="76"
                        y2={y - 10}
                        stroke="#00C67A"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    ))}
                    <line x1="84" y1="28" x2="84" y2="170" stroke="#38BDF8" strokeWidth="3" />
                    <line x1="92" y1="28" x2="92" y2="170" stroke="#38BDF8" strokeWidth="3" />
                    <path d="M16 52 L64 62 L22 86" fill="none" stroke="#FBBF24" strokeWidth="2" />
                    <path
                      d="M94 95 L168 115"
                      fill="none"
                      stroke="#00C67A"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <text
                      x="104"
                      y="65"
                      fontSize="8.5"
                      fill="#00C67A"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      Sombreamento externo
                    </text>
                    <text x="104" y="82" fontSize="8.5" fill="#A7F3D0" fontFamily="monospace">
                      Luz transmitida varia →
                    </text>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </>
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