import {
  CONSTANTES_AR,
  CONSTANTES_LUZ,
  FONTES_VOC,
  type FonteVocKey,
  type OrientacaoKey,
  type PosicaoJanelaKey,
} from "@/data/wellness";

export interface ParametrosCo2 {
  volumeM3: number;
  ach: number;
  ocupantes: number;
  geracaoPorPessoaLh?: number;
  cExtPpm?: number;
  c0Ppm?: number;
}

export interface PontoSerieCo2 {
  tempoH: number;
  ppm: number;
}

/**
 * Balanço de massa de mistura perfeita para CO₂:
 * C(t) = C_ext + (G / Q) + (C0 - C_ext - (G / Q)) * e^(-ACH * t)
 * onde G (m³/h) = ocupantes * (geracaoLh / 1000) e Q (m³/h) = ACH * volumeM3.
 */
export function co2NoTempo(tempoH: number, params: ParametrosCo2): number {
  const volume = Math.max(0.1, params.volumeM3);
  const ach = Math.max(0, params.ach);
  const ocupantes = Math.max(0, params.ocupantes);
  const geracaoLh = params.geracaoPorPessoaLh ?? CONSTANTES_AR.geracaoCo2PorPessoaLh.valor;
  const cExt = params.cExtPpm ?? CONSTANTES_AR.co2ExternoPpm.valor;
  const c0 = params.c0Ppm ?? cExt;
  const t = Math.max(0, tempoH);

  const geracaoPpmM3h = ocupantes * geracaoLh * 1000;

  if (ach < 1e-6) {
    return c0 + (geracaoPpmM3h / volume) * t;
  }

  const qM3h = ach * volume;
  const incrementoEquilibrioPpm = geracaoPpmM3h / qM3h;
  const cEquilibrio = cExt + incrementoEquilibrioPpm;

  return cEquilibrio + (c0 - cEquilibrio) * Math.exp(-ach * t);
}

export function co2EquilibrioPpm(params: ParametrosCo2): number {
  const volume = Math.max(0.1, params.volumeM3);
  const ach = Math.max(0.01, params.ach);
  const ocupantes = Math.max(0, params.ocupantes);
  const geracaoLh = params.geracaoPorPessoaLh ?? CONSTANTES_AR.geracaoCo2PorPessoaLh.valor;
  const cExt = params.cExtPpm ?? CONSTANTES_AR.co2ExternoPpm.valor;

  const geracaoPpmM3h = ocupantes * geracaoLh * 1000;
  return cExt + geracaoPpmM3h / (ach * volume);
}

export function serieCo2NoTempo(
  duracaoHoras: number,
  params: ParametrosCo2,
  passos = 48,
): PontoSerieCo2[] {
  const duracao = Math.max(1, duracaoHoras);
  return Array.from({ length: passos + 1 }, (_, i) => {
    const tempoH = (duracao * i) / passos;
    return {
      tempoH,
      ppm: co2NoTempo(tempoH, params),
    };
  });
}

/**
 * Carga térmica sensível de renovação de ar (mesma equação do simulador térmico):
 * Q_ren = 0,3333 * ACH * Volume * max(0, T_ext - T_int)
 */
export function cargaTermicaRenovacaoW(
  ach: number,
  volumeM3: number,
  temperaturaExternaC: number,
  setpointC: number,
): number {
  const deltaT = Math.max(0, temperaturaExternaC - setpointC);
  return (1200 / 3600) * Math.max(0, ach) * Math.max(0, volumeM3) * deltaT;
}

export interface ParametrosVocRelativo {
  fonte: FonteVocKey;
  intensidade: 1 | 2 | 3;
  ach: number;
}

function respostaBrutaEmissaoDecaimento(t: number, k: number, ach: number): number {
  if (t <= 0) return 0;
  if (Math.abs(ach - k) < 1e-5) {
    return t * Math.exp(-ach * t);
  }
  return (Math.exp(-k * t) - Math.exp(-ach * t)) / (ach - k);
}

function picoAnaliticoEmissaoDecaimento(k: number, ach: number): number {
  if (Math.abs(ach - k) < 1e-5) {
    return (1 / ach) * Math.exp(-1);
  }
  const tPico = Math.log(ach / k) / (ach - k);
  return respostaBrutaEmissaoDecaimento(tPico, k, ach);
}

