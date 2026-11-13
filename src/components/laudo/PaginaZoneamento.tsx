// src/components/laudo/PaginaZoneamento.tsx
//
// Página 2 do laudo: enquadramento normativo (NBR 15220-3) e diretrizes construtivas.
// Extraída da rota para o laudo ficar legível; os textos de fallback e as regras de
// "o que mostrar quando o dado não veio" são os mesmos de antes.

import { Layers, ShieldCheck, Thermometer } from "lucide-react";
import { formatarNumero } from "@/utils/calculosBioclimaticos";
import { FOLHA_A4, LaudoFooter, LaudoHeader } from "./LaudoChrome";

type Diretriz = { diretriz: string; detalhamento?: string; norma?: string };

function ListaDiretrizes({ itens, tom }: { itens: Diretriz[]; tom: "conforto" | "resiliencia" }) {
  return (
    <div className="flex-1 space-y-2">
      {itens.slice(0, 4).map((item, idx) => (
        <div key={idx} className="rounded-xl border border-line bg-white p-2.5">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10.5px] font-extrabold leading-tight text-ink-deep">{item.diretriz}</span>
            {item.norma && (
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                  tom === "conforto" ? "bg-surface-soft text-brand-deep" : "bg-canvas text-ink-soft"
                }`}
              >
                {item.norma}
              </span>
            )}
          </div>
          {item.detalhamento && <p className="mt-1 text-[10px] leading-snug text-ink-soft">{item.detalhamento}</p>}
        </div>
      ))}
    </div>
  );
}

export function PaginaZoneamento({
  dados,
  cidade,
  uf,
  chuvaMm,
  nomeProjeto,
  pagina,
  totalPaginas,
  codigo,
}: {
  dados: any;
  cidade: string;
  uf: string;
  chuvaMm: number | null;
  nomeProjeto: string;
  pagina: number;
  totalPaginas: number;
  codigo?: string;
}) {
  const zb = `${dados.zona}${dados.subzona}`;

  const confortoDetalhado: Diretriz[] =
    Array.isArray(dados.diretrizes_conforto_detalhadas) && dados.diretrizes_conforto_detalhadas.length > 0
      ? dados.diretrizes_conforto_detalhadas
      : (Array.isArray(dados.estrategias_conforto) ? dados.estrategias_conforto : []).map((d: string) => ({
          diretriz: d,
          detalhamento: "Estratégia passiva de desempenho térmico catalogada para esta zona bioclimática.",
        }));

  const resilienciaDetalhada: Diretriz[] =
    Array.isArray(dados.diretrizes_resiliencia_detalhadas) && dados.diretrizes_resiliencia_detalhadas.length > 0
      ? dados.diretrizes_resiliencia_detalhadas
      : (Array.isArray(dados.estrategias_resiliencia) ? dados.estrategias_resiliencia : []).map((d: string) => ({
          diretriz: d,
          detalhamento: "Medida de adaptação e resiliência física recomendada para eventos climáticos da região.",
        }));

  const limiarTbs =
    dados.temp_bulbo_seco_min != null && dados.temp_bulbo_seco_max != null
      ? `${formatarNumero(dados.temp_bulbo_seco_min, 1)}°C a ${formatarNumero(dados.temp_bulbo_seco_max, 1)}°C`
      : dados.temp_bulbo_seco_max != null
      ? `≤ ${formatarNumero(dados.temp_bulbo_seco_max, 1)}°C`
      : dados.temp_bulbo_seco_min != null
      ? `> ${formatarNumero(dados.temp_bulbo_seco_min, 1)}°C`
      : "Conforme subzona";

  return (
    <article className={FOLHA_A4}>
      <LaudoHeader
        secao="01 · Enquadramento normativo"
        nomeProjeto={nomeProjeto}
        pagina={pagina}
        totalPaginas={totalPaginas}
        codigo={codigo}
      />

      {/* Título */}
      <div className="mb-3.5 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-ink-deep px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
            Zona bioclimática {zb}
          </span>
          <span className="rounded-md border border-brand/30 bg-surface-soft px-2.5 py-0.5 text-[10px] font-bold text-brand-deep">
            ABNT NBR 15220-3:2024
          </span>
          {dados.intervalo_nbr15575 && (
            <span className="rounded-md border border-line bg-canvas px-2.5 py-0.5 text-[10px] font-semibold text-ink-soft">
              NBR 15575 · Intervalo {dados.intervalo_nbr15575}
            </span>
          )}
          {dados.amplitude_termica && (
            <span className="rounded-md border border-line bg-white px-2.5 py-0.5 text-[10px] font-semibold text-ink-soft">
              {dados.amplitude_termica}
            </span>
          )}
        </div>
        <h2 className="mt-2 text-xl font-black leading-tight text-ink-deep">{dados.caracteristica || "Classificação oficial"}</h2>
        <p className="mt-0.5 text-[11px] text-ink-soft">
          Local analisado:{" "}
          <strong className="text-ink">
            {dados.municipio || cidade}/{dados.uf || uf}
          </strong>
          {dados.cidade_representativa && (
            <>
              {" "}
              · Cidade-referência da subzona:{" "}
              <strong className="text-ink">
                {dados.cidade_representativa}/{dados.estado_representativo || dados.uf}
              </strong>
            </>
          )}
          {dados.nome_estacao && (
            <>
              {" "}
              · Estação INMET: {dados.nome_estacao} ({formatarNumero(dados.distancia_km, 1)} km)
            </>
          )}
        </p>
      </div>

      {/* Diagnóstico */}
      <div className="mb-3.5 shrink-0 rounded-xl border border-line border-l-4 border-l-brand-deep bg-surface-soft/60 p-3.5">
        <p className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-deep">
          <Thermometer className="size-3.5" aria-hidden="true" /> Diagnóstico higrotérmico da subzona {zb}
        </p>
        <p className="text-xs leading-relaxed text-ink">
          {dados.resumo_climatico ||
            `O município de ${dados.municipio || cidade} insere-se na Zona Bioclimática ${zb} (${dados.caracteristica}), demandando soluções arquitetónicas adaptadas às condições higrotérmicas locais.`}
        </p>
        {dados.criterio_classificacao && (
          <p className="mt-2 border-t border-line pt-2 text-[10.5px] leading-snug text-ink-soft">
            <strong className="text-[9.5px] uppercase tracking-wider text-ink">Critério da norma: </strong>
            {dados.criterio_classificacao}
          </p>
        )}
      </div>

      {/* 4 parâmetros */}
      <div className="mb-3.5 grid shrink-0 grid-cols-4 gap-2.5">
        <div className="rounded-xl border border-line bg-white p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Limiar TBSm (norma)</p>
          <p className="mt-1 text-sm font-black tabular-nums text-ink-deep">{limiarTbs}</p>
          <p className="mt-0.5 text-[9.5px] text-ink-soft">Média anual de bulbo seco</p>
        </div>

        <div className="rounded-xl border border-line bg-white p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Extremos de projeto</p>
          <p className="mt-1 text-sm font-black tabular-nums text-ink-deep">
            {dados.temp_projeto_inverno_c != null && dados.temp_projeto_verao_c != null
              ? `${formatarNumero(dados.temp_projeto_inverno_c, 1)}° / ${formatarNumero(dados.temp_projeto_verao_c, 1)}°C`
              : `${formatarNumero(dados.temp_media, 1)}°C (média)`}
          </p>
          <p className="mt-0.5 text-[9.5px] text-ink-soft">Ref. inverno / verão na zona</p>
        </div>

        <div className="rounded-xl border border-line bg-white p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Umidade e limiar</p>
          <p className="mt-1 text-sm font-black tabular-nums text-ink-deep">
            {dados.umidade_media != null ? `${formatarNumero(dados.umidade_media, 1)}% real` : "N/D"}
          </p>
          <p className="mt-0.5 text-[9.5px] text-ink-soft">
            {dados.umidade_relativa_limiar != null
              ? `Limiar subzona: ${dados.umidade_relativa_condicao === "maior" ? ">" : "≤"} ${formatarNumero(dados.umidade_relativa_limiar, 1)}%`
              : "Subzona definida por inverno (R/M)"}
          </p>
        </div>

        <div className="rounded-xl border border-line bg-white p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">Radiação e chuva local</p>
          <p className="mt-1 text-sm font-black tabular-nums text-ink-deep">
            {dados.radiacao_media != null ? `${formatarNumero(dados.radiacao_media, 0)} W/m²` : "N/D"}
          </p>
          <p className="mt-0.5 text-[9.5px] text-ink-soft">
            {chuvaMm != null ? `Precipitação: ${formatarNumero(chuvaMm, 0)} mm/ano` : "Média horária insolada"}
          </p>
        </div>
      </div>

      {/* Inverno x Verão */}
      {(dados.desafio_inverno || dados.desafio_verao) && (
        <div className="mb-3.5 grid shrink-0 grid-cols-2 gap-3">
          <div className="rounded-xl border border-sky-200 border-l-4 border-l-sky-700 bg-sky-50/70 p-3">
            <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-sky-800">Regime crítico de inverno · zona {zb}</p>
            <p className="mt-1 text-[10.5px] leading-snug text-ink">
              {dados.desafio_inverno || "Requer avaliação de estanqueidade e retenção térmica conforme orientação solar."}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 border-l-4 border-l-amber-700 bg-amber-50/70 p-3">
            <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-amber-800">Regime crítico de verão · zona {zb}</p>
            <p className="mt-1 text-[10.5px] leading-snug text-ink">
              {dados.desafio_verao || "Requer controlo de ganho solar direto nas aberturas e ventilação seletiva."}
            </p>
          </div>
        </div>
      )}

      {/* Diretrizes */}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
        <div className="flex flex-col rounded-2xl border border-line bg-surface-soft/50 p-3.5">
          <div className="mb-2.5 flex items-center justify-between border-b border-line pb-2">
            <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-deep">
              <ShieldCheck className="size-3.5" aria-hidden="true" /> Estratégias passivas de conforto ({confortoDetalhado.length})
            </span>
            <span className="text-[9px] font-bold text-ink-soft">NBR 15220 / 15575</span>
          </div>
          <ListaDiretrizes itens={confortoDetalhado} tom="conforto" />
        </div>

        <div className="flex flex-col rounded-2xl border border-line bg-surface-soft/50 p-3.5">
          <div className="mb-2.5 flex items-center justify-between border-b border-line pb-2">
            <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-ink-deep">
              <Layers className="size-3.5 text-brand-deep" aria-hidden="true" /> Resiliência e adaptação ({resilienciaDetalhada.length})
            </span>
            <span className="text-[9px] font-bold text-ink-soft">Durabilidade e risco</span>
          </div>
          <ListaDiretrizes itens={resilienciaDetalhada} tom="resiliencia" />
        </div>
      </div>

      <LaudoFooter nota="Enquadramento normativo · ABNT NBR 15220-3:2024 e INMET" />
    </article>
  );
}

export default PaginaZoneamento;
