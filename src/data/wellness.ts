export type OrientacaoKey = "N" | "S" | "L" | "O";
export type EnvoltoriaKey = "concreto" | "ceramica" | "termica";
export type CorTintaKey = "branca" | "terracota" | "grafite";
export type TipoComodoKey = "sala" | "quarto" | "escritorio" | "banheiro";
export type PosicaoJanelaKey = "centro" | "altas" | "baixas" | "distribuidas";
export type TipoVidroKey = "comum" | "controle" | "lowE";
export type FonteVocKey = "tinta" | "movel" | "limpeza";

export interface ValorReferencia<T = number> {
  valor: T;
  unidade?: string;
  fonte: string;
  status: string;
}

export const TIPOS_COMODO: Record<
  TipoComodoKey,
  {
    nome: string;
    subtitulo: string;
    comprimentoPadraoM: number;
    larguraPadraoM: number;
    peDireitoPadraoM: number;
    percentualVidroPadrao: number;
    quantidadeJanelasPadrao: number;
    posicaoJanelasPadrao: PosicaoJanelaKey;
    ocupantesPadrao: number;
    ganhosInternosPadraoWm2: number;
    renovacoesArPadraoAch: number;
    horasOperacaoPadrao: number;
    notaTecnica: string;
  }
> = {
  sala: {
    nome: "Sala de Estar",
    subtitulo: "Permanência prolongada · convívio",
    comprimentoPadraoM: 4.5,
    larguraPadraoM: 6.0,
    peDireitoPadraoM: 2.8,
    percentualVidroPadrao: 30,
    quantidadeJanelasPadrao: 2,
    posicaoJanelasPadrao: "centro",
    ocupantesPadrao: 3,
    ganhosInternosPadraoWm2: 12,
    renovacoesArPadraoAch: 0.8,
    horasOperacaoPadrao: 8,
    notaTecnica:
      "Referência residencial: aberturas médias/amplas, 3 ocupantes e iluminação/TV (12 W/m²).",
  },
  quarto: {
    nome: "Dormitório",
    subtitulo: "Permanência prolongada · descanso",
    comprimentoPadraoM: 3.2,
    larguraPadraoM: 4.0,
    peDireitoPadraoM: 2.7,
    percentualVidroPadrao: 25,
    quantidadeJanelasPadrao: 1,
    posicaoJanelasPadrao: "centro",
    ocupantesPadrao: 2,
    ganhosInternosPadraoWm2: 8,
    renovacoesArPadraoAch: 0.6,
    horasOperacaoPadrao: 8,
    notaTecnica:
      "Referência residencial: abertura moderada, 2 ocupantes e baixa carga de equipamentos (8 W/m²).",
  },
  escritorio: {
    nome: "Escritório / Studio",
    subtitulo: "Atividade cognitiva · equipamentos",
    comprimentoPadraoM: 3.5,
    larguraPadraoM: 4.5,
    peDireitoPadraoM: 2.8,
    percentualVidroPadrao: 35,
    quantidadeJanelasPadrao: 2,
    posicaoJanelasPadrao: "distribuidas",
    ocupantesPadrao: 2,
    ganhosInternosPadraoWm2: 18,
    renovacoesArPadraoAch: 1.0,
    horasOperacaoPadrao: 9,
    notaTecnica:
      "Referência de trabalho: maior densidade de carga interna por computadores e iluminação (18 W/m²).",
  },
  banheiro: {
    nome: "Banheiro",
    subtitulo: "Permanência transitória · janelas altas",
    comprimentoPadraoM: 2.0,
    larguraPadraoM: 2.6,
    peDireitoPadraoM: 2.6,
    percentualVidroPadrao: 12,
    quantidadeJanelasPadrao: 1,
    posicaoJanelasPadrao: "altas",
    ocupantesPadrao: 1,
    ganhosInternosPadraoWm2: 6,
    renovacoesArPadraoAch: 2.0,
    horasOperacaoPadrao: 2,
    notaTecnica:
      "Referência sanitária: abertura alta reduzida (maxim-ar) e maior taxa de renovação de ar (2,0 ACH).",
  },
};

// TODO: validar valores de Tv, U e FS com catálogo técnico de fabricante de vidros.
export const VIDROS: Record<
  TipoVidroKey,
  {
    nome: string;
    u: number;
    fs: number;
    tv: number;
    fonte: string;
    status: string;
  }
> = {
  comum: {
    nome: "Vidro monolítico comum",
    u: 5.7,
    fs: 0.87,
    tv: 0.88,
    fonte: "Sem fonte confirmada",
    status: "valor didático — verificar fonte",
  },
  controle: {
    nome: "Vidro de controle solar",
    u: 3.3,
    fs: 0.55,
    tv: 0.5,
    fonte: "Sem fonte confirmada",
    status: "valor didático — verificar fonte",
  },
  lowE: {
    nome: "Vidro insulado duplo Low-E",
    u: 1.8,
    fs: 0.28,
    tv: 0.65,
    fonte: "Sem fonte confirmada",
    status: "valor didático — verificar fonte",
  },
};

export const CONSTANTES_AR = {
  co2ExternoPpm: {
    valor: 420,
    unidade: "ppm",
    fonte: "Referência atmosférica média",
    status: "valor didático — verificar fonte",
  } satisfies ValorReferencia,
  geracaoCo2PorPessoaLh: {
    valor: 18,
    unidade: "L/h",
    fonte: "Adulto em atividade sedentária leve (dormindo pode ser menor)",
    status: "valor didático — verificar fonte",
  } satisfies ValorReferencia,
  // TODO: confirmar se a referência de 1000 ppm da ANVISA (RE nº 9/2003) pode ser citada para o contexto educativo, e só citar se confirmar.
  faixasDidaticasCo2Ppm: {
    valor: { atencao: 800, alerta: 1000 },
    unidade: "ppm",
    fonte: "Faixas visuais meramente ilustrativas",
    status: "valor didático — verificar fonte",
  } satisfies ValorReferencia<{ atencao: number; alerta: number }>,
  atalhosAch: [
    { rotulo: "Fechado 0,6", ach: 0.6 },
    { rotulo: "Janela entreaberta 2", ach: 2.0 },
    { rotulo: "Ventilação cruzada 5", ach: 5.0 },
  ],
} as const;

// TODO: verificar constantes de decaimento de 1ª ordem para emissão de VOCs em literatura especializada.
export const FONTES_VOC: Record<
  FonteVocKey,
  {
    nome: string;
    descricao: string;
    kDecaimentoHora: ValorReferencia;
    fatorEmissaoRelativo: ValorReferencia;
  }
> = {
  tinta: {
    nome: "Tinta ou verniz recém-aplicado",
    descricao: "Pico inicial mais acentuado que decai conforme o filme seca e cura.",
    kDecaimentoHora: {
      valor: 0.18,
      unidade: "1/h",
      fonte: "Curva esquemática de secagem",
      status: "valor didático — verificar fonte",
    },
    fatorEmissaoRelativo: {
      valor: 1.0,
      fonte: "Escala relativa normalizada",
      status: "valor didático — verificar fonte",
    },
  },
  movel: {
    nome: "Móvel novo (painéis / adesivos)",
    descricao: "Emissão contínua mais lenta e persistente ao longo de dias ou semanas.",
    kDecaimentoHora: {
      valor: 0.04,
      unidade: "1/h",
      fonte: "Curva esquemática de liberação lenta",
      status: "valor didático — verificar fonte",
    },
    fatorEmissaoRelativo: {
      valor: 0.65,
      fonte: "Escala relativa normalizada",
      status: "valor didático — verificar fonte",
    },
  },
  limpeza: {
    nome: "Produtos de limpeza / aerossóis",
    descricao: "Liberação rápida durante a aplicação com decaimento curto.",
    kDecaimentoHora: {
      valor: 0.45,
      unidade: "1/h",
      fonte: "Curva esquemática de volatilização rápida",
      status: "valor didático — verificar fonte",
    },
    fatorEmissaoRelativo: {
      valor: 0.85,
      fonte: "Escala relativa normalizada",
      status: "valor didático — verificar fonte",
    },
  },
};

export const CONSTANTES_LUZ = {
  anguloCeuPadraoGraus: {
    valor: 90,
    unidade: "graus",
    fonte: "Céu visível sem obstrução frontal no plano vertical",
    status: "valor didático — verificar fonte",
  } satisfies ValorReferencia,
  refletanciaMediaInterna: {
    valor: 0.5,
    unidade: "adim.",
    fonte: "Média ponderada típica entre teto claro, paredes e piso",
    status: "valor didático — verificar fonte",
  } satisfies ValorReferencia,
  fatorManutencaoEsquadria: {
    valor: 0.8,
    unidade: "adim.",
    fonte: "Correção didática para caixilho e sujeira (T = Tv × 0,8)",
    status: "valor didático — verificar fonte",
  } satisfies ValorReferencia,
  iluminanciaExternaCeuEncobertoLux: {
    valor: 10000,
    unidade: "lux",
    fonte: "Abóbada celeste encoberta de referência",
    status: "valor didático — verificar fonte",
  } satisfies ValorReferencia,
  multiplicadorProfundidadeLuzUtil: {
    valor: { min: 2.0, max: 2.5 },
    unidade: "× H_verga",
    fonte: "Regra prática geométrica de penetração lateral de luz natural",
    status: "valor didático — verificar fonte",
  } satisfies ValorReferencia<{ min: number; max: number }>,
  // TODO: confirmar faixas de 60/90/120 lux na NBR 15575-1 e 300/500 lux na NBR ISO/CIE 8995-1 antes de citar a norma; manter como "faixa didática" até confirmar.
  faixasDidaticasLuzNaturalLux: {
    valor: { basico: 60, intermediario: 90, elevado: 120 },
    unidade: "lux",
    fonte: "Faixa didática de luz natural",
    status: "valor didático — verificar fonte",
  } satisfies ValorReferencia<{ basico: number; intermediario: number; elevado: number }>,
  faixasDidaticasTarefaLux: {
    valor: { geral: 300, leituraDetalhe: 500 },
    unidade: "lux",
    fonte: "Faixa didática para plano de trabalho",
    status: "valor didático — verificar fonte",
  } satisfies ValorReferencia<{ geral: number; leituraDetalhe: number }>,
  fatorUtilizacaoLumens: {
    valor: 0.5,
    unidade: "UF",
    fonte: "Método dos lúmens simplificado",
    status: "valor didático — verificar fonte",
  } satisfies ValorReferencia,
  fatorManutencaoLumens: {
    valor: 0.8,
    unidade: "MF",
    fonte: "Método dos lúmens simplificado",
    status: "valor didático — verificar fonte",
  } satisfies ValorReferencia,
  eficaciaLedPadraoLmW: {
    valor: 100,
    unidade: "lm/W",
    fonte: "Luminária LED residencial/comercial típica",
    status: "valor didático — verificar fonte",
  } satisfies ValorReferencia,
} as const;