import {
  CONSTANTES_AR,
  TIPOS_COMODO,
  type TipoComodoKey,
} from "@/data/wellness";
import {
  cargaTermicaRenovacaoW,
  co2EquilibrioPpm,
  co2NoTempo,
  serieCo2NoTempo,
} from "@/lib/wellness";
import { useState } from "react";

export interface SimuladorArProps {
  tipoComodo: TipoComodoKey;
  onSelectTipoComodo: (tipo: TipoComodoKey) => void;
  comprimentoM: number;
  larguraM: number;
  peDireitoM: number;
  ocupantes: number;
  onChangeOcupantes: (ocupantes: number) => void;
  ach: number;
  onChangeAch: (ach: number) => void;
  modoSimulador: "simples" | "especialista";
  temperaturaExternaC: number;
  setpointC: number;
}

export default function SimuladorAr({
  tipoComodo,
  onSelectTipoComodo,
  comprimentoM,
  larguraM,
  peDireitoM,
  ocupantes,
  onChangeOcupantes,
  ach,
  onChangeAch,
  modoSimulador,
  temperaturaExternaC,
  setpointC,
}: SimuladorArProps) {
  const [duracaoHoras, setDuracaoHoras] = useState(8);
  const [geracaoLh, setGeracaoLh] = useState<number>(
    CONSTANTES_AR.geracaoCo2PorPessoaLh.valor,
  );

  const volumeM3 = comprimentoM * larguraM * peDireitoM;
  const taxaGeracaoEfetiva =
    modoSimulador === "especialista"
      ? geracaoLh
      : CONSTANTES_AR.geracaoCo2PorPessoaLh.valor;

  const paramsCo2 = {
    volumeM3,
    ach,
    ocupantes,
    geracaoPorPessoaLh: taxaGeracaoEfetiva,
    cExtPpm: CONSTANTES_AR.co2ExternoPpm.valor,
    c0Ppm: CONSTANTES_AR.co2ExternoPpm.valor,
  };

  const co2Em1h = co2NoTempo(1, paramsCo2);
  const co2Em4h = co2NoTempo(4, paramsCo2);
  const co2Em8h = co2NoTempo(8, paramsCo2);
  const co2Eq = co2EquilibrioPpm(paramsCo2);
  const serie = serieCo2NoTempo(duracaoHoras, paramsCo2, 48);

  const deltaT = Math.max(0, temperaturaExternaC - setpointC);
  const cargaRenovacaoAtualW = cargaTermicaRenovacaoW(
    ach,
    volumeM3,
    temperaturaExternaC,
    setpointC,
  );
  const cargaRenovacaoFechadoW = cargaTermicaRenovacaoW(
    0.6,
    volumeM3,
    temperaturaExternaC,
    setpointC,
  );
  const diferencaCargaW = cargaRenovacaoAtualW - cargaRenovacaoFechadoW;

  // Escala do gráfico SVG
  const maxPpmGrafico = Math.max(
    1400,
    Math.min(5000, Math.ceil(Math.max(...serie.map((p) => p.ppm), 1200) / 200) * 200),
  );
  const minPpmGrafico = 350;
  const chartX = 48;
  const chartY = 20;
  const chartW = 540;
  const chartH = 155;

  const mapX = (t: number) => chartX + (t / duracaoHoras) * chartW;
  const mapY = (ppm: number) => {
    const clamped = Math.max(minPpmGrafico, Math.min(maxPpmGrafico, ppm));
    return (
      chartY +
      chartH -
      ((clamped - minPpmGrafico) / (maxPpmGrafico - minPpmGrafico)) * chartH
    );
  };

  const polylinePoints = serie
    .map((p) => `${mapX(p.tempoH).toFixed(1)},${mapY(p.ppm).toFixed(1)}`)
    .join(" ");

  const y800 = mapY(CONSTANTES_AR.faixasDidaticasCo2Ppm.valor.atencao);
  const y1000 = mapY(CONSTANTES_AR.faixasDidaticasCo2Ppm.valor.alerta);

  return (
    <div className="mt-4 rounded-2xl border border-border bg-background/60 p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <p className="text-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            Simulador 1 · Acúmulo de CO₂ por balanço de massa (mistura perfeita)
          </p>
          <p className="text-xs text-muted-foreground">
            Cômodo compartilhado: <strong>{TIPOS_COMODO[tipoComodo].nome}</strong> (
            {comprimentoM.toFixed(1).replace(".", ",")} ×{" "}
            {larguraM.toFixed(1).replace(".", ",")} ×{" "}
            {peDireitoM.toFixed(1).replace(".", ",")} m · Vol.{" "}
            {volumeM3.toFixed(1).replace(".", ",")} m³)
          </p>
        </div>
        <span className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[9px] text-muted-foreground">
          C_ext = {CONSTANTES_AR.co2ExternoPpm.valor} ppm ·{" "}
          {CONSTANTES_AR.co2ExternoPpm.status}
        </span>
      </div>

      {/* Controles sincronizados com o cômodo (labels separados para acessibilidade) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <span className="block text-xs text-muted-foreground">Preset de cômodo</span>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(TIPOS_COMODO) as TipoComodoKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onSelectTipoComodo(key)}
                aria-pressed={tipoComodo === key}
                className={`rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition-colors cursor-pointer ${
                  tipoComodo === key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {TIPOS_COMODO[key].nome}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block space-y-1.5">
            <span className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Ocupantes no cômodo</span>
              <span className="font-mono text-[10px]">pessoas</span>
            </span>
            <input
              type="number"
              min={0}
              max={30}
              step={1}
              value={ocupantes}
              onChange={(e) => {
                if (e.currentTarget.value !== "" && e.currentTarget.validity.valid) {
                  onChangeOcupantes(e.currentTarget.valueAsNumber);
                }
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm tabular-nums text-foreground"
            />
          </label>
          {modoSimulador === "especialista" && (
            <label className="block space-y-1">
              <span className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Taxa geração CO₂/pessoa (didática)</span>
                <span className="font-mono">L/h</span>
              </span>
              <input
                type="number"
                min={8}
                max={45}
                step={1}
                value={geracaoLh}
                onChange={(e) => {
                  if (e.currentTarget.value !== "" && e.currentTarget.validity.valid) {
                    setGeracaoLh(e.currentTarget.valueAsNumber);
                  }
                }}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1 font-mono text-xs tabular-nums text-foreground"
              />
            </label>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block space-y-1.5">
            <span className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Renovação de ar (ACH)</span>
              <span className="font-mono text-[10px]">trocas/h</span>
            </span>
            <input
              type="number"
              min={0.1}
              max={15}
              step={0.1}
              value={ach}
              onChange={(e) => {
                if (e.currentTarget.value !== "" && e.currentTarget.validity.valid) {
                  onChangeAch(e.currentTarget.valueAsNumber);
                }
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm tabular-nums text-foreground"
            />
          </label>
          <div className="flex flex-wrap gap-1 pt-0.5">
            {CONSTANTES_AR.atalhosAch.map((item) => (
              <button
                key={item.rotulo}
                type="button"
                onClick={() => onChangeAch(item.ach)}
                className={`rounded-md border px-2 py-0.5 font-mono text-[9px] font-semibold transition-colors cursor-pointer ${
                  Math.abs(ach - item.ach) < 0.05
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {item.rotulo}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Duração simulada: {duracaoHoras} h</span>
            <span className="font-mono text-[10px]">1 a 12 h</span>
          </span>
          <input
            type="range"
            min={1}
            max={12}
            step={1}
            value={duracaoHoras}
            onChange={(e) => setDuracaoHoras(Number(e.currentTarget.value))}
            className="w-full accent-emerald-600"
          />
          <span className="block font-mono text-[10px] text-muted-foreground">
            G = {ocupantes} × {taxaGeracaoEfetiva} L/h · Q = {(ach * volumeM3).toFixed(1).replace(".", ",")} m³/h
          </span>
        </label>
      </div>

      {/* Cards de leitura em 1 h, 4 h, 8 h e Equilíbrio + Conexão Térmica */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { rotulo: "Após 1 h", valor: `${Math.round(co2Em1h)} ppm` },
          { rotulo: "Após 4 h", valor: `${Math.round(co2Em4h)} ppm` },
          { rotulo: "Após 8 h", valor: `${Math.round(co2Em8h)} ppm` },
          {
            rotulo: "Concentração de equilíbrio",
            valor: `${Math.round(co2Eq).toLocaleString("pt-BR")} ppm`,
          },
        ].map((card) => (
          <div
            key={card.rotulo}
            className="rounded-xl border border-border bg-card px-3 py-2.5"
          >
            <span className="block text-[10px] text-muted-foreground">{card.rotulo}</span>
            <span className="mt-0.5 block font-mono text-sm font-bold text-foreground">
              {card.valor}
            </span>
          </div>
        ))}

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
          <span className="block text-[10px] font-semibold text-amber-700">
            Custo térmico da ventilação (ΔT = {deltaT.toFixed(1).replace(".", ",")} K)
          </span>
          <span className="mt-0.5 block font-mono text-sm font-bold text-amber-600">
            {Math.round(cargaRenovacaoAtualW)} W{" "}
            {deltaT > 0 && (
              <span className="text-[10px] font-normal text-muted-foreground">
                ({diferencaCargaW >= 0 ? "+" : ""}
                {Math.round(diferencaCargaW)} W vs 0,6 ACH)
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-[10px] text-muted-foreground">
            {deltaT > 0
              ? "Com ar externo mais quente, ventilar custa energia e melhora o ar."
              : `Com T_ext (${temperaturaExternaC.toFixed(1).replace(".", ",")} °C) ≤ setpoint (${setpointC} °C), ventilar renova o ar sem adicionar carga de resfriamento.`}
          </span>
        </div>
      </div>

      {/* Gráfico SVG CO₂ × Tempo */}
      <div className="overflow-hidden rounded-2xl border border-border bg-[#09100D] p-3">
        <svg
          viewBox="0 0 620 215"
          className="w-full h-auto"
          role="img"
          aria-label="Esquema conceitual e curva de concentração de CO₂ ao longo do tempo"
        >
          <rect
            x={chartX}
            y={y800}
            width={chartW}
            height={Math.max(0, chartY + chartH - y800)}
            fill="#00C67A"
            fillOpacity="0.1"
          />
          <rect
            x={chartX}
            y={y1000}
            width={chartW}
            height={Math.max(0, y800 - y1000)}
            fill="#FBBF24"
            fillOpacity="0.12"
          />
          <rect
            x={chartX}
            y={chartY}
            width={chartW}
            height={Math.max(0, y1000 - chartY)}
            fill="#EF4444"
            fillOpacity="0.1"
          />

          <line
            x1={chartX}
            y1={y800}
            x2={chartX + chartW}
            y2={y800}
            stroke="#00C67A"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text
            x={chartX + chartW - 4}
            y={y800 - 4}
            textAnchor="end"
            fontSize="8.5"
            fill="#A7F3D0"
            fontFamily="monospace"
          >
            ~800 ppm (faixa didática)
          </text>

          <line
            x1={chartX}
            y1={y1000}
            x2={chartX + chartW}
            y2={y1000}
            stroke="#FBBF24"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text
            x={chartX + chartW - 4}
            y={y1000 - 4}
            textAnchor="end"
            fontSize="8.5"
            fill="#FDE68A"
            fontFamily="monospace"
          >
            ~1000 ppm (faixa didática)
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

          {[420, 800, 1000, maxPpmGrafico].map((val) => (
            <text
              key={val}
              x={chartX - 6}
              y={mapY(val) + 3}
              textAnchor="end"
              fontSize="8.5"
              fill="#94A3B8"
              fontFamily="monospace"
            >
              {val}
            </text>
          ))}

          {Array.from({ length: duracaoHoras + 1 }, (_, h) => (
            <g key={h}>
              <line
                x1={mapX(h)}
                y1={chartY + chartH}
                x2={mapX(h)}
                y2={chartY + chartH + 4}
                stroke="#64748B"
              />
              <text
                x={mapX(h)}
                y={chartY + chartH + 15}
                textAnchor="middle"
                fontSize="8.5"
                fill="#94A3B8"
                fontFamily="monospace"
              >
                {h}h
              </text>
            </g>
          ))}

          <polyline
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.6"
            points={polylinePoints}
          />

          <text
            x={chartX + 8}
            y={chartY + 14}
            fontSize="9"
            fill="#E2E8F0"
            fontFamily="monospace"
            fontWeight="bold"
          >
            C(t) = C_ext + G/Q + (C₀ − C_ext − G/Q)·e^(−ACH·t) · Equilíbrio ≈{" "}
            {Math.round(co2Eq)} ppm
          </text>
        </svg>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Nota técnica:</strong> CO₂ é indicador de
        ventilação, não mede VOCs nem garante qualidade do ar. Esquema conceitual; não
        substitui medição ou projeto. Valores de geração ({taxaGeracaoEfetiva} L/h por
        pessoa) e faixas visuais marcados com status:{" "}
        <span className="font-mono">{CONSTANTES_AR.geracaoCo2PorPessoaLh.status}</span>.
      </p>
    </div>
  );
}