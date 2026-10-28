// src/utils/calculosBioclimaticos.ts  (arquivo completo, substitui o atual)
//
// Mudanças em relação ao original:
//  - Solar: NÃO aplica mais o fator 0,85 aqui (o n8n 6c já entrega energia AC).
//    Removido o teto arbitrário de 180 kWh/m² e o limite de painéis por área.
//  - Água: coeficiente de escoamento, perda de filtro/descarte e limite pela
//    demanda de uso não potável. Premissas ficam visíveis no relatório.
//  - Área do telhado: só chaves que são telhado de verdade (a área dos painéis
//    "areaDisponivelM2" não é mais usada como área de captação de chuva).
//  - Novo: obterAreaTelhadoComOrigem (diz se a área é medida ou de referência).
//
// ATENÇÃO: aplique junto com o patch do node 6c. Se só este arquivo for
// atualizado e o n8n ainda mandar DC, a geração fica superestimada.

type Bruto = Record<string, unknown> | null | undefined;

const num = (v: unknown): number | null => {
  const x = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(x) ? x : null;
};

export const formatarNumero = (
  valor: number | string | undefined | null,
  casas: number = 1,
): string => {
  if (valor === undefined || valor === null || Number.isNaN(Number(valor))) {
    return "Indisponível";
  }

  return Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
};

export const formatarMoeda = (valor: number): string =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── PREMISSAS (um lugar só para ajustar) ────────────────────────────────────
export const PREMISSAS_AGUA = {
  coefEscoamento: 0.8,           // telha cerâmica/fibrocimento (NBR 15527 usa ~0,8)
  eficienciaFiltroDescarte: 0.9, // perda no filtro e descarte da primeira chuva
  tarifaM3: 8.5,                 // a mesma que o relatório já usava
  moradoresReferencia: 3,
  litrosNaoPotavelPessoaDia: 50, // descarga, limpeza, rega
  areaReferenciaM2: 100,         // só quando não há área medida
  chuvaAnualAtipicaMm: 2200,
};

export const PREMISSAS_SOLAR = {
  tarifaKwh: 0.85,       // a mesma que o relatório já usava
  consumoCasaKwhAno: 3000, // para a equivalência "residências médias"
};

// ── ÁREA DO TELHADO ─────────────────────────────────────────────────────────
const CHAVES_AREA_TELHADO = [
  "areaTelhadoProjecaoM2", "area_telhado_projecao_m2",
  "areaTelhadoM2", "area_telhado_m2",
  "superficieTelhadoM2", "superficie_telhado_m2",
  "telhadoM2", "telhado_m2",
];

export function obterAreaTelhadoReal(origem?: Record<string, unknown> | null, fallback: number = 100): number {
  if (!origem || typeof origem !== "object") return fallback;
  for (const chave of CHAVES_AREA_TELHADO) {
    const v = num(origem[chave]);
    if (v && v > 0) return v;
  }
  return fallback;
}

export function obterAreaTelhadoComOrigem(
  hidrico?: Bruto,
  fotovoltaico?: Bruto,
): { areaM2: number; origem: "medida" | "referencia" } {
  for (const fonte of [hidrico, fotovoltaico]) {
    if (!fonte || typeof fonte !== "object") continue;
    for (const chave of CHAVES_AREA_TELHADO) {
      const v = num(fonte[chave]);
      if (v && v > 0) return { areaM2: v, origem: "medida" };
    }
  }
  return { areaM2: PREMISSAS_AGUA.areaReferenciaM2, origem: "referencia" };
}

// ── ÁGUA DA CHUVA ───────────────────────────────────────────────────────────
export function calcularEconomiaAgua(
  precipitacaoMmAno: number | string | null | undefined,
  areaTelhadoRefM2: number = 100,
  opcoes?: { moradores?: number; demandaNaoPotavelM3Ano?: number },
) {
  const chuva = num(precipitacaoMmAno);
  const area = num(areaTelhadoRefM2);
  if (!chuva || chuva <= 0 || !area || area <= 0) return null;

  const P = PREMISSAS_AGUA;
  const volumeCaptavelM3Ano = (chuva * area * P.coefEscoamento * P.eficienciaFiltroDescarte) / 1000;

  const moradores = opcoes?.moradores ?? P.moradoresReferencia;
  const demandaNaoPotavelM3Ano =
    opcoes?.demandaNaoPotavelM3Ano ?? (moradores * P.litrosNaoPotavelPessoaDia * 365) / 1000;

  const m3Ano = Math.min(volumeCaptavelM3Ano, demandaNaoPotavelM3Ano); // o excedente transborda
  const limitadoPelaDemanda = volumeCaptavelM3Ano > demandaNaoPotavelM3Ano;
  const coberturaDemandaPct = Math.round(Math.min(volumeCaptavelM3Ano / demandaNaoPotavelM3Ano, 1) * 100);

  return {
    litrosAno: m3Ano * 1000,
    m3Ano,                       // volume aproveitável (o que gera economia)
    volumeCaptavelM3Ano,
    demandaNaoPotavelM3Ano,
    limitadoPelaDemanda,
    coberturaDemandaPct,
    economiaAnualEstimada: m3Ano * P.tarifaM3,
    alertaChuva:
      chuva > P.chuvaAnualAtipicaMm
        ? `Chuva anual de ${formatarNumero(chuva, 0)} mm está acima do esperado para a região; revise a série da estação.`
        : null,
    premissas: [
      `Chuva ${formatarNumero(chuva, 0)} mm/ano`,
      `Telhado ${formatarNumero(area, 0)} m² (projeção horizontal)`,
      `Escoamento ${formatarNumero(P.coefEscoamento, 2)} · filtro e descarte ${formatarNumero(P.eficienciaFiltroDescarte, 2)}`,
      `Uso não potável ${formatarNumero(demandaNaoPotavelM3Ano, 0)} m³/ano (${moradores} moradores × ${P.litrosNaoPotavelPessoaDia} L/dia)`,
      `Tarifa ${formatarMoeda(P.tarifaM3)}/m³`,
    ],
    textoImpacto: limitadoPelaDemanda
      ? "O telhado capta mais do que a casa usa em descarga, limpeza e rega; o excedente transborda da cisterna."
      : `A captação cobre cerca de ${coberturaDemandaPct}% do uso não potável estimado.`,
  };
}

// ── FOTOVOLTAICO ────────────────────────────────────────────────────────────
// Confia na configuração que o n8n (node 6c) escolheu. Sem teto por m²: ele
// cortava painéis modernos, que passam de 180 kWh/m²·ano.
export function normalizarPotencialFotovoltaico(potencial?: Record<string, number | string | undefined> | null) {
  if (!potencial || typeof potencial !== "object") return null;
  const p = potencial as Record<string, unknown>;

  const geracaoAnual = num(p.geracaoAnualMaximaKwh ?? p.geracao_anual_maxima_kwh);
  if (!geracaoAnual || geracaoAnual <= 0) return null;

  return {
    maxPaineis: num(p.maxPaineis ?? p.max_paineis) ?? 0,
    areaDisponivelM2: num(p.areaDisponivelM2 ?? p.area_disponivel_m2) ?? 0,
    geracaoAnualMaximaKwh: geracaoAnual, // AC, vem do n8n
    geracaoMensalMediaKwh: num(p.geracaoMensalMediaKwh ?? p.geracao_mensal_media_kwh) ?? geracaoAnual / 12,
    potenciaInstaladaKwp: num(p.potenciaInstaladaKwp),
    rendimentoEspecificoKwhKwp: num(p.rendimentoEspecificoKwhKwp),
    escopo: typeof p.escopo === "string" ? p.escopo : null,
    alerta: typeof p.alerta === "string" ? p.alerta : null,
  };
}

export function calcularEconomiaSolar(geracaoKwhAno: number | string, consumoAnualKwh?: number | null) {
  const geracao = num(geracaoKwhAno);
  if (!geracao || geracao <= 0) return null;

  const S = PREMISSAS_SOLAR;
  const aproveitada = consumoAnualKwh && consumoAnualKwh > 0 ? Math.min(geracao, consumoAnualKwh) : geracao;
  const economiaAnualEstimada = aproveitada * S.tarifaKwh;
  const economiaMensalEstimada = economiaAnualEstimada / 12;
  const casasAbastecidasAno = geracao / S.consumoCasaKwhAno;

  return {
    economiaAnualEstimada,
    economiaMensalEstimada,
    premissas: [
      `Tarifa ${formatarMoeda(S.tarifaKwh)}/kWh`,
      consumoAnualKwh ? `Limitada ao consumo de ${formatarNumero(consumoAnualKwh, 0)} kWh/ano` : "Sem limite de consumo informado",
    ],
    textoImpacto: `Geração estimada de ${formatarNumero(geracao, 0)} kWh/ano (AC, já com perdas), economia de ${formatarMoeda(economiaMensalEstimada)}/mês e equivalente a ${formatarNumero(casasAbastecidasAno, 1)} residências médias. A economia real depende do consumo e das regras de compensação.`,
  };
}