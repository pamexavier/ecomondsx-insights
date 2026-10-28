// src/components/CapaLaudo.tsx
//
// Página 1 do laudo redesenhada como prancha técnica: cabeçalho com régua,
// quadro de clima em tabela, dois painéis de recursos (solar e água) com as
// premissas visíveis, e carimbo de prancha no rodapé.
// Usa só os tokens que o projeto já tem (brand, ink, line, surface-soft...).
// Mantém "pdf-page" e a proporção A4 para o gerarPDFPaginado continuar igual.

import { Droplets, MapPin, Zap } from "lucide-react";
import { formatarMoeda, formatarNumero } from "@/utils/calculosBioclimaticos";

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
};

function BarraScore({ nota }: { nota: number }) {
  const cheios = Math.max(0, Math.min(10, Math.round(nota)));
  return (
    <div className="mt-2 grid grid-cols-10 gap-0.5" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={`h-1.5 ${i < cheios ? "bg-brand-strong" : "bg-line"}`} />
      ))}
    </div>
  );
}

function PainelRecurso({
  icone,
  titulo,
  valor,
  unidade,
  economia,
  detalhe,
  premissas,
  alerta,
  vazio,
  corBarra,
  corTexto,
}: {
  icone: React.ReactNode;
  titulo: string;
  valor?: string;
  unidade?: string;
  economia?: string;
  detalhe?: string;
  premissas?: string[];
  alerta?: string | null;
  vazio?: string;
  corBarra: string;
  corTexto: string;
}) {
  return (
    <section className={`flex flex-col border border-line border-t-4 ${corBarra} bg-white`}>
      <header className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className={corTexto}>{icone}</span>
        <h3 className="text-sm font-semibold text-ink">{titulo}</h3>
      </header>

      {vazio ? (
        <p className="p-3 text-xs leading-relaxed text-ink-soft">{vazio}</p>
      ) : (
        <div className="flex flex-1 flex-col p-3">
          <p className="tabular-nums leading-none">
            <span className={`text-3xl font-bold ${corTexto}`}>{valor}</span>{" "}
            <span className="text-xs font-medium text-ink-soft">{unidade}</span>
          </p>
          {detalhe && <p className="mt-1 text-[11px] text-ink-soft">{detalhe}</p>}

          <p className="mt-3 text-[11px] text-ink-soft">Economia estimada</p>
          <p className="tabular-nums text-lg font-semibold text-ink">
            {economia}
            <span className="text-xs font-normal text-ink-soft"> por ano</span>
          </p>

          {alerta && (
            <p className="mt-3 border-l-2 border-warn-ink bg-warn-soft px-2 py-1.5 text-[10px] leading-snug text-warn-ink">
              {alerta}
            </p>
          )}

          <ul className="mt-3 divide-y divide-line border-t border-line text-[10px] leading-snug text-ink-soft">
            {(premissas ?? []).map((p) => (
              <li key={p} className="py-1">
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
  } = props;

  const notaNum = Number(nota);
  const temNota = Number.isFinite(notaNum);
  const hoje = new Date().toLocaleDateString("pt-BR");

  const celulasClima = [
    { rotulo: "Temperatura média", valor: `${formatarNumero(clima.tempMedia, 1)} °C` },
    { rotulo: "Mínima e máxima", valor: `${formatarNumero(clima.tempMin, 0)} a ${formatarNumero(clima.tempMax, 0)} °C` },
    { rotulo: "Umidade média", valor: `${formatarNumero(clima.umidade, 0)} %` },
    { rotulo: "Radiação global", valor: `${formatarNumero(clima.radiacao, 0)} W/m²` },
  ];

  const escopoPredio = potencialFotovoltaico?.escopo === "edificio_inteiro";
  const alertaSolar =
    [potencialFotovoltaico?.alerta, escopoPredio ? "Valor do edifício inteiro, não da sua unidade." : null]
      .filter(Boolean)
      .join(" ") || null;

  return (
    <div className="pdf-page relative flex aspect-[210/297] w-full flex-col overflow-hidden rounded-md border border-line bg-white p-10 text-ink shadow-sm">
      {/* Cabeçalho */}
      <header className="flex items-start justify-between gap-6 border-b-2 border-ink pb-4">
        <div className="min-w-0">
          <p className="text-xs text-ink-soft">Laudo de viabilidade bioclimática</p>
          <h1 className="mt-1 break-words text-3xl font-bold leading-tight tracking-tight">{nomeProjeto}</h1>
          <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-soft">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-brand-strong" aria-hidden="true" />
            {endereco}
          </p>
        </div>
        <div className="w-40 shrink-0">
          <p className="text-xs text-ink-soft">Score bioclimático</p>
          <p className="tabular-nums leading-none">
            <span className="text-5xl font-bold text-brand-strong">{temNota ? formatarNumero(notaNum, 1) : "–"}</span>
            <span className="text-lg text-ink-soft">/10</span>
          </p>
          {temNota && <BarraScore nota={notaNum} />}
        </div>
      </header>

      <p className="mt-5 border-l-4 border-brand pl-4 text-sm leading-relaxed">
        {resumoScore || "Análise concluída com sucesso."}
      </p>

      {/* Clima */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold">
          Clima local, zona bioclimática {zona}
          {subzona}
        </h2>
        <dl className="mt-2 grid grid-cols-4 divide-x divide-line border-y border-line">
          {celulasClima.map((c) => (
            <div key={c.rotulo} className="px-3 py-2.5 first:pl-0">
              <dt className="text-[11px] text-ink-soft">{c.rotulo}</dt>
              <dd className="mt-0.5 tabular-nums text-lg font-semibold">{c.valor}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Recursos */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold">Recursos do imóvel</h2>
        <div className="mt-2 grid grid-cols-2 gap-4">
          {potencialFotovoltaico && economiaSolar ? (
            <PainelRecurso
              icone={<Zap className="size-4" aria-hidden="true" />}
              titulo="Energia solar fotovoltaica"
              valor={formatarNumero(potencialFotovoltaico.geracaoAnualMaximaKwh, 0)}
              unidade="kWh/ano"
              detalhe={`${formatarNumero(potencialFotovoltaico.maxPaineis, 0)} painéis${
                potencialFotovoltaico.potenciaInstaladaKwp
                  ? ` · ${formatarNumero(potencialFotovoltaico.potenciaInstaladaKwp, 1)} kWp`
                  : ""
              }`}
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
              corBarra="border-t-amber-600"
              corTexto="text-amber-700"
            />
          ) : (
            <PainelRecurso
              icone={<Zap className="size-4" aria-hidden="true" />}
              titulo="Energia solar fotovoltaica"
              vazio="Sem dados do Google Solar para a geometria deste telhado. A estimativa não foi calculada."
              corBarra="border-t-amber-600"
              corTexto="text-amber-700"
            />
          )}

          {economiaAgua ? (
            <PainelRecurso
              icone={<Droplets className="size-4" aria-hidden="true" />}
              titulo="Captação de água da chuva"
              valor={formatarNumero(economiaAgua.m3Ano, 0)}
              unidade="m³/ano aproveitáveis"
              detalhe={
                economiaAgua.limitadoPelaDemanda
                  ? `O telhado capta ${formatarNumero(economiaAgua.volumeCaptavelM3Ano, 0)} m³/ano; o resto transborda`
                  : "Todo o volume captado é usado"
              }
              economia={formatarMoeda(economiaAgua.economiaAnualEstimada)}
              premissas={[...economiaAgua.premissas, economiaAgua.textoImpacto]}
              alerta={economiaAgua.alertaChuva}
              corBarra="border-t-sky-600"
              corTexto="text-sky-700"
            />
          ) : (
            <PainelRecurso
              icone={<Droplets className="size-4" aria-hidden="true" />}
              titulo="Captação de água da chuva"
              vazio="Dados de chuva insuficientes para projetar a captação."
              corBarra="border-t-sky-600"
              corTexto="text-sky-700"
            />
          )}
        </div>
        <p className="mt-2 text-[10px] leading-snug text-ink-soft">
          Valores de pré-dimensionamento. Não substituem projeto de instalação fotovoltaica nem de cisterna.
        </p>
      </section>

      {/* Carimbo de prancha */}
      <footer className="mt-auto grid grid-cols-[1fr_auto_auto_auto] divide-x divide-line border border-ink text-[10px]">
        <div className="px-3 py-1.5">
          <p className="text-ink-soft">Projeto</p>
          <p className="truncate font-semibold">{nomeProjeto}</p>
        </div>
        <div className="px-3 py-1.5">
          <p className="text-ink-soft">Fachada</p>
          <p className="font-semibold">{fachada}</p>
        </div>
        <div className="px-3 py-1.5">
          <p className="text-ink-soft">Fonte solar</p>
          <p className="font-semibold">{fonteSolar}</p>
        </div>
        <div className="px-3 py-1.5">
          <p className="text-ink-soft">Emissão</p>
          <p className="tabular-nums font-semibold">{hoje}</p>
        </div>
      </footer>
    </div>
  );
}

export default CapaLaudo;

