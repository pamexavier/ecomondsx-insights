import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { InstitutionalLayout } from "@/components/InstitutionalLayout";

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
    origem: "EUA · USGBC / GBCI (v4 / v4.1)",
    foco: "Eficiência energética, água, materiais e ambiente interno",
    porQueEscolher:
      "Padrão global exigido por multinacionais e fundos imobiliários (FIIs) para comprovar eficiência operacional e liquidez de ativos comerciais ou logísticos.",
    ganhoPrincipal:
      "Prêmio de locação (+4% a 8% segundo CBRE), menor vacância e redução auditada nas contas de energia e água.",
    regraFactual:
      "Avalia 8 categorias até 110 pontos (Energia vale 33 pts / 30%; Qualidade Interna vale 16 pts / 14,5%).",
    perfilIdeal: "Corporativo Triple-A, Galpões Logísticos e Fundos Globais",
    complexidade: "Auditoria GBCI",
    auditoriaCampo: "Revisão documental GBCI + Comissionamento obrigatório de sistemas",
    categoriasFiltro: ["todos", "saude"] as CategoriaSeloFiltro[],
    descricao:
      "O sistema mais adotado globalmente. Avalia 8 categorias (com maior peso em Energia e Atmosfera) numa escala de 40 a 110 pontos, de Certified a Platinum.",
    destaqueRotulo: "Prêmio de aluguel",
    destaqueValor: "+4% a 8%",
    cor: "#22C55E",
  },
  {
    sigla: "WELL",
    nome: "WELL Building Standard (v2)",
    origem: "EUA · IWBI",
    foco: "100% voltado à saúde biológica, conforto e bem-estar humano",
    porQueEscolher:
      "Ideal quando o foco principal são as pessoas: atrair talentos, reduzir absenteísmo e comprovar qualidade do ar, água, luz circadiana e acústica.",
    ganhoPrincipal:
      "Prêmio de aluguel (+4,4% a 7,7% segundo MIT), retenção de equipes e cumprimento de metas de Saúde (S do ESG).",
    regraFactual:
      "Avalia 10 conceitos de saúde humana (Ar, Água, Luz, Som, Mente, etc.) até 100 pontos + 10 de inovação.",
    perfilIdeal: "Sedes Corporativas, Escritórios, Clínicas e Educação",
    complexidade: "Ensaios in loco",
    auditoriaCampo: "Verificação presencial obrigatória com medições laboratoriais em campo",
    categoriasFiltro: ["todos", "saude"] as CategoriaSeloFiltro[],
    descricao:
      "Foco exclusivo em quem ocupa o espaço: 10 conceitos de saúde física e mental verificados com medições reais de ar, água, luz e acústica no prédio pronto.",
    destaqueRotulo: "Prêmio de aluguel",
    destaqueValor: "+4,4% a 7,7%",
    cor: "#8B5CF6",
  },
  {
    sigla: "BREEAM",
    nome: "Building Research Establishment Environmental Assessment Method",
    origem: "Reino Unido · BRE (1990)",
    foco: "Ciclo de vida completo, carbono, ecologia do terreno e gestão",
    porQueEscolher:
      "Recomendado para ativos com investidores europeus ou grandes complexos que exigem rigor científico em carbono, biodiversidade do lote e cadeia de materiais.",
    ganhoPrincipal:
      "Valorização patrimonial (+14% a 16% em capital value segundo estudos CBRE/JLL) e blindagem contra risco regulatório.",
    regraFactual:
      "Pondera 9 categorias ambientais + inovação em nota percentual (Saúde representa ~15%; Energia ~19%).",
    perfilIdeal: "Portfólios Europeus/Globais, Varejo e Grandes Complexos",
    complexidade: "Assessor Licenciado",
    auditoriaCampo: "Auditoria documental e presencial por BREEAM Assessor licenciado",
    categoriasFiltro: ["todos"] as CategoriaSeloFiltro[],
    descricao:
      "O selo mais antigo do mundo (1990). Pondera 9 categorias ambientais mais inovação, exigindo nota percentual auditada de Pass (≥30%) até Outstanding (≥85%).",
    destaqueRotulo: "Valor de capital",
    destaqueValor: "+14% a 16%",
    cor: "#A78BFA",
  },
  {
    sigla: "EDGE",
    nome: "Excellence in Design for Greater Efficiencies",
    origem: "Global · IFC / Banco Mundial",
    foco: "Economia física direta em 3 eixos: Energia, Água e Materiais",
    porQueEscolher:
      "A rota internacional mais rápida e financeiramente acessível para incorporadoras certificarem eficiência real de recursos sem burocracia excessiva.",
    ganhoPrincipal:
      "Elegibilidade a desconto de IPTU Verde municipal, acesso a Green Bonds e queda mínima de 20% nas contas de água e luz.",
    regraFactual:
      "Exige redução mínima comprovada de 20% em Energia, 20% em Água e 20% em Energia Incorporada nos Materiais (não avalia saúde/ar).",
    perfilIdeal: "Incorporação Residencial, Hotelaria e Galpões em Mercados Emergentes",
    complexidade: "Ágil · EDGE App",
    auditoriaCampo: "Simulação no software oficial EDGE App + Auditoria de projeto e obra",
    categoriasFiltro: ["todos", "acessivel", "brasil"] as CategoriaSeloFiltro[],
    descricao:
      "Criado pelo braço do Banco Mundial (IFC): foca 100% em comprovar redução mínima de 20% em energia operacional, água e materiais frente ao padrão local.",
    destaqueRotulo: "Incentivo fiscal",
    destaqueValor: "IPTU Verde + Economia",
    cor: "#FBBF24",
  },
  {
    sigla: "Selo Casa Azul",
    nome: "Selo Casa Azul + CAIXA",
    origem: "Brasil · Caixa Econômica Federal",
    foco: "Habitação sustentável, conforto NBR 15575 e critérios ASG no Brasil",
    porQueEscolher:
      "Escolha natural para construtoras e incorporadoras residenciais que financiam a produção da obra ou a venda das unidades junto à CAIXA.",
    ganhoPrincipal:
      "Desconto direto de 0,25% a 1,0% a.a. nos juros de financiamento (SBPE/Plano Empresário) e maior velocidade de vendas.",
    regraFactual:
      "Avalia 53 critérios em 6 categorias (Qualidade Urbana, Projeto e Conforto, Energia, Materiais, Água e Práticas Sociais).",
    perfilIdeal: "Incorporadoras Residenciais com Financiamento CAIXA (SBPE/SFI)",
    complexidade: "Engenharia CAIXA",
    auditoriaCampo: "Análise técnica de projeto + Vistorias nas medições de obra pela CAIXA",
    categoriasFiltro: ["todos", "brasil", "acessivel"] as CategoriaSeloFiltro[],
    descricao:
      "Instrumento ASG da CAIXA com 53 critérios distribuídos em 6 categorias, conectando desempenho térmico, água e impacto social a juros menores no Brasil.",
    destaqueRotulo: "Custo de financiamento",
    destaqueValor: "-0,25% a 1% nos juros",
    cor: "#3B82F6",
  },
  {
    sigla: "AQUA-HQE",
    nome: "Alta Qualidade Ambiental (Fundação Vanzolini)",
    origem: "França/Brasil · Vanzolini & Poli-USP",
    foco: "Gestão ambiental e conforto adaptados às normas brasileiras (NBR)",
    porQueEscolher:
      "Ideal para quem busca o rigor de uma certificação internacional (HQE francês), mas 100% tropicalizada pela USP para as normas e o clima do Brasil.",
    ganhoPrincipal:
      "Forte reconhecimento no mercado nacional (+980 projetos), pontuação em leis de IPTU Verde e controle rigoroso da obra.",
    regraFactual:
      "Avalia Sistema de Gestão (SGE) + 14 categorias de Qualidade Ambiental (exige mín. 3 em nível Excelente e 4 em nível Superior).",
    perfilIdeal: "Construtoras Brasileiras, Edifícios Públicos, Comerciais e Residenciais",
    complexidade: "3 Auditorias Presenciais",
    auditoriaCampo: "Auditorias presenciais independentes nas fases de Pré-projeto, Projeto e Obra",
    categoriasFiltro: ["todos", "brasil", "saude"] as CategoriaSeloFiltro[],
    descricao:
      "Desenvolvido a partir do francês HQE e adaptado pela Poli-USP às normas brasileiras (NBR 15575 e NBR 15220). Avalia 14 categorias do projeto à execução.",
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

const seloAnchorId = (sigla: string) => `selo-${sigla.toLowerCase().replace(/\s+/g, "-")}`;

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

type ConteudoInstitucional = "sobre" | "referencias" | "educativo";

function ReferenciasPage() {
  const [refSelecionada, setRefSelecionada] = useState<(typeof REFERENCIAS_GLOBAIS)[number] | null>(
    null,
  );
  const [fotoModalIdx, setFotoModalIdx] = useState(0);
  const [fotoCardMap, setFotoCardMap] = useState<Record<string, number>>({});
  const [certSelecionada, setCertSelecionada] = useState<(typeof CERTIFICACOES)[number] | null>(
    null,
  );
  const [seloDestacado, setSeloDestacado] = useState<string | null>(null);
  const [filtroObjetivo, setFiltroObjetivo] = useState<CategoriaSeloFiltro>("todos");
  const [filtroCaseSelo, setFiltroCaseSelo] = useState("TODOS");
  const destaqueTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (destaqueTimeout.current) clearTimeout(destaqueTimeout.current);
    },
    [],
  );

  useEffect(() => {
    setFotoModalIdx(0);
  }, [refSelecionada]);

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
    direcao: 1 | -1,
  ) {
    e.stopPropagation();
    setFotoCardMap((prev) => {
      const atual = prev[nomeRef] ?? 0;
      return { ...prev, [nomeRef]: (atual + direcao + totalFotos) % totalFotos };
    });
  }

  const fecharRef = useModalA11y(!!refSelecionada, () => setRefSelecionada(null));
  const fecharCertRef = useModalA11y(!!certSelecionada, () => setCertSelecionada(null));
  const detalhesCertSelecionada = certSelecionada
    ? DETALHES_CERTIFICACAO[certSelecionada.sigla]
    : null;
  const certificacoesFiltradas = CERTIFICACOES.filter((c) =>
    c.categoriasFiltro.includes(filtroObjetivo),
  );
  const referenciasFiltradas =
    filtroCaseSelo === "TODOS"
      ? REFERENCIAS_GLOBAIS
      : REFERENCIAS_GLOBAIS.filter((r) => r.seloRelacionado === filtroCaseSelo);

  return (
    <InstitutionalLayout>
      <>
        <>
          {/* ── 1. Hero Editorial de Certificações ── */}
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

          {/* ── 2. Grid de Cards de Certificações ── */}
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
                          {cert.complexidade}
                        </span>
                      </div>

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

                      <div
                        className="relative mt-3.5 border-l-2 pl-3"
                        style={{ borderColor: cert.cor }}
                      >
                        <span className="text-mono text-[8px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                          Por que escolher
                        </span>
                        <p className="mt-0.5 text-xs font-semibold leading-snug text-foreground">
                          {cert.porQueEscolher}
                        </p>
                      </div>

                      <div className="relative mt-4 rounded-2xl border border-border/70 bg-background/60 p-3">
                        <span className="block text-mono text-[8px] font-bold uppercase tracking-[0.15em] text-primary">
                          Estrutura Oficial do Manual
                        </span>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {cert.regraFactual}
                        </p>
                      </div>
                    </div>

                    <div className="relative mt-5 pt-3.5 border-t border-border/60 flex items-center justify-between gap-2">
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
                        Auditoria e níveis →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── 3. Matriz de Decisão Executiva ── */}
          <section className="mb-16 sm:mb-24">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-primary">
                Comparativo Direto
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <h2 className="text-display text-2xl sm:text-3xl font-extrabold mb-2">
              Matriz de decisão: qual selo escolher e o que você ganha?
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-3xl leading-relaxed mb-6">
              Compare rapidamente quando indicar cada certificação e qual é o retorno prático para o
              empreendimento. Para consultar o processo de{" "}
              <strong>verificação, auditoria e faixas de pontuação</strong>, clique em{" "}
              <strong>Ver detalhes e auditoria</strong>.
            </p>

            <div className="space-y-3">
              {CERTIFICACOES.map((cert) => (
                <div
                  key={cert.sigla}
                  onClick={() => setCertSelecionada(cert)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setCertSelecionada(cert);
                    }
                  }}
                  className="group relative grid grid-cols-1 gap-4 rounded-3xl border border-border bg-card p-4 sm:p-6 transition-all duration-300 hover:border-primary/45 hover:shadow-md lg:grid-cols-[190px_1.15fr_1fr_auto] lg:items-center cursor-pointer"
                >
                  <span
                    className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full"
                    style={{ backgroundColor: cert.cor }}
                  />

                  <div className="pl-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cert.cor }}
                      />
                      <span
                        className="text-display text-xl sm:text-2xl font-black tracking-tight"
                        style={{ color: cert.cor }}
                      >
                        {cert.sigla}
                      </span>
                    </div>
                    <span className="mt-1 block text-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {cert.origem}
                    </span>
                    <span className="mt-1.5 inline-block rounded-md border border-border bg-background/70 px-2 py-0.5 text-[10px] font-semibold text-foreground/80">
                      {cert.perfilIdeal.split(",")[0]}
                    </span>
                  </div>

                  <div className="pl-2 lg:pl-0 lg:border-l lg:border-border/60 lg:px-5">
                    <span className="block text-mono text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Por que escolher (Quando usar)
                    </span>
                    <p className="mt-1 text-xs sm:text-sm font-medium leading-relaxed text-foreground">
                      {cert.porQueEscolher}
                    </p>
                  </div>

                  <div className="pl-2 lg:pl-0 lg:border-l lg:border-border/60 lg:px-5">
                    <div className="flex items-center gap-2">
                      <span className="text-mono text-[9px] font-bold uppercase tracking-[0.16em] text-primary">
                        O que ganha (Retorno)
                      </span>
                      <span
                        className="rounded-full border px-2 py-0.5 text-mono text-[9px] font-extrabold"
                        style={{
                          color: cert.cor,
                          borderColor: cert.cor + "50",
                          backgroundColor: cert.cor + "12",
                        }}
                      >
                        {cert.destaqueValor}
                      </span>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                      {cert.ganhoPrincipal}
                    </p>
                  </div>

                  <div className="pl-2 lg:pl-0 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCertSelecionada(cert);
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-mono text-[10px] font-bold uppercase tracking-[0.14em] text-foreground group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all cursor-pointer whitespace-nowrap"
                    >
                      <span>Ver auditoria e níveis</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 4. Referências Globais ── */}
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
                  técnica e financeira da engenharia bioclimática e biofílica. Navegue pelas fotos
                  ou abra o estudo técnico.
                </p>
              </div>

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

                        <span
                          className="absolute top-3 left-3 rounded-md text-mono text-[8px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 border bg-[#090F0C]/80 backdrop-blur-sm"
                          style={{ color: "#00C67A", borderColor: "rgba(0,198,122,0.45)" }}
                        >
                          {ref.certificacao}
                        </span>
                        <span className="absolute top-3 right-3 rounded-md text-mono text-[8px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 border bg-[#090F0C]/80 backdrop-blur-sm text-amber-300 border-amber-400/40">
                          {ref.metricaChave}
                        </span>

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
                              onClick={(e) => trocarFotoCard(e, ref.nome, ref.imagens.length, -1)}
                              className="flex size-6 items-center justify-center rounded-full bg-[#090F0C]/80 text-[10px] text-white border border-white/15 hover:border-[#00C67A] transition-colors cursor-pointer"
                            >
                              ‹
                            </button>
                            <button
                              type="button"
                              aria-label="Próxima foto"
                              onClick={(e) => trocarFotoCard(e, ref.nome, ref.imagens.length, 1)}
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
                          <span className="text-primary font-bold">Ref. {ref.seloRelacionado}</span>
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

        {refSelecionada && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Detalhes: ${refSelecionada.nome}`}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          >
            <div className="absolute inset-0" onClick={() => setRefSelecionada(null)} />
            <div className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-3xl animate-in slide-in-from-bottom duration-300 overflow-hidden max-h-[92vh] overflow-y-auto">
              <div className="relative h-64 sm:h-80 overflow-hidden bg-[#090F0C]">
                <img
                  src={(refSelecionada.imagens[fotoModalIdx] ?? refSelecionada.imagens[0]).url}
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
                            refSelecionada.imagens.length,
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
                        setFotoModalIdx((prev) => (prev + 1) % refSelecionada.imagens.length)
                      }
                      className="flex size-8 items-center justify-center rounded-full bg-black/75 text-white border border-white/20 hover:border-[#00C67A] cursor-pointer"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>

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
      </>
    </InstitutionalLayout>
  );
}

export const Route = createFileRoute("/referencias")({ component: ReferenciasPage });