/**
 * Índice relativo de VOCs no tempo (adimensional, sem prometer µg/m³):
 * - Parte de C(0) = 0, modelando apenas a fonte com emissão de 1ª ordem E(t) = E0 * e^(-k * t)
 *   diluída pela renovação de ar ACH: dC/dt + ACH * C = E(t).
 * - Normalizado pelo pico analítico do cenário de referência (ACH = 0,5 h⁻¹, intensidade = 3),
 *   de modo que a fonte com fator 1,0 atinja exatamente 100 no pico do cenário de referência.
 * - Sem teto artificial que achate a curva em ventilações muito baixas.
 */
export function vocRelativoNoTempo(tempoH: number, params: ParametrosVocRelativo): number {
  const t = Math.max(0, tempoH);
  if (t === 0) return 0;

  const ach = Math.max(0.05, params.ach);
  const dadosFonte = FONTES_VOC[params.fonte];
  const k = dadosFonte.kDecaimentoHora.valor;
  const achReferencia = 0.5;

  const picoRef = picoAnaliticoEmissaoDecaimento(k, achReferencia);
  if (picoRef <= 0) return 0;

  const escalaFonte =
    100 * (params.intensidade / 3) * dadosFonte.fatorEmissaoRelativo.valor;
  const respostaAtual = respostaBrutaEmissaoDecaimento(t, k, ach);

  return Math.max(0, escalaFonte * (respostaAtual / picoRef));
}

export interface ParametrosLuzNatural {
  comprimentoM: number;
  larguraM: number;
  peDireitoM: number;
  areaVidroM2: number;
  tvVidro: number;
  anguloCeuGraus?: number;
  refletanciaMedia?: number;
  fatorCorrecaoEsquadria?: number;
}

export type MotorLuzNaturalFn = (params: ParametrosLuzNatural) => number;

/**
 * Fator de Luz do Dia médio (fórmula do BRE) em percentual (ex.: 3.5 para 3,5%):
 * FLD (%) = (T * Aw * θ) / (A_total * (1 - R²))
 * onde T = Tv * 0,8; A_total = 2*(C*L + C*PD + L*PD); θ em graus (máximo físico de 90° para janela vertical).
 * Arquitetura desacoplada: pode ser substituída por outro motor no futuro.
 */
export const fatorLuzDiaMedio: MotorLuzNaturalFn = ({
  comprimentoM,
  larguraM,
  peDireitoM,
  areaVidroM2,
  tvVidro,
  anguloCeuGraus = CONSTANTES_LUZ.anguloCeuPadraoGraus.valor,
  refletanciaMedia = CONSTANTES_LUZ.refletanciaMediaInterna.valor,
  fatorCorrecaoEsquadria = CONSTANTES_LUZ.fatorManutencaoEsquadria.valor,
}: ParametrosLuzNatural): number => {
  const c = Math.max(0.5, comprimentoM);
  const l = Math.max(0.5, larguraM);
  const pd = Math.max(1.5, peDireitoM);
  const aw = Math.max(0, areaVidroM2);
  // Limite físico de 90° para abertura vertical
  const theta = Math.max(5, Math.min(90, anguloCeuGraus));
  const r = Math.max(0.05, Math.min(0.9, refletanciaMedia));
  const tEfetivo = Math.max(0, Math.min(1, tvVidro)) * fatorCorrecaoEsquadria;

  const areaTotalInternaM2 = 2 * (c * l + c * pd + l * pd);
  const denominador = areaTotalInternaM2 * (1 - r * r);
  if (denominador <= 0) return 0;

  return (tEfetivo * aw * theta) / denominador;
};

export function iluminanciaMedia(
  fldPercentual: number,
  iluminanciaExternaLux = CONSTANTES_LUZ.iluminanciaExternaCeuEncobertoLux.valor,
): number {
  return (Math.max(0, fldPercentual) / 100) * Math.max(0, iluminanciaExternaLux);
}

/**
 * Perfil meramente ilustrativo ao longo da profundidade do cômodo,
 * normalizado para que a média da curva corresponda à iluminância média calculada.
 */
export function perfilIlustrativoProfundidade(
  profundidadeTotalM: number,
  eMediaLux: number,
  pontos = 24,
): { distanciaM: number; lux: number }[] {
  const prof = Math.max(1, profundidadeTotalM);
  const k = 1.65 / prof;
  const brutos = Array.from({ length: pontos + 1 }, (_, i) => {
    const distanciaM = (prof * i) / pontos;
    const peso = Math.exp(-k * distanciaM);
    return { distanciaM, peso };
  });
  const mediaPesos = brutos.reduce((acc, item) => acc + item.peso, 0) / brutos.length;
  const fatorNormalizacao = mediaPesos > 0 ? eMediaLux / mediaPesos : 0;

  return brutos.map((item) => ({
    distanciaM: item.distanciaM,
    lux: item.peso * fatorNormalizacao,
  }));
}

export function alcanceLuzUtilM(
  peDireitoM: number,
  posicaoJanelas: PosicaoJanelaKey,
  alturaPlanoTrabalhoM = 0.75,
): { alturaVergaAcimaPlanoM: number; alcanceMinM: number; alcanceMaxM: number } {
  const cotaVergaM =
    posicaoJanelas === "altas"
      ? peDireitoM - 0.15
      : posicaoJanelas === "baixas"
        ? Math.min(peDireitoM - 0.45, 2.1)
        : peDireitoM - 0.35;
  const alturaVergaAcimaPlanoM = Math.max(0.5, cotaVergaM - alturaPlanoTrabalhoM);
  return {
    alturaVergaAcimaPlanoM,
    alcanceMinM:
      alturaVergaAcimaPlanoM * CONSTANTES_LUZ.multiplicadorProfundidadeLuzUtil.valor.min,
    alcanceMaxM:
      alturaVergaAcimaPlanoM * CONSTANTES_LUZ.multiplicadorProfundidadeLuzUtil.valor.max,
  };
}

export interface ParametrosFluxoArtificial {
  iluminanciaAlvoLux: number;
  areaPisoM2: number;
  uf?: number;
  mf?: number;
  eficaciaLmW?: number;
}

/**
 * Método dos lúmens:
 * Φ = (E_alvo * A_piso) / (UF * MF)
 * Potência (W) = Φ / eficácia
 */
export function fluxoNecessario({
  iluminanciaAlvoLux,
  areaPisoM2,
  uf = CONSTANTES_LUZ.fatorUtilizacaoLumens.valor,
  mf = CONSTANTES_LUZ.fatorManutencaoLumens.valor,
  eficaciaLmW = CONSTANTES_LUZ.eficaciaLedPadraoLmW.valor,
}: ParametrosFluxoArtificial): {
  fluxoLumens: number;
  potenciaTotalW: number;
  densidadePotenciaWm2: number;
} {
  const area = Math.max(0.1, areaPisoM2);
  const denominador = Math.max(0.05, uf * mf);
  const eficacia = Math.max(10, eficaciaLmW);
  const fluxoLumens = (Math.max(0, iluminanciaAlvoLux) * area) / denominador;
  const potenciaTotalW = fluxoLumens / eficacia;
  const densidadePotenciaWm2 = potenciaTotalW / area;

  return {
    fluxoLumens,
    potenciaTotalW,
    densidadePotenciaWm2,
  };
}

export function avaliarOfuscamentoQualitativo(params: {
  orientacao: OrientacaoKey;
  percentualVidro: number;
  reducaoSolarBrise: number;
  posicaoJanelas: PosicaoJanelaKey;
  tvVidro: number;
}): {
  nivel: "Baixo" | "Médio" | "Alto";
  resumo: string;
} {
  let score = 0;

  if (params.orientacao === "O" || params.orientacao === "L") score += 2;
  else if (params.orientacao === "N") score += 1;

  if (params.percentualVidro >= 40) score += 2;
  else if (params.percentualVidro >= 25) score += 1;

  if (params.reducaoSolarBrise >= 60) score -= 2;
  else if (params.reducaoSolarBrise >= 35) score -= 1;

  if (params.posicaoJanelas === "baixas" || params.posicaoJanelas === "centro") score += 1;
  if (params.tvVidro <= 0.55) score -= 1;

  if (score >= 3) {
    return {
      nivel: "Alto",
      resumo:
        "Sol em ângulo baixo (Leste/Oeste) ou grande área envidraçada na linha de visão sem proteção externa pode gerar contraste excessivo.",
    };
  }
  if (score >= 1) {
    return {
      nivel: "Médio",
      resumo:
        "Entrada de luz moderada; dependendo da posição da tela ou mesa de trabalho, pode exigir controle por brise, cortina difusora ou reposicionamento.",
    };
  }
  return {
    nivel: "Baixo",
    resumo:
      "Menor incidência direta no campo de visão principal, favorecida por proteção solar, orientação Sul/Norte sombreada ou abertura alta.",
  };
}