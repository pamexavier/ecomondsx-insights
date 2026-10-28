import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { EcomondsLogo } from "@/components/EcomondsLogo";

/* ────────────────────────────────────────────────────────────────────────
   SOBRE / TESE
   Home ficou só com Diagnóstico + Notícias (ferramenta). Aqui mora o
   conceito: os três pilares que sustentam a tese (dado + filosofia +
   wellness), o glossário de certificações e as referências globais que
   provam que isso não é teoria. Ajuste o conteúdo à vontade — é a página
   pra mandar link pra orientador, vaga, quem quiser entender a ideia.
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
    subtitulo: "O ambiente precisa ornar com quem o vive",
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

// Cada selo corresponde a um cert.sigla no array CERTIFICACOES abaixo.
// Mapeamento editorial: quando a certificação real do prédio (campo
// "certificacao") não existe no nosso glossário (ex: Green Star, Green Mark,
// Int'l Highrise Award), ligamos ao selo do glossário que ele melhor
// exemplifica na prática. Ajuste livremente — é uma escolha de curadoria,
// não um fato técnico.
const REFERENCIAS_GLOBAIS = [
  {
    nome: "One Central Park",
    local: "Sydney, Austrália",
    ano: "2014",
    arquiteto: "Ateliers Jean Nouvel + PTW Architects",
    certificacao: "Green Star 6★",
    metricaChave: "42 heliostatos",
    destaque:
      "Duas torres cobertas por jardins verticais com dezenas de milhares de plantas nativas e um sistema pioneiro de heliostatos que devolve luz solar às áreas sombreadas pelo próprio edifício.",
    caracteristicas: [
      "42 heliostatos motorizados no topo da torre menor redirecionam sol para 320 refletores no cantilever da torre mais alta",
      "Maior sistema de heliostatos já aplicado em contexto urbano residencial no mundo",
      "Fachada viva com cerca de 38 mil plantas nativas e exóticas escolhidas por clima e resistência",
      "Primeira torre residencial de Sydney a atingir 6 estrelas no Green Star",
    ],
    imagem: "/images/wellness/ocp-1.jpg",
    seloRelacionado: "WELL", // aproximação: conexão com natureza / bem-estar
  },
  {
    nome: "The Edge",
    local: "Amsterdã, Holanda",
    ano: "2014",
    arquiteto: "PLP Architecture",
    certificacao: "BREEAM 98,36%",
    metricaChave: "98,36% BREEAM",
    destaque:
      "Considerado por anos o edifício mais inteligente e sustentável do mundo: cerca de 28 mil sensores monitoram luz, temperatura, umidade e ocupação em tempo real num prédio que gera mais energia do que consome.",
    caracteristicas: [
      "≈28 mil sensores IoT acompanham luz, temperatura, CO₂, umidade e ocupação em tempo real",
      "Energy positive: produz mais eletricidade do que consome, com painéis solares na fachada sul e no telhado",
      "Aquífero subterrâneo armazena água para aquecimento e resfriamento do edifício",
      "98,36% no BREEAM — a maior pontuação de sustentabilidade já registrada num escritório",
    ],
    imagem: "/images/wellness/the-edge-1.jpg",
    seloRelacionado: "BREEAM", // match exato
  },
  {
    nome: "Bosco Verticale",
    local: "Milão, Itália",
    ano: "2014",
    arquiteto: "Stefano Boeri Architetti",
    certificacao: "Int'l Highrise Award",
    metricaChave: "≈19 t CO₂/ano",
    destaque:
      "As duas torres reúnem o equivalente a um hectare de floresta concentrado na fachada, funcionando como corredor de biodiversidade no centro de Milão.",
    caracteristicas: [
      "≈800 árvores, 4.500 arbustos e 15 mil plantas perenes distribuídas nas fachadas das duas torres",
      "Absorve cerca de 19 toneladas de CO₂ por ano e ajuda a filtrar material particulado do ar urbano",
      "A vegetação reduz a temperatura interna em até 3°C no verão, diminuindo a demanda por climatização",
      "Abriga uma comunidade estimada em 1.600 pássaros e borboletas, funcionando como habitat urbano",
    ],
    imagem: "/images/wellness/bosco-1.jpg",
    seloRelacionado: "LEED", // aproximação: eficiência/impacto ambiental global
  },
  {
    nome: "PARKROYAL Pickering",
    local: "Singapura",
    ano: "2013",
    arquiteto: "WOHA",
    certificacao: "Green Mark Platinum",
    metricaChave: "15.000 m² verdes",
    destaque:
      "Hotel-jardim com skygardens que somam mais que o dobro da área do terreno, irrigados sem bombas, por gravidade e energia solar.",
    caracteristicas: [
      "15 mil m² de skygardens, piscinas refletoras e paredes verdes — mais que o dobro da área do lote",
      "Skygardens 'zero energy': água de chuva captada irriga por gravidade, sem bombas elétricas",
      "Mais de 260 painéis fotovoltaicos no telhado alimentam a iluminação dos jardins",
      "Primeiro hotel de Singapura a receber Green Mark Platinum, a certificação ambiental mais alta do país",
    ],
    imagem: "/images/wellness/parkroyal-1.jpg",
    seloRelacionado: "LEED", // aproximação: referência global de eficiência
  },
  {
    nome: "Amazon Spheres",
    local: "Seattle, EUA",
    ano: "2018",
    arquiteto: "NBBJ",
    certificacao: "Biophilic Design",
    metricaChave: "40.000 plantas",
    destaque:
      "Três domos de vidro que funcionam como espaço de trabalho e convivência dentro de um microclima de floresta tropical, no coração da sede da Amazon.",
    caracteristicas: [
      "Três esferas de vidro abrigam cerca de 40 mil plantas de mais de 30 países",
      "Microclima interno mantido perto de 22°C e 60% de umidade, inspirado na floresta nublada da Costa Rica",
      "Parede viva de quatro andares com milhares de espécies vegetais cultivadas em painéis verticais",
      "Vidro de baixa emissividade especial permite luz suficiente para fotossíntese e ainda barra o excesso de calor",
    ],
    imagem: "/images/wellness/amazon-1.jpg",
    seloRelacionado: "WELL", // bem-estar humano via natureza
  },
  {
    nome: "CapitaSpring",
    local: "Singapura",
    ano: "2021",
    arquiteto: "BIG + Carlo Ratti",
    certificacao: "Green Mark Platinum",
    metricaChave: "80.000 plantas",
    destaque:
      "Torre de 280 metros que reserva quatro andares inteiros para um jardim espiralado aberto e corona o edifício com a horta urbana mais alta de Singapura.",
    caracteristicas: [
      "'Green Oasis': jardim espiralado de 35 m de altura entre os andares 17 e 20, com passarela de 312 m",
      "Mais de 80 mil plantas ao longo do edifício, cerca de 63% delas espécies nativas de Singapura",
      "Horta urbana no topo (nível 51) com mais de 150 espécies comestíveis que abastecem os restaurantes da torre",
      "Certificação Green Mark Platinum, o selo ambiental mais alto de Singapura",
    ],
    imagem: "/images/wellness/capitaspring-1.jpg",
    seloRelacionado: "LEED", // aproximação: referência global de eficiência
  },
] as const;

const CERTIFICACOES = [
  {
    sigla: "LEED",
    nome: "Leadership in Energy and Environmental Design",
    origem: "EUA · USGBC",
    foco: "Eficiência energética e ciclo de vida do edifício",
    descricao:
      "O sistema mais adotado globalmente. Avalia energia, água, materiais e qualidade do ambiente interno numa pontuação de Certified a Platinum.",
    destaqueValor: "+4% a 8% no aluguel",
    cor: "#22C55E",
    status: "ativo" as "ativo" | "em_breve",
  },
  {
    sigla: "WELL",
    nome: "WELL Building Standard",
    origem: "EUA · IWBI",
    foco: "Saúde e bem-estar humano dentro da edificação",
    descricao:
      "Foco em quem ocupa o espaço: ar, água, luz, conforto térmico, acústica, nutrição e saúde mental viram critérios mensuráveis.",
    destaqueValor: "+4,4% a 7,7% no aluguel",
    cor: "#8B5CF6", // Alterado para roxo/violeta
    status: "ativo" as "ativo" | "em_breve",
  },
  {
    sigla: "BREEAM",
    nome: "Building Research Establishment Environmental Assessment Method",
    origem: "Reino Unido · BRE",
    foco: "Desempenho ambiental ao longo do ciclo de vida",
    descricao:
      "O selo mais antigo (1990). Forte em gestão, uso do solo, ecologia e resíduos além dos critérios técnicos de energia e água.",
    destaqueValor: "+14% a 16% no valor do ativo",
    cor: "#A78BFA",
    status: "ativo" as "ativo" | "em_breve",
  },
  {
    sigla: "EDGE",
    nome: "Excellence in Design for Greater Efficiencies",
    origem: "Global · IFC / Banco Mundial",
    foco: "Eficiência de recursos com certificação acessível",
    descricao:
      "Pensado para mercados emergentes: exige redução mínima de 20% em energia, água e energia incorporada nos materiais.",
    destaqueValor: "Até 25% de desconto no IPTU (SP)",
    cor: "#FBBF24",
    status: "ativo" as "ativo" | "em_breve",
  },
  
    {
    sigla: "Selo Casa Azul",
    nome: "Selo Casa Azul CAIXA",
    origem: "Brasil · Caixa Econômica Federal",
    foco: "Classificação ASG para empreendimentos habitacionais",
    descricao: "Instrumento da CAIXA para reconhecer soluções sustentáveis na concepção, execução, uso, ocupação e manutenção de empreendimentos habitacionais.",
    destaqueValor: "-0,25% a 1% nos juros do financiamento",
    cor: "#3B82F6", // Alterado para azul
    status: "ativo" as "ativo" | "em_breve",
  },
  {
    sigla: "AQUA-HQE",
    nome: "Alta Qualidade Ambiental",
    origem: "França/Brasil · Fundação Vanzolini",
    foco: "Qualidade ambiental, desempenho e governança",
    descricao: "Certificação de alta qualidade ambiental contextualizada para o Brasil, aplicável a edificações, planejamento urbano e infraestrutura.",
    destaqueValor: "+980 empreendimentos certificados no Brasil",
    cor: "#94A3B8",
    status: "ativo" as "ativo" | "em_breve",
  },
] as const;

const DETALHES_CERTIFICACAO: Record<string, {
  comoFunciona: string;
  criterios: string[];
  niveis: string[];
  valorizacao: string;
  impacto: string;
  olharInvestidor: string;
  fonte?: string;
}> = {
  LEED: {
    comoFunciona:
      "O projeto soma pontos em cinco frentes (energia, água, materiais, terreno e qualidade do ar interno). A pontuação final define o nível do selo, de Certified a Platinum. Quanto mais alto o nível, mais rigoroso foi o desempenho comprovado, não apenas prometido no papel.",
    criterios: ["Energia e emissões", "Água", "Materiais e resíduos", "Qualidade ambiental interna"],
    niveis: ["Certified · 40 a 49 pontos", "Silver · 50 a 59 pontos", "Gold · 60 a 79 pontos", "Platinum · 80 pontos ou mais"],
    valorizacao:
      "Levantamentos da CBRE com mais de 20 mil edifícios comerciais nos EUA apontam prêmio de aluguel entre 4% e 8% em relação a imóveis sem o selo (janela histórica 2019-2022). Estudos específicos de mercado chegam a registrar prêmios acima de 20%, especialmente em cidades com forte demanda por ESG.",
    impacto: "Estrutura decisões de projeto e operação em metas verificáveis de desempenho ambiental, ao invés de intenções soltas.",
    olharInvestidor: "É a certificação mais reconhecida globalmente. Facilita a leitura de risco operacional e eficiência de recursos por parte de fundos e compradores institucionais.",
    fonte: "https://www.usgbc.org/leed/",
  },
  WELL: {
    comoFunciona:
      "Diferente do LEED, que olha o edifício, o WELL olha para quem usa o edifício. Ele mede como ar, água, luz, acústica, nutrição e conforto térmico afetam a saúde física e mental de quem ocupa o espaço, com metas de desempenho testadas em campo, não só em projeto.",
    criterios: ["Ar e água", "Luz e conforto térmico", "Acústica e materiais", "Mente, movimento e comunidade"],
    niveis: ["Bronze · 40 pontos", "Silver · 50 pontos", "Gold · 60 pontos", "Platinum · 80 pontos"],
    valorizacao:
      "Um estudo do MIT Real Estate Innovation Lab (2020) mediu prêmio de aluguel entre 4,4% e 7,7% por pé quadrado em edifícios WELL, isolando esse efeito de outros fatores como idade do prédio e localização. O próprio instituto responsável pelo selo (IWBI) cita até US$ 115 por pé quadrado em valor presente líquido ao longo de 10 anos.",
    impacto: "Coloca a saúde e a experiência do ocupante no centro das decisões de espaço, o que tende a reduzir rotatividade e aumentar a duração dos contratos de locação.",
    olharInvestidor: "Ajuda a demonstrar uma estratégia concreta de bem-estar, cada vez mais exigida por empresas na hora de escolher onde alocar seus times.",
    fonte: "https://support.wellcertified.com/hc/en-us/articles/25650185551383-WELL-Certification-overview",
  },
  BREEAM: {
    comoFunciona:
      "É o selo mais antigo do mundo (Reino Unido, 1990). Avalia o ciclo de vida completo do edifício, da gestão da obra à ecologia do entorno, passando por energia e resíduos. Um avaliador credenciado audita a documentação e confere in loco se o que foi projetado foi mesmo entregue.",
    criterios: ["Gestão e saúde", "Energia, água e transporte", "Materiais, resíduos e poluição", "Ecologia e uso do solo"],
    niveis: ["Pass · 30%", "Good · 45%", "Very Good · 55%", "Excellent · 70%", "Outstanding · 85%"],
    valorizacao:
      "A CBRE aponta prêmio médio de 6% a 8% no aluguel e 14% a 16% no valor de capital para edifícios BREEAM. Pesquisas focadas em Londres (Knight Frank, JLL) registram números ainda mais altos para os níveis Excellent e Outstanding, com valorizações que passam de 20% em alguns levantamentos.",
    impacto: "Organiza o ciclo de vida do ativo numa avaliação ampla, o que ajuda a antecipar riscos de obsolescência regulatória.",
    olharInvestidor: "Cria uma linguagem comparável entre países para durabilidade e gestão de risco ambiental, útil para portfólios internacionais.",
    fonte: "https://breeam.com/breeam-usa/standards/new-construction",
  },
  EDGE: {
    comoFunciona:
      "Criado pelo IFC (braço do Banco Mundial) para ser mais simples e acessível que LEED ou BREEAM. Um software online simula o desempenho do projeto comparado a uma construção de referência local. Basta atingir 20% de economia combinada em energia, água e energia incorporada nos materiais para certificar.",
    criterios: ["Energia (comparada a uma linha de base local)", "Água potável", "Energia incorporada nos materiais de construção"],
    niveis: ["EDGE Certified · 20% ou mais de economia nos três eixos", "EDGE Advanced · 40% ou mais de economia em energia", "Zero Carbon · operação líquida zero, com renovável no local ou compensação"],
    valorizacao:
      "Além da economia direta na conta de água e energia ao longo da vida útil do imóvel, projetos certificados em São Paulo têm acesso a desconto de até 25% no IPTU pela Lei Cidade Verde, com benefícios semelhantes em Curitiba e Belo Horizonte. Também abre porta para linhas de crédito verde e para carteiras de fundos imobiliários que priorizam ativos sustentáveis.",
    impacto: "Torna a eficiência de recursos mensurável desde a fase de projeto, com uma rota de certificação mais rápida e barata que outros selos internacionais.",
    olharInvestidor: "Pensado para mercados emergentes, é a porta de entrada mais viável para incorporadoras que ainda não certificam nada, sem abrir mão de reconhecimento internacional.",
    fonte: "https://edgebuildings.com/certify/certification/",
  },
  "Selo Casa Azul": {
    comoFunciona:
      "É a classificação socioambiental da própria CAIXA para empreendimentos habitacionais que ela financia. O projeto é avaliado em 53 critérios divididos em seis categorias, e a nota final define o nível do selo. Desde novembro de 2025, tornou-se obrigatório para financiamentos de construção acima de R$ 2,25 milhões via SFI.",
    criterios: ["Qualidade urbana", "Eficiência energética", "Gestão eficiente da água", "Produção sustentável e dimensão social"],
    niveis: ["Cristal / Bronze · 50 pontos", "Topázio / Prata · 60 pontos", "Safira / Ouro · 80 pontos", "Diamante · 100 pontos, com inovação"],
    valorizacao:
      "É um dos poucos selos com benefício financeiro direto e mensurável no Brasil: desconto de 0,25% a 1% na taxa de juros do financiamento pelo SBPE, tanto para a construtora quanto para o comprador. Uma pesquisa da própria CAIXA no Residencial Bonelli, em Joinville (primeiro empreendimento certificado do país), apontou que compradores se dispõem a pagar até 7% a mais por um imóvel com o selo.",
    impacto: "Conecta soluções de habitação sustentável a critérios de projeto, execução, uso e manutenção acompanhados pela própria CAIXA ao longo da obra.",
    olharInvestidor: "Reduz o custo de capital do próprio empreendimento (juros mais baixos na produção) e se tornou pré-requisito, não diferencial, para financiamentos maiores.",
    fonte: "https://www.caixa.gov.br/sustentabilidade/negocios-sustentaveis/selo-casa-azul-caixa/Paginas/default.aspx",
  },
  "AQUA-HQE": {
    comoFunciona:
      "Nasceu na França (HQE) e foi adaptado ao Brasil pela Fundação Vanzolini em parceria com a USP, considerando clima, cultura e normas técnicas locais (como a NBR 15.575). Acompanha o empreendimento do projeto à operação, com auditorias em cada fase para confirmar que o que foi prometido foi realmente construído.",
    criterios: ["Energia, água e recursos", "Ambiente, materiais e canteiro de obras", "Saúde e qualidade dos espaços", "Conforto e gestão do empreendimento"],
    niveis: ["Base · pré-requisitos atendidos", "Boas Práticas · desempenho superior à média", "Melhores Práticas · desempenho de excelência"],
    valorizacao:
      "A Fundação Vanzolini já certificou mais de 980 empreendimentos no Brasil, somando cerca de 20 milhões de m² em 15 estados, sinal de que o mercado já reconhece o selo como referência. Empreendimentos certificados relatam mais facilidade de acesso a linhas de crédito verde (como green bonds) e redução relevante de custos operacionais, como cerca de 60% menos resíduos domiciliares gerados.",
    impacto: "Integra qualidade de vida, respeito ao meio ambiente, desempenho econômico e gestão ao longo de todo o ciclo de vida do empreendimento, não só na entrega das chaves.",
    olharInvestidor: "É o selo internacional com processo de certificação mais adaptado à realidade regulatória brasileira, o que reduz atrito na hora de comprovar conformidade.",
    fonte: "https://vanzolini.org.br/organizacoes/certificacoes/aqua-hqe/",
  },
};
// Gera um id de âncora estável a partir da sigla (ex: "Selo Casa Azul" → "selo-selo-casa-azul")
const seloAnchorId = (sigla: string) =>
  `selo-${sigla.toLowerCase().replace(/\s+/g, "-")}`;

function SobreHeroIllustration() {
  return (
    <svg viewBox="0 0 640 520" className="h-full w-full" role="img" aria-label="Diagrama de clima, território e bem-estar aplicados à arquitetura">
      <defs>
        <radialGradient id="sobreGlow" cx="55%" cy="42%" r="65%">
          <stop offset="0%" stopColor="var(--primary, #00c67a)" stopOpacity="0.23" />
          <stop offset="100%" stopColor="var(--primary, #00c67a)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sobreTerrain" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--primary, #00c67a)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--primary, #00c67a)" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <circle cx="330" cy="255" r="250" fill="url(#sobreGlow)" />

      <g transform="translate(75,75)">
        {/* território em perspectiva */}
        <path d="M35 286L244 179 475 287 263 402z" fill="url(#sobreTerrain)" stroke="var(--primary, #00c67a)" strokeOpacity="0.58" strokeWidth="1.5" />
        <g fill="none" stroke="var(--primary, #00c67a)" strokeOpacity="0.3" strokeWidth="1">
          <path d="M83 310L292 204 426 267M131 333L340 227 378 245M178 357L387 251M244 179v93M190 207v93M137 234v93M85 260v92" />
        </g>

        {/* edifício / ambiente */}
        <path d="M185 251L285 200 378 245 278 298z" fill="var(--primary, #00c67a)" fillOpacity="0.22" stroke="var(--primary, #00c67a)" strokeOpacity="0.75" />
        <path d="M185 251v-114l100-51v114z" fill="var(--card, #0d1410)" stroke="var(--primary, #00c67a)" strokeOpacity="0.7" />
        <path d="M285 86l93 45v114l-93-45z" fill="var(--primary, #00c67a)" fillOpacity="0.12" stroke="var(--primary, #00c67a)" strokeOpacity="0.7" />
        {[0, 1, 2].map((row) => [0, 1].map((col) => <path key={`${row}-${col}`} d={`M${203 + col * 35} ${157 + row * 29}l22-11v23l-22 11z`} fill="#7dd3fc" fillOpacity="0.22" stroke="#7dd3fc" strokeOpacity="0.5" />))}
        <path d="M302 128l52 25v30l-52-25zM302 193l52 25v18l-52-25z" fill="#fbbf24" fillOpacity="0.34" />

        {/* sol e leitura solar */}
        <g stroke="#fbbf24" strokeLinecap="round" strokeWidth="2"><circle cx="413" cy="52" r="21" fill="#fbbf24" fillOpacity="0.13" />{[0, 45, 90, 135, 180, 225, 270, 315].map((d) => { const r = (d * Math.PI) / 180; return <line key={d} x1={413 + Math.cos(r) * 31} y1={52 + Math.sin(r) * 31} x2={413 + Math.cos(r) * 40} y2={52 + Math.sin(r) * 40} />; })}</g>
        <path d="M399 73L340 160" stroke="#fbbf24" strokeOpacity="0.75" strokeWidth="1.5" strokeDasharray="5 5" />

        {/* vegetação e ventilação */}
        <g fill="var(--primary, #00c67a)"><path d="M104 293c-35-32-20-77 9-88 24 26 14 65-9 88z" opacity="0.72" /><path d="M112 289c4-39 33-53 55-38-7 26-27 42-55 38z" opacity="0.52" /><path d="M119 303v-74" stroke="var(--primary, #00c67a)" strokeWidth="3" /></g>
        <g fill="none" stroke="var(--primary, #00c67a)" strokeWidth="2" strokeLinecap="round" opacity="0.75"><path d="M57 143c37-30 66-22 85 0 17 20 37 19 59 2" strokeDasharray="6 7"><animate attributeName="stroke-dashoffset" from="0" to="-39" dur="3s" repeatCount="indefinite" /></path><path d="M48 165c34-24 60-17 79 1 17 18 34 17 49 4" /></g>
      </g>

      {/* etiquetas técnicas */}
      <g transform="translate(32,102)"><rect width="142" height="60" rx="10" fill="var(--card, #0d1410)" stroke="var(--border, #1f2e27)" /><circle cx="18" cy="20" r="4" fill="var(--primary, #00c67a)"><animate attributeName="opacity" values="1;.3;1" dur="1.8s" repeatCount="indefinite" /></circle><text x="30" y="24" fontSize="9" fill="var(--primary, #00c67a)" fontFamily="monospace" letterSpacing="1">CLIMA E TERRITÓRIO</text><text x="14" y="44" fontSize="10" fill="var(--muted-foreground, #8a938e)" fontFamily="monospace">sol · vento · água · solo</text></g>
      <g transform="translate(420,383)"><rect width="164" height="61" rx="10" fill="var(--card, #0d1410)" stroke="var(--border, #1f2e27)" /><text x="14" y="23" fontSize="9" fill="var(--primary, #00c67a)" fontFamily="monospace" letterSpacing="1">BEM-ESTAR MENSURÁVEL</text><text x="14" y="44" fontSize="10" fill="var(--muted-foreground, #8a938e)" fontFamily="monospace">luz · ar · conforto · saúde</text></g>
      </svg>
  );
}

