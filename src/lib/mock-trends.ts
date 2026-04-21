export type TrendCategory = "Material" | "Regulação" | "Tecnologia" | "Mercado";

export interface Trend {
  id: string;
  category: TrendCategory;
  title: string;
  description: string;
  relevance: number; // 0–100
  source?: string;
}

export interface TrendsPayload {
  trends: Trend[];
  stats: {
    activeTrends: number;
    monitoredSources: number;
    lastUpdate: string; // ISO
    avgRelevance: number;
  };
  highlight: {
    title: string;
    excerpt: string;
    source: string;
    publishedAt: string;
  };
  keywords: string[];
}

export const MOCK_PAYLOAD: TrendsPayload = {
  trends: [
    {
      id: "1",
      category: "Material",
      title: "Concreto de baixo carbono ganha escala no Brasil",
      description:
        "Fabricantes anunciam linhas com até 40% menos emissões usando cinzas e escórias industriais.",
      relevance: 92,
      source: "ABCP",
    },
    {
      id: "2",
      category: "Regulação",
      title: "Nova NBR exige rastreio de origem da madeira",
      description:
        "Norma entra em vigor em 2026 e impacta especificações de obras públicas e privadas.",
      relevance: 78,
    },
    {
      id: "3",
      category: "Tecnologia",
      title: "Gêmeos digitais reduzem retrabalho em 23%",
      description:
        "Estudo com 14 canteiros mostra ganho de produtividade ao integrar BIM com sensores IoT.",
      relevance: 85,
    },
    {
      id: "4",
      category: "Mercado",
      title: "Demanda por certificação LEED cresce 31% em SP",
      description:
        "Investidores institucionais passam a exigir selo em novos empreendimentos comerciais.",
      relevance: 71,
    },
    {
      id: "5",
      category: "Material",
      title: "Tijolos de micélio entram em fase piloto",
      description:
        "Startup paulista testa blocos cultivados a partir de fungos para vedação interna.",
      relevance: 64,
    },
    {
      id: "6",
      category: "Tecnologia",
      title: "IA generativa acelera projetos de fundação",
      description:
        "Ferramentas avaliam centenas de configurações em minutos, otimizando consumo de aço.",
      relevance: 88,
    },
  ],
  stats: {
    activeTrends: 24,
    monitoredSources: 187,
    lastUpdate: new Date().toISOString(),
    avgRelevance: 79,
  },
  highlight: {
    title:
      "Cimento verde: como o setor se prepara para o net-zero até 2050",
    excerpt:
      "Uma análise das principais rotas de descarbonização adotadas por cimenteiras brasileiras, com foco em captura de carbono, substituição de clínquer e uso de combustíveis alternativos. O movimento já redesenha cadeias de fornecimento e contratos de longo prazo.",
    source: "Instituto Brasileiro do Cimento",
    publishedAt: new Date().toISOString(),
  },
  keywords: [
    "net-zero",
    "BIM",
    "concreto verde",
    "LEED",
    "IoT canteiro",
    "madeira certificada",
    "economia circular",
    "fachada ativa",
    "ESG",
    "off-site",
    "fotovoltaico",
    "água cinza",
  ],
};
