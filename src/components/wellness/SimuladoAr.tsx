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

function classificarCo2(ppm: number) {
  if (ppm <= 800) {
    return {
      rotulo: "Ar fresco",
      corTexto: "text-emerald-700",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
      corHex: "#059669",
    };
  }
  if (ppm <= 1000) {
    return {
      rotulo: "Atenção",
      corTexto: "text-amber-700",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
      corHex: "#d97706",
    };
  }
  if (ppm <= 1500) {
    return {
      rotulo: "Ar carregado",
      corTexto: "text-orange-700",
      badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
      corHex: "#ea580c",
    };
  }
  return {
    rotulo: "Muito abafado",
    corTexto: "text-red-700",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    corHex: "#dc2626",
  };
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
  const co2Final = co2NoTempo(duracaoHoras, paramsCo2);
  const co2Eq = co2EquilibrioPpm(paramsCo2);
  const serie = serieCo2NoTempo(duracaoHoras, paramsCo2, 48);

  const statusFinal = classificarCo2(co2Final);

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

  // Diagnóstico direto em linguagem simples
  const diagnosticoPratico = (() => {
    if (ocupantes === 0) {
      return "Sem pessoas no ambiente, o CO₂ permanece igual ao ar livre (~420 ppm).";
    }
    if (co2Final <= 800) {
      return `Ótimo! Mesmo após ${duracaoHoras}h com ${ocupantes} ${ocupantes === 1 ? "pessoa" : "pessoas"}, o ar continua leve e renovado (${Math.round(co2Final)} ppm).`;
    }
    if (co2Final <= 1000) {
      return `Após ${duracaoHoras}h, o ar começa a ficar um pouco cansativo (${Math.round(co2Final)} ppm). Abrir uma fresta um pouco maior já traz de volta para a faixa verde.`;
    }
    return `Atenção: após ${duracaoHoras}h, o CO₂ chega a ${Math.round(co2Final).toLocaleString("pt-BR")} ppm (${statusFinal.rotulo.toLowerCase()}). Clique em "Janela entreaberta" ou "Ventilação cruzada" acima para ver a queda imediata.`;
  })();

  // Escala do gráfico SVG claro — cabeçalho separado da área da curva (zero sobreposição)
  const maxPpmGrafico = Math.max(
    1400,
    Math.min(5000, Math.ceil(Math.max(...serie.map((p) => p.ppm), 1200) / 200) * 200),
  );
  const minPpmGrafico = 350;
  const chartX = 56;
  const chartY = 44;
  const chartW = 594;
  const chartH = 160;

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
  const ultimoPonto = serie[serie.length - 1];
  const endX = mapX(ultimoPonto.tempoH);
  const endY = mapY(ultimoPonto.ppm);
  const badgeEndY = Math.max(chartY + 14, Math.min(chartY + chartH - 18, endY - 14));

  // Evita números grudados no eixo Y quando o topo é muito alto (ex.: 4000 ppm)
  const ticksY = [420, 800, 1000, maxPpmGrafico].filter((val, idx, arr) => {
    if (idx === 0 || idx === arr.length - 1) return true;
    const prevVal = arr[idx - 1];
    return Math.abs(mapY(val) - mapY(prevVal)) >= 14;
  });

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs">
      {/* Cabeçalho claro */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <p className="text-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            Simulador de renovação de ar · {TIPOS_COMODO[tipoComodo].nome}
          </p>
          <p className="text-xs text-muted-foreground">
            Medidas sincronizadas: {comprimentoM.toFixed(1).replace(".", ",")} ×{" "}
            {larguraM.toFixed(1).replace(".", ",")} ×{" "}
            {peDireitoM.toFixed(1).replace(".", ",")} m ({volumeM3.toFixed(1).replace(".", ",")} m³ de ar)
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 font-mono text-[10px] font-bold ${statusFinal.badgeClass}`}
        >
          Em {duracaoHoras}h: {Math.round(co2Final).toLocaleString("pt-BR")} ppm · {statusFinal.rotulo}
        </span>
      </div>

      {/* Controles fáceis de entender */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-foreground">1. Escolha o cômodo</span>
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
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                {TIPOS_COMODO[key].nome}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block space-y-1.5">
            <span className="flex items-center justify-between text-xs font-medium text-foreground">
              <span>2. Quantas pessoas?</span>
              <span className="font-mono text-[10px] text-muted-foreground">ocupantes</span>
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
                <span>Geração CO₂/pessoa</span>
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
            <span className="flex items-center justify-between text-xs font-medium text-foreground">
              <span>3. Troca de ar (ACH)</span>
              <span className="font-mono text-[10px] text-muted-foreground">trocas/h</span>
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
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                  Math.abs(ach - item.ach) < 0.05
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                {item.rotulo}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="flex items-center justify-between text-xs font-medium text-foreground">
            <span>4. Tempo no local</span>
            <span className="font-mono text-xs font-bold text-primary">{duracaoHoras} h</span>
          </span>
          <input
            type="range"
            min={1}
            max={12}
            step={1}
            value={duracaoHoras}
            onChange={(e) => setDuracaoHoras(Number(e.currentTarget.value))}
            className="w-full accent-primary"
          />
          <span className="block text-[10.5px] leading-snug text-muted-foreground">
            Arraste de 1h (reunião rápida) até 8–12h (noite de sono ou expediente).
          </span>
        </label>
      </div>

      {/* Diagnóstico automático em português direto */}
      <div
        className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
          co2Final <= 800
            ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
            : co2Final <= 1000
              ? "border-amber-200 bg-amber-50/70 text-amber-950"
              : "border-red-200 bg-red-50/70 text-red-950"
        }`}
      >
        <strong>Leitura prática:</strong> {diagnosticoPratico}
      </div>

      {/* Cards de evolução no tempo com cor intuitiva + Impacto no ar-condicionado */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { rotulo: "Após 1 hora", valor: co2Em1h },
          { rotulo: "Após 4 horas", valor: co2Em4h },
          { rotulo: "Após 8 horas", valor: co2Em8h },
          { rotulo: "Teto máximo (estabiliza)", valor: co2Eq },
        ].map((card) => {
          const st = classificarCo2(card.valor);
          return (
            <div
              key={card.rotulo}
              className="rounded-xl border border-border bg-background/60 px-3 py-2.5"
            >
              <span className="block text-[10.5px] text-muted-foreground">{card.rotulo}</span>
              <span className={`mt-0.5 block font-mono text-base font-bold ${st.corTexto}`}>
                {Math.round(card.valor).toLocaleString("pt-BR")} ppm
              </span>
              <span
                className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${st.badgeClass}`}
              >
                {st.rotulo}
              </span>
            </div>
          );
        })}

        <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5">
          <span className="block text-[10.5px] font-semibold text-amber-900">
            Impacto no ar-condicionado
          </span>
          <span className="mt-0.5 block font-mono text-base font-bold text-amber-700">
            {Math.round(cargaRenovacaoAtualW)} W
            {deltaT > 0 && (
              <span className="ml-1 text-[10px] font-normal text-amber-900/80">
                ({diferencaCargaW >= 0 ? "+" : ""}
                {Math.round(diferencaCargaW)} W vs. fechado)
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-[10px] leading-snug text-amber-950/80">
            {deltaT > 0
              ? `A rua está ${deltaT.toFixed(1).replace(".", ",")} °C mais quente: ventilar traz ar puro, mas exige um pouco mais do ar-condicionado.`
              : `A rua está fresca (${temperaturaExternaC.toFixed(0)} °C): você renova o ar de graça sem esquentar a sala!`}
          </span>
        </div>
      </div>

      {/* Gráfico SVG Claro — Limpo, legível e sem fórmula colidindo com a linha */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2.5 sm:p-4 shadow-inner print:print-color-adjust-exact">
        <svg
          viewBox="0 0 680 250"
          className="w-full h-auto"
          role="img"
          aria-label="Gráfico de evolução do CO₂ ao longo das horas com faixas de ar fresco, atenção e ar carregado"
        >
          {/* Cabeçalho fora da área da curva */}
          <text x="18" y="22" fontSize="11" fill="#0f172a" fontWeight="bold">
            Como o CO₂ sobe ao longo das horas ({ocupantes}{" "}
            {ocupantes === 1 ? "pessoa" : "pessoas"} · {ach.toFixed(1).replace(".", ",")} trocas/h)
          </text>
          <text x="662" y="22" textAnchor="end" fontSize="10" fill="#475569" fontFamily="monospace">
            Ar livre: 420 ppm · Teto: ~{Math.round(co2Eq).toLocaleString("pt-BR")} ppm
          </text>

          {/* Fundo branco da área do gráfico */}
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

          {/* Faixas coloridas suaves */}
          <rect
            x={chartX + 1}
            y={y800}
            width={chartW - 2}
            height={Math.max(0, chartY + chartH - y800 - 1)}
            fill="#10b981"
            fillOpacity="0.12"
          />
          <rect
            x={chartX + 1}
            y={y1000}
            width={chartW - 2}
            height={Math.max(0, y800 - y1000)}
            fill="#f59e0b"
            fillOpacity="0.14"
          />
          <rect
            x={chartX + 1}
            y={chartY + 1}
            width={chartW - 2}
            height={Math.max(0, y1000 - chartY - 1)}
            fill="#ef4444"
            fillOpacity="0.08"
          />

          {/* Linhas de referência tracejadas */}
          <line
            x1={chartX}
            y1={y800}
            x2={chartX + chartW}
            y2={y800}
            stroke="#059669"
            strokeDasharray="5 4"
            strokeWidth="1.2"
          />
          <line
            x1={chartX}
            y1={y1000}
            x2={chartX + chartW}
            y2={y1000}
            stroke="#d97706"
            strokeDasharray="5 4"
            strokeWidth="1.2"
          />

          {/* Eixos */}
          <line
            x1={chartX}
            y1={chartY}
            x2={chartX}
            y2={chartY + chartH}
            stroke="#64748b"
            strokeWidth="1.4"
          />
          <line
            x1={chartX}
            y1={chartY + chartH}
            x2={chartX + chartW}
            y2={chartY + chartH}
            stroke="#64748b"
            strokeWidth="1.4"
          />

          {/* Eixo Y sem colisão */}
          {ticksY.map((val) => (
            <text
              key={val}
              x={chartX - 8}
              y={mapY(val) + 3.5}
              textAnchor="end"
              fontSize="9.5"
              fill={val === 800 ? "#047857" : val === 1000 ? "#b45309" : "#475569"}
              fontFamily="monospace"
              fontWeight={val === 800 || val === 1000 ? "bold" : "normal"}
            >
              {val}
            </text>
          ))}

          {/* Eixo X (Horas) */}
          {Array.from({ length: duracaoHoras + 1 }, (_, h) => (
            <g key={h}>
              <line
                x1={mapX(h)}
                y1={chartY + chartH}
                x2={mapX(h)}
                y2={chartY + chartH + 4}
                stroke="#64748b"
              />
              <text
                x={mapX(h)}
                y={chartY + chartH + 16}
                textAnchor="middle"
                fontSize="9.5"
                fill="#475569"
                fontFamily="monospace"
              >
                {h}h
              </text>
            </g>
          ))}

          {/* Curva principal */}
          <polyline
            fill="none"
            stroke="#0284c7"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylinePoints}
          />

          {/* Ponto final destacado com etiqueta segura à esquerda */}
          <circle cx={endX} cy={endY} r="5" fill={statusFinal.corHex} stroke="#ffffff" strokeWidth="2" />
          <g transform={`translate(${endX - 118}, ${badgeEndY - 12})`}>
            <rect
              width="110"
              height="22"
              rx="11"
              fill="#ffffff"
              stroke={statusFinal.corHex}
              strokeWidth="1.4"
            />
            <text
              x="55"
              y="14.5"
              textAnchor="middle"
              fill={statusFinal.corHex}
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {Math.round(ultimoPonto.ppm).toLocaleString("pt-BR")} ppm
            </text>
          </g>

          {/* Legenda limpa no rodapé — sem encostar na curva */}
          <g transform="translate(56, 238)">
            <rect x="0" y="-8" width="12" height="10" rx="2" fill="#10b981" fillOpacity="0.35" stroke="#059669" />
            <text x="18" y="0" fontSize="9.8" fill="#047857" fontWeight="bold">
              Até 800 ppm: Ar fresco
            </text>

            <rect x="172" y="-8" width="12" height="10" rx="2" fill="#f59e0b" fillOpacity="0.35" stroke="#d97706" />
            <text x="190" y="0" fontSize="9.8" fill="#b45309" fontWeight="bold">
              800–1.000 ppm: Atenção
            </text>

            <rect x="352" y="-8" width="12" height="10" rx="2" fill="#ef4444" fillOpacity="0.25" stroke="#dc2626" />
            <text x="370" y="0" fontSize="9.8" fill="#b91c1c" fontWeight="bold">
              Acima de 1.000 ppm: Carregado (abrir janela)
            </text>
          </g>
        </svg>
      </div>

      {/* Memória técnica e fórmula recolhível (sem poluir o gráfico) */}
      <details className="rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-[11px] text-muted-foreground">
        <summary className="cursor-pointer font-semibold text-foreground hover:text-primary">
          Ver fórmula matemática e premissas técnicas do cálculo
        </summary>
        <div className="mt-2 space-y-1.5 leading-relaxed">
          <p className="font-mono text-[10.5px] text-foreground">
            C(t) = C_ext + G/Q + (C₀ − C_ext − G/Q) · e^(−ACH · t)
          </p>
          <p>
            <strong>Parâmetros atuais:</strong> C_ext = {CONSTANTES_AR.co2ExternoPpm.valor} ppm ·
            G = {ocupantes} × {taxaGeracaoEfetiva} L/h · Q ={" "}
            {(ach * volumeM3).toFixed(1).replace(".", ",")} m³/h · Equilíbrio ≈{" "}
            {Math.round(co2Eq).toLocaleString("pt-BR")} ppm.
          </p>
          <p>
            CO₂ é um indicador de ventilação (não mede VOCs nem substitui medição real ou projeto de
            climatização). Status das constantes:{" "}
            <span className="font-mono">{CONSTANTES_AR.geracaoCo2PorPessoaLh.status}</span>.
          </p>
        </div>
      </details>
    </div>
  );
}