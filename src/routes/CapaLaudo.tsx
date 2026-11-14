// src/routes/CapaLaudo.tsx
//
// Página 1 do laudo (capa executiva): cabeçalho de marca, bloco de identificação,
// score em anel, quadro de zona bioclimática, telemetria climática e os dois
// painéis de recursos (solar e água) com premissas e alertas visíveis.
// Mantém "pdf-page" e a proporção A4 para o gerarPDFPaginado continuar igual.

import { Activity, AlertTriangle, Compass, Droplets, MapPin, Sun, Thermometer, Zap } from "lucide-react";
import { formatarMoeda, formatarNumero } from "@/utils/calculosBioclimaticos";
import { FOLHA_A4, LaudoFooter } from "@/components/laudo/LaudoChrome";

type EconomiaAgua = {
  m3Ano: number;
  volumeCaptavelM3Ano: number;
  limitadoPelaDemanda: boolean;
  economiaAnualEstimada: number;
  alertaChuva: string | null;
  premissas: string[];
  textoImpacto: string;
} | null;

type EconomiaSolar = {
  economiaAnualEstimada: number;
  premissas: string[];
  textoImpacto: string;
} | null;

type PotencialFV = {
  geracaoAnualMaximaKwh: number;
  areaDisponivelM2: number;
  maxPaineis: number;
  potenciaInstaladaKwp: number | null;
  rendimentoEspecificoKwhKwp: number | null;
  escopo: string | null;
  alerta: string | null;
} | null;

export type CapaLaudoProps = {
  nomeProjeto: string;
  endereco: string;
  fachada: string;
  zona?: string;
  subzona?: string;
  nota?: number | string | null;
  resumoScore?: string;
  fonteSolar: string;
  clima: {
    tempMedia?: number | string | null;
    tempMin?: number | string | null;
    tempMax?: number | string | null;
    umidade?: number | string | null;
    radiacao?: number | string | null;
  };
  economiaAgua: EconomiaAgua;
  economiaSolar: EconomiaSolar;
  potencialFotovoltaico: PotencialFV;
  // ── Opcionais (novo visual): se não vierem, o bloco correspondente se adapta ──
  finalidade?: string;
  tipologia?: string;
  coordenadas?: string;
  azimute?: number | null;
  percentualIluminacao?: number | null;
  entornoResumo?: string;
  intervaloNbr15575?: string | number | null;
  caracteristicaZona?: string | null;
  amplitudeTermica?: string | null;
  estacaoInmet?: string | null;
  distanciaEstacaoKm?: number | string | null;
  codigo?: string;
  totalPaginas?: number;
};

function AnelScore({ nota }: { nota: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, nota / 10));
  return (
    <div className="relative flex size-24 shrink-0 items-center justify-center" aria-hidden="true">
      <svg className="size-24 -rotate-90" viewBox="0 0 92 92">
        <circle cx="46" cy="46" r={r} fill="none" stroke="#E6EFEA" strokeWidth="7" />
        <circle
          cx="46"
          cy="46"
          r={r}
          fill="none"
          stroke="#2A6B53"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - frac * circ}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black leading-none tabular-nums text-ink-deep">{formatarNumero(nota, 1)}</span>
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-ink-soft">/ 10</span>
      </div>
    </div>
  );
}

function PainelRecurso({
  icone,
  titulo,
  valor,
  unidade,
  chip,
  economia,
  detalhe,
  premissas,
  alerta,
  vazio,
  tom,
}: {
  icone: React.ReactNode;
  titulo: string;
  valor?: string;
  unidade?: string;
  chip?: string;
  economia?: string;
  detalhe?: string;
  premissas?: string[];
  alerta?: string | null;
  vazio?: string;
  tom: "solar" | "agua";
}) {
  const estilo =
    tom === "solar"
      ? { caixa: "border-amber-200 bg-amber-50/50", icone: "bg-amber-100 text-amber-800", texto: "text-amber-800", chip: "bg-amber-100 text-amber-900", div: "border-amber-100" }
      : { caixa: "border-sky-200 bg-sky-50/50", icone: "bg-sky-100 text-sky-800", texto: "text-sky-800", chip: "bg-sky-100 text-sky-900", div: "border-sky-100" };

  return (
    <section className={`flex flex-col rounded-2xl border p-3.5 ${estilo.caixa}`}>
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`flex size-7 items-center justify-center rounded-lg ${estilo.icone}`}>{icone}</span>
          <h3 className={`text-[10px] font-extrabold uppercase tracking-wider ${estilo.texto}`}>{titulo}</h3>
        </div>
        {chip && (
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-black tabular-nums ${estilo.chip}`}>{chip}</span>
        )}
      </header>

      {vazio ? (
        <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">{vazio}</p>
      ) : (
        <div className="flex flex-1 flex-col">
          <p className="mt-3 leading-none tabular-nums">
            <span className={`text-3xl font-black ${estilo.texto}`}>{valor}</span>{" "}
            <span className="text-[11px] font-medium text-ink-soft">{unidade}</span>
          </p>
          {detalhe && <p className="mt-1 text-[11px] text-ink-soft">{detalhe}</p>}

          <div className={`mt-3 border-t pt-2.5 ${estilo.div}`}>
            <p className="text-[10px] font-bold uppercase text-ink-soft">Economia estimada</p>
            <p className="text-lg font-black tabular-nums text-ink-deep">
              {economia}
              <span className="text-[11px] font-normal text-ink-soft"> por ano</span>
            </p>
          </div>

          {alerta && (
            <p className="mt-2.5 flex gap-1.5 rounded-lg border-l-2 border-warn-ink bg-warn-soft px-2 py-1.5 text-[10px] leading-snug text-warn-ink">
              <AlertTriangle className="mt-px size-3 shrink-0" aria-hidden="true" />
              <span>{alerta}</span>
            </p>
          )}

          <ul className={`mt-2.5 divide-y text-[10px] leading-snug text-ink-soft ${estilo.div}`}>
            {(premissas ?? []).map((p) => (
              <li key={p} className={`py-1 ${estilo.div}`}>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function CapaLaudo(props: CapaLaudoProps) {
  const {
    nomeProjeto, endereco, fachada, zona, subzona, nota, resumoScore, fonteSolar,
    clima, economiaAgua, economiaSolar, potencialFotovoltaico,
    finalidade, tipologia, coordenadas, azimute, percentualIluminacao, entornoResumo,
    intervaloNbr15575, caracteristicaZona, amplitudeTermica, estacaoInmet, distanciaEstacaoKm,
    codigo, totalPaginas = 5,
  } = props;

  const notaNum = Number(nota);
  const temNota = nota !== null && nota !== undefined && nota !== "" && Number.isFinite(notaNum);

  const celulasClima = [
    { rotulo: "Temp. média anual", valor: `${formatarNumero(clima.tempMedia, 1)} °C`, sub: "Bulbo seco", Icone: Thermometer },
    { rotulo: "Mínima e máxima", valor: `${formatarNumero(clima.tempMin, 0)}° a ${formatarNumero(clima.tempMax, 0)} °C`, sub: "Faixa anual", Icone: Activity },
    { rotulo: "Umidade média", valor: `${formatarNumero(clima.umidade, 0)} %`, sub: "Média anual", Icone: Droplets },
    { rotulo: "Radiação global", valor: `${formatarNumero(clima.radiacao, 0)} W/m²`, sub: "Média horária", Icone: Sun },
  ];

  const escopoPredio = potencialFotovoltaico?.escopo === "edificio_inteiro";
  const alertaSolar =
    [potencialFotovoltaico?.alerta, escopoPredio ? "Valor do edifício inteiro, não da sua unidade." : null]
      .filter(Boolean)
      .join(" ") || null;

  const azTxt = typeof azimute === "number" && Number.isFinite(azimute) ? ` (${Math.round(azimute)}°)` : "";

  return (
    <div className={FOLHA_A4}>
      <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-ink-deep via-brand-deep to-brand" />

      {/* Masthead */}
      <header className="mt-1 flex shrink-0 items-start justify-between gap-4 border-b border-line pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-ink-deep shadow-sm">
            <Compass className="size-5 text-brand" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-ink-deep">
                VECTOR<span className="text-brand-deep">-X</span>
              </span>
              <span className="rounded border border-brand/30 bg-surface-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-brand-deep">
                Engenharia bioclimática
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-ink-soft">Laudo técnico de viabilidade bioclimática, insolação e sombreamento</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-surface-soft px-3 py-1 text-[10px] font-bold text-brand-deep">
            <span className="size-1.5 rounded-full bg-brand-deep" />
            {fonteSolar}
          </span>
          <p className="mt-1.5 font-mono text-[10px] tabular-nums text-ink-soft">
            {codigo ? `DOC: ${codigo} · ` : ""}PÁG. 01 / {String(totalPaginas).padStart(2, "0")}
          </p>
        </div>
      </header>

      {/* Identificação */}
      <section className="mt-4 shrink-0 rounded-2xl border border-line bg-surface-soft/60 p-4">
        {(finalidade || tipologia) && (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-deep">{finalidade}</span>
            <span className="text-[10px] font-semibold text-ink-soft">{tipologia}</span>
          </div>
        )}
        <h1 className="break-words text-2xl font-black leading-tight tracking-tight text-ink-deep">{nomeProjeto}</h1>
        <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-ink">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-brand-deep" aria-hidden="true" />
          <span>
            {endereco}
            {coordenadas && <span className="ml-3 font-mono text-[11px] tabular-nums text-ink-soft">Coord: {coordenadas}</span>}
          </span>
        </p>

        <div className="mt-3 grid grid-cols-3 gap-4 border-t border-line pt-3">
          <div>
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-ink-soft">Fachada analisada</p>
            <p className="mt-0.5 text-sm font-black tabular-nums text-ink-deep">
              {fachada}
              {azTxt}
            </p>
          </div>
          <div>
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-ink-soft">Sol direto na fachada</p>
            <p className="mt-0.5 text-sm font-black tabular-nums text-brand-deep">
              {percentualIluminacao != null ? `${percentualIluminacao}% dos horários` : "–"}
            </p>
          </div>
          <div>
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-ink-soft">Interferência do entorno</p>
            <p className="mt-0.5 text-sm font-bold text-ink-deep">{entornoResumo || "Sem medição do entorno"}</p>
          </div>
        </div>
      </section>

      {/* Score + zona */}
      <section className="mt-3 grid shrink-0 grid-cols-12 gap-4">
        <div className="col-span-7 flex items-center gap-5 rounded-2xl border border-line bg-white p-4">
          {temNota ? (
            <AnelScore nota={notaNum} />
          ) : (
            <div className="flex size-24 shrink-0 items-center justify-center rounded-full border-[7px] border-line text-2xl font-black text-ink-soft">–</div>
          )}
          <div className="min-w-0">
            <span className="inline-block rounded-md bg-surface-soft px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-brand-deep">
              Score bioclimático
            </span>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink">{resumoScore || "Análise concluída com sucesso."}</p>
          </div>
        </div>

        <div className="col-span-5 flex flex-col justify-between rounded-2xl bg-ink-deep p-4 text-white">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <span className="whitespace-nowrap text-[9.5px] font-bold uppercase tracking-[0.16em] text-brand">NBR 15220-3:2024</span>
              {intervaloNbr15575 != null && intervaloNbr15575 !== "" && (
                <span className="whitespace-nowrap rounded bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-white/90">
                  NBR 15575 · Intervalo {intervaloNbr15575}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="text-4xl font-black tracking-tight tabular-nums">
                ZB {zona ?? "–"}
                {subzona}
              </span>
              <span className="text-xs font-semibold text-brand">Zona oficial</span>
            </div>
            {caracteristicaZona && <p className="mt-1.5 text-[11px] leading-snug text-white/80">{caracteristicaZona}</p>}
          </div>
          {estacaoInmet && (
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/15 pt-2.5 text-[10px] text-white/75">
              <span className="truncate">Estação INMET: {estacaoInmet}</span>
              {distanciaEstacaoKm != null && distanciaEstacaoKm !== "" && (
                <span className="shrink-0 font-mono font-bold tabular-nums text-brand">{formatarNumero(distanciaEstacaoKm, 1)} km</span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Telemetria */}
      <section className="mt-3 shrink-0">
        <h2 className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-ink-soft">
          Telemetria climática de referência · série histórica local
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {celulasClima.map(({ rotulo, valor, sub, Icone }) => (
            <div key={rotulo} className="rounded-xl border border-line bg-white p-2.5">
              <div className="flex items-center justify-between text-brand-deep">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-ink-soft">{rotulo}</span>
                <Icone className="size-3.5" aria-hidden="true" />
              </div>
              <p className="mt-1 text-base font-black tabular-nums text-ink-deep">{valor}</p>
              <p className="mt-0.5 truncate text-[10px] text-ink-soft">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recursos */}
      <section className="mt-3 min-h-0 flex-1">
        <h2 className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-ink-soft">
          Aproveitamento de recursos naturais do imóvel · pré-dimensionamento
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {potencialFotovoltaico && economiaSolar ? (
            <PainelRecurso
              tom="solar"
              icone={<Zap className="size-4" aria-hidden="true" />}
              titulo="Energia solar fotovoltaica"
              valor={formatarNumero(potencialFotovoltaico.geracaoAnualMaximaKwh, 0)}
              unidade="kWh/ano"
              chip={
                potencialFotovoltaico.potenciaInstaladaKwp
                  ? `${formatarNumero(potencialFotovoltaico.potenciaInstaladaKwp, 1)} kWp`
                  : undefined
              }
              detalhe={`${formatarNumero(potencialFotovoltaico.maxPaineis, 0)} painéis`}
              economia={formatarMoeda(economiaSolar.economiaAnualEstimada)}
              premissas={[
                `Área de painéis ${formatarNumero(potencialFotovoltaico.areaDisponivelM2, 0)} m²`,
                ...(potencialFotovoltaico.rendimentoEspecificoKwhKwp
                  ? [`Rendimento ${formatarNumero(potencialFotovoltaico.rendimentoEspecificoKwhKwp, 0)} kWh/kWp·ano (AC)`]
                  : []),
                ...economiaSolar.premissas,
                economiaSolar.textoImpacto,
              ]}
              alerta={alertaSolar}
            />
          ) : (
            <PainelRecurso
              tom="solar"
              icone={<Zap className="size-4" aria-hidden="true" />}
              titulo="Energia solar fotovoltaica"
              vazio="Sem dados do Google Solar para a geometria deste telhado. A estimativa não foi calculada."
            />
          )}

          {economiaAgua ? (
            <PainelRecurso
              tom="agua"
              icone={<Droplets className="size-4" aria-hidden="true" />}
              titulo="Captação de água da chuva"
              valor={formatarNumero(economiaAgua.m3Ano, 0)}
              unidade="m³/ano aproveitáveis"
              chip={`${formatarNumero(economiaAgua.m3Ano / 12, 1)} m³/mês`}
              detalhe={
                economiaAgua.limitadoPelaDemanda
                  ? `O telhado capta ${formatarNumero(economiaAgua.volumeCaptavelM3Ano, 0)} m³/ano; o resto transborda`
                  : "Todo o volume captado é usado"
              }
              economia={formatarMoeda(economiaAgua.economiaAnualEstimada)}
              premissas={[...economiaAgua.premissas, economiaAgua.textoImpacto]}
              alerta={economiaAgua.alertaChuva}
            />
          ) : (
            <PainelRecurso
              tom="agua"
              icone={<Droplets className="size-4" aria-hidden="true" />}
              titulo="Captação de água da chuva"
              vazio="Dados de chuva insuficientes para projetar a captação."
            />
          )}
        </div>
        <p className="mt-2 text-[10px] leading-snug text-ink-soft">
          Valores de pré-dimensionamento. Não substituem projeto de instalação fotovoltaica nem de cisterna.
        </p>
      </section>

      <LaudoFooter nota="Sumário executivo de desempenho ambiental · ABNT NBR 15220-3:2024 e NBR 15575:2024" />
    </div>
  );
}

export default CapaLaudo;
