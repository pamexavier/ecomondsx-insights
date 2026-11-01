import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { EcomondsLogo } from "@/components/EcomondsLogo";

/* ────────────────────────────────────────────────────────────────────────
   SOBRE / TESE & CERTIFICAÇÕES
   Home ficou só com Diagnóstico + Notícias (ferramenta). Aqui mora o
   conceito: os três pilares que sustentam a tese (dado + filosofia +
   wellness), o laboratório interativo 3D para educar o cliente, a bússola
   e matriz comparativa de certificações auditadas e as referências globais
   com galeria multi-fotos.
──────────────────────────────────────────────────────────────────────── */

const PILARES = [
  {
    id: "engenharia",
    numero: "01",
    titulo: "Leitura Ambiental",
    subtitulo: "O projeto começa antes da planta",
    corpo:
      "Clima, sol, vento, água e solo não são pano de fundo. Nós transformamos essas variáveis em critérios de implantação, orientação, materiais e desempenho para que cada escolha responda ao lugar real.",
    entregas: ["Diagnóstico bioclimático", "Leitura do território"],
    cor: "#38BDF8",
  },
  {
    id: "filosofia",
    numero: "02",
    titulo: "Projeto para Pessoas",
    subtitulo: "O ambiente precisa dialogar com quem o vive",
    corpo:
      "Entender rotina, comportamento, cultura e percepção é tão importante quanto entender a técnica. Projetamos para que luz, escala, circulação e permanência façam sentido para as pessoas.",
    entregas: ["Experiência do ocupante", "Uso e pertencimento"],
    cor: "#A78BFA",
  },
  {
    id: "wellness",
    numero: "03",
    titulo: "Wellness Mensurável",
    subtitulo: "Bem-estar também é desempenho",
    corpo:
      "Ar, luz, conforto térmico, acústica e contato com a natureza afetam saúde, produtividade e permanência. Quando esses fatores são medidos, deixam de ser subjetivos e passam a orientar valor, qualidade e certificação.",
    entregas: ["Conforto ambiental", "Saúde e valorização"],
    cor: "#FBBF24",
  },
] as const;

/* ── Configurações do Simulador Educativo 3D (Estilo SketchUp) ── */
type OrientacaoKey = "N" | "S" | "L" | "O";
type EnvoltoriaKey = "concreto" | "ceramica" | "termica";
type CorTintaKey = "branca" | "terracota" | "grafite";
type AcModoKey = "hibrido" | "inverter23" | "intenso18";

const ORIENTACOES: Record<
  OrientacaoKey,
  {
    nome: string;
    insolacao: string;
    ganhoSolarW: number;
    luzScore: number;
    sunPos: { cx: number; cy: number };
    feixeLuz: string;
    resumo: string;
  }
> = {
  N: {
    nome: "Norte",
    insolacao: "Insolação constante e previsível",
    ganhoSolarW: 210,
    luzScore: 92,
    sunPos: { cx: 365, cy: 58 },
    feixeLuz: "M272 212 L345 248 L295 274 L222 238 Z",
    resumo:
      "Recebe sol o ano inteiro em ângulo alto no verão e baixo no inverno. Fácil de sombrear com brise horizontal.",
  },
  L: {
    nome: "Leste",
    insolacao: "Sol da manhã · Aquecimento suave",
    ganhoSolarW: 165,
    luzScore: 86,
    sunPos: { cx: 475, cy: 88 },
    feixeLuz: "M272 212 L328 240 L282 263 L226 235 Z",
    resumo:
      "Radiação direta nas primeiras horas do dia, quando o ar externo ainda está fresco. Excelente para saúde circadiana.",
  },
  O: {
    nome: "Oeste",
    insolacao: "Sol da tarde · Pico crítico de calor",
    ganhoSolarW: 430,
    luzScore: 62,
    sunPos: { cx: 515, cy: 165 },
    feixeLuz: "M272 212 L392 272 L322 308 L202 248 Z",
    resumo:
      "O sol baixo da tarde incide em cheio na janela quando o ar externo já está quente, gerando superaquecimento severo.",
  },
  S: {
    nome: "Sul",
    insolacao: "Luz difusa · Pouca radiação direta",
    ganhoSolarW: 95,
    luzScore: 74,
    sunPos: { cx: 205, cy: 62 },
    feixeLuz: "M272 212 L300 226 L265 244 L237 230 Z",
    resumo:
      "Baixo ganho de calor no verão, mas pode resultar em ambientes frios e úmidos no inverno se não houver bom isolamento.",
  },
};

const ENVOLTORIAS: Record<
  EnvoltoriaKey,
  {
    nome: string;
    detalhe: string;
    transmitancia: string;
    u: number;
    fatorCalor: number;
    brise: boolean;
    resumo: string;
  }
> = {
  concreto: {
    nome: "Maciça + Vidro Simples",
    detalhe: "Concreto 12cm sem proteção solar",
    transmitancia: "U = 3,7 W/m²K",
    u: 3.7,
    fatorCalor: 1.28,
    brise: false,
    resumo:
      "Alta transmitância térmica: o calor atravessa rápido a parede e o vidro comum cria efeito estufa imediato.",
  },
  ceramica: {
    nome: "Bloco Cerâmico + Reboco",
    detalhe: "Alvenaria 19cm + Vidro Laminado",
    transmitancia: "U = 2,1 W/m²K",
    u: 2.1,
    fatorCalor: 0.95,
    brise: false,
    resumo:
      "Desempenho intermediário. As câmaras de ar do bloco cerâmico amortecem parte da onda de calor externa.",
  },
  termica: {
    nome: "Isolamento EPS + Brise + Duplo",
    detalhe: "Parede dupla com EPS + Vidro Low-E",
    transmitancia: "U = 0,85 W/m²K",
    u: 0.85,
    fatorCalor: 0.42,
    brise: true,
    resumo:
      "Envoltória de alta eficiência: o brise barra a radiação direta no vidro e o isolamento mantém o frescor interno.",
  },
};

const CORES_TINTA: Record<
  CorTintaKey,
  {
    nome: string;
    absortancia: string;
    alpha: number;
    hex: string;
    hexSombra: string;
    resumo: string;
  }
> = {
  branca: {
    nome: "Branco Neve",
    absortancia: "α = 0,20 (Reflete 80%)",
    alpha: 0.2,
    hex: "#E2E8F0",
    hexSombra: "#CBD5E1",
    resumo:
      "A superfície reflete a maior parte da radiação solar incidente, reduzindo drasticamente a temperatura superficial da parede.",
  },
  terracota: {
    nome: "Terracota Natural",
    absortancia: "α = 0,55 (Equilíbrio)",
    alpha: 0.55,
    hex: "#C26D4A",
    hexSombra: "#9C5234",
    resumo:
      "Absorção térmica moderada. Exige que a envoltória tenha boa inércia ou isolamento para não transferir calor ao interior.",
  },
  grafite: {
    nome: "Grafite Escuro",
    absortancia: "α = 0,85 (Absorve 85%)",
    alpha: 0.85,
    hex: "#334155",
    hexSombra: "#1E293B",
    resumo:
      "Fachada escura sob sol direto atinge temperaturas superficiais muito altas e continua irradiando calor para dentro por horas após o pôr do sol.",
  },
};

const MODOS_AC: Record<
  AcModoKey,
  {
    nome: string;
    detalhe: string;
    setpoint: number;
    fatorEnergia: number;
    corFluxo: string;
    resumo: string;
  }
> = {
  hibrido: {
    nome: "Híbrido + Ventilação Natural",
    detalhe: "Janelas operáveis + AC só no pico",
    setpoint: 24,
    fatorEnergia: 0.45,
    corFluxo: "#00C67A",
    resumo:
      "Aproveita a ventilação cruzada para dissipar o calor interno e aciona a climatização mecânica apenas quando necessário.",
  },
  inverter23: {
    nome: "Inverter Conforto (23°C)",
    detalhe: "Operação contínua em faixa saudável",
    setpoint: 23,
    fatorEnergia: 0.85,
    corFluxo: "#38BDF8",
    resumo:
      "Mantém temperatura estável dentro da zona de conforto (NBR 15220 / ASHRAE 55) sem choque térmico ou desperdício extremo.",
  },
  intenso18: {
    nome: "Ar Forçado no Máximo (18°C)",
    detalhe: "Compensando fachada quente no gelado",
    setpoint: 18,
    fatorEnergia: 1.65,
    corFluxo: "#60A5FA",
    resumo:
      "Quanto mais baixo o setpoint, maior o consumo (o aumento por grau varia com equipamento e clima), além de ressecar o ar e gerar desconforto térmico localizado.",
  },
};

/* ── Referências Globais Verificadas + Galeria Multi-Fotos ── */

const REFERENCIAS_GLOBAIS = [
  {
    nome: "One Central Park",
    local: "Sydney, Austrália",
    ano: "2014",
    tipologia: "Residencial & Uso Misto",
    arquiteto: "Ateliers Jean Nouvel + PTW + Patrick Blanc",
    certificacao: "Green Star 6★ (Design & As Built)",
    metricaChave: "42 heliostatos + 320 refletores",
    destaque:
      "Duas torres cobertas por jardins hidropônicos verticais desenhados por Patrick Blanc e um sistema pioneiro de heliostatos no cantilever que devolve luz solar direta às áreas sombreadas.",
    caracteristicas: [
      "42 heliostatos motorizados no topo da torre menor redirecionam a luz solar para 320 refletores Fresnel sob o balanço (cantilever) da torre mais alta",
      "Fachada hidropônica viva com cerca de 35 mil a 38 mil plantas de 350 espécies diferentes adaptadas à orientação solar e ao vento de cada pavimento",
      "Central própria de trigeração (energia, aquecimento e resfriamento) e estação interna de reciclagem de águas negras para irrigação e bacias sanitárias",
      "Eleito Melhor Edifício Alto do Mundo pelo CTBUH em 2014 e primeira torre residencial de Sydney a atingir 6 estrelas no sistema australiano Green Star",
    ],
    imagem: "/images/wellness/ocp-1.jpg",
    imagens: [
      {
        url: "/images/wellness/ocp-1.jpg",
        legenda: "Vista geral das torres e do cantilever com refletores solares",
      },
      {
        url: "/images/wellness/ocp-2.jpg",
        legenda: "Detalhe da fachada biofílica e integração com iluminação natural",
      },
      {
        url: "/images/wellness/ocp-3.jpg",
        legenda: "Inserção urbana e microclima no contexto de Sydney",
      },
    ],
    seloRelacionado: "WELL",
  },
  {
    nome: "The Edge",
    local: "Amsterdã, Países Baixos",
    ano: "2014",
    tipologia: "Corporativo High-Tech (40.000 m²)",
    arquiteto: "PLP Architecture",
    certificacao: "BREEAM-NL Outstanding (98,36%)",
    metricaChave: "≈28.000 sensores IoT",
    destaque:
      "Referência mundial em edifícios inteligentes e energia positiva: um átrio orientado ao norte para luz difusa constante, combinado a 28 mil sensores que ajustam luz e clima por ocupante.",
    caracteristicas: [
      "Cerca de 28 mil sensores integrados (iluminação LED Power-over-Ethernet da Philips) monitoram presença, luz, temperatura e umidade em tempo real",
      "Balanço energético positivo: fachada sul e cobertura com painéis fotovoltaicos aliados a 4.100 m² adicionais em telhados vizinhos conveniados",
      "Sistema de armazenamento térmico em aquífero (ATES) a 130 metros de profundidade bombeia água aquecida ou resfriada conforme a estação do ano",
      "Alcançou 98,36% no BREEAM-NL New Construction e consome cerca de 70% menos eletricidade que um edifício corporativo convencional de mesmo porte",
    ],
    imagem: "/images/wellness/the-edge-1.jpg",
    imagens: [
      {
        url: "/images/wellness/the-edge-1.jpg",
        legenda: "Átrio envidraçado voltado ao Norte para iluminação natural sem ofuscamento",
      },
      {
        url: "/images/wellness/the-edge-2.jpg",
        legenda: "Espaços internos colaborativos com sensores de luz e clima por ocupante",
      },
      {
        url: "/images/wellness/the-edge-3.jpg",
        legenda: "Envoltória de vidro de alto desempenho e captação solar",
      },
    ],
    seloRelacionado: "BREEAM",
  },
  {
    nome: "Bosco Verticale",
    local: "Milão, Itália",
    ano: "2014",
    tipologia: "Residencial Biofílico (Torres de 111m e 76m)",
    arquiteto: "Boeri Studio (Stefano Boeri)",
    certificacao: "LEED Gold + Int'l Highrise Award",
    metricaChave: "≈20.000 m² de floresta equivalente",
    destaque:
      "Duas torres residenciais em Porta Nuova que concentram na envoltória o equivalente a 2 hectares de floresta, regulando o microclima interno e a ilha de calor urbana.",
    caracteristicas: [
      "Reúne cerca de 800 árvores (de 3 a 9 metros), 4.500 arbustos e 15 mil plantas perenes testadas em túnel de vento antes da instalação nas sacadas em balanço",
      "A cortina vegetal filtra poeira fina urbana, absorve cerca de 19 a 30 toneladas de CO₂/ano e produz cerca de 19 toneladas de oxigênio por ano",
      "No verão, o sombreamento vivo e a evapotranspiração reduzem a temperatura da fachada e do ar interno em até 2,5°C a 3°C, cortando picos de ar-condicionado",
      "Certificado LEED Gold e vencedor do International Highrise Award (2014) e do CTBUH Best Tall Building Worldwide (2015)",
    ],
    imagem: "/images/wellness/bosco-1.jpg",
    imagens: [
      {
        url: "/images/wellness/bosco-1.jpg",
        legenda: "Sacadas desencontradas de 3,3 m para permitir o crescimento das copas",
      },
      {
        url: "/images/wellness/bosco-2.jpg",
        legenda: "Vista das torres de 111m e 76m no bairro Porta Nuova, Milão",
      },
      {
        url: "/images/wellness/bosco-3.jpg",
        legenda: "Detalhe da densidade arbórea e proteção solar passiva nas janelas",
      },
    ],
    seloRelacionado: "LEED",
  },
  {
    nome: "PARKROYAL Collection Pickering",
    local: "Singapura",
    ano: "2013",
    tipologia: "Hotelaria & Arquitetura Bioclimática",
    arquiteto: "WOHA Architects",
    certificacao: "BCA Green Mark Platinum",
    metricaChave: "215% de reposição verde do lote",
    destaque:
      "Um 'hotel-em-um-jardim' onde terraços em curvas orgânicas inspiradas em arrozais somam 15 mil m² de vegetação — mais que o dobro da área do próprio terreno.",
    caracteristicas: [
      "15.000 m² de skygardens em balanço a cada quatro andares, cascatas, espelhos d'água e paredes verdes que absorvem calor e sombreiam os quartos",
      "Corredores externos abertos e ventilados naturalmente reduzem drasticamente a área que exige ar-condicionado contínuo no clima equatorial de Singapura",
      "Irrigação por gravidade abastecida por captação pluvial no topo e 260 painéis fotovoltaicos que alimentam 100% da iluminação paisagística",
      "Certificado BCA Green Mark Platinum (nota máxima de Singapura) e vencedor do CTBUH Urban Habitat Award",
    ],
    imagem: "/images/wellness/parkroyal-1.jpg",
    imagens: [
      {
        url: "/images/wellness/parkroyal-1.jpg",
        legenda: "Terraços curvos em camadas topográficas sombreados por vegetação tropical",
      },
      {
        url: "/images/wellness/parkroyal-2.jpg",
        legenda: "Integração de arquitetura biofílica e espelhos d'água em Singapura",
      },
      {
        url: "/images/wellness/parkroyal-3.jpg",
        legenda: "Ambiência de hospitalidade com sombreamento natural e brisas tropicais",
      },
    ],
    seloRelacionado: "LEED",
  },
  {
    nome: "The Spheres (Amazon HQ)",
    local: "Seattle, EUA",
    ano: "2018",
    tipologia: "Espaço de Trabalho Biofílico",
    arquiteto: "NBBJ",
    certificacao: "LEED Platinum (Complexo) & Design Biofílico",
    metricaChave: "40.000 plantas de 30 países",
    destaque:
      "Três domos geodésicos pentakis dodecaedros concebidos para substituir salas de reunião fechadas por trilhas, pontes suspensas e paredes vivas em clima de floresta nublada.",
    caracteristicas: [
      "Abriga cerca de 40 mil plantas de mais de 400 espécies originárias de florestas nubladas de altitude (montane cloud forests) de 30 países",
      "Clima diurno controlado em 22°C e 60% de umidade relativa (e 13°C com 85% de umidade à noite) para saúde simultânea de pessoas e plantas",
      "Parede viva ('The Canyon') de quatro andares com 25 mil plantas em tecido fibroso irrigado por gravidade e climatizado com calor residual de um data center vizinho",
      "Vidro laminado de baixa emissividade (Low-E) com película interlayer que bloqueia o infravermelho (calor) mantendo os comprimentos de onda exigidos pela fotossíntese",
    ],
    imagem: "/images/wellness/amazon-1.jpg",
    imagens: [
      {
        url: "/images/wellness/amazon-1.jpg",
        legenda: "As três esferas geodésicas de aço e vidro Low-E no centro de Seattle",
      },
      {
        url: "/images/wellness/amazon-2.jpg",
        legenda: "Microclima interno de floresta nublada com 40 mil plantas",
      },
      {
        url: "/images/wellness/amazon-3.jpg",
        legenda: "Paredes vivas verticais que regulam umidade e qualidade acústica",
      },
    ],
    seloRelacionado: "WELL",
  },
  {
    nome: "CapitaSpring",
    local: "Singapura",
    ano: "2021",
    tipologia: "Torre Corporativa & Uso Misto (280 m)",
    arquiteto: "BIG (Bjarke Ingels Group) + Carlo Ratti Associati",
    certificacao: "BCA Green Mark Platinum + Universal Design GoldPLUS",
    metricaChave: "80.000 plantas · 140% área verde",
    destaque:
      "Arranha-céu de 51 andares onde a fachada de alumínio se abre no meio da torre para revelar um oásis público espiralado de quatro pavimentos e a fazenda urbana mais alta de Singapura.",
    caracteristicas: [
      "'Green Oasis' entre os andares 17 e 20: um parque vertical aberto de 35 metros de altura com trilha botânica espiral que imita a hierarquia de luz da floresta tropical",
      "Mais de 80 mil plantas distribuídas em 8.300 m² de paisagismo (140% da área do lote), sendo 63% espécies nativas para atrair biodiversidade local",
      "Sky Garden no 51º andar (a 280 metros de altura) abriga uma fazenda urbana com 150 variedades de frutas, verduras e ervas que abastecem os restaurantes do prédio",
      "Certificado BCA Green Mark Platinum, com sensores IoT em toda a torre, reaproveitamento de água de condensação do ar-condicionado e ciclovia integrada com 165 vagas",
    ],
    imagem: "/images/wellness/capitaspring-1.jpg",
    imagens: [
      {
        url: "/images/wellness/capitaspring-1.jpg",
        legenda: "A fachada se abre como cortinas para revelar o Green Oasis no meio da torre",
      },
      {
        url: "https://images.unsplash.com/photo-1508964942454-1a56651d54ac?auto=format&fit=crop&w=1200&q=80",
        legenda: "Torre de 280m de altura no distrito financeiro de Raffles Place, Singapura",
      },
      {
        url: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=1200&q=80",
        legenda: "Horta urbana e jardim produtivo no topo do edifício",
      },
    ],
    seloRelacionado: "LEED",
  },
] as const;

export type CategoriaSeloFiltro = "todos" | "saude" | "brasil" | "acessivel";

const FILTROS_OBJETIVO: {
  id: CategoriaSeloFiltro;
  titulo: string;
  subtitulo: string;
}[] = [
  {
    id: "todos",
    titulo: "Visão Completa (6 Selos)",
    subtitulo: "Compare padrões globais e nacionais",
  },
  {
    id: "saude",
    titulo: "Saúde & Produtividade",
    subtitulo: "Foco em pessoas, ar, luz e conforto",
  },
  {
    id: "brasil",
    titulo: "Foco Brasil & Crédito",
    subtitulo: "Normas locais (NBR) e juros menores",
  },
  {
    id: "acessivel",
    titulo: "Rápido & Custo Acessível",
    subtitulo: "ROI direto em água, energia e IPTU",
  },
];

const CERTIFICACOES = [
  {
    sigla: "LEED",
    nome: "Leadership in Energy and Environmental Design",
    origem: "EUA · USGBC (v4 / v4.1)",
    foco: "Eficiência energética, carbono e ciclo de vida do edifício",
    perfilIdeal: "Corporativo Triple-A, Galpões Logísticos e Fundos Globais",
    complexidade: "Alta · Auditoria GBCI",
    auditoriaCampo: "Documental + Comissionamento de sistemas",
    categoriasFiltro: ["todos", "saude"] as CategoriaSeloFiltro[],
    pesos: { energia: 95, agua: 80, saude: 72, gestao: 85 },
    descricao:
      "O sistema mais adotado globalmente. Avalia 8 categorias (com maior peso em Energia e Atmosfera) numa escala de até 110 pontos, de Certified a Platinum.",
    destaqueRotulo: "Prêmio de aluguel",
    destaqueValor: "+4% a 8%",
    cor: "#22C55E",
  },
  {
    sigla: "WELL",
    nome: "WELL Building Standard (v2)",
    origem: "EUA · IWBI",
    foco: "Saúde biológica, conforto e bem-estar humano",
    perfilIdeal: "Sedes Corporativas, Escritórios, Saúde e Educação",
    complexidade: "Alta · Ensaios in loco",
    auditoriaCampo: "Obrigatória em campo (Performance Verification)",
    categoriasFiltro: ["todos", "saude"] as CategoriaSeloFiltro[],
    pesos: { energia: 45, agua: 85, saude: 100, gestao: 78 },
    descricao:
      "Foco em quem ocupa o espaço: 10 conceitos (Ar, Água, Nutrição, Luz, Movimento, Conforto Térmico, Som, Materiais, Mente e Comunidade) medidos em campo.",
    destaqueRotulo: "Prêmio de aluguel",
    destaqueValor: "+4,4% a 7,7%",
    cor: "#8B5CF6",
  },
  {
    sigla: "BREEAM",
    nome: "Building Research Establishment Environmental Assessment Method",
    origem: "Reino Unido · BRE (1990)",
    foco: "Desempenho ambiental rigoroso, carbono e ecologia do entorno",
    perfilIdeal: "Portfólios Europeus/Globais, Varejo e Grandes Complexos",
    complexidade: "Alta · Assessor Licenciado",
    auditoriaCampo: "Documental + Auditoria in loco",
    categoriasFiltro: ["todos"] as CategoriaSeloFiltro[],
    pesos: { energia: 90, agua: 85, saude: 75, gestao: 95 },
    descricao:
      "O selo mais antigo do mundo. Pondera 9 categorias ambientais mais inovação, exigindo nota percentual auditada de Pass (≥30%) até Outstanding (≥85%).",
    destaqueRotulo: "Valor de capital",
    destaqueValor: "+14% a 16%",
    cor: "#A78BFA",
  },
  {
    sigla: "EDGE",
    nome: "Excellence in Design for Greater Efficiencies",
    origem: "Global · IFC / Banco Mundial",
    foco: "Redução mínima comprovada de 20% em energia, água e materiais",
    perfilIdeal: "Incorporação Residencial, Hotelaria e Galpões em Mercados Emergentes",
    complexidade: "Ágil · Software EDGE App",
    auditoriaCampo: "Auditoria de projeto + Vistoria final in loco",
    categoriasFiltro: ["todos", "acessivel", "brasil"] as CategoriaSeloFiltro[],
    pesos: { energia: 92, agua: 92, saude: 45, gestao: 60 },
    descricao:
      "Focado em métrica física direta: exige redução mínima de 20% em energia operacional, água e energia incorporada nos materiais frente ao baseline local.",
    destaqueRotulo: "Incentivo fiscal",
    destaqueValor: "Desconto de IPTU Verde",
    cor: "#FBBF24",
  },
  {
    sigla: "Selo Casa Azul",
    nome: "Selo Casa Azul + CAIXA",
    origem: "Brasil · Caixa Econômica Federal",
    foco: "Critérios ASG para empreendimentos habitacionais no Brasil",
    perfilIdeal: "Incorporadoras Residenciais com Financiamento CAIXA (SBPE/SFI)",
    complexidade: "Média · Engenharia CAIXA",
    auditoriaCampo: "Análise de projeto + Vistoria de obra CAIXA",
    categoriasFiltro: ["todos", "brasil", "acessivel"] as CategoriaSeloFiltro[],
    pesos: { energia: 78, agua: 85, saude: 72, gestao: 90 },
    descricao:
      "Instrumento ASG da CAIXA com 53 critérios distribuídos em 6 categorias (Qualidade Urbana, Projeto e Conforto, Eficiência Energética, Recursos, Social e Finanças).",
    destaqueRotulo: "Custo de financiamento",
    destaqueValor: "-0,25% a 1% nos juros",
    cor: "#3B82F6",
  },
  {
    sigla: "AQUA-HQE",
    nome: "Alta Qualidade Ambiental (Fundação Vanzolini)",
    origem: "França/Brasil · Vanzolini & Poli-USP",
    foco: "Gestão ambiental adaptada ao clima e às normas brasileiras",
    perfilIdeal: "Construtoras Brasileiras, Edifícios Públicos e Residenciais",
    complexidade: "Alta · 3 Auditorias Presenciais",
    auditoriaCampo: "Pré-projeto + Projeto + Execução (In loco)",
    categoriasFiltro: ["todos", "brasil", "saude"] as CategoriaSeloFiltro[],
    pesos: { energia: 85, agua: 85, saude: 88, gestao: 96 },
    descricao:
      "Desenvolvido a partir do francês HQE e adaptado pela Poli-USP às normas brasileiras (NBR 15575 e NBR 15220). Avalia 14 categorias de desempenho ambiental.",
    destaqueRotulo: "Adoção no Brasil",
    destaqueValor: "+980 empreendimentos",
    cor: "#10B981",
  },
] as const;

const DETALHES_CERTIFICACAO: Record<
  string,
  {
    comoFunciona: string;
    criterios: string[];
    niveis: string[];
    valorizacao: string;
    impacto: string;
    olharInvestidor: string;
    fonte?: string;
  }
> = {
  LEED: {
    comoFunciona:
      "No LEED v4/v4.1, o projeto precisa cumprir pré-requisitos eliminatórios e soma pontos em 8 categorias (Localização e Transporte, Terrenos Sustentáveis, Eficiência Hídrica, Energia e Atmosfera, Materiais e Recursos, Qualidade Ambiental Interna, Inovação e Prioridade Regional), até o teto de 110 pontos.",
    criterios: [
      "Energia e Atmosfera (maior peso da certificação — até 33 pontos)",
      "Eficiência Hídrica interna e externa",
      "Materiais, Análise de Ciclo de Vida (ACV) e Resíduos",
      "Qualidade Ambiental Interna (renovação de ar, luz natural e conforto térmico)",
    ],
    niveis: [
      "Certified · 40 a 49 pontos",
      "Silver · 50 a 59 pontos",
      "Gold · 60 a 79 pontos",
      "Platinum · 80 a 110 pontos",
    ],
    valorizacao:
      "Levantamentos da CBRE com mais de 20 mil edifícios comerciais nos EUA apontam prêmio médio de aluguel entre 4% e 8% em relação a imóveis não certificados. Em mercados com restrição de oferta Triple-A (como Faria Lima em SP), a absorção e a retenção de inquilinos multinacionais são significativamente superiores.",
    impacto:
      "Exige comissionamento fundamental dos sistemas de energia e água, garantindo que o edifício opere na prática conforme simulado em projeto.",
    olharInvestidor:
      "Padrão global de liquidez para fundos imobiliários (FIIs) e investidores institucionais estrangeiros na leitura de risco operacional e descarbonização.",
    fonte: "https://www.usgbc.org/leed/",
  },
  WELL: {
    comoFunciona:
      "Enquanto o LEED foca no edifício, o WELL v2 foca na biologia humana dentro dele. Avalia 10 conceitos com pré-condições obrigatórias e otimizações pontuadas (até 100 pontos + 10 de inovação). Diferente de outros selos, exige verificação presencial com instrumentos calibrados (Performance Verification) após a ocupação.",
    criterios: [
      "Ar e Água (medição laboratorial in loco de VOCs, PM2.5, PM10, CO₂ e qualidade potável)",
      "Luz e Conforto Térmico (iluminação circadiana equivalente em melanopsina e zoneamento térmico)",
      "Som e Materiais (tempo de reverberação, isolamento acústico e restrição de compostos tóxicos)",
      "Nutrição, Movimento, Mente e Comunidade (acesso à natureza/biofilia, ergonomia e saúde mental)",
    ],
    niveis: [
      "WELL Silver · 50 a 59 pontos",
      "WELL Gold · 60 a 79 pontos",
      "WELL Platinum · 80 a 110 pontos",
    ],
    valorizacao:
      "Estudo do MIT Real Estate Innovation Lab (2020) identificou prêmio de locação entre 4,4% e 7,7% por pé quadrado em edifícios certificados WELL, isolando variáveis de idade e localização. Além do aluguel, o ganho em produtividade e redução de absenteísmo supera o custo de certificação em poucos meses.",
    impacto:
      "Coloca a saúde física e cognitiva do ocupante como métrica de engenharia, reduzindo o turnover corporativo e elevando a permanência contratual.",
    olharInvestidor:
      "Principal diferencial competitivo para atrair sedes de tecnologia, bancos e escritórios jurídicos que disputam talentos e reportam metas de S (Social) no ESG.",
    fonte:
      "https://support.wellcertified.com/hc/en-us/articles/25650185551383-WELL-Certification-overview",
  },
  BREEAM: {
    comoFunciona:
      "Criado em 1990 pelo BRE no Reino Unido, avalia 9 categorias ambientais ponderadas (Gestão, Saúde e Bem-Estar, Energia, Transporte, Água, Materiais, Resíduos, Uso do Solo/Ecologia e Poluição) mais Inovação. Um BREEAM Assessor licenciado audita as evidências de projeto e obra para emitir a nota percentual final.",
    criterios: [
      "Energia e emissões de carbono ao longo do ciclo de vida",
      "Saúde, bem-estar visual, qualidade do ar interno e conforto acústico",
      "Ecologia do terreno, biodiversidade líquida positiva e controle de poluição",
      "Materiais responsáveis, durabilidade e gestão de canteiro de obras",
    ],
    niveis: [
      "Pass · ≥ 30%",
      "Good · ≥ 45%",
      "Very Good · ≥ 55%",
      "Excellent · ≥ 70%",
      "Outstanding · ≥ 85%",
    ],
    valorizacao:
      "Estudos da CBRE, JLL e Knight Frank em mercados europeus registram prêmio de 6% a 8% no aluguel e valorização patrimonial (capital value) de 14% a 16% para ativos BREEAM Excellent e Outstanding frente ao estoque convencional.",
    impacto:
      "Forte rigor em análise de ciclo de vida, resiliência climática e biodiversidade do lote, blindando o imóvel contra futuras exigências regulatórias de carbono.",
    olharInvestidor:
      "Certificação preferida por fundos de pensão europeus e portfólios globais que exigem rastreabilidade estrita da cadeia de suprimentos e governança de obra.",
    fonte: "https://breeam.com/standards/new-construction",
  },
  EDGE: {
    comoFunciona:
      "Desenvolvido pela IFC (Banco Mundial) para democratizar a certificação em mercados emergentes. A equipe modela a geometria, orientação e sistemas no software gratuito EDGE App, comparando o projeto a um edifício base local. Para certificar, é obrigatório atingir pelo menos 20% de redução simultânea nos três eixos.",
    criterios: [
      "Eficiência Energética (mínimo 20% de redução via relação janela-parede, pintura refletiva, brises, isolamento e HVAC)",
      "Eficiência Hídrica (mínimo 20% de redução via metais econômicos, reúso e paisagismo nativo)",
      "Energia Incorporada nos Materiais (mínimo 20% de redução no carbono/energia de lajes, blocos, vidros e isolantes)",
    ],
    niveis: [
      "EDGE Certified · ≥ 20% em Energia, Água e Materiais",
      "EDGE Advanced · ≥ 40% em Energia (+ 20% em Água e Materiais)",
      "EDGE Zero Carbon · Advanced + 100% renovável ou compensação de carbono em operação",
    ],
    valorizacao:
      "Destrava descontos de IPTU Verde em diversos municípios brasileiros (como Salvador, São Paulo, Curitiba, Belo Horizonte e Guarulhos, conforme legislação municipal vigente) e habilita emissão de Green Bonds e financiamentos com taxas reduzidas junto a bancos de fomento.",
    impacto:
      "Foca 100% em escolhas físicas de arquitetura passiva e sistemas eficientes com o menor custo de consultoria e auditoria do mercado internacional.",
    olharInvestidor:
      "Melhor relação custo-benefício para incorporadoras residenciais, habitação de interesse social, hotéis e galpões logísticos comprovarem eficiência real ao comprador final.",
    fonte: "https://edgebuildings.com/certify/certification/",
  },
  "Selo Casa Azul": {
    comoFunciona:
      "Classificação socioambiental oficial da CAIXA para empreendimentos habitacionais. A metodologia atual avalia 53 critérios distribuídos em 6 categorias (Qualidade Urbana e Bem-Estar, Projeto e Conforto, Eficiência Energética, Conservação de Recursos Materiais, Gestão Eficiente da Água e Práticas Sociais/ASG), além de critérios de Finanças Sustentáveis.",
    criterios: [
      "Projeto e Conforto (desempenho térmico e lumínico conforme NBR 15220 e NBR 15575, ventilação cruzada e sombreamento)",
      "Eficiência Energética e Gestão da Água (aquecimento solar, geração fotovoltaica, medição individualizada e aproveitamento pluvial)",
      "Conservação de Recursos Materiais (gestão de resíduos de obra, fôrmas reutilizáveis e madeira rastreada)",
      "Qualidade Urbana e Práticas Sociais (integração com entorno, áreas de convívio e educação ambiental de moradores e trabalhadores)",
    ],
    niveis: [
      "Cristal · ≥ 50 pontos",
      "Topázio · ≥ 60 pontos",
      "Safira · ≥ 80 pontos",
      "Diamante · ≥ 100 pontos (+ requisitos de finanças sustentáveis/inovação)",
    ],
    valorizacao:
      "Gera benefício financeiro imediato na planilha de viabilidade da incorporadora: redução na taxa de juros do financiamento à produção (Plano Empresário / SBPE) e nas taxas para o mutuário final, além de maior velocidade de vendas (VSO).",
    impacto:
      "Auditoria realizada pela própria engenharia da CAIXA durante as medições de obra, garantindo que os itens sustentáveis não sejam cortados no meio da execução.",
    olharInvestidor:
      "Instrumento indispensável para construtoras habitacionais no Brasil reduzirem custo de capital (funding) e cumprirem exigências crescentes para grandes financiamentos via SFI/SBPE.",
    fonte:
      "https://www.caixa.gov.br/sustentabilidade/negocios-sustentaveis/selo-casa-azul-caixa/Paginas/default.aspx",
  },
  "AQUA-HQE": {
    comoFunciona:
      "Adaptado do processo francês Démarche HQE pela Fundação Vanzolini e professores da Poli-USP, respeitando integralmente o clima e a normalização brasileira (NBR 15575 e NBR 15220). Divide-se em dois instrumentos auditados presencialmente em 3 fases (Pré-projeto, Projeto e Execução): o Sistema de Gestão do Empreendimento (SGE) e a Qualidade Ambiental do Edifício (QAE).",
    criterios: [
      "Eco-construção (relação harmônica do edifício com o entorno, escolha integrada de produtos/sistemas e canteiro de obras com baixo impacto)",
      "Eco-gestão (gestão da energia, da água, dos resíduos de uso/operação e da manutenção/permanência do desempenho)",
      "Conforto (conforto higrotérmico tropicalizado, acústico, visual com luz natural e olfativo)",
      "Saúde (qualidade sanitária dos ambientes, qualidade do ar interno e qualidade sanitária da água)",
    ],
    niveis: [
      "Para certificar, das 14 categorias de QAE o projeto deve atingir no mínimo:",
      "3 categorias no nível EXCELENTE (Melhores Práticas)",
      "4 categorias no nível SUPERIOR (Boas Práticas)",
      "Máximo de 7 categorias no nível BOM (Prática Corrente / Pré-requisitos)",
    ],
    valorizacao:
      "Com mais de 980 empreendimentos e cerca de 20 milhões de m² certificados em 15 estados brasileiros pela Fundação Vanzolini, o selo facilita acesso a linhas de crédito verde, pontua em leis municipais de IPTU Verde e reduz custos condominiais em operação.",
    impacto:
      "Exige que o empreendedor defina o perfil ambiental desejado ainda na concepção e comprove a entrega em três auditorias independentes até o término da obra.",
    olharInvestidor:
      "Tradução mais fiel de um selo internacional de primeira linha para a cultura construtiva, climática e regulatória do Brasil.",
    fonte: "https://vanzolini.org.br/organizacoes/certificacoes/aqua-hqe/",
  },
};

const seloAnchorId = (sigla: string) =>
  `selo-${sigla.toLowerCase().replace(/\s+/g, "-")}`;

function SobreHeroIllustration() {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 640 520"
      className="h-full w-full"
      role="img"
      aria-label="Diagrama de clima, território e bem-estar aplicados à arquitetura"
    >
      <defs>
        <radialGradient id={`${uid}-sobreGlow`} cx="55%" cy="42%" r="65%">
          <stop offset="0%" stopColor="var(--primary, #00c67a)" stopOpacity="0.23" />
          <stop offset="100%" stopColor="var(--primary, #00c67a)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-sobreTerrain`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--primary, #00c67a)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--primary, #00c67a)" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <circle cx="330" cy="255" r="250" fill={`url(#${uid}-sobreGlow)`} />

      <g transform="translate(75,75)">
        {/* território em perspectiva */}
        <path
          d="M35 286L244 179 475 287 263 402z"
          fill={`url(#${uid}-sobreTerrain)`}
          stroke="var(--primary, #00c67a)"
          strokeOpacity="0.58"
          strokeWidth="1.5"
        />
        <g fill="none" stroke="var(--primary, #00c67a)" strokeOpacity="0.3" strokeWidth="1">
          <path d="M83 310L292 204 426 267M131 333L340 227 378 245M178 357L387 251M244 179v93M190 207v93M137 234v93M85 260v92" />
        </g>

        {/* edifício / ambiente */}
        <path
          d="M185 251L285 200 378 245 278 298z"
          fill="var(--primary, #00c67a)"
          fillOpacity="0.22"
          stroke="var(--primary, #00c67a)"
          strokeOpacity="0.75"
        />
        <path
          d="M185 251v-114l100-51v114z"
          fill="#0d1410"
          stroke="var(--primary, #00c67a)"
          strokeOpacity="0.7"
        />
        <path
          d="M285 86l93 45v114l-93-45z"
          fill="var(--primary, #00c67a)"
          fillOpacity="0.12"
          stroke="var(--primary, #00c67a)"
          strokeOpacity="0.7"
        />
        {[0, 1, 2].map((row) =>
          [0, 1].map((col) => (
            <path
              key={`${row}-${col}`}
              d={`M${203 + col * 35} ${157 + row * 29}l22-11v23l-22 11z`}
              fill="#7dd3fc"
              fillOpacity="0.22"
              stroke="#7dd3fc"
              strokeOpacity="0.5"
            />
          ))
        )}
        <path
          d="M302 128l52 25v30l-52-25zM302 193l52 25v18l-52-25z"
          fill="#fbbf24"
          fillOpacity="0.34"
        />

        {/* sol e leitura solar */}
        <g stroke="#fbbf24" strokeLinecap="round" strokeWidth="2">
          <circle cx="413" cy="52" r="21" fill="#fbbf24" fillOpacity="0.13" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => {
            const r = (d * Math.PI) / 180;
            return (
              <line
                key={d}
                x1={413 + Math.cos(r) * 31}
                y1={52 + Math.sin(r) * 31}
                x2={413 + Math.cos(r) * 40}
                y2={52 + Math.sin(r) * 40}
              />
            );
          })}
        </g>
        <path
          d="M399 73L340 160"
          stroke="#fbbf24"
          strokeOpacity="0.75"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />

        {/* vegetação e ventilação */}
        <g fill="var(--primary, #00c67a)">
          <path d="M104 293c-35-32-20-77 9-88 24 26 14 65-9 88z" opacity="0.72" />
          <path d="M112 289c4-39 33-53 55-38-7 26-27 42-55 38z" opacity="0.52" />
          <path d="M119 303v-74" stroke="var(--primary, #00c67a)" strokeWidth="3" />
        </g>
        <g
          fill="none"
          stroke="var(--primary, #00c67a)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.75"
        >
          <path d="M57 143c37-30 66-22 85 0 17 20 37 19 59 2" strokeDasharray="6 7">
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="-39"
              dur="3s"
              repeatCount="indefinite"
            />
          </path>
          <path d="M48 165c34-24 60-17 79 1 17 18 34 17 49 4" />
        </g>
      </g>

      {/* etiquetas técnicas com fundo escuro explícito */}
      <g transform="translate(32,102)">
        <rect
          width="148"
          height="60"
          rx="10"
          fill="#0d1410"
          stroke="#1f2e27"
          strokeWidth="1.2"
        />
        <circle cx="18" cy="20" r="4" fill="#00c67a">
          <animate
            attributeName="opacity"
            values="1;.3;1"
            dur="1.8s"
            repeatCount="indefinite"
          />
        </circle>
        <text
          x="30"
          y="24"
          fontSize="9"
          fill="#00c67a"
          fontFamily="monospace"
          fontWeight="bold"
          letterSpacing="1"
        >
          CLIMA E TERRITÓRIO
        </text>
        <text
          x="14"
          y="44"
          fontSize="10"
          fill="#CBD5E1"
          fontFamily="monospace"
        >
          sol · vento · água · solo
        </text>
      </g>
      <g transform="translate(420,383)">
        <rect
          width="172"
          height="61"
          rx="10"
          fill="#0d1410"
          stroke="#1f2e27"
          strokeWidth="1.2"
        />
        <text
          x="14"
          y="23"
          fontSize="9"
          fill="#00c67a"
          fontFamily="monospace"
          fontWeight="bold"
          letterSpacing="1"
        >
          BEM-ESTAR MENSURÁVEL
        </text>
        <text
          x="14"
          y="44"
          fontSize="10"
          fill="#CBD5E1"
          fontFamily="monospace"
        >
          luz · ar · conforto · saúde
        </text>
      </g>
    </svg>
  );
}

/* ── Modelo didático simplificado ── */
type EstadoSimulacao = {
  orientacao: OrientacaoKey;
  envoltoria: EnvoltoriaKey;
  corTinta: CorTintaKey;
  modoAc: AcModoKey;
};

export function calcularSimulacao({
  orientacao,
  envoltoria,
  corTinta,
  modoAc,
}: EstadoSimulacao) {
  const ori = ORIENTACOES[orientacao];
  const env = ENVOLTORIAS[envoltoria];
  const cor = CORES_TINTA[corTinta];
  const ac = MODOS_AC[modoAc];

  const ganhoSolarJanelaW = Math.round(
    ori.ganhoSolarW * (0.55 + cor.alpha * 0.75) * env.fatorCalor
  );

  const tempInterna = +(
    24 +
    ganhoSolarJanelaW * 0.0085 +
    (env.u - 0.85) * 0.55
  ).toFixed(1);

  const kwhMes = Math.max(
    15,
    Math.round(
      (ganhoSolarJanelaW * 0.09 + Math.max(0, tempInterna - ac.setpoint) * 9) *
        ac.fatorEnergia
    )
  );

  const penalidadeTermica = Math.max(0, (tempInterna - 24) * 7.5);
  const penalidadeChoqueAc = modoAc === "intenso18" ? 14 : 0;
  const bonusIsolamento =
    envoltoria === "termica" ? 12 : envoltoria === "ceramica" ? 4 : -6;
  const scoreConforto = Math.min(
    98,
    Math.max(
      22,
      Math.round(
        ori.luzScore - penalidadeTermica - penalidadeChoqueAc + bonusIsolamento
      )
    )
  );

  const nivelTemp = tempInterna >= 28.5 ? 2 : tempInterna >= 25.5 ? 1 : 0;
  const nivelScore = scoreConforto >= 75 ? 0 : scoreConforto >= 50 ? 1 : 2;
  const nivelConforto = Math.max(nivelTemp, nivelScore);

  return {
    ganhoSolarJanelaW,
    tempInterna,
    kwhMes,
    scoreConforto,
    nivelTemp,
    nivelConforto,
  };
}

/* ── Componente do Simulador 3D Estilo SketchUp / BIM ── */
/* ── Componente do Simulador 3D + Guia Visual de Patologias e Física Construtiva ── */
function LaboratorioInterativo() {
  const uid = useId().replace(/:/g, "");
  const ids = {
    thermalSpot: `${uid}-thermal`,
    sunBeamWall: `${uid}-sunbeam-wall`,
    sunBeamFloor: `${uid}-sunbeam-floor`,
    floorGrad: `${uid}-floor-grad`,
    wallLeftGrad: `${uid}-wall-left`,
    glassGrad: `${uid}-glass`,
    epsPattern: `${uid}-eps`,
    ceramicPattern: `${uid}-ceramic`,
    woodGrad: `${uid}-wood`,
  };

  const [orientacao, setOrientacao] = useState<OrientacaoKey>("O");
  const [envoltoria, setEnvoltoria] = useState<EnvoltoriaKey>("concreto");
  const [corTinta, setCorTinta] = useState<CorTintaKey>("grafite");
  const [modoAc, setModoAc] = useState<AcModoKey>("intenso18");
  const [abaMobile, setAbaMobile] = useState<
    "fachada" | "envoltoria" | "tinta" | "ac"
  >("fachada");
  const [fenomenoAtivo, setFenomenoAtivo] = useState<"mofo" | "parede" | "estufa">("mofo");

  const dadosOri = ORIENTACOES[orientacao];
  const dadosEnv = ENVOLTORIAS[envoltoria];
  const dadosCor = CORES_TINTA[corTinta];
  const dadosAc = MODOS_AC[modoAc];

  const {
    ganhoSolarJanelaW,
    tempInterna,
    kwhMes,
    scoreConforto,
    nivelTemp,
    nivelConforto,
  } = calcularSimulacao({ orientacao, envoltoria, corTinta, modoAc });

  const COR_NIVEL = ["#00C67A", "#FBBF24", "#EF4444"] as const;
  const corAlertaTemp = COR_NIVEL[nivelTemp];
  const corConforto = COR_NIVEL[nivelConforto];

  function aplicarPreset(tipo: "critico" | "otimizado") {
    if (tipo === "critico") {
      setOrientacao("O");
      setEnvoltoria("concreto");
      setCorTinta("grafite");
      setModoAc("intenso18");
    } else {
      setOrientacao("N");
      setEnvoltoria("termica");
      setCorTinta("branca");
      setModoAc("hibrido");
    }
  }

  const manchaSolarPiso = {
    N: "M342 238 L428 281 L368 312 L282 269 Z",
    L: "M342 238 L402 268 L352 294 L292 264 Z",
    O: "M342 238 L448 291 L345 344 L238 290 Z",
    S: "M342 238 L374 254 L344 270 L312 254 Z",
  }[orientacao];

  return (
    <section id="laboratorio-3d" className="mb-16 sm:mb-24 scroll-mt-24">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-primary">
          Educação do cliente · Simulador 3D
        </span>
        <span className="hidden sm:inline-block h-px w-16 bg-border" />
      </div>

      <h2 className="max-w-3xl text-display text-2xl font-extrabold leading-tight sm:text-3xl md:text-4xl mb-2 sm:mb-3">
        Entenda na prática: como cada escolha altera o ambiente.
      </h2>
      <p className="mb-5 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:mb-8 sm:text-base">
        Mude a orientação da fachada, a envoltória construtiva, a cor da pintura externa e o uso do
        ar-condicionado neste módulo de <strong>27 m² (4,50 m × 6,00 m)</strong>. Acompanhe os
        indicadores no topo do modelo 3D em tempo real.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.18fr_0.82fr] lg:gap-6">
        {/* ── Viewport 3D Estilo SketchUp Pro / BIM ── */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-emerald-950/80 bg-[#080D0B] p-3.5 sm:p-5 shadow-[0_25px_70px_rgba(0,0,0,0.4)]">
          {/* TOPO DO VISOR: Título + Presets + Pílulas Delicadas de Telemetria */}
          <div className="relative z-10 flex flex-col gap-2.5 border-b border-white/10 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="size-2 shrink-0 rounded-full bg-[#00C67A] animate-pulse" />
                <span className="text-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-50/90">
                  CORTE AXONOMÉTRICO BIM · 27,0 M²
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => aplicarPreset("critico")}
                  className="rounded-full border border-red-400/40 bg-red-500/10 px-2.5 py-0.5 text-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-red-300 hover:bg-red-500/25 transition-colors cursor-pointer"
                >
                  Sem estratégia
                </button>
                <button
                  type="button"
                  onClick={() => aplicarPreset("otimizado")}
                  className="rounded-full border border-[#00C67A]/50 bg-[#00C67A]/10 px-2.5 py-0.5 text-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-[#00C67A] hover:bg-[#00C67A]/25 transition-colors cursor-pointer"
                >
                  Com estratégia
                </button>
              </div>
            </div>

            {/* PÍLULAS DELICADAS DE TELEMETRIA NO TOPO (Visíveis enquanto a pessoa altera) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 backdrop-blur-sm">
                <span className="text-mono text-[8px] uppercase tracking-wider text-emerald-100/60">
                  Radiação
                </span>
                <span className="text-mono text-[11px] sm:text-xs font-bold text-amber-300">
                  {ganhoSolarJanelaW} W
                </span>
              </div>

              <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 backdrop-blur-sm">
                <span className="text-mono text-[8px] uppercase tracking-wider text-emerald-100/60">
                  Temp.
                </span>
                <span
                  className="text-mono text-[11px] sm:text-xs font-bold transition-colors"
                  style={{ color: corAlertaTemp }}
                >
                  {tempInterna}°C
                </span>
              </div>

              <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 backdrop-blur-sm">
                <span className="text-mono text-[8px] uppercase tracking-wider text-emerald-100/60">
                  Consumo
                </span>
                <span className="text-mono text-[11px] sm:text-xs font-bold text-sky-300">
                  {kwhMes} kWh
                </span>
              </div>

              <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 backdrop-blur-sm">
                <span className="text-mono text-[8px] uppercase tracking-wider text-emerald-100/60">
                  Conforto
                </span>
                <span
                  className="text-mono text-[11px] sm:text-xs font-bold transition-colors"
                  style={{ color: corConforto }}
                >
                  {scoreConforto}/100
                </span>
              </div>
            </div>
          </div>

          {/* ── Canvas SVG 3D Volumétrico ── */}
          <div className="relative my-1 h-[240px] sm:h-auto sm:aspect-[1.36] w-full">
            <svg
              viewBox="0 0 700 470"
              className="h-full w-full select-none"
              role="img"
              aria-label="Maquete eletrônica 3D em corte axonométrico com camadas de parede, mobiliário e insolação"
            >
              <defs>
                <radialGradient id={ids.thermalSpot} cx="55%" cy="52%" r="52%">
                  <stop offset="0%" stopColor={corAlertaTemp} stopOpacity="0.48" />
                  <stop offset="60%" stopColor={corAlertaTemp} stopOpacity="0.16" />
                  <stop offset="100%" stopColor={corAlertaTemp} stopOpacity="0" />
                </radialGradient>
                <linearGradient id={ids.sunBeamWall} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FDE047" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id={ids.sunBeamFloor} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FDE047" stopOpacity="0.58" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.06" />
                </linearGradient>
                <linearGradient id={ids.floorGrad} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#26332D" />
                  <stop offset="100%" stopColor="#17201C" />
                </linearGradient>
                <linearGradient id={ids.wallLeftGrad} x1="0" y1="0" x2="1" y2="0.4">
                  <stop offset="0%" stopColor="#2A3831" />
                  <stop offset="100%" stopColor="#1B2520" />
                </linearGradient>
                <linearGradient id={ids.glassGrad} x1="0" y1="0" x2="1" y2="1">
                  <stop
                    offset="0%"
                    stopColor={envoltoria === "termica" ? "#38BDF8" : "#BAE6FD"}
                    stopOpacity={envoltoria === "termica" ? "0.62" : "0.38"}
                  />
                  <stop offset="50%" stopColor="#E0F2FE" stopOpacity="0.18" />
                  <stop
                    offset="100%"
                    stopColor={envoltoria === "termica" ? "#0284C7" : "#7DD3FC"}
                    stopOpacity={envoltoria === "termica" ? "0.55" : "0.32"}
                  />
                </linearGradient>
                <linearGradient id={ids.woodGrad} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#E08E45" />
                  <stop offset="100%" stopColor="#B46522" />
                </linearGradient>
                <pattern id={ids.ceramicPattern} width="16" height="12" patternUnits="userSpaceOnUse">
                  <path
                    d="M0 6h16M8 0v6M0 12v-6"
                    stroke="#7C2D12"
                    strokeWidth="0.7"
                    strokeOpacity="0.28"
                    fill="none"
                  />
                </pattern>
              </defs>

              {/* 1. Base / Terreno Técnico Isométrico */}
              <g>
                <polygon
                  points="55,310 315,180 605,325 345,455"
                  fill="#0C1410"
                  stroke="#1E3028"
                  strokeWidth="1"
                />
                <g stroke="#182820" strokeWidth="0.75">
                  {[0.16, 0.33, 0.5, 0.66, 0.83].map((t, idx) => (
                    <g key={idx}>
                      <line
                        x1={55 + 260 * t}
                        y1={310 - 130 * t}
                        x2={345 + 260 * t}
                        y2={455 - 130 * t}
                      />
                      <line
                        x1={55 + 290 * t}
                        y1={310 + 145 * t}
                        x2={315 + 290 * t}
                        y2={180 + 145 * t}
                      />
                    </g>
                  ))}
                </g>
                <g strokeWidth="1.3" opacity="0.75">
                  <line x1="80" y1="302" x2="80" y2="78" stroke="#3B82F6" strokeDasharray="3 3" />
                  <line x1="80" y1="302" x2="305" y2="189" stroke="#22C55E" strokeDasharray="3 3" />
                  <line x1="80" y1="302" x2="328" y2="426" stroke="#EF4444" strokeDasharray="3 3" />
                </g>
              </g>

              {/* 2. Trajetória Solar e Sol 3D */}
              <path
                d="M165 88 Q365 -22 555 172"
                fill="none"
                stroke="#FBBF24"
                strokeWidth="1.3"
                strokeDasharray="5 6"
                opacity="0.45"
              />
              <line
                x1={dadosOri.sunPos.cx}
                y1={dadosOri.sunPos.cy}
                x2="405"
                y2="188"
                stroke="#FBBF24"
                strokeWidth="1.8"
                strokeDasharray="5 4"
                opacity="0.85"
              />
              <g
                transform={`translate(${dadosOri.sunPos.cx}, ${dadosOri.sunPos.cy})`}
                className="transition-all duration-500"
              >
                <circle r="26" fill="#FBBF24" fillOpacity="0.16" />
                <circle r="18" fill="#FBBF24" fillOpacity="0.28" />
                <circle r="12" fill="#FDE047" stroke="#FEF9C3" strokeWidth="1.5" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => {
                  const rad = (ang * Math.PI) / 180;
                  return (
                    <line
                      key={ang}
                      x1={Math.cos(rad) * 16}
                      y1={Math.sin(rad) * 16}
                      x2={Math.cos(rad) * 22}
                      y2={Math.sin(rad) * 22}
                      stroke="#FDE047"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  );
                })}
              </g>

              <polygon
                points="118,288 300,382 496,284 484,274 300,366 130,281"
                fill="#020504"
                opacity="0.75"
              />

              {/* 3. Laje de Piso 3D com Espessura */}
              <g>
                <polygon
                  points="118,274 300,365 300,381 118,290"
                  fill="#334155"
                  stroke="#64748B"
                  strokeWidth="1"
                />
                <polygon
                  points="300,365 488,271 488,287 300,381"
                  fill="#1E293B"
                  stroke="#64748B"
                  strokeWidth="1"
                />
                <polygon
                  points="140,285 310,200 470,280 300,365"
                  fill={`url(#${ids.floorGrad})`}
                  stroke="#94A3B8"
                  strokeWidth="1.4"
                />
                <g stroke="#33443C" strokeWidth="0.9" opacity="0.85">
                  <line x1="168" y1="271" x2="328" y2="351" />
                  <line x1="196" y1="257" x2="356" y2="337" />
                  <line x1="225" y1="242" x2="385" y2="322" />
                  <line x1="253" y1="228" x2="413" y2="308" />
                  <line x1="281" y1="214" x2="441" y2="294" />
                  <line x1="180" y1="305" x2="350" y2="220" />
                  <line x1="220" y1="325" x2="390" y2="240" />
                  <line x1="260" y1="345" x2="430" y2="260" />
                </g>
                <ellipse
                  cx="315"
                  cy="282"
                  rx="118"
                  ry="54"
                  fill={`url(#${ids.thermalSpot})`}
                />
              </g>

              {/* 4. Parede Esquerda 3D */}
              <g>
                <polygon
                  points="118,274 118,128 140,139 140,285"
                  fill={dadosCor.hexSombra}
                  stroke="#94A3B8"
                  strokeWidth="1.2"
                />
                <polygon
                  points="118,128 298,38 310,44 140,139"
                  fill="#475569"
                  stroke="#CBD5E1"
                  strokeWidth="1.2"
                />
                {envoltoria === "termica" && (
                  <polygon points="125,131 302,40 306,42 129,133" fill="#38BDF8" />
                )}
                <polygon
                  points="140,285 140,139 310,54 310,200"
                  fill={`url(#${ids.wallLeftGrad})`}
                  stroke="#94A3B8"
                  strokeWidth="1.4"
                />
                <polygon
                  points="140,285 140,277 310,192 310,200"
                  fill="#0F1714"
                  opacity="0.7"
                />
                <line
                  x1="144"
                  y1="143"
                  x2="308"
                  y2="61"
                  stroke="#FBBF24"
                  strokeWidth="2.5"
                  strokeOpacity="0.65"
                />
              </g>

              {/* 5. Parede da Fachada Direita 3D */}
              <g>
                <polygon
                  points="310,200 310,54 470,134 470,280"
                  fill={dadosCor.hex}
                  stroke="#CBD5E1"
                  strokeWidth="1.5"
                  className="transition-colors duration-500"
                />
                <polygon
                  points="310,200 310,54 470,134 470,280"
                  fill="#000000"
                  fillOpacity="0.12"
                  pointerEvents="none"
                />
                {envoltoria === "ceramica" && (
                  <polygon
                    points="310,200 310,54 470,134 470,280"
                    fill={`url(#${ids.ceramicPattern})`}
                    pointerEvents="none"
                  />
                )}
                <polygon
                  points="310,200 310,192 470,272 470,280"
                  fill="#0F1714"
                  opacity="0.6"
                />
                <polygon
                  points="310,54 310,38 488,125 470,134"
                  fill={
                    envoltoria === "ceramica"
                      ? "#B45309"
                      : envoltoria === "termica"
                      ? "#475569"
                      : "#64748B"
                  }
                  stroke="#E2E8F0"
                  strokeWidth="1.2"
                />
                {envoltoria === "termica" && (
                  <>
                    <polygon points="310,46 310,42 482,127 477,130" fill="#38BDF8" />
                    <polygon points="477,130 482,127 482,276 477,278" fill="#38BDF8" />
                  </>
                )}
                {envoltoria === "ceramica" && (
                  <g stroke="#FDE68A" strokeWidth="1" opacity="0.7">
                    <line x1="335" y1="58" x2="350" y2="65" strokeDasharray="3 3" />
                    <line x1="375" y1="78" x2="395" y2="88" strokeDasharray="3 3" />
                    <line x1="420" y1="100" x2="445" y2="112" strokeDasharray="3 3" />
                  </g>
                )}
                <polygon
                  points="470,134 488,125 488,271 470,280"
                  fill={dadosCor.hexSombra}
                  stroke="#CBD5E1"
                  strokeWidth="1.3"
                />

                {/* Esquadria 3D com Recuo e Peitoril */}
                <polygon
                  points="348,182 348,108 358,113 358,187"
                  fill="#334155"
                  stroke="#0F172A"
                  strokeWidth="1"
                />
                <polygon
                  points="348,182 434,225 442,221 358,179"
                  fill="#94A3B8"
                  stroke="#1E293B"
                  strokeWidth="1"
                />
                <polygon
                  points="354,180 354,111 436,152 436,221"
                  fill={`url(#${ids.glassGrad})`}
                  stroke="#0F172A"
                  strokeWidth="2.8"
                />
                {envoltoria === "termica" && (
                  <polygon
                    points="358,178 358,114 432,151 432,217"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="1"
                    strokeDasharray="3 2"
                  />
                )}
                <line x1="395" y1="131" x2="395" y2="200" stroke="#0F172A" strokeWidth="2.4" />
                <line x1="354" y1="146" x2="436" y2="187" stroke="#0F172A" strokeWidth="1.6" />
                <line
                  x1="366"
                  y1="126"
                  x2="384"
                  y2="178"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeOpacity="0.45"
                  strokeLinecap="round"
                />
                <line
                  x1="373"
                  y1="124"
                  x2="386"
                  y2="162"
                  stroke="#FFFFFF"
                  strokeWidth="1"
                  strokeOpacity="0.3"
                  strokeLinecap="round"
                />

                {/* Brise-soleil 3D Externo */}
                {dadosEnv.brise && (
                  <g className="transition-opacity duration-300">
                    <line x1="350" y1="102" x2="350" y2="152" stroke="#047857" strokeWidth="2" />
                    <line x1="442" y1="148" x2="442" y2="198" stroke="#047857" strokeWidth="2" />
                    {[0, 1, 2, 3].map((b) => (
                      <g key={b}>
                        <polygon
                          points={`346,${104 + b * 12} 438,${150 + b * 12} 452,${
                            143 + b * 12
                          } 360,${97 + b * 12}`}
                          fill="#00C67A"
                          stroke="#064E3B"
                          strokeWidth="1"
                        />
                        <polygon
                          points={`346,${104 + b * 12} 438,${150 + b * 12} 438,${
                            153 + b * 12
                          } 346,${107 + b * 12}`}
                          fill="#047857"
                        />
                      </g>
                    ))}
                  </g>
                )}
              </g>

              {/* 6. Feixe de Luz Solar Volumétrico */}
              <g pointerEvents="none">
                <polygon
                  points="354,180 436,221 368,312 282,269"
                  fill={`url(#${ids.sunBeamWall})`}
                  opacity={dadosEnv.brise ? "0.28" : "0.75"}
                  className="transition-all duration-500"
                />
                <path
                  d={manchaSolarPiso}
                  fill={`url(#${ids.sunBeamFloor})`}
                  opacity={dadosEnv.brise ? "0.32" : "0.95"}
                  className="transition-all duration-500"
                />
              </g>

              {/* 7. Mobiliário 3D */}
              <g>
                <polygon
                  points="252,138 252,100 294,79 294,117"
                  fill="#13201B"
                  stroke="#475569"
                  strokeWidth="1.5"
                />
                <polygon
                  points="256,132 256,103 290,86 290,115"
                  fill="#00C67A"
                  fillOpacity="0.16"
                />
                <polygon
                  points="204,284 282,245 362,285 284,324"
                  fill="#0F172A"
                  fillOpacity="0.7"
                  stroke="#334155"
                  strokeWidth="1.2"
                />
                <g>
                  <line x1="252" y1="274" x2="252" y2="260" stroke="#94A3B8" strokeWidth="2" />
                  <line x1="242" y1="278" x2="262" y2="270" stroke="#64748B" strokeWidth="1.5" />
                  <line x1="244" y1="270" x2="260" y2="278" stroke="#64748B" strokeWidth="1.5" />
                  <polygon
                    points="238,258 256,249 270,256 252,265"
                    fill="#334155"
                    stroke="#CBD5E1"
                    strokeWidth="1"
                  />
                  <polygon
                    points="238,258 238,234 254,226 254,250"
                    fill="#1E293B"
                    stroke="#94A3B8"
                    strokeWidth="1.2"
                  />
                </g>
                <g>
                  <path
                    d="M224,262 L224,296 L254,311 L254,277"
                    fill="none"
                    stroke="#CBD5E1"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M292,228 L292,262 L322,277 L322,243"
                    fill="none"
                    stroke="#94A3B8"
                    strokeWidth="1.8"
                  />
                  <polygon
                    points="218,256 290,220 328,239 256,275"
                    fill={`url(#${ids.woodGrad})`}
                    stroke="#FDE68A"
                    strokeWidth="1.1"
                  />
                  <polygon points="218,256 256,275 256,280 218,261" fill="#9A3412" />
                  <polygon points="256,275 328,239 328,244 256,280" fill="#7C2D12" />
                  <line x1="274" y1="244" x2="274" y2="235" stroke="#E2E8F0" strokeWidth="2.2" />
                  <polygon points="267,246 277,241 282,244 272,249" fill="#64748B" />
                  <polygon
                    points="254,238 288,221 288,203 254,220"
                    fill="#0F172A"
                    stroke="#38BDF8"
                    strokeWidth="1.4"
                  />
                  <line x1="259" y1="227" x2="272" y2="220" stroke="#00C67A" strokeWidth="1.5" />
                  <line x1="259" y1="231" x2="282" y2="219" stroke="#38BDF8" strokeWidth="1.2" />
                </g>
                <g>
                  <line x1="252" y1="145" x2="252" y2="178" stroke="#64748B" strokeWidth="0.9" />
                  <line x1="292" y1="125" x2="292" y2="158" stroke="#64748B" strokeWidth="0.9" />
                  <polygon
                    points="244,181 298,154 302,156 248,183"
                    fill="#FBBF24"
                    stroke="#FEF08A"
                    strokeWidth="0.8"
                  />
                </g>
                <g transform="translate(174, 274)">
                  <ellipse cx="2" cy="10" rx="16" ry="8" fill="#000000" opacity="0.45" />
                  <path
                    d="M-12,-4 L-9,10 C-9,14 9,14 9,10 L12,-4 Z"
                    fill="#9A3412"
                    stroke="#F97316"
                    strokeWidth="1"
                  />
                  <ellipse
                    cx="0"
                    cy="-4"
                    rx="12"
                    ry="5.5"
                    fill="#431407"
                    stroke="#F97316"
                    strokeWidth="1"
                  />
                  <path
                    d="M0,-4 C-20,-24 -14,-52 3,-60 C18,-44 14,-18 0,-4 Z"
                    fill="#00C67A"
                    stroke="#A7F3D0"
                    strokeWidth="0.7"
                  />
                  <path
                    d="M2,-4 C14,-30 34,-40 46,-26 C34,-8 18,0 2,-4 Z"
                    fill="#10B981"
                    stroke="#6EE7B7"
                    strokeWidth="0.7"
                  />
                  <path
                    d="M-2,-4 C-24,-10 -32,-28 -18,-38 C-6,-30 -2,-14 -2,-4 Z"
                    fill="#059669"
                  />
                </g>
              </g>

              {/* 8. Ar-Condicionado Split 3D */}
              <g>
                <polygon
                  points="186,162 248,131 248,149 186,180"
                  fill="#F8FAFC"
                  stroke="#64748B"
                  strokeWidth="1.3"
                />
                <polygon
                  points="180,158 242,127 248,131 186,162"
                  fill="#CBD5E1"
                  stroke="#64748B"
                  strokeWidth="1"
                />
                <polygon
                  points="180,158 186,162 186,180 180,176"
                  fill="#94A3B8"
                  stroke="#475569"
                  strokeWidth="1"
                />
                <line x1="190" y1="174" x2="244" y2="147" stroke="#0284C7" strokeWidth="1.8" />
                <g
                  fill="none"
                  stroke={dadosAc.corFluxo}
                  strokeWidth={modoAc === "intenso18" ? "2.4" : "1.8"}
                  strokeDasharray="5 5"
                  opacity="0.92"
                >
                  <path d="M206 174 Q235 206 272 230">
                    <animate
                      attributeName="stroke-dashoffset"
                      from="20"
                      to="0"
                      dur={modoAc === "intenso18" ? "0.65s" : "1.5s"}
                      repeatCount="indefinite"
                    />
                  </path>
                  <path d="M226 164 Q258 196 302 218">
                    <animate
                      attributeName="stroke-dashoffset"
                      from="20"
                      to="0"
                      dur={modoAc === "intenso18" ? "0.65s" : "1.5s"}
                      repeatCount="indefinite"
                    />
                  </path>
                  {modoAc === "intenso18" && (
                    <path d="M192 182 Q216 220 248 248">
                      <animate
                        attributeName="stroke-dashoffset"
                        from="20"
                        to="0"
                        dur="0.6s"
                        repeatCount="indefinite"
                      />
                    </path>
                  )}
                </g>
                <rect
                  x="176"
                  y="98"
                  width="74"
                  height="20"
                  rx="5"
                  fill="#080D0B"
                  stroke={dadosAc.corFluxo}
                  strokeWidth="1.2"
                />
                <text
                  x="213"
                  y="112"
                  textAnchor="middle"
                  fontSize="9.5"
                  fill={dadosAc.corFluxo}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  AC · {dadosAc.setpoint}°C
                </text>
              </g>

              {/* 9. Vetores de Ganho Térmico */}
              {ganhoSolarJanelaW > 200 && (
                <g stroke="#EF4444" strokeWidth="2" fill="none">
                  <path d="M454 185 L412 206" strokeDasharray="3 3" />
                  <polygon points="412,206 419,199 421,207" fill="#EF4444" />
                  <path d="M454 215 L412 236" strokeDasharray="3 3" />
                  <polygon points="412,236 419,229 421,237" fill="#EF4444" />
                </g>
              )}

              {/* 10. Linhas de Cota 3D */}
              <g stroke="#00C67A" strokeWidth="1.2">
                <line x1="112" y1="304" x2="286" y2="391" />
                <line x1="119" y1="296" x2="105" y2="312" />
                <line x1="293" y1="383" x2="279" y2="399" />
                <rect x="164" y="338" width="62" height="20" rx="4" fill="#080D0B" />
                <text
                  x="195"
                  y="352"
                  textAnchor="middle"
                  fontSize="11"
                  fill="#00C67A"
                  fontFamily="monospace"
                  fontWeight="bold"
                  stroke="none"
                >
                  4,50 m
                </text>
              </g>
              <g stroke="#00C67A" strokeWidth="1.2">
                <line x1="314" y1="391" x2="496" y2="300" />
                <line x1="307" y1="383" x2="321" y2="399" />
                <line x1="489" y1="292" x2="503" y2="308" />
                <rect x="376" y="336" width="62" height="20" rx="4" fill="#080D0B" />
                <text
                  x="407"
                  y="350"
                  textAnchor="middle"
                  fontSize="11"
                  fill="#00C67A"
                  fontFamily="monospace"
                  fontWeight="bold"
                  stroke="none"
                >
                  6,00 m
                </text>
              </g>
              <g stroke="#94A3B8" strokeWidth="1.1">
                <line x1="96" y1="274" x2="96" y2="128" />
                <line x1="90" y1="274" x2="102" y2="274" />
                <line x1="90" y1="128" x2="102" y2="128" />
                <rect x="52" y="192" width="60" height="20" rx="4" fill="#080D0B" />
                <text
                  x="82"
                  y="206"
                  textAnchor="middle"
                  fontSize="11"
                  fill="#E2E8F0"
                  fontFamily="monospace"
                  stroke="none"
                >
                  2,80 m
                </text>
              </g>

              {/* Rosa dos Ventos Interativa */}
              <g transform="translate(600, 396)">
                <circle r="38" fill="#0D1512" stroke="#1E2E26" strokeWidth="1.5" />
                <circle r="28" fill="none" stroke="#1E2E26" strokeDasharray="2 3" />
                {(["N", "L", "S", "O"] as OrientacaoKey[]).map((dir) => {
                  const posMap = {
                    N: { x: 0, y: -24 },
                    L: { x: 24, y: 4 },
                    S: { x: 0, y: 31 },
                    O: { x: -24, y: 4 },
                  }[dir];
                  const ativo = orientacao === dir;
                  return (
                    <text
                      key={dir}
                      x={posMap.x}
                      y={posMap.y}
                      textAnchor="middle"
                      fontSize={ativo ? "12" : "9"}
                      fontFamily="monospace"
                      fontWeight="bold"
                      fill={ativo ? "#00C67A" : "#94A3B8"}
                      style={{ cursor: "pointer" }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Fachada ${ORIENTACOES[dir].nome}`}
                      aria-pressed={ativo}
                      onClick={() => setOrientacao(dir)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setOrientacao(dir);
                        }
                      }}
                    >
                      {dir}
                    </text>
                  );
                })}
                <polygon points="0,-14 5,4 0,0 -5,4" fill="#00C67A" />
              </g>
            </svg>
          </div>

          {/* Rodapé discreto de especificações ativas no visor */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-mono text-[8px] sm:text-[9px] text-emerald-100/65">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Fachada: <strong className="text-[#00C67A]">{dadosOri.nome}</strong>
              </span>
              <span>·</span>
              <span>{dadosEnv.transmitancia}</span>
              <span>·</span>
              <span>α = {dadosCor.alpha.toFixed(2).replace(".", ",")}</span>
            </div>
            <span className="text-sky-300/90">
              Corte: {dadosEnv.nome}
            </span>
          </div>
        </div>

        {/* ── Painel de Controles Interativos ── */}
        <div className="flex flex-col justify-between gap-3 rounded-3xl border border-border bg-card p-4 sm:p-6">
          <div className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-background/60 p-1 lg:hidden">
            {[
              { id: "fachada", label: "1. Sol" },
              { id: "envoltoria", label: "2. Parede" },
              { id: "tinta", label: "3. Tinta" },
              { id: "ac", label: "4. Clima" },
            ].map((tab) => {
              const ativo = abaMobile === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAbaMobile(tab.id as typeof abaMobile)}
                  className={`rounded-lg py-2 text-mono text-[9px] font-bold uppercase tracking-wider transition-all ${
                    ativo
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div className={abaMobile === "fachada" ? "block" : "hidden lg:block"}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-mono text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  1. Orientação da Fachada
                </span>
                <span className="text-mono text-[9px] text-muted-foreground">
                  {dadosOri.insolacao}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(ORIENTACOES) as OrientacaoKey[]).map((k) => {
                  const ativo = orientacao === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setOrientacao(k)}
                      className={`rounded-xl border py-2 px-2 text-center transition-all cursor-pointer ${
                        ativo
                          ? "border-primary bg-primary/15 text-primary shadow-sm"
                          : "border-border bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      <div className="text-display text-base font-extrabold">{k}</div>
                      <div className="text-mono text-[8px] uppercase tracking-wider">
                        {ORIENTACOES[k].nome}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={abaMobile === "envoltoria" ? "block" : "hidden lg:block"}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-mono text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  2. Envoltória Construtiva (Parede + Vidro)
                </span>
                <span className="text-mono text-[9px] text-muted-foreground">
                  {dadosEnv.transmitancia}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
                {(Object.keys(ENVOLTORIAS) as EnvoltoriaKey[]).map((k) => {
                  const item = ENVOLTORIAS[k];
                  const ativo = envoltoria === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setEnvoltoria(k)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition-all cursor-pointer ${
                        ativo
                          ? "border-primary bg-primary/12 text-foreground"
                          : "border-border bg-background/40 text-muted-foreground hover:border-primary/35 hover:text-foreground"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-foreground">{item.nome}</p>
                        <p className="text-[11px] text-muted-foreground">{item.detalhe}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-mono text-[8px] uppercase ${
                          ativo
                            ? "border-primary/50 bg-primary/20 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {item.transmitancia}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={abaMobile === "tinta" ? "block" : "hidden lg:block"}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-mono text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  3. Cor da Pintura Externa (Absortância)
                </span>
                <span className="text-mono text-[9px] text-muted-foreground">
                  {dadosCor.absortancia}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(CORES_TINTA) as CorTintaKey[]).map((k) => {
                  const item = CORES_TINTA[k];
                  const ativo = corTinta === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setCorTinta(k)}
                      className={`flex items-center gap-2 rounded-xl border p-2 text-left transition-all cursor-pointer ${
                        ativo
                          ? "border-primary bg-primary/12 text-foreground"
                          : "border-border bg-background/40 text-muted-foreground hover:border-primary/35"
                      }`}
                    >
                      <span
                        className="size-4 sm:size-5 shrink-0 rounded-full border border-black/20 shadow-inner"
                        style={{ backgroundColor: item.hex }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">{item.nome}</p>
                        <p className="text-mono text-[8px] text-muted-foreground">
                          α = {item.alpha.toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={abaMobile === "ac" ? "block" : "hidden lg:block"}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-mono text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  4. Regime de Climatização (Ar-Condicionado)
                </span>
                <span className="text-mono text-[9px] text-muted-foreground">
                  Setpoint {dadosAc.setpoint}°C
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
                {(Object.keys(MODOS_AC) as AcModoKey[]).map((k) => {
                  const item = MODOS_AC[k];
                  const ativo = modoAc === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setModoAc(k)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition-all cursor-pointer ${
                        ativo
                          ? "border-sky-500/70 bg-sky-500/10 text-foreground"
                          : "border-border bg-background/40 text-muted-foreground hover:border-sky-500/35"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-foreground">{item.nome}</p>
                        <p className="text-[11px] text-muted-foreground">{item.detalhe}</p>
                      </div>
                      <span className="text-mono text-xs font-bold text-sky-500">
                        {item.setpoint}°C
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-mono text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
                Leitura Técnica da Combinação
              </span>
              <span className="text-mono text-[8px] text-muted-foreground">
                Estimativa didática · NBR 15220 / 15575
              </span>
            </div>
            <p className="text-xs leading-relaxed text-foreground lg:hidden">
              {abaMobile === "fachada" && (
                <>
                  <strong>Fachada {dadosOri.nome}:</strong> {dadosOri.resumo}
                </>
              )}
              {abaMobile === "envoltoria" && (
                <>
                  <strong>{dadosEnv.nome}:</strong> {dadosEnv.resumo}
                </>
              )}
              {abaMobile === "tinta" && (
                <>
                  <strong>Pintura {dadosCor.nome}:</strong> {dadosCor.resumo}
                </>
              )}
              {abaMobile === "ac" && (
                <>
                  <strong>{dadosAc.nome}:</strong> {dadosAc.resumo}
                </>
              )}
            </p>
            <p className="hidden lg:block text-xs leading-relaxed text-foreground">
              <strong>Fachada {dadosOri.nome}:</strong> {dadosOri.resumo}{" "}
              <strong>Envoltória & Cor:</strong> {dadosEnv.resumo} {dadosCor.resumo}
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
         GUIA VISUAL DE FÍSICA CONSTRUTIVA (MOFO, PAREDE & EFEITO ESTUFA)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="mt-10 rounded-3xl border border-border bg-card p-5 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/70 pb-5">
          <div>
            <span className="text-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              Física da Construção Descomplicada
            </span>
            <h3 className="mt-1 text-display text-xl sm:text-2xl font-extrabold text-foreground">
              O que acontece invisivelmente dentro da parede e do vidro?
            </h3>
          </div>

          {/* Botões seletores dos 3 fenômenos */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "mofo", label: "1. Como surge o Mofo" },
              { id: "parede", label: "2. Como o Calor atravessa a Parede" },
              { id: "estufa", label: "3. Efeito Estufa no Vidro" },
            ].map((item) => {
              const ativo = fenomenoAtivo === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFenomenoAtivo(item.id as typeof fenomenoAtivo)}
                  className={`rounded-full border px-3.5 py-1.5 text-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] transition-all cursor-pointer ${
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

        {/* ── FENÔMENO 1: COMO ACONTECE O MOFO (PONTO DE ORVALHO & PONTE TÉRMICA) ── */}
        {fenomenoAtivo === "mofo" && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr] items-center">
            <div className="space-y-3.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-mono text-[9px] font-bold uppercase tracking-wider text-sky-500">
                Ponte Térmica + Ponto de Orvalho
              </div>
              <h4 className="text-display text-lg sm:text-xl font-extrabold text-foreground">
                Mofo não é só "infiltração": é o vapor interno condensando numa parede gelada.
              </h4>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Em fachadas que quase não recebem sol no inverno (como a <strong>Fachada Sul</strong>),
                uma parede fina ou viga de concreto sem isolamento esfria rapidamente. Quando o ar
                morno e úmido de dentro de casa (respiração, banho, cozinha) encosta nessa superfície
                fria, ele atinge o <strong>Ponto de Orvalho</strong> e vira microgotículas de água
                invisíveis — o habitat perfeito para esporos de fungos em menos de 48 horas.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-3">
                  <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-red-500">
                    Sem Isolamento (U = 3,7)
                  </span>
                  <p className="mt-1 text-xs text-foreground">
                    Superfície interna cai para <strong>14°C</strong>. O vapor condensa na tinta e o
                    mofo preto aparece nos cantos e atrás de armários.
                  </p>
                </div>
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
                  <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-primary">
                    Com Isolamento + Ventilação
                  </span>
                  <p className="mt-1 text-xs text-foreground">
                    O EPS mantém a face interna acima de <strong>20°C</strong> (acima do ponto de
                    orvalho) e a ventilação cruzada remove o excesso de umidade.
                  </p>
                </div>
              </div>
            </div>

            {/* Diagrama SVG: Corte de Condensação e Mofo vs Parede Isolada */}
            <div className="rounded-2xl border border-border bg-[#09100D] p-4">
              <svg viewBox="0 0 460 220" className="w-full h-auto" role="img" aria-label="Diagrama comparativo de formação de mofo por condensação">
                {/* Lado Esquerdo: Parede Fria com Mofo */}
                <g transform="translate(15, 18)">
                  <text x="95" y="12" textAnchor="middle" fontSize="9.5" fill="#F87171" fontFamily="monospace" fontWeight="bold">
                    PAREDE MACIÇA FRIA (SUL)
                  </text>
                  {/* Ar externo frio */}
                  <text x="22" y="95" fontSize="9" fill="#38BDF8" fontFamily="monospace">Ext: 10°C</text>
                  {/* Parede de concreto */}
                  <rect x="75" y="26" width="32" height="145" rx="3" fill="#475569" stroke="#94A3B8" />
                  {/* Gotículas de condensação e fungos na face interna */}
                  {[45, 68, 92, 115, 138].map((y, i) => (
                    <g key={i}>
                      <circle cx="112" cy={y} r="3" fill="#38BDF8" />
                      <circle cx="106" cy={y + 8} r="4.5" fill="#1E293B" stroke="#EF4444" strokeWidth="0.8" />
                    </g>
                  ))}
                  {/* Vapor interno batendo na parede gelada */}
                  <path d="M168 65 Q138 65 116 75" fill="none" stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="3 3" />
                  <path d="M168 115 Q138 115 116 105" fill="none" stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="3 3" />
                  <text x="122" y="52" fontSize="8.5" fill="#F8FAFC" fontFamily="monospace">Face: 13,8°C</text>
                  <text x="122" y="138" fontSize="8.5" fill="#F87171" fontFamily="monospace" fontWeight="bold">CONDENSAÇÃO</text>
                  <text x="122" y="150" fontSize="8" fill="#FCA5A5" fontFamily="monospace">+ MOFO NOS CANTOS</text>
                </g>

                <line x1="230" y1="20" x2="230" y2="200" stroke="#1E3028" strokeDasharray="4 4" />

                {/* Lado Direito: Parede com Isolamento EPS Sem Mofo */}
                <g transform="translate(245, 18)">
                  <text x="100" y="12" textAnchor="middle" fontSize="9.5" fill="#00C67A" fontFamily="monospace" fontWeight="bold">
                    PAREDE COM EPS (BARREIRA)
                  </text>
                  <text x="12" y="95" fontSize="9" fill="#38BDF8" fontFamily="monospace">Ext: 10°C</text>
                  {/* Camada externa + EPS azul + Camada interna */}
                  <rect x="65" y="26" width="14" height="145" fill="#475569" />
                  <rect x="79" y="26" width="14" height="145" fill="#38BDF8" fillOpacity="0.85" />
                  <rect x="93" y="26" width="14" height="145" fill="#64748B" />
                  {/* Parede seca */}
                  <text x="116" y="52" fontSize="8.5" fill="#00C67A" fontFamily="monospace" fontWeight="bold">Face: 20,4°C</text>
                  <text x="116" y="66" fontSize="8" fill="#CBD5E1" fontFamily="monospace">Acima do orvalho</text>
                  <path d="M122 115 C145 95 165 125 185 100" fill="none" stroke="#00C67A" strokeWidth="1.8" strokeDasharray="4 4" />
                  <text x="116" y="142" fontSize="8.5" fill="#00C67A" fontFamily="monospace" fontWeight="bold">PAREDE 100% SECA</text>
                  <text x="116" y="154" fontSize="8" fill="#A7F3D0" fontFamily="monospace">Zero fungos e esporos</text>
                </g>
              </svg>
            </div>
          </div>
        )}

        {/* ── FENÔMENO 2: COMO O CALOR ATRAVESSA CADA PAREDE (ATRASO TÉRMICO) ── */}
        {fenomenoAtivo === "parede" && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr] items-center">
            <div className="space-y-3.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-mono text-[9px] font-bold uppercase tracking-wider text-amber-500">
                Transmitância ($U$) & Atraso Térmico ($\varphi$)
              </div>
              <h4 className="text-display text-lg sm:text-xl font-extrabold text-foreground">
                Por que a casa continua quente às 22h mesmo quando a noite já está fresca?
              </h4>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Toda parede funciona como uma esponja de calor. Quando o sol da tarde (Oeste) bate
                numa parede pintada de <strong>Grafite ($\alpha = 0,85$)</strong>, a superfície
                externa passa de <strong>60°C</strong>. No concreto maciço fino, essa onda atravessa
                rápido e transforma a parede num radiador ligado para dentro do quarto. Já a parede
                dupla com <strong>EPS + tinta clara</strong> reflete 80% na largada e amortece a onda
                térmica antes que ela chegue ao interior.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="rounded-xl border border-border bg-background/60 p-2.5">
                  <span className="text-mono text-[8px] font-bold uppercase text-red-500">
                    1. Concreto 12cm
                  </span>
                  <p className="mt-1 text-xs font-extrabold text-foreground">Atraso: ~2,8 h</p>
                  <p className="text-[11px] text-muted-foreground">O pico de calor entra todo à tarde.</p>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-2.5">
                  <span className="text-mono text-[8px] font-bold uppercase text-amber-500">
                    2. Bloco Cerâmico
                  </span>
                  <p className="mt-1 text-xs font-extrabold text-foreground">Atraso: ~4,6 h</p>
                  <p className="text-[11px] text-muted-foreground">Ar nos furos amortece parte do fluxo.</p>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-2.5">
                  <span className="text-mono text-[8px] font-bold uppercase text-primary">
                    3. Dupla + EPS
                  </span>
                  <p className="mt-1 text-xs font-extrabold text-foreground">Atraso: &gt; 8,5 h</p>
                  <p className="text-[11px] text-muted-foreground">Onda morre no isolante térmico.</p>
                </div>
              </div>
            </div>

            {/* Diagrama SVG: Onda de Calor Atravessando as 3 Paredes */}
            <div className="rounded-2xl border border-border bg-[#09100D] p-4">
              <svg viewBox="0 0 460 220" className="w-full h-auto" role="img" aria-label="Comparativo de fluxo de calor em três tipos de parede">
                {[
                  {
                    y: 16,
                    titulo: "CONCRETO MACIÇO + TINTA ESCURA (U = 3,7 W/m²K)",
                    corOnda: "#EF4444",
                    ondaPath: "M25 38 Q55 18 85 38 T145 38 T205 38 L295 38",
                    tempInt: "31,2°C",
                  },
                  {
                    y: 84,
                    titulo: "BLOCO CERÂMICO 19CM (U = 2,1 W/m²K)",
                    corOnda: "#FBBF24",
                    ondaPath: "M25 38 Q55 20 85 38 T145 38 Q180 46 225 38 L275 38",
                    tempInt: "27,4°C",
                  },
                  {
                    y: 152,
                    titulo: "PAREDE DUPLA + EPS + TINTA BRANCA (U = 0,85 W/m²K)",
                    corOnda: "#00C67A",
                    ondaPath: "M25 38 Q55 28 85 38 Q115 41 155 38 L245 38",
                    tempInt: "23,8°C",
                  },
                ].map((row, idx) => (
                  <g key={row.titulo} transform={`translate(18, ${row.y})`}>
                    <text x="0" y="11" fontSize="8.5" fill={row.corOnda} fontFamily="monospace" fontWeight="bold">
                      {row.titulo}
                    </text>
                    {/* Corte da parede no meio */}
                    <rect x="135" y="18" width="44" height="36" rx="3" fill="#334155" stroke="#64748B" />
                    {idx === 1 && (
                      <line x1="157" y1="20" x2="157" y2="52" stroke="#F59E0B" strokeWidth="2" strokeDasharray="4 3" />
                    )}
                    {idx === 2 && (
                      <rect x="151" y="19" width="12" height="34" fill="#38BDF8" />
                    )}
                    {/* Onda térmica atravessando */}
                    <path d={row.ondaPath} fill="none" stroke={row.corOnda} strokeWidth="2.4" />
                    <polygon
                      points={`${idx === 0 ? 298 : idx === 1 ? 278 : 248},38 ${
                        idx === 0 ? 290 : idx === 1 ? 270 : 240
                      },33 ${idx === 0 ? 290 : idx === 1 ? 270 : 240},43`}
                      fill={row.corOnda}
                    />
                    <text x="335" y="42" fontSize="13" fill={row.corOnda} fontFamily="monospace" fontWeight="bold">
                      Int: {row.tempInt}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        )}

        {/* ── FENÔMENO 3: EFEITO ESTUFA NO VIDRO VS. BRISE + LOW-E ── */}
        {fenomenoAtivo === "estufa" && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr] items-center">
            <div className="space-y-3.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                Fator Solar ($FS$) & Seletividade Espectral
              </div>
              <h4 className="text-display text-lg sm:text-xl font-extrabold text-foreground">
                Luz não precisa significar calor: como separar iluminação natural de radiação térmica.
              </h4>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                O vidro comum é transparente para a radiação solar de <strong>onda curta</strong>.
                Ela atravessa a janela, aquece o piso e os móveis, e é reemitida como{" "}
                <strong>onda longa (infravermelho térmico)</strong> — que não consegue sair pelo
                vidro, criando uma estufa. Quando combinamos <strong>Brise externo</strong> (que
                barra o sol direto antes de tocar no vidro) com <strong>Vidro Duplo Low-E</strong>,
                deixamos a luz visível entrar e refletimos o infravermelho para fora.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-3">
                  <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-red-500">
                    Vidro Simples 4mm (FS = 0,87)
                  </span>
                  <p className="mt-1 text-xs text-foreground">
                    Deixa entrar <strong>87% do calor solar</strong>. O ar-condicionado precisa
                    trabalhar dobrado para vencer a estufa.
                  </p>
                </div>
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
                  <span className="text-mono text-[8px] font-bold uppercase tracking-wider text-primary">
                    Brise + Duplo Low-E (FS = 0,28)
                  </span>
                  <p className="mt-1 text-xs text-foreground">
                    Bloqueia mais de <strong>72% do ganho térmico</strong> mantendo iluminação
                    natural abundante e conforto visual sem ofuscamento.
                  </p>
                </div>
              </div>
            </div>

            {/* Diagrama SVG: Efeito Estufa no Vidro vs Brise + Low-E */}
            <div className="rounded-2xl border border-border bg-[#09100D] p-4">
              <svg viewBox="0 0 460 220" className="w-full h-auto" role="img" aria-label="Comparativo de efeito estufa em vidro simples versus brise e vidro duplo">
                {/* Esquerda: Vidro Simples (Armadilha de Calor) */}
                <g transform="translate(15, 18)">
                  <text x="95" y="12" textAnchor="middle" fontSize="9.5" fill="#F87171" fontFamily="monospace" fontWeight="bold">
                    VIDRO SIMPLES (ESTUFA)
                  </text>
                  <line x1="85" y1="28" x2="85" y2="170" stroke="#93C5FD" strokeWidth="4" />
                  {/* Raios solares entrando e ficando presos */}
                  <path d="M18 55 L85 85 L155 125 L88 145 L155 162" fill="none" stroke="#EF4444" strokeWidth="2.2" />
                  <text x="100" y="65" fontSize="8.5" fill="#FCA5A5" fontFamily="monospace">87% do calor entra</text>
                  <text x="100" y="80" fontSize="8.5" fill="#EF4444" fontFamily="monospace" fontWeight="bold">Onda longa presa ↺</text>
                </g>

                <line x1="230" y1="20" x2="230" y2="200" stroke="#1E3028" strokeDasharray="4 4" />

                {/* Direita: Brise + Vidro Duplo Low-E */}
                <g transform="translate(245, 18)">
                  <text x="100" y="12" textAnchor="middle" fontSize="9.5" fill="#00C67A" fontFamily="monospace" fontWeight="bold">
                    BRISE + VIDRO DUPLO LOW-E
                  </text>
                  {/* Aletas do brise barrando sol direto */}
                  {[42, 66, 90].map((y, i) => (
                    <line key={i} x1="56" y1={y} x2="76" y2={y - 10} stroke="#00C67A" strokeWidth="3.5" strokeLinecap="round" />
                  ))}
                  {/* Vidro duplo */}
                  <line x1="84" y1="28" x2="84" y2="170" stroke="#38BDF8" strokeWidth="3" />
                  <line x1="92" y1="28" x2="92" y2="170" stroke="#38BDF8" strokeWidth="3" />
                  {/* Calor refletido de volta pro exterior */}
                  <path d="M16 52 L64 62 L22 86" fill="none" stroke="#FBBF24" strokeWidth="2" />
                  {/* Apenas luz suave difusa entrando */}
                  <path d="M94 95 L168 115" fill="none" stroke="#00C67A" strokeWidth="2" strokeDasharray="4 4" />
                  <text x="104" y="65" fontSize="8.5" fill="#00C67A" fontFamily="monospace" fontWeight="bold">72% calor barrado</text>
                  <text x="104" y="82" fontSize="8.5" fill="#A7F3D0" fontFamily="monospace">Luz difusa saudável →</text>
                </g>
              </svg>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}


function PilarIcon({ id, color }: { id: (typeof PILARES)[number]["id"]; color: string }) {
  if (id === "engenharia") {
    return (
      <svg viewBox="0 0 80 80" className="size-16" fill="none" aria-hidden="true">
        <path
          d="M13 57L39 17l28 40H13z"
          fill={color}
          fillOpacity=".12"
          stroke={color}
          strokeWidth="1.5"
        />
        <path
          d="M13 57l27-14 27 14M40 17v40"
          stroke={color}
          strokeOpacity=".8"
          strokeWidth="1.5"
        />
        <circle cx="40" cy="43" r="4" fill={color}>
          <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    );
  }
  if (id === "filosofia") {
    return (
      <svg viewBox="0 0 80 80" className="size-16" fill="none" aria-hidden="true">
        <circle
          cx="40"
          cy="27"
          r="10"
          fill={color}
          fillOpacity=".22"
          stroke={color}
          strokeWidth="1.5"
        />
        <path
          d="M22 63c1-15 9-23 18-23s17 8 18 23M13 43c8-6 14-7 20-2M67 43c-8-6-14-7-20-2"
          stroke={color}
          strokeLinecap="round"
          strokeWidth="1.5"
        />
        <circle cx="14" cy="43" r="3" fill={color} />
        <circle cx="66" cy="43" r="3" fill={color} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 80" className="size-16" fill="none" aria-hidden="true">
      <circle cx="40" cy="40" r="25" stroke={color} strokeOpacity=".35" strokeWidth="1.5" />
      <path
        d="M22 41h9l5-12 8 24 5-12h10"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="40" cy="40" r="4" fill={color}>
        <animate attributeName="opacity" values="1;.3;1" dur="1.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function CertificacaoIllustration({ sigla, color }: { sigla: string; color: string }) {
  const variant =
    sigla === "WELL"
      ? "well"
      : sigla === "EDGE"
      ? "edge"
      : sigla === "BREEAM"
      ? "breeam"
      : sigla === "Selo Casa Azul"
      ? "casa"
      : sigla === "AQUA-HQE"
      ? "aqua"
      : "leed";
  return (
    <svg
      viewBox="0 0 340 230"
      className="h-full w-full"
      role="img"
      aria-label={`Ilustração de desempenho ${sigla}`}
    >
      <defs>
        <radialGradient id={`cert-glow-${seloAnchorId(sigla)}`} cx="50%" cy="48%" r="60%">
          <stop stopColor={color} stopOpacity=".28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="170" cy="115" r="120" fill={`url(#cert-glow-${seloAnchorId(sigla)})`} />
      {variant === "leed" && (
        <>
          <path
            d="M58 184l111-92 115 92H58z"
            fill={color}
            fillOpacity=".14"
            stroke={color}
            strokeWidth="1.5"
          />
          <path
            d="M100 184v-73l69-57 71 57v73M126 184v-48h29v48M191 109h29v31h-29z"
            fill="none"
            stroke={color}
            strokeWidth="2"
          />
          <path
            d="M68 153c24-13 38-35 42-64 21 10 32 30 29 54-18 18-40 21-71 10z"
            fill={color}
            fillOpacity=".42"
          />
        </>
      )}
      {variant === "well" && (
        <>
          <circle
            cx="170"
            cy="112"
            r="53"
            fill={color}
            fillOpacity=".1"
            stroke={color}
            strokeWidth="1.5"
          />
          <circle cx="170" cy="85" r="15" fill={color} fillOpacity=".35" />
          <path
            d="M136 161c2-30 16-47 34-47s32 17 34 47M91 114c19-17 34-20 50-9M249 114c-19-17-34-20-50-9"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeWidth="2"
          />
          <circle cx="86" cy="116" r="5" fill={color} />
          <circle cx="254" cy="116" r="5" fill={color} />
        </>
      )}
      {variant === "breeam" && (
        <>
          <path
            d="M75 180l95-120 95 120H75z"
            fill={color}
            fillOpacity=".11"
            stroke={color}
            strokeWidth="1.5"
          />
          <path
            d="M170 60v120M116 180l54-64 54 64M91 160h158"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
          />
          <circle cx="170" cy="115" r="10" fill={color}>
            <animate attributeName="r" values="8;12;8" dur="2.3s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      {variant === "edge" && (
        <>
          <path
            d="M63 166l107-104 107 104-107 39L63 166z"
            fill={color}
            fillOpacity=".12"
            stroke={color}
            strokeWidth="1.5"
          />
          <path
            d="M63 166l107-48 107 48M170 62v143M116 142l54 24 54-24"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
          />
          <path d="M192 83l39 18-39 19z" fill={color} fillOpacity=".55" />
        </>
      )}
      {variant === "casa" && (
        <>
          <path
            d="M70 178l100-95 100 95v24H70z"
            fill={color}
            fillOpacity=".13"
            stroke={color}
            strokeWidth="1.5"
          />
          <path
            d="M104 178v-58l66-62 66 62v58M145 202v-47h50v47"
            fill="none"
            stroke={color}
            strokeWidth="2"
          />
          <path
            d="M84 130c29-19 52-14 67 8 13 18 33 19 56 2"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeWidth="2"
            strokeDasharray="5 6"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="-30"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </path>
        </>
      )}
      {variant === "aqua" && (
        <>
          <path
            d="M70 172c36-86 87-118 100-118s64 32 100 118c-35 25-70 36-100 36s-65-11-100-36z"
            fill={color}
            fillOpacity=".13"
            stroke={color}
            strokeWidth="1.5"
          />
          <path
            d="M96 164c24-36 48-54 74-54s50 18 74 54M119 181c17-18 34-27 51-27s34 9 51 27"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="170" cy="88" r="9" fill={color}>
            <animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      <text
        x="170"
        y="214"
        textAnchor="middle"
        fontSize="11"
        fill={color}
        fontFamily="monospace"
        fontWeight="bold"
        letterSpacing="2"
      >
        {sigla.toUpperCase()}
      </text>
    </svg>
  );
}

/* Modal acessível: Esc fecha, foco vai para o botão de fechar e volta ao gatilho. */
function useModalA11y(aberto: boolean, onClose: () => void) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const gatilho = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!aberto) return;
    gatilho.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      gatilho.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  return closeRef;
}

export type SobreSection = "sobre" | "referencias";

export function SobrePage({ section = "sobre" }: { section?: SobreSection }) {
  const [refSelecionada, setRefSelecionada] = useState<
    (typeof REFERENCIAS_GLOBAIS)[number] | null
  >(null);
  const [fotoModalIdx, setFotoModalIdx] = useState(0);
  const [fotoCardMap, setFotoCardMap] = useState<Record<string, number>>({});
  const [certSelecionada, setCertSelecionada] = useState<
    (typeof CERTIFICACOES)[number] | null
  >(null);
  const [seloDestacado, setSeloDestacado] = useState<string | null>(null);
  const [filtroObjetivo, setFiltroObjetivo] = useState<CategoriaSeloFiltro>("todos");
  const [filtroCaseSelo, setFiltroCaseSelo] = useState<string>("TODOS");
  const destaqueTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (destaqueTimeout.current) clearTimeout(destaqueTimeout.current);
    };
  }, []);

  // Reseta a foto ativa do modal sempre que abrir um novo empreendimento
  useEffect(() => {
    setFotoModalIdx(0);
  }, [refSelecionada]);

  // Rola automaticamente até #laboratorio-3d quando acionado pelo HeroCarousel
  useEffect(() => {
    if (window.location.hash === "#laboratorio-3d") {
      setTimeout(() => {
        document
          .getElementById("laboratorio-3d")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
  }, []);

  function irParaSelo(sigla: string) {
    setRefSelecionada(null);
    setFiltroObjetivo("todos");
    const id = seloAnchorId(sigla);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setSeloDestacado(sigla);
      if (destaqueTimeout.current) clearTimeout(destaqueTimeout.current);
      destaqueTimeout.current = setTimeout(() => setSeloDestacado(null), 2400);
    }, 150);
  }

  function trocarFotoCard(
    e: React.MouseEvent,
    nomeRef: string,
    totalFotos: number,
    direcao: 1 | -1
  ) {
    e.stopPropagation();
    setFotoCardMap((prev) => {
      const atual = prev[nomeRef] ?? 0;
      const novo = (atual + direcao + totalFotos) % totalFotos;
      return { ...prev, [nomeRef]: novo };
    });
  }

  const fecharRef = useModalA11y(!!refSelecionada, () => setRefSelecionada(null));
  const fecharCertRef = useModalA11y(!!certSelecionada, () => setCertSelecionada(null));

  const detalhesCertSelecionada = certSelecionada
    ? DETALHES_CERTIFICACAO[certSelecionada.sigla]
    : null;

  const certificacoesFiltradas = CERTIFICACOES.filter((c) =>
    c.categoriasFiltro.includes(filtroObjetivo)
  );

  const referenciasFiltradas =
    filtroCaseSelo === "TODOS"
      ? REFERENCIAS_GLOBAIS
      : REFERENCIAS_GLOBAIS.filter((r) => r.seloRelacionado === filtroCaseSelo);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[700px]"
        style={{ background: "var(--gradient-radial-glow)" }}
      />

      {/* ── Header ── */}
      <header
        data-local-nav
        className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity shrink-0"
          >
            <EcomondsLogo size={32} />
            <div className="flex flex-col">
              <span className="text-display text-sm sm:text-xl font-extrabold tracking-tight leading-none uppercase">
                Vector-X
              </span>
              <span className="text-mono text-[6px] sm:text-[8px] uppercase tracking-[0.3em] text-muted-foreground opacity-70 mt-1">
                By EcomindsX
              </span>
            </div>
          </Link>

          <nav className="overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 sm:gap-2 px-1">
              {[
                { label: "Sobre", href: "/sobre" },
                { label: "Certificações", href: "/referencias" },
                { label: "Notícias", href: "/noticias" },
                { label: "Diagnóstico", href: "/wellness-analise-solar" },
              ].map((item) => (
                <Link
                  key={item.label}
                  to={item.href as any}
                  className="text-mono text-[8px] sm:text-[10px] uppercase tracking-[0.15em] text-muted-foreground px-2 sm:px-3 py-1.5 hover:text-primary transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 pb-32">
        {/* ══════════════════════════════════════════════════════════════════
           SEÇÃO: SOBRE & SIMULADOR 3D
        ══════════════════════════════════════════════════════════════════ */}
        {section === "sobre" && (
          <section className="grid grid-cols-1 items-center gap-8 pb-16 pt-14 sm:gap-12 sm:pb-20 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
            <div className="animate-fade-up">
              <div className="mb-6 flex items-center gap-3 text-mono text-[10px] uppercase tracking-[0.3em] text-primary sm:text-[11px]">
                <span className="h-px w-8 bg-primary" />
                Nossa Visão
              </div>
              <h1 className="max-w-3xl text-display text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-4xl md:text-5xl">
                Inteligência ambiental para transformar dados em{" "}
                <span className="text-primary">decisões melhores.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Conectamos clima, território e bem-estar para orientar projetos mais eficientes,
                saudáveis e resilientes — antes que a primeira decisão de projeto seja tomada.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Da leitura bioclimática à qualidade dos ambientes, a EcomindsX une ciência,
                tecnologia e engenharia para tornar o desempenho ambiental uma escolha concreta,
                não uma promessa de marketing.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {["Clima", "Território", "Materiais", "Bem-estar"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-mono text-[9px] uppercase tracking-[0.16em] text-primary"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none">
              <div className="pointer-events-none absolute inset-[12%] rounded-full bg-primary/10 blur-3xl" />
              <div className="relative aspect-[1.2] overflow-hidden rounded-3xl border border-primary/15 bg-card/60 p-3 shadow-[0_25px_70px_rgba(0,0,0,0.22)] sm:p-5">
                <SobreHeroIllustration />
              </div>
            </div>
          </section>
        )}

        {section === "sobre" && (
          <section id="pilares" className="mb-16 sm:mb-24">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-primary">
                Três pilares
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <h2 className="max-w-2xl text-display text-2xl font-extrabold leading-tight sm:text-3xl md:text-4xl mb-3">
              Projetar melhor é enxergar além da planta.
            </h2>
            <p className="mb-8 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mb-10 sm:text-base">
              Três leituras se encontram em cada decisão: o lugar onde se constrói, as pessoas que
              vão viver ali e as condições que sustentam seu bem-estar ao longo do tempo.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {PILARES.map((pilar) => {
                return (
                  <article
                    key={pilar.id}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-left transition-all duration-300 hover:-translate-y-1 sm:p-6"
                  >
                    <div
                      className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                      style={{ background: pilar.cor, opacity: 0.06 }}
                    />
                    <span
                      className="absolute left-0 right-0 top-0 h-1 transition-all duration-300"
                      style={{ background: pilar.cor, opacity: 0.7 }}
                    />

                    <div className="relative mb-5 flex items-start justify-between gap-3">
                      <div
                        className="flex size-16 items-center justify-center rounded-2xl border"
                        style={{
                          borderColor: pilar.cor + "45",
                          backgroundColor: pilar.cor + "12",
                        }}
                      >
                        <PilarIcon id={pilar.id} color={pilar.cor} />
                      </div>
                      <span
                        className="text-mono text-xs tracking-[0.2em]"
                        style={{ color: pilar.cor }}
                      >
                        {pilar.numero}
                      </span>
                    </div>

                    <p
                      className="relative mb-2 text-mono text-[9px] font-bold uppercase tracking-[0.16em]"
                      style={{ color: pilar.cor }}
                    >
                      {pilar.subtitulo}
                    </p>
                    <h3 className="relative mb-3 text-display text-xl font-extrabold text-foreground">
                      {pilar.titulo}
                    </h3>
                    <p className="relative text-sm leading-relaxed text-muted-foreground">
                      {pilar.corpo}
                    </p>

                    <div
                      className="relative mt-5 flex flex-wrap gap-2 border-t pt-4"
                      style={{ borderColor: pilar.cor + "28" }}
                    >
                      {pilar.entregas.map((entrega) => (
                        <span
                          key={entrega}
                          className="rounded-full border px-2.5 py-1 text-mono text-[8px] uppercase tracking-[0.1em]"
                          style={{
                            color: pilar.cor,
                            borderColor: pilar.cor + "40",
                            backgroundColor: pilar.cor + "0D",
                          }}
                        >
                          {entrega}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {section === "sobre" && <LaboratorioInterativo />}

        {/* ══════════════════════════════════════════════════════════════════
           SEÇÃO: CERTIFICAÇÕES, BÚSSOLA, MATRIZ & REFERÊNCIAS GLOBAIS
        ══════════════════════════════════════════════════════════════════ */}
        {section === "referencias" && (
          <>
            {/* ── 1. Hero Editorial de Certificações (Com faixa de indicadores delicada) ── */}
            {/* ── 1. Hero Editorial de Certificações (Com 3 indicadores lado a lado + Bússola legível) ── */}
            <section className="pt-12 sm:pt-20 pb-12 sm:pb-16">
              <div className="flex items-center gap-3 mb-4">
                <span className="h-px w-8 bg-primary" />
                <span className="text-mono text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-primary">
                  Guia Técnico & Financeiro · Selos de Desempenho
                </span>
              </div>

              <div className="max-w-3xl">
                <h1 className="text-display text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.08] tracking-tight">
                  Certificações que transformam{" "}
                  <span className="text-primary">intenção em evidência.</span>
                </h1>
                <p className="mt-5 text-sm sm:text-base leading-relaxed text-muted-foreground">
                  Um edifício eficiente precisa comprovar como performa em campo. Selos como{" "}
                  <strong className="text-foreground font-semibold">
                    LEED, WELL, BREEAM, EDGE, Casa Azul e AQUA-HQE
                  </strong>{" "}
                  traduzem decisões de engenharia em critérios auditáveis — destravando linhas de
                  crédito verde, reduzindo vacância e protegendo o valor do ativo contra
                  obsolescência.
                </p>
              </div>

              {/* Faixa de Indicadores Lado a Lado (Ocupando largura total para nunca quebrar linha) */}
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6 border-y border-border/70 py-4">
                {[
                  {
                    valor: "+4% a 8%",
                    rotulo: "Prêmio médio de locação",
                    fonte: "CBRE / MIT Real Estate Lab",
                  },
                  {
                    valor: "+14% a 16%",
                    rotulo: "Valorização patrimonial",
                    fonte: "Ativos certificados (BREEAM/LEED)",
                  },
                  {
                    valor: "-0,25% a 1% a.a.",
                    rotulo: "Redução de juros de obra",
                    fonte: "Funding SBPE / Finanças Verdes",
                  },
                ].map((stat, idx) => (
                  <div
                    key={stat.rotulo}
                    className={`flex items-baseline gap-3 ${
                      idx > 0 ? "sm:border-l sm:border-border/70 sm:pl-6" : ""
                    }`}
                  >
                    <span className="text-display text-xl sm:text-2xl font-extrabold text-primary whitespace-nowrap">
                      {stat.valor}
                    </span>
                    <div className="min-w-0">
                      <span className="block text-xs sm:text-sm font-bold text-foreground leading-tight">
                        {stat.rotulo}
                      </span>
                      <span className="block text-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                        {stat.fonte}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Bússola de Escolha Rápida (Letras maiores e com alto contraste) ── */}
              <div className="mt-10 rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <span className="text-mono text-xs sm:text-sm font-extrabold uppercase tracking-[0.14em] text-primary">
                    Bússola de Decisão · Filtre pelo objetivo do empreendimento:
                  </span>
                  <span className="rounded-full border border-border bg-background px-3 py-1 text-mono text-[11px] font-semibold text-foreground/80">
                    Exibindo {certificacoesFiltradas.length} de {CERTIFICACOES.length} certificações
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {FILTROS_OBJETIVO.map((f) => {
                    const ativo = filtroObjetivo === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFiltroObjetivo(f.id)}
                        className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                          ativo
                            ? "border-primary bg-primary/12 shadow-sm ring-1 ring-primary/30"
                            : "border-border bg-background/60 hover:border-primary/45 hover:bg-background"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm sm:text-base font-extrabold text-foreground">
                            {f.titulo}
                          </span>
                          <span
                            className={`size-2.5 shrink-0 rounded-full ${
                              ativo ? "bg-primary" : "bg-border"
                            }`}
                          />
                        </div>
                        <p className="mt-1.5 text-xs sm:text-sm font-medium leading-snug text-foreground/75">
                          {f.subtitulo}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ── 2. Grid de Cards de Certificações (Com Barras de Peso & Perfil Ideal) ── */}
            <section id="certificacoes" className="mb-16 sm:mb-24">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {certificacoesFiltradas.map((cert) => {
                  const destacado = seloDestacado === cert.sigla;
                  return (
                    <button
                      key={cert.sigla}
                      id={seloAnchorId(cert.sigla)}
                      type="button"
                      onClick={() => setCertSelecionada(cert)}
                      className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-5 sm:p-6 transition-all duration-500 scroll-mt-24 border-border bg-card text-left hover:-translate-y-1 hover:shadow-lg focus:outline-none cursor-pointer ${
                        destacado ? "border-primary" : ""
                      }`}
                      style={{
                        borderColor: destacado ? cert.cor : undefined,
                        boxShadow: destacado ? `0 0 0 3px ${cert.cor}35` : undefined,
                      }}
                    >
                      <div
                        className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                        style={{ backgroundColor: cert.cor, opacity: 0.1 }}
                      />
                      <span
                        className="absolute left-0 right-0 top-0 h-1.5"
                        style={{ backgroundColor: cert.cor, opacity: 0.9 }}
                      />

                      <div>
                        {/* Cabeçalho do Card */}
                        <div className="relative flex items-center justify-between gap-2">
                          <span className="text-mono text-[8px] sm:text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                            {cert.origem}
                          </span>
                          <span
                            className="rounded-full border px-2.5 py-0.5 text-mono text-[8px] font-bold uppercase tracking-[0.14em]"
                            style={{
                              color: cert.cor,
                              borderColor: cert.cor + "55",
                              backgroundColor: cert.cor + "12",
                            }}
                          >
                            {cert.complexidade.split("·")[0].trim()}
                          </span>
                        </div>

                        {/* Sigla e Nome */}
                        <div className="relative mt-3">
                          <h3
                            className="text-display text-3xl font-black leading-none tracking-tight sm:text-4xl"
                            style={{ color: cert.cor }}
                          >
                            {cert.sigla}
                          </h3>
                          <p className="mt-2 text-xs sm:text-sm font-bold leading-snug text-foreground">
                            {cert.nome}
                          </p>
                        </div>

                        {/* O que mede */}
                        <div
                          className="relative mt-3.5 border-l-2 pl-3"
                          style={{ borderColor: cert.cor }}
                        >
                          <span className="text-mono text-[8px] uppercase tracking-[0.15em] text-muted-foreground">
                            Foco Principal
                          </span>
                          <p className="mt-0.5 text-xs font-semibold leading-snug text-foreground">
                            {cert.foco}
                          </p>
                        </div>

                        <p className="relative mt-3 text-xs leading-relaxed text-muted-foreground">
                          {cert.descricao}
                        </p>

                        {/* Barras de Peso por Eixo Técnico */}
                        <div className="relative mt-4 rounded-2xl border border-border/70 bg-background/50 p-3 space-y-2">
                          <span className="block text-mono text-[8px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                            Ênfase na Avaliação Técnica
                          </span>
                          {[
                            { label: "Energia & Carbono", val: cert.pesos.energia },
                            { label: "Água & Recursos", val: cert.pesos.agua },
                            { label: "Saúde & Conforto", val: cert.pesos.saude },
                            { label: "Gestão & Entorno", val: cert.pesos.gestao },
                          ].map((eixo) => (
                            <div key={eixo.label} className="space-y-1">
                              <div className="flex justify-between text-mono text-[8px] text-muted-foreground">
                                <span>{eixo.label}</span>
                                <span className="font-bold text-foreground">{eixo.val}%</span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${eixo.val}%`,
                                    backgroundColor: cert.cor,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Rodapé do Card: Valorização + Call to Action */}
                      <div className="relative mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-mono text-[9px] font-bold tracking-[0.03em]"
                          style={{
                            color: cert.cor,
                            borderColor: cert.cor + "55",
                            backgroundColor: cert.cor + "10",
                          }}
                        >
                          <span aria-hidden="true">↑</span>
                          <span>
                            <span className="opacity-75">{cert.destaqueRotulo}: </span>
                            {cert.destaqueValor}
                          </span>
                        </span>

                        <span
                          className="text-mono text-[9px] font-bold uppercase tracking-[0.12em] group-hover:translate-x-0.5 transition-transform"
                          style={{ color: cert.cor }}
                        >
                          Raio-X →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── 3. Matriz Comparativa Direta (Lado a Lado) ── */}
            <section className="mb-16 sm:mb-24">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-primary">
                  Comparativo Direto
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <h2 className="text-display text-xl sm:text-2xl md:text-3xl font-extrabold mb-2">
                Matriz de decisão: qual selo escolher?
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm max-w-2xl leading-relaxed mb-6">
                Compare rapidamente o rigor de auditoria, a tipologia ideal e o impacto no retorno
                financeiro de cada certificação. Clique em qualquer linha para abrir os níveis de
                pontuação.
              </p>

              <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
                <table className="w-full min-w-[760px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-background/60 text-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                      <th className="py-3.5 px-4 sm:px-5">Selo</th>
                      <th className="py-3.5 px-4">Tipologia Ideal</th>
                      <th className="py-3.5 px-4">Verificação & Auditoria</th>
                      <th className="py-3.5 px-4">Saúde Humana</th>
                      <th className="py-3.5 px-4 sm:px-5">Retorno / Benefício</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70 text-xs">
                    {CERTIFICACOES.map((cert) => (
                      <tr
                        key={cert.sigla}
                        onClick={() => setCertSelecionada(cert)}
                        className="group hover:bg-primary/[0.04] transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4 sm:px-5 font-bold whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="size-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: cert.cor }}
                            />
                            <div>
                              <span
                                className="text-display text-sm font-black block"
                                style={{ color: cert.cor }}
                              >
                                {cert.sigla}
                              </span>
                              <span className="text-mono text-[8px] text-muted-foreground">
                                {cert.origem}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-foreground font-medium max-w-[230px]">
                          {cert.perfilIdeal}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {cert.auditoriaCampo}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-border overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${cert.pesos.saude}%`,
                                  backgroundColor: cert.cor,
                                }}
                              />
                            </div>
                            <span className="text-mono text-[9px] font-bold text-foreground">
                              {cert.pesos.saude}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-mono text-[9px] font-bold"
                            style={{
                              color: cert.cor,
                              borderColor: cert.cor + "45",
                              backgroundColor: cert.cor + "10",
                            }}
                          >
                            {cert.destaqueValor}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── 4. Referências Globais com Galeria Multi-Fotos nos Cards e no Modal ── */}
            <section id="referencias" className="mb-16 sm:mb-24 pt-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-primary">
                  Referências Globais · Cases Reais Auditados
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-display text-xl sm:text-2xl md:text-3xl font-extrabold mb-2">
                    Empreendimentos que definem o padrão.
                  </h2>
                  <p className="text-muted-foreground text-xs sm:text-sm max-w-xl leading-relaxed">
                    Os selos acima não são teoria — são edifícios reais que provam a viabilidade
                    técnica e financeira da engenharia bioclimática e biofílica. Navegue pelas
                    fotos ou abra o estudo técnico.
                  </p>
                </div>

                {/* Filtro rápido de cases por selo */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {["TODOS", "LEED", "WELL", "BREEAM"].map((selo) => {
                    const ativo = filtroCaseSelo === selo;
                    return (
                      <button
                        key={selo}
                        type="button"
                        onClick={() => setFiltroCaseSelo(selo)}
                        className={`rounded-full border px-3 py-1 text-mono text-[9px] font-bold uppercase tracking-[0.14em] transition-all cursor-pointer ${
                          ativo
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {selo === "TODOS" ? "Todos os Cases (6)" : `Exemplo ${selo}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {referenciasFiltradas.map((ref) => {
                  const idxAtivo = fotoCardMap[ref.nome] ?? 0;
                  const fotoAtual = ref.imagens[idxAtivo] ?? ref.imagens[0];

                  return (
                    <div
                      key={ref.nome}
                      role="button"
                      tabIndex={0}
                      onClick={() => setRefSelecionada(ref)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setRefSelecionada(ref);
                        }
                      }}
                      className="group relative flex flex-col justify-between text-left overflow-hidden border border-border bg-card rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus:outline-none cursor-pointer"
                    >
                      <div>
                        {/* Carrossel de Fotos no Card */}
                        <div className="relative h-52 sm:h-56 overflow-hidden bg-background">
                          <img
                            src={fotoAtual.url}
                            alt={`${ref.nome} - ${fotoAtual.legenda}`}
                            loading="lazy"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (target.src !== window.location.origin + ref.imagem) {
                                target.src = ref.imagem;
                              }
                            }}
                            className="h-full w-full object-cover grayscale-[35%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/15 to-transparent" />

                          {/* Selo e Métrica no Topo da Foto */}
                          <span
                            className="absolute top-3 left-3 rounded-md text-mono text-[8px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 border bg-[#090F0C]/80 backdrop-blur-sm"
                            style={{ color: "#00C67A", borderColor: "rgba(0,198,122,0.45)" }}
                          >
                            {ref.certificacao}
                          </span>
                          <span className="absolute top-3 right-3 rounded-md text-mono text-[8px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 border bg-[#090F0C]/80 backdrop-blur-sm text-amber-300 border-amber-400/40">
                            {ref.metricaChave}
                          </span>

                          {/* Botões Anterior/Próxima Foto direto no Card */}
                          <div className="absolute inset-x-2.5 bottom-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-1 rounded-full bg-[#090F0C]/75 px-2 py-1 backdrop-blur-sm border border-white/10">
                              {ref.imagens.map((_, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  aria-label={`Foto ${i + 1}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFotoCardMap((prev) => ({ ...prev, [ref.nome]: i }));
                                  }}
                                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                    i === idxAtivo
                                      ? "w-4 bg-[#00C67A]"
                                      : "w-1.5 bg-white/40 hover:bg-white/75"
                                  }`}
                                />
                              ))}
                              <span className="ml-1 text-mono text-[8px] text-emerald-50/90">
                                {idxAtivo + 1}/{ref.imagens.length}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                aria-label="Foto anterior"
                                onClick={(e) =>
                                  trocarFotoCard(e, ref.nome, ref.imagens.length, -1)
                                }
                                className="flex size-6 items-center justify-center rounded-full bg-[#090F0C]/80 text-[10px] text-white border border-white/15 hover:border-[#00C67A] transition-colors cursor-pointer"
                              >
                                ‹
                              </button>
                              <button
                                type="button"
                                aria-label="Próxima foto"
                                onClick={(e) =>
                                  trocarFotoCard(e, ref.nome, ref.imagens.length, 1)
                                }
                                className="flex size-6 items-center justify-center rounded-full bg-[#090F0C]/80 text-[10px] text-white border border-white/15 hover:border-[#00C67A] transition-colors cursor-pointer"
                              >
                                ›
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="p-5">
                          <div className="flex items-center justify-between gap-2 text-mono text-[8px] sm:text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                            <span>
                              {ref.local} · {ref.ano}
                            </span>
                            <span className="text-primary font-bold">
                              Ref. {ref.seloRelacionado}
                            </span>
                          </div>
                          <h3 className="text-display text-lg sm:text-xl font-extrabold mt-1.5 mb-1">
                            {ref.nome}
                          </h3>
                          <p className="text-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-2.5">
                            {ref.tipologia} · {ref.arquiteto}
                          </p>
                          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                            {ref.destaque}
                          </p>
                        </div>
                      </div>

                      <div className="px-5 pb-4 pt-2 border-t border-border/50 flex items-center justify-between">
                        <span className="text-mono text-[8px] uppercase tracking-[0.15em] text-muted-foreground">
                          {ref.imagens.length} fotos + ficha técnica
                        </span>
                        <span className="text-mono text-[9px] font-bold uppercase tracking-[0.15em] text-primary group-hover:translate-x-1 transition-transform">
                          Abrir galeria →
                        </span>
                      </div>

                      <span className="absolute bottom-0 left-0 right-0 h-1 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left bg-primary" />
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>

      {/* ── Modal Referência (Com Galeria de Fotos & Miniaturas) ── */}
      {refSelecionada && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Detalhes: ${refSelecionada.nome}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        >
          <div className="absolute inset-0" onClick={() => setRefSelecionada(null)} />
          <div className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-3xl animate-in slide-in-from-bottom duration-300 overflow-hidden max-h-[92vh] overflow-y-auto">
            {/* Imagem Principal do Modal */}
            <div className="relative h-64 sm:h-80 overflow-hidden bg-[#090F0C]">
              <img
                src={
                  (refSelecionada.imagens[fotoModalIdx] ?? refSelecionada.imagens[0]).url
                }
                alt={refSelecionada.nome}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== window.location.origin + refSelecionada.imagem) {
                    target.src = refSelecionada.imagem;
                  }
                }}
                className="h-full w-full object-cover transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <button
                ref={fecharRef}
                type="button"
                onClick={() => setRefSelecionada(null)}
                className="absolute top-3.5 right-3.5 rounded-full text-mono text-[10px] px-3.5 py-1.5 border border-white/20 bg-black/75 backdrop-blur-sm text-white hover:border-[#00C67A] hover:text-[#00C67A] transition-colors cursor-pointer"
              >
                ✕ FECHAR
              </button>

              <span
                className="absolute top-3.5 left-3.5 rounded-md text-mono text-[8px] font-bold uppercase tracking-[0.18em] px-2.5 py-1 border bg-black/75 backdrop-blur-sm"
                style={{ color: "#00C67A", borderColor: "rgba(0,198,122,0.45)" }}
              >
                {refSelecionada.certificacao}
              </span>

              {/* Legenda da Foto Atual + Setas de Navegação */}
              <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3">
                <p className="text-mono text-[10px] text-emerald-50/95 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md border border-white/10">
                  {(refSelecionada.imagens[fotoModalIdx] ?? refSelecionada.imagens[0]).legenda}
                </p>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label="Foto anterior"
                    onClick={() =>
                      setFotoModalIdx(
                        (prev) =>
                          (prev - 1 + refSelecionada.imagens.length) %
                          refSelecionada.imagens.length
                      )
                    }
                    className="flex size-8 items-center justify-center rounded-full bg-black/75 text-white border border-white/20 hover:border-[#00C67A] cursor-pointer"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    aria-label="Próxima foto"
                    onClick={() =>
                      setFotoModalIdx(
                        (prev) => (prev + 1) % refSelecionada.imagens.length
                      )
                    }
                    className="flex size-8 items-center justify-center rounded-full bg-black/75 text-white border border-white/20 hover:border-[#00C67A] cursor-pointer"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>

            {/* Faixa de Miniaturas (Thumbnails) */}
            <div className="grid grid-cols-3 gap-2 bg-background/70 px-6 py-3 border-b border-border">
              {refSelecionada.imagens.map((imgItem, idx) => {
                const selecionada = idx === fotoModalIdx;
                return (
                  <button
                    key={imgItem.legenda}
                    type="button"
                    onClick={() => setFotoModalIdx(idx)}
                    className={`group relative h-14 sm:h-16 overflow-hidden rounded-xl border transition-all cursor-pointer ${
                      selecionada
                        ? "border-primary ring-2 ring-primary/35"
                        : "border-border opacity-65 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={imgItem.url}
                      alt={imgItem.legenda}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== window.location.origin + refSelecionada.imagem) {
                          target.src = refSelecionada.imagem;
                        }
                      }}
                      className="h-full w-full object-cover"
                    />
                  </button>
                );
              })}
            </div>

            {/* Conteúdo Técnico do Estudo de Caso */}
            <div className="p-6 sm:p-8 space-y-5">
              <div>
                <span className="text-mono text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
                  {refSelecionada.local} · {refSelecionada.ano} · {refSelecionada.tipologia}
                </span>
                <h2 className="text-display text-2xl font-extrabold mt-1">
                  {refSelecionada.nome}
                </h2>
                <p className="text-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
                  {refSelecionada.arquiteto}
                </p>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {refSelecionada.destaque}
              </p>

              <div className="rounded-2xl border border-border bg-background/40 p-4 sm:p-5">
                <span className="text-mono text-[8px] font-bold uppercase tracking-[0.18em] text-primary">
                  Solucionática & Engenharia Comprovada
                </span>
                <ul className="mt-3 space-y-2.5">
                  {refSelecionada.caracteristicas.map((c) => (
                    <li
                      key={c}
                      className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground leading-relaxed"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span
                  className="rounded-full text-mono text-[9px] font-bold uppercase tracking-[0.15em] border px-3 py-1.5"
                  style={{ color: "#00C67A", borderColor: "rgba(0,198,122,0.4)" }}
                >
                  {refSelecionada.metricaChave}
                </span>
                <button
                  type="button"
                  onClick={() => irParaSelo(refSelecionada.seloRelacionado)}
                  className="rounded-full text-mono text-[9px] font-bold uppercase tracking-[0.15em] border px-3.5 py-1.5 border-primary/40 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                >
                  Destacar selo {refSelecionada.seloRelacionado} na lista ↑
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Painel de certificação (Modal Completo) ── */}
      {certSelecionada && detalhesCertSelecionada && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Certificação ${certSelecionada.sigla}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        >
          <div className="absolute inset-0" onClick={() => setCertSelecionada(null)} />
          <article className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom duration-300">
            <button
              ref={fecharCertRef}
              type="button"
              onClick={() => setCertSelecionada(null)}
              className="absolute right-4 top-4 z-10 rounded-full border border-border bg-background/80 px-3 py-2 text-mono text-[10px] tracking-[0.14em] text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground cursor-pointer"
            >
              ✕ FECHAR
            </button>
            <div className="grid grid-cols-1 border-b border-border lg:grid-cols-[.9fr_1.1fr]">
              <div className="relative flex flex-col justify-between min-h-[260px] overflow-hidden bg-background p-6 sm:p-8">
                <div
                  className="pointer-events-none absolute inset-0 opacity-60"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, ${certSelecionada.cor}22, transparent 68%)`,
                  }}
                />
                <div className="relative h-full min-h-[190px]">
                  <CertificacaoIllustration
                    sigla={certSelecionada.sigla}
                    color={certSelecionada.cor}
                  />
                </div>
                <div className="relative mt-4 rounded-xl border border-border bg-card/80 p-3">
                  <span className="block text-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                    Tipologia & Perfil Ideal
                  </span>
                  <p className="mt-0.5 text-xs font-bold text-foreground">
                    {certSelecionada.perfilIdeal}
                  </p>
                </div>
              </div>
              <div className="p-7 sm:p-9">
                <span
                  className="text-mono text-xs uppercase tracking-[0.2em] font-semibold"
                  style={{ color: certSelecionada.cor }}
                >
                  Certificação de desempenho
                </span>
                <h2
                  className="mt-2 text-display text-4xl font-black tracking-tight sm:text-5xl"
                  style={{ color: certSelecionada.cor }}
                >
                  {certSelecionada.sigla}
                </h2>
                <p className="mt-3 text-lg font-semibold leading-snug text-foreground">
                  {certSelecionada.nome}
                </p>
                <p className="mt-2 text-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  {certSelecionada.origem} · {certSelecionada.auditoriaCampo}
                </p>
                <p className="mt-5 text-sm sm:text-base leading-relaxed text-muted-foreground">
                  {certSelecionada.descricao}
                </p>
                <div className="mt-5 rounded-xl border border-border bg-background/40 p-4 sm:p-5">
                  <span
                    className="text-mono text-xs font-bold uppercase tracking-[0.18em]"
                    style={{ color: certSelecionada.cor }}
                  >
                    Como funciona, em resumo
                  </span>
                  <p className="mt-2 text-sm sm:text-base leading-relaxed text-foreground">
                    {detalhesCertSelecionada.comoFunciona}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-7 sm:grid-cols-2 sm:p-9">
              <section className="rounded-2xl border border-border bg-background/35 p-5">
                <span
                  className="text-mono text-xs font-bold uppercase tracking-[0.18em]"
                  style={{ color: certSelecionada.cor }}
                >
                  Principais critérios avaliados
                </span>
                <ul className="mt-4 space-y-3">
                  {detalhesCertSelecionada.criterios.map((criterio) => (
                    <li
                      key={criterio}
                      className="flex items-start gap-3 text-sm sm:text-base text-foreground"
                    >
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: certSelecionada.cor }}
                      />
                      {criterio}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-2xl border border-border bg-background/35 p-5">
                <span
                  className="text-mono text-xs font-bold uppercase tracking-[0.18em]"
                  style={{ color: certSelecionada.cor }}
                >
                  Níveis e pontuação oficiais
                </span>
                <div className="mt-4 flex flex-wrap gap-2">
                  {detalhesCertSelecionada.niveis.map((nivel) => (
                    <span
                      key={nivel}
                      className="rounded-lg border px-3 py-2 text-mono text-xs leading-tight font-medium"
                      style={{
                        color: certSelecionada.cor,
                        borderColor: certSelecionada.cor + "55",
                        backgroundColor: certSelecionada.cor + "0E",
                      }}
                    >
                      {nivel}
                    </span>
                  ))}
                </div>
              </section>
              <section
                className="rounded-2xl border p-5 sm:col-span-2"
                style={{
                  borderColor: certSelecionada.cor + "48",
                  backgroundColor: certSelecionada.cor + "08",
                }}
              >
                <span
                  className="text-mono text-xs font-bold uppercase tracking-[0.18em]"
                  style={{ color: certSelecionada.cor }}
                >
                  Quanto isso pode valorizar o ativo (ROI & Funding)
                </span>
                <p className="mt-2 text-sm sm:text-base leading-relaxed text-foreground">
                  {detalhesCertSelecionada.valorizacao}
                </p>
              </section>
              <section
                className="rounded-2xl border p-5 sm:col-span-2"
                style={{
                  borderColor: certSelecionada.cor + "48",
                  backgroundColor: certSelecionada.cor + "08",
                }}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <span
                      className="text-mono text-xs font-bold uppercase tracking-[0.18em]"
                      style={{ color: certSelecionada.cor }}
                    >
                      Impacto no ativo
                    </span>
                    <p className="mt-2 text-sm sm:text-base leading-relaxed text-foreground">
                      {detalhesCertSelecionada.impacto}
                    </p>
                  </div>
                  <div>
                    <span
                      className="text-mono text-xs font-bold uppercase tracking-[0.18em]"
                      style={{ color: certSelecionada.cor }}
                    >
                      Olhar de investidores e construtoras
                    </span>
                    <p className="mt-2 text-sm sm:text-base leading-relaxed text-foreground">
                      {detalhesCertSelecionada.olharInvestidor}
                    </p>
                  </div>
                </div>
              </section>
            </div>
            {detalhesCertSelecionada.fonte && (
              <div className="border-t border-border px-7 py-4 sm:px-9 flex flex-wrap items-center justify-between gap-3">
                <a
                  href={detalhesCertSelecionada.fonte}
                  target="_blank"
                  rel="noreferrer"
                  className="text-mono text-xs font-bold uppercase tracking-[0.15em] text-primary transition-colors hover:opacity-80"
                >
                  Consultar critérios na fonte oficial ↗
                </a>
                <Link
                  to="/wellness-analise-solar"
                  onClick={() => setCertSelecionada(null)}
                  className="text-mono text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors"
                >
                  Testar pré-diagnóstico bioclimático para este selo →
                </Link>
              </div>
            )}
          </article>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/sobre")({
  component: () => <SobrePage section="sobre" />,
});