function PilarIcon({ id, color }: { id: (typeof PILARES)[number]["id"]; color: string }) {
  if (id === "engenharia") {
    return <svg viewBox="0 0 80 80" className="size-16" fill="none" aria-hidden="true"><path d="M13 57L39 17l28 40H13z" fill={color} fillOpacity=".12" stroke={color} strokeWidth="1.5" /><path d="M13 57l27-14 27 14M40 17v40" stroke={color} strokeOpacity=".8" strokeWidth="1.5" /><circle cx="40" cy="43" r="4" fill={color}><animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" /></circle></svg>;
  }
  if (id === "filosofia") {
    return <svg viewBox="0 0 80 80" className="size-16" fill="none" aria-hidden="true"><circle cx="40" cy="27" r="10" fill={color} fillOpacity=".22" stroke={color} strokeWidth="1.5" /><path d="M22 63c1-15 9-23 18-23s17 8 18 23M13 43c8-6 14-7 20-2M67 43c-8-6-14-7-20-2" stroke={color} strokeLinecap="round" strokeWidth="1.5" /><circle cx="14" cy="43" r="3" fill={color} /><circle cx="66" cy="43" r="3" fill={color} /></svg>;
  }
  return <svg viewBox="0 0 80 80" className="size-16" fill="none" aria-hidden="true"><circle cx="40" cy="40" r="25" stroke={color} strokeOpacity=".35" strokeWidth="1.5" /><path d="M22 41h9l5-12 8 24 5-12h10" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><circle cx="40" cy="40" r="4" fill={color}><animate attributeName="opacity" values="1;.3;1" dur="1.8s" repeatCount="indefinite" /></circle></svg>;
}

function CertificacaoIllustration({ sigla, color }: { sigla: string; color: string }) {
  const variant = sigla === "WELL" ? "well" : sigla === "EDGE" ? "edge" : sigla === "BREEAM" ? "breeam" : sigla === "Selo Casa Azul" ? "casa" : sigla === "AQUA-HQE" ? "aqua" : "leed";
  return (
    <svg viewBox="0 0 340 230" className="h-full w-full" role="img" aria-label={`Ilustração de desempenho ${sigla}`}>
      <defs><radialGradient id={`cert-glow-${sigla}`} cx="50%" cy="48%" r="60%"><stop stopColor={color} stopOpacity=".28" /><stop offset="1" stopColor={color} stopOpacity="0" /></radialGradient></defs>
      <circle cx="170" cy="115" r="120" fill={`url(#cert-glow-${sigla})`} />
      {variant === "leed" && <><path d="M58 184l111-92 115 92H58z" fill={color} fillOpacity=".14" stroke={color} strokeWidth="1.5" /><path d="M100 184v-73l69-57 71 57v73M126 184v-48h29v48M191 109h29v31h-29z" fill="none" stroke={color} strokeWidth="2" /><path d="M68 153c24-13 38-35 42-64 21 10 32 30 29 54-18 18-40 21-71 10z" fill={color} fillOpacity=".42" /></>}
      {variant === "well" && <><circle cx="170" cy="112" r="53" fill={color} fillOpacity=".1" stroke={color} strokeWidth="1.5" /><circle cx="170" cy="85" r="15" fill={color} fillOpacity=".35" /><path d="M136 161c2-30 16-47 34-47s32 17 34 47M91 114c19-17 34-20 50-9M249 114c-19-17-34-20-50-9" fill="none" stroke={color} strokeLinecap="round" strokeWidth="2" /><circle cx="86" cy="116" r="5" fill={color} /><circle cx="254" cy="116" r="5" fill={color} /></>}
      {variant === "breeam" && <><path d="M75 180l95-120 95 120H75z" fill={color} fillOpacity=".11" stroke={color} strokeWidth="1.5" /><path d="M170 60v120M116 180l54-64 54 64M91 160h158" fill="none" stroke={color} strokeWidth="1.5" /><circle cx="170" cy="115" r="10" fill={color}><animate attributeName="r" values="8;12;8" dur="2.3s" repeatCount="indefinite" /></circle></>}
      {variant === "edge" && <><path d="M63 166l107-104 107 104-107 39L63 166z" fill={color} fillOpacity=".12" stroke={color} strokeWidth="1.5" /><path d="M63 166l107-48 107 48M170 62v143M116 142l54 24 54-24" fill="none" stroke={color} strokeWidth="1.5" /><path d="M192 83l39 18-39 19z" fill={color} fillOpacity=".55" /></>}
      {variant === "casa" && <><path d="M70 178l100-95 100 95v24H70z" fill={color} fillOpacity=".13" stroke={color} strokeWidth="1.5" /><path d="M104 178v-58l66-62 66 62v58M145 202v-47h50v47" fill="none" stroke={color} strokeWidth="2" /><path d="M84 130c29-19 52-14 67 8 13 18 33 19 56 2" fill="none" stroke={color} strokeLinecap="round" strokeWidth="2" strokeDasharray="5 6"><animate attributeName="stroke-dashoffset" from="0" to="-30" dur="2.5s" repeatCount="indefinite" /></path></>}
      {variant === "aqua" && <><path d="M70 172c36-86 87-118 100-118s64 32 100 118c-35 25-70 36-100 36s-65-11-100-36z" fill={color} fillOpacity=".13" stroke={color} strokeWidth="1.5" /><path d="M96 164c24-36 48-54 74-54s50 18 74 54M119 181c17-18 34-27 51-27s34 9 51 27" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /><circle cx="170" cy="88" r="9" fill={color}><animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite" /></circle></>}
      <text x="170" y="214" textAnchor="middle" fontSize="11" fill={color} fontFamily="monospace" fontWeight="bold" letterSpacing="2">{sigla.toUpperCase()}</text>
    </svg>
  );
}

export type SobreSection = "sobre" | "referencias";

export function SobrePage({ section = "sobre" }: { section?: SobreSection }) {
  const [pilarAberto, setPilarAberto] = useState<string | null>(null);
  const [refSelecionada, setRefSelecionada] = useState<(typeof REFERENCIAS_GLOBAIS)[number] | null>(null);
  const [certSelecionada, setCertSelecionada] = useState<(typeof CERTIFICACOES)[number] | null>(null);
  const [seloDestacado, setSeloDestacado] = useState<string | null>(null);
  const destaqueTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (destaqueTimeout.current) clearTimeout(destaqueTimeout.current);
    };
  }, []);

  function irParaSelo(sigla: string) {
    setRefSelecionada(null);
    const id = seloAnchorId(sigla);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setSeloDestacado(sigla);
      if (destaqueTimeout.current) clearTimeout(destaqueTimeout.current);
      destaqueTimeout.current = setTimeout(() => setSeloDestacado(null), 2200);
    }, 150);
  }

  const detalhesCertSelecionada = certSelecionada
    ? DETALHES_CERTIFICACAO[certSelecionada.sigla]
    : null;

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[700px]"
        style={{ background: "var(--gradient-radial-glow)" }}
      />

      {/* ── Header ── */}
      <header data-local-nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity shrink-0">
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

        {/* ── Intro da tese ── */}
        {section === "sobre" && <section className="grid grid-cols-1 items-center gap-8 pb-16 pt-14 sm:gap-12 sm:pb-20 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
          <div className="animate-fade-up">
            <div className="mb-6 flex items-center gap-3 text-mono text-[10px] uppercase tracking-[0.3em] text-primary sm:text-[11px]"><span className="h-px w-8 bg-primary" />Nossa Visão</div>
            <h1 className="max-w-3xl text-display text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-4xl md:text-5xl">
              Inteligência ambiental para transformar dados em <span className="text-primary">decisões melhores.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Conectamos clima, território e bem-estar para orientar projetos mais eficientes, saudáveis e resilientes — antes que a primeira decisão de projeto seja tomada.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Da leitura bioclimática à qualidade dos ambientes, a EcomindsX une ciência, tecnologia e engenharia para tornar o desempenho ambiental uma escolha concreta, não uma promessa de marketing.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {["Clima", "Território", "Materiais", "Bem-estar"].map((item) => <span key={item} className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-mono text-[9px] uppercase tracking-[0.16em] text-primary">{item}</span>)}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none"><div className="pointer-events-none absolute inset-[12%] rounded-full bg-primary/10 blur-3xl" /><div className="relative aspect-[1.2] overflow-hidden rounded-3xl border border-primary/15 bg-card/60 p-3 shadow-[0_25px_70px_rgba(0,0,0,0.22)] sm:p-5"><SobreHeroIllustration /></div></div>
        </section>}

        {/* ── Pilares editoriais ── */}
        {section === "sobre" && <section id="pilares" className="mb-16 sm:mb-24">
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
            Três leituras se encontram em cada decisão: o lugar onde se constrói, as pessoas que vão viver ali e as condições que sustentam seu bem-estar ao longo do tempo.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PILARES.map((pilar) => {
              const aberto = pilarAberto === pilar.id;
              return (
                <button
                  key={pilar.id}
                  onClick={() => setPilarAberto(aberto ? null : pilar.id)}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-left transition-all duration-300 hover:-translate-y-1 focus:outline-none sm:p-6"
                  style={aberto ? { borderColor: pilar.cor + "90", background: pilar.cor + "0B", boxShadow: `0 18px 50px ${pilar.cor}18` } : {}}
                >
                  <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-100" style={{ background: pilar.cor, opacity: aberto ? 0.16 : 0.06 }} />
                  <span className="absolute left-0 right-0 top-0 h-1 transition-all duration-300" style={{ background: pilar.cor, opacity: aberto ? 1 : 0.7 }} />

                  <div className="relative mb-5 flex items-start justify-between gap-3">
                    <div className="flex size-16 items-center justify-center rounded-2xl border" style={{ borderColor: pilar.cor + "45", backgroundColor: pilar.cor + "12" }}><PilarIcon id={pilar.id} color={pilar.cor} /></div>
                    <span className="text-mono text-xs tracking-[0.2em]" style={{ color: pilar.cor }}>{pilar.numero}</span>
                  </div>

                  <p className="relative mb-2 text-mono text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: pilar.cor }}>{pilar.subtitulo}</p>
                  <h3 className="relative mb-3 text-display text-xl font-extrabold text-foreground">{pilar.titulo}</h3>
                  <p className="relative text-sm leading-relaxed text-muted-foreground">{pilar.corpo}</p>

                  <div className="relative mt-5 flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: pilar.cor + "28" }}>
                    {pilar.entregas.map((entrega) => <span key={entrega} className="rounded-full border px-2.5 py-1 text-mono text-[8px] uppercase tracking-[0.1em]" style={{ color: pilar.cor, borderColor: pilar.cor + "40", backgroundColor: pilar.cor + "0D" }}>{entrega}</span>)}
                  </div>
                </button>
              );
            })}
          </div>
        </section>}

        {/* ── Certificações ── */}
        {section === "referencias" && <section id="certificacoes" className="mb-16 sm:mb-24 pt-14 sm:pt-20">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-primary">
              Referências de desempenho
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <h2 className="max-w-3xl text-display text-2xl font-extrabold leading-tight sm:text-3xl md:text-4xl mb-3">
            Certificações que transformam intenção em evidência.
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-3xl leading-relaxed mb-8 sm:mb-10">
            Um edifício sustentável precisa provar como performa. LEED, WELL, BREEAM e EDGE traduzem
            compromissos ambientais e humanos em critérios verificáveis — energia, água, materiais,
            saúde, conforto e gestão. Aqui, você entende o que cada referência mede e onde ela faz diferença.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {CERTIFICACOES.map((cert) => {
              const emBreve = cert.status === "em_breve";
              const destacado = seloDestacado === cert.sigla;
              return (
                <button
                  key={cert.sigla}
                  id={seloAnchorId(cert.sigla)}
                  onClick={() => !emBreve && setCertSelecionada(cert)}
                  disabled={emBreve}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-500 scroll-mt-24 ${
                    emBreve
                      ? "border-dashed border-border/60 bg-card/35 opacity-70"
                      : "border-border bg-card text-left hover:-translate-y-1 focus:outline-none"
                  } ${destacado ? "border-primary" : ""}`}
                  style={{
                    borderColor: destacado ? cert.cor : undefined,
                    boxShadow: destacado ? `0 0 0 3px ${cert.cor}35` : undefined,
                  }}
                >
                  <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-100" style={{ backgroundColor: cert.cor, opacity: emBreve ? 0.04 : 0.09 }} />
                  <span className="absolute left-0 right-0 top-0 h-1" style={{ backgroundColor: cert.cor, opacity: emBreve ? 0.35 : 0.9 }} />
                  <div className="relative flex items-start justify-end gap-3">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-mono text-[8px] uppercase tracking-[0.15em] ${
                        emBreve
                          ? "text-muted-foreground border-border"
                          : ""
                      }`}
                      style={emBreve ? undefined : { color: cert.cor, borderColor: cert.cor + "55", backgroundColor: cert.cor + "10" }}
                    >
                      {emBreve ? "Em breve" : "Ativo"}
                    </span>
                  </div>
                  <div className="relative mt-3">
                    <h3 className="text-display text-3xl font-black leading-none tracking-tight sm:text-4xl" style={{ color: cert.cor }}>{cert.sigla}</h3>
                    <p className="mt-2 text-xs font-semibold leading-snug text-foreground">{cert.nome}</p>
                    <p className="mt-1 text-mono text-[8px] uppercase tracking-[0.13em] text-muted-foreground">{cert.origem}</p>
                  </div>
                  <div className="relative mt-3 border-l-2 pl-2.5" style={{ borderColor: cert.cor }}>
                    <span className="text-mono text-[8px] uppercase tracking-[0.15em] text-muted-foreground">O que mede</span>
                    <p className="mt-0.5 text-xs font-semibold leading-snug text-foreground">{cert.foco}</p>
                  </div>
                  <p className="relative mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-3">{cert.descricao}</p>

                  <span
                    className="relative mt-4 inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-mono text-[9px] font-bold leading-snug tracking-[0.04em] sm:text-[10px]"
                    style={{ color: cert.cor, borderColor: cert.cor + "55", backgroundColor: cert.cor + "0D" }}
                  >
                    <span className="shrink-0 text-xs sm:text-sm" aria-hidden="true">↑</span>
                    <span>{cert.destaqueValor}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>}

        {/* ── Referências Globais ── */}
        {section === "referencias" && <section id="referencias" className="mb-16 sm:mb-24 pt-14 sm:pt-20">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-primary">
              Referências Globais
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <h2 className="text-display text-xl sm:text-2xl md:text-3xl font-extrabold mb-2">
            Empreendimentos que definem o padrão.
          </h2>
          <p className="text-mono text-xs text-muted-foreground max-w-xl leading-relaxed mb-8 sm:mb-10">
            Os selos acima não são teoria — são projetos reais. Clique numa referência pra ver o
            selo que ela exemplifica.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {REFERENCIAS_GLOBAIS.map((ref) => (
              <button
                key={ref.nome}
                onClick={() => setRefSelecionada(ref)}
                className="group relative text-left overflow-hidden border border-border bg-card rounded-2xl transition-all duration-300 hover:border-primary/40 focus:outline-none"
              >
                <div className="relative h-44 sm:h-52 overflow-hidden bg-background">
                  <img
                    src={ref.imagem}
                    alt={ref.nome}
                    loading="lazy"
                    className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                  <span
                    className="absolute top-3 left-3 text-mono text-[8px] uppercase tracking-[0.18em] px-2 py-1 border bg-background/70 backdrop-blur-sm"
                    style={{ color: "#00C67A", borderColor: "rgba(0,198,122,0.4)" }}
                  >
                    {ref.certificacao}
                  </span>
                  <span
                    className="absolute top-3 right-3 text-mono text-[8px] uppercase tracking-[0.18em] px-2 py-1 border bg-background/70 backdrop-blur-sm text-primary border-primary/30"
                  >
                    {ref.metricaChave}
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <span className="text-mono text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                    {ref.local} · {ref.ano}
                  </span>
                  <h3 className="text-display text-base sm:text-lg font-extrabold mt-1 mb-2">{ref.nome}</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{ref.destaque}</p>
                  <span
                    className="text-mono text-[8px] uppercase tracking-[0.15em] mt-3 flex items-center gap-1 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                    style={{ color: "#00C67A" }}
                  >
                    Ver especificações →
                  </span>
                </div>
                <span
                  className="absolute bottom-0 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left bg-primary"
              />
              </button>
            ))}
          </div>
        </section>}

      </main>

      {/* ── Modal Referência ── */}
      {refSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="absolute inset-0" onClick={() => setRefSelecionada(null)} />
          <div className="relative w-full max-w-lg bg-card border border-border shadow-2xl rounded-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="relative h-52 overflow-hidden bg-background">
              <img
                src={refSelecionada.imagem}
                alt={refSelecionada.nome}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
              <button
                onClick={() => setRefSelecionada(null)}
                className="absolute top-3 right-3 text-mono text-[10px] px-3 py-1.5 border border-border bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-primary transition-colors"
              >
                ✕ FECHAR
              </button>
              <span
                className="absolute top-3 left-3 text-mono text-[8px] uppercase tracking-[0.18em] px-2 py-1 border bg-background/70 backdrop-blur-sm"
                style={{ color: "#00C67A", borderColor: "rgba(0,198,122,0.4)" }}
              >
                {refSelecionada.certificacao}
              </span>
            </div>
            <div className="p-6 sm:p-8 space-y-5">
              <div>
                <span className="text-mono text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
                  {refSelecionada.local} · {refSelecionada.ano}
                </span>
                <h2 className="text-display text-2xl font-extrabold mt-1">{refSelecionada.nome}</h2>
                <p className="text-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
                  {refSelecionada.arquiteto}
                </p>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">{refSelecionada.destaque}</p>

              {/* Principais características */}
              <div className="rounded-xl border border-border bg-background/40 p-4 sm:p-5">
                <span className="text-mono text-[8px] uppercase tracking-[0.18em] text-primary">
                  Principais características
                </span>
                <ul className="mt-3 space-y-2.5">
                  {refSelecionada.caracteristicas.map((c) => (
                    <li key={c} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground leading-relaxed">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span
                  className="text-mono text-[9px] uppercase tracking-[0.15em] border px-3 py-1.5"
                  style={{ color: "#00C67A", borderColor: "rgba(0,198,122,0.4)" }}
                >
                  {refSelecionada.metricaChave}
                </span>
                <button
                  onClick={() => irParaSelo(refSelecionada.seloRelacionado)}
                  className="text-mono text-[9px] uppercase tracking-[0.15em] border px-3 py-1.5 border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                >
                  Ver selo {refSelecionada.seloRelacionado} →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Painel de certificação ── */}
      {certSelecionada && detalhesCertSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="absolute inset-0" onClick={() => setCertSelecionada(null)} />
          <article className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom duration-300">
            <button onClick={() => setCertSelecionada(null)} className="absolute right-4 top-4 z-10 rounded-full border border-border bg-background/80 px-3 py-2 text-mono text-[10px] tracking-[0.14em] text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground">✕ FECHAR</button>
            <div className="grid grid-cols-1 border-b border-border lg:grid-cols-[.9fr_1.1fr]">
              <div className="relative min-h-[250px] overflow-hidden bg-background p-6 sm:p-8">
                <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: `radial-gradient(circle at 50% 50%, ${certSelecionada.cor}22, transparent 68%)` }} />
                <div className="relative h-full min-h-[220px]"><CertificacaoIllustration sigla={certSelecionada.sigla} color={certSelecionada.cor} /></div>
              </div>
              <div className="p-7 sm:p-9">
                <span className="text-mono text-xs uppercase tracking-[0.2em] font-semibold" style={{ color: certSelecionada.cor }}>Certificação de desempenho</span>
                <h2 className="mt-2 text-display text-4xl font-black tracking-tight sm:text-5xl" style={{ color: certSelecionada.cor }}>{certSelecionada.sigla}</h2>
                <p className="mt-3 text-lg font-semibold leading-snug text-foreground">{certSelecionada.nome}</p>
                <p className="mt-2 text-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">{certSelecionada.origem}</p>
                <p className="mt-6 text-sm sm:text-base leading-relaxed text-muted-foreground">{certSelecionada.descricao}</p>
                <div className="mt-5 rounded-xl border border-border bg-background/40 p-4 sm:p-5">
                  <span className="text-mono text-xs font-bold uppercase tracking-[0.18em]" style={{ color: certSelecionada.cor }}>
                    Como funciona, em resumo
                  </span>
                  <p className="mt-2 text-sm sm:text-base leading-relaxed text-foreground">{detalhesCertSelecionada.comoFunciona}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-7 sm:grid-cols-2 sm:p-9">
              <section className="rounded-2xl border border-border bg-background/35 p-5">
                <span className="text-mono text-xs font-bold uppercase tracking-[0.18em]" style={{ color: certSelecionada.cor }}>Principais critérios</span>
                <ul className="mt-4 space-y-3">
                  {detalhesCertSelecionada.criterios.map((criterio) => <li key={criterio} className="flex items-start gap-3 text-sm sm:text-base text-foreground"><span className="mt-2 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: certSelecionada.cor }} />{criterio}</li>)}
                </ul>
              </section>
              <section className="rounded-2xl border border-border bg-background/35 p-5">
                <span className="text-mono text-xs font-bold uppercase tracking-[0.18em]" style={{ color: certSelecionada.cor }}>Níveis e pontuação</span>
                <div className="mt-4 flex flex-wrap gap-2">
                  {detalhesCertSelecionada.niveis.map((nivel) => <span key={nivel} className="rounded-lg border px-3 py-2 text-mono text-xs leading-tight font-medium" style={{ color: certSelecionada.cor, borderColor: certSelecionada.cor + "55", backgroundColor: certSelecionada.cor + "0E" }}>{nivel}</span>)}
                </div>
              </section>
              <section className="rounded-2xl border p-5 sm:col-span-2" style={{ borderColor: certSelecionada.cor + "48", backgroundColor: certSelecionada.cor + "08" }}>
                <span className="text-mono text-xs font-bold uppercase tracking-[0.18em]" style={{ color: certSelecionada.cor }}>
                  Quanto isso pode valorizar o ativo
                </span>
                <p className="mt-2 text-sm sm:text-base leading-relaxed text-foreground">{detalhesCertSelecionada.valorizacao}</p>
              </section>
              <section className="rounded-2xl border p-5 sm:col-span-2" style={{ borderColor: certSelecionada.cor + "48", backgroundColor: certSelecionada.cor + "08" }}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div><span className="text-mono text-xs font-bold uppercase tracking-[0.18em]" style={{ color: certSelecionada.cor }}>Impacto no ativo</span><p className="mt-2 text-sm sm:text-base leading-relaxed text-foreground">{detalhesCertSelecionada.impacto}</p></div>
                  <div><span className="text-mono text-xs font-bold uppercase tracking-[0.18em]" style={{ color: certSelecionada.cor }}>Olhar de investidores e construtoras</span><p className="mt-2 text-sm sm:text-base leading-relaxed text-foreground">{detalhesCertSelecionada.olharInvestidor}</p></div>
                </div>
              </section>
            </div>
            {detalhesCertSelecionada.fonte && <div className="border-t border-border px-7 py-4 sm:px-9"><a href={detalhesCertSelecionada.fonte} target="_blank" rel="noreferrer" className="text-mono text-xs uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary">Consultar critérios na fonte oficial ↗</a></div>}
          </article>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/sobre")({
  component: () => <SobrePage section="sobre" />,
});