import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { EcomondsLogo } from "@/components/EcomondsLogo";
import HeroCarousel from "@/components/HeroCarousel";
import { BrazilMapSvg } from "@/components/BrazilZonesMap";
import { LIBERAR_ANALISES } from "@/lib/flags";

/* ────────────────────────────────────────────────────────────────────────
   HOME, Vector-X by EcomindsX
   Ordem: Hero/Apresentação no topo, Diagnóstico Bioclimático abaixo.

   ZONEAMENTO: ABNT NBR 15220-3:2024 (12 zonas):
   1R, 1M, 2R, 2M, 3A, 3B, 4A, 4B, 5A, 5B, 6A, 6B.
   R/M = inverno Rigoroso/Moderado (zonas 1 e 2)
   A/B = úmida/seca (zonas 3 a 6)

   IMPORTANTE: o zoneamento 2024 é por MUNICÍPIO (5.507 cidades, ABNT TR
   15220-3-1). Um estado pode ter várias zonas. Aqui cada sigla (UF) mostra
   a zona da CAPITAL (Tabela A.1 da norma) e deixa isso explícito na tela.

   O mapa usa uma caixa de proporção fixa (480:460, a mesma do SVG).
   Pins e focos de zoom são porcentagens dessa caixa.
──────────────────────────────────────────────────────────────────────── */

type ZoneKey = "1R" | "1M" | "2R" | "2M" | "3A" | "3B" | "4A" | "4B" | "5A" | "5B" | "6A" | "6B";
type AzimuthKey = "L" | "NE" | "N" | "O" | "S";
type MapView = { scale: number; x: number; y: number };

const ZONE_ORDER: ZoneKey[] = ["1R", "1M", "2R", "2M", "3A", "3B", "4A", "4B", "5A", "5B", "6A", "6B"];

// Cores do frio ao calor
const ZONE_DOT: Record<ZoneKey, string> = {
  "1R": "#1D4ED8",
  "1M": "#4A89F3",
  "2R": "#0EA5E9",
  "2M": "#34C3F9",
  "3A": "#14B8A6",
  "3B": "#249A57",
  "4A": "#84CC16",
  "4B": "#EAB308",
  "5A": "#F59E0B",
  "5B": "#F97316",
  "6A": "#EF4444",
  "6B": "#B91C1C",
};

const MAP_FULL: MapView = { scale: 1, x: 50, y: 50 };

// 27 UFs: x e y em % da caixa do mapa. "zone" = zona da CAPITAL (NBR 15220-3:2024, Tabela A.1).
const STATES: { uf: string; name: string; capital: string; zone: ZoneKey; x: number; y: number }[] = [
  { uf: "AM", name: "Amazonas", capital: "Manaus", zone: "6A", x: 25, y: 24 },
  { uf: "RR", name: "Roraima", capital: "Boa Vista", zone: "6A", x: 32, y: 9 },
  { uf: "PA", name: "Pará", capital: "Belém", zone: "6A", x: 53, y: 24 },
  { uf: "AP", name: "Amapá", capital: "Macapá", zone: "6A", x: 57, y: 10 },
  { uf: "AC", name: "Acre", capital: "Rio Branco", zone: "5A", x: 14, y: 36 },
  { uf: "RO", name: "Rondônia", capital: "Porto Velho", zone: "5A", x: 30, y: 39 },
  { uf: "MT", name: "Mato Grosso", capital: "Cuiabá", zone: "5B", x: 46, y: 47 },
  { uf: "TO", name: "Tocantins", capital: "Palmas", zone: "6B", x: 63, y: 40 },
  { uf: "MA", name: "Maranhão", capital: "São Luís", zone: "6A", x: 70, y: 24 },
  { uf: "PI", name: "Piauí", capital: "Teresina", zone: "6A", x: 76, y: 31 },
  { uf: "CE", name: "Ceará", capital: "Fortaleza", zone: "6A", x: 85, y: 25 },
  { uf: "RN", name: "Rio Grande do Norte", capital: "Natal", zone: "5A", x: 92, y: 28 },
  { uf: "PB", name: "Paraíba", capital: "João Pessoa", zone: "5A", x: 92, y: 33 },
  { uf: "PE", name: "Pernambuco", capital: "Recife", zone: "5A", x: 87, y: 37 },
  { uf: "AL", name: "Alagoas", capital: "Maceió", zone: "5A", x: 91, y: 41 },
  { uf: "SE", name: "Sergipe", capital: "Aracaju", zone: "5A", x: 87, y: 45 },
  { uf: "BA", name: "Bahia", capital: "Salvador", zone: "5A", x: 78, y: 47 },
  { uf: "DF", name: "Distrito Federal", capital: "Brasília", zone: "3B", x: 66, y: 54 },
  { uf: "GO", name: "Goiás", capital: "Goiânia", zone: "4B", x: 61, y: 57 },
  { uf: "MS", name: "Mato Grosso do Sul", capital: "Campo Grande", zone: "4B", x: 49, y: 65 },
  { uf: "MG", name: "Minas Gerais", capital: "Belo Horizonte", zone: "3B", x: 73, y: 62 },
  { uf: "ES", name: "Espírito Santo", capital: "Vitória", zone: "4A", x: 83, y: 65 },
  { uf: "RJ", name: "Rio de Janeiro", capital: "Rio de Janeiro", zone: "4A", x: 78, y: 71 },
  { uf: "SP", name: "São Paulo", capital: "São Paulo", zone: "2M", x: 64, y: 72 },
  { uf: "PR", name: "Paraná", capital: "Curitiba", zone: "1M", x: 58, y: 78 },
  { uf: "SC", name: "Santa Catarina", capital: "Florianópolis", zone: "3A", x: 60, y: 84 },
  { uf: "RS", name: "Rio Grande do Sul", capital: "Porto Alegre", zone: "2R", x: 53, y: 91 },
];

const STATES_SORTED = [...STATES].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

// Foco do zoom calculado a partir das capitais da zona.
// Zona muito espalhada (ex.: 5A, 6A) fica em 100%, só com os pins destacados.
// A 1R não tem capital (cidade de referência: Canela/RS), então foca o RS.
const focusForZone = (zone: ZoneKey): MapView => {
  const pts = STATES.filter((s) => s.zone === zone);
  if (pts.length === 0) {
    const rs = STATES.find((s) => s.uf === "RS")!;
    return { scale: 2.6, x: rs.x, y: rs.y };
  }
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY);
  if (span > 45) return MAP_FULL;
  const scale = Math.min(2.6, Math.max(1.6, 60 / Math.max(span, 20)));
  return { scale, x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
};

type ZoneProfile = {
  name: string;
  repCity: string;
  tbsm: string; // média anual da temperatura de bulbo seco (cidade de referência)
  criterio: string;
  ur: string; // umidade relativa média anual (cidade de referência)
  amp: string; // amplitude térmica média anual, em K
  rad: string; // radiação horizontal global média, kWh/m²/dia
  municipios: string;
  az: string;
  azSub: string;
  radExplain: string;
  ampExplain: string;
  inerciaTitle: string;
  inerciaExplain: string;
  contrast: string;
};

// Dados numéricos: ABNT NBR 15220-3:2024, Tabela A.2 (cidades de referência).
// Textos de estratégia: leitura técnica própria, não são texto da norma.
const zbProfiles: Record<ZoneKey, ZoneProfile> = {
  "1R": {
    name: "Muito fria com inverno rigoroso",
    repCity: "Canela/RS",
    tbsm: "16,26",
    criterio: "TBSm < 18,8 °C · subdivisão por carga térmica de aquecimento",
    ur: "81",
    amp: "8,5",
    rad: "4,56",
    municipios: "61",
    az: "15° N",
    azSub: "AZIMUTE DA FACHADA",
    radExplain: "Sol baixo no inverno e valioso: aberturas ao Norte captam calor gratuito.",
    ampExplain: "Inverno rigoroso com carga de aquecimento elevada; a umidade alta pede ventilação controlada contra condensação.",
    inerciaTitle: "Isolamento + Estanqueidade",
    inerciaExplain: "Paredes e cobertura isoladas, esquadrias vedadas e vidros com baixa perda térmica.",
    contrast: "Na <strong>ZB 1R (Muito fria, inverno rigoroso)</strong>, o foco é captar o sol de inverno e reter calor.",
  },
  "1M": {
    name: "Muito fria com inverno moderado",
    repCity: "Curitiba/PR",
    tbsm: "17,54",
    criterio: "TBSm < 18,8 °C · inverno moderado",
    ur: "83",
    amp: "9,8",
    rad: "4,15",
    municipios: "476",
    az: "22° NE",
    azSub: "AZIMUTE DA FACHADA",
    radExplain: "A menor radiação entre as cidades de referência: cada fachada ao Norte conta no inverno.",
    ampExplain: "Frio úmido com inverno mais brando que na 1R; o aquecimento ainda pesa e o mofo é o risco principal.",
    inerciaTitle: "Isolamento moderado + Ventilação controlada",
    inerciaExplain: "Boa resistência térmica nas paredes e na cobertura, sem abrir mão de ventilar para secar os ambientes.",
    contrast: "Na <strong>ZB 1M (Muito fria, inverno moderado)</strong>, o aquecimento pesa menos que na 1R, mas a umidade segue crítica.",
  },
  "2R": {
    name: "Fria com inverno rigoroso",
    repCity: "Porto Alegre/RS",
    tbsm: "20,05",
    criterio: "18,8 ≤ TBSm < 20,9 °C · ao sul de 24,2°S e a oeste de 50,3°O",
    ur: "79",
    amp: "9,2",
    rad: "4,60",
    municipios: "385",
    az: "34° NE",
    azSub: "AZIMUTE DA FACHADA",
    radExplain: "Sol baixo no inverno e forte no verão: o Norte ganha calor no inverno e pede beiral no verão.",
    ampExplain: "Invernos rigorosos e verões quentes e úmidos: a edificação precisa funcionar nas duas estações.",
    inerciaTitle: "Isolamento + Proteção solar seletiva",
    inerciaExplain: "Isolar paredes e cobertura para o inverno, prever beirais ou brises para o verão e ventilar de forma controlada.",
    contrast: "Na <strong>ZB 2R (Fria, inverno rigoroso)</strong>, o inverno pesa no aquecimento e o verão exige sombreamento. É a zona de Porto Alegre.",
  },
  "2M": {
    name: "Fria com inverno moderado",
    repCity: "São Paulo/SP",
    tbsm: "20,39",
    criterio: "18,8 ≤ TBSm < 20,9 °C · inverno moderado",
    ur: "71",
    amp: "8,4",
    rad: "4,63",
    municipios: "573",
    az: "34° NE",
    azSub: "AZIMUTE DA FACHADA",
    radExplain: "Radiação parecida com a da 2R; Norte e Nordeste seguem como melhores fachadas para ganho solar.",
    ampExplain: "Inverno moderado: a carga de aquecimento é menor que na 2R e o foco passa a ser o conforto ao longo do ano.",
    inerciaTitle: "Inércia moderada + Ventilação",
    inerciaExplain: "Alvenaria com boa resistência térmica e aberturas que permitam ventilar nos dias quentes.",
    contrast: "Na <strong>ZB 2M (Fria, inverno moderado)</strong>, o frio é menos severo que na 2R. A cidade de referência é São Paulo.",
  },
  "3A": {
    name: "Mista e úmida",
    repCity: "Florianópolis/SC",
    tbsm: "21,20",
    criterio: "20,9 ≤ TBSm < 22,9 °C · UR > 73,2%",
    ur: "80",
    amp: "6,8",
    rad: "4,32",
    municipios: "302",
    az: "45° NE",
    azSub: "AZIMUTE DA FACHADA",
    radExplain: "Radiação moderada: beirais controlam o sol de verão e o Norte aproveita o sol de inverno.",
    ampExplain: "Umidade alta e pouca variação diária: os ambientes demoram a secar e a ventilação cruzada é prioridade.",
    inerciaTitle: "Ventilação cruzada + Proteção solar",
    inerciaExplain: "Vedações com boa resistência térmica sem excesso de massa e aberturas que renovem o ar úmido.",
    contrast: "Na <strong>ZB 3A (Mista e úmida)</strong>, a umidade do ar é o diferencial: ventilar bem evita mofo.",
  },
  "3B": {
    name: "Mista e seca",
    repCity: "Brasília/DF",
    tbsm: "21,98",
    criterio: "20,9 ≤ TBSm < 22,9 °C · UR ≤ 73,2%",
    ur: "66",
    amp: "11,3",
    rad: "5,45",
    municipios: "601",
    az: "45° NE",
    azSub: "AZIMUTE DA FACHADA",
    radExplain: "Céu aberto e radiação alta: fachadas a Oeste exigem proteção e o Norte pede beiral dimensionado.",
    ampExplain: "Ar mais seco e grande variação entre dia e noite: a massa térmica amortece os picos de calor.",
    inerciaTitle: "Inércia alta + Ventilação noturna",
    inerciaExplain: "Paredes com massa térmica e ventilação à noite descarregam o calor acumulado durante o dia.",
    contrast: "Na <strong>ZB 3B (Mista e seca)</strong>, a amplitude térmica alta favorece a inércia térmica. Brasília e Belo Horizonte estão aqui.",
  },
  "4A": {
    name: "Levemente quente e úmida",
    repCity: "Rio de Janeiro/RJ",
    tbsm: "24,38",
    criterio: "22,9 ≤ TBSm < 25,0 °C · UR > 70,3%",
    ur: "75",
    amp: "8,4",
    rad: "4,69",
    municipios: "549",
    az: "90° L",
    azSub: "AZIMUTE DA FACHADA",
    radExplain: "Sol forte de verão: sombreie Oeste e Norte com beirais e brises.",
    ampExplain: "Calor moderado com umidade alta: ventilar é a principal estratégia de conforto passivo.",
    inerciaTitle: "Ventilação + Proteção das fachadas expostas",
    inerciaExplain: "Aberturas bem posicionadas para ventilação cruzada e proteção solar nas fachadas mais expostas.",
    contrast: "Na <strong>ZB 4A (Levemente quente e úmida)</strong>, o calor é moderado mas a umidade é alta. Rio de Janeiro e Vitória estão aqui.",
  },
  "4B": {
    name: "Levemente quente e seca",
    repCity: "Goiânia/GO",
    tbsm: "24,27",
    criterio: "22,9 ≤ TBSm < 25,0 °C · UR ≤ 70,3%",
    ur: "65",
    amp: "11,7",
    rad: "5,52",
    municipios: "781",
    az: "90° L",
    azSub: "AZIMUTE DA FACHADA",
    radExplain: "Radiação alta e céu aberto: proteção solar a Oeste e na cobertura.",
    ampExplain: "Ar seco e grande variação diária: dias quentes e noites mais amenas.",
    inerciaTitle: "Inércia alta + Sombreamento",
    inerciaExplain: "Massa térmica protegida do sol direto, ventilação à noite e vegetação para umidificar o entorno.",
    contrast: "Na <strong>ZB 4B (Levemente quente e seca)</strong>, ar seco e amplitude alta pedem massa térmica sombreada. Goiânia e Campo Grande estão aqui.",
  },
  "5A": {
    name: "Quente e úmida",
    repCity: "Recife/PE",
    tbsm: "25,90",
    criterio: "25,0 ≤ TBSm < 27,0 °C · UR > 68,7%",
    ur: "78",
    amp: "6,5",
    rad: "5,34",
    municipios: "797",
    az: "90° L",
    azSub: "AZIMUTE DA FACHADA",
    radExplain: "Radiação alta o ano todo: vidros sem proteção superaquecem o ambiente.",
    ampExplain: "Calor e umidade constantes: ventilação cruzada permanente é a principal estratégia.",
    inerciaTitle: "Vedações leves + Sombreamento",
    inerciaExplain: "Materiais que não armazenam calor, beirais profundos e aberturas para ventilação cruzada.",
    contrast: "Na <strong>ZB 5A (Quente e úmida)</strong>, paredes pesadas sem ventilação retêm calor e umidade. Reúne capitais como Salvador, Recife, Rio Branco e Porto Velho.",
  },
  "5B": {
    name: "Quente e seca",
    repCity: "Cuiabá/MT",
    tbsm: "26,70",
    criterio: "25,0 ≤ TBSm < 27,0 °C · UR ≤ 68,7%",
    ur: "70",
    amp: "9,5",
    rad: "5,37",
    municipios: "443",
    az: "90° L",
    azSub: "AZIMUTE DA FACHADA",
    radExplain: "Radiação alta e céu aberto: fachadas a Oeste e coberturas precisam de proteção.",
    ampExplain: "Calor com ar mais seco: a noite oferece alívio que a ventilação noturna pode aproveitar.",
    inerciaTitle: "Sombreamento + Ventilação noturna",
    inerciaExplain: "Proteger do sol direto e ventilar à noite; a massa térmica só ajuda quando está sombreada.",
    contrast: "Na <strong>ZB 5B (Quente e seca)</strong>, o ar seco e a amplitude permitem aproveitar a ventilação noturna. Cuiabá é a cidade de referência.",
  },
  "6A": {
    name: "Muito quente e úmida",
    repCity: "Fortaleza/CE",
    tbsm: "27,12",
    criterio: "TBSm ≥ 27,0 °C · UR > 66,8%",
    ur: "74",
    amp: "5,5",
    rad: "5,77",
    municipios: "297",
    az: "110° SE",
    azSub: "CAPTAÇÃO DE VENTOS",
    radExplain: "Radiação muito alta: sombreamento integral das aberturas e da cobertura.",
    ampExplain: "Calor e umidade o ano todo, com pouca folga à noite: ventilação permanente.",
    inerciaTitle: "Vedações leves + Ventilação permanente",
    inerciaExplain: "Cobertura ventilada e refletiva, brises e elementos vazados (cobogós) que deixam o vento passar e bloqueiam o sol.",
    contrast: "Na <strong>ZB 6A (Muito quente e úmida)</strong>, sombrear e ventilar o tempo todo é essencial. Fortaleza, Manaus e Belém estão aqui.",
  },
  "6B": {
    name: "Muito quente e seca",
    repCity: "Petrolina/PE",
    tbsm: "27,53",
    criterio: "TBSm ≥ 27,0 °C · UR ≤ 66,8%",
    ur: "58",
    amp: "10,5",
    rad: "5,72",
    municipios: "305",
    az: "110° SE",
    azSub: "CAPTAÇÃO DE VENTOS",
    radExplain: "Radiação muito alta e ar seco: sombreamento integral e alto potencial fotovoltaico.",
    ampExplain: "Calor intenso e ar seco: pátios sombreados e vegetação ajudam a umidificar o ambiente.",
    inerciaTitle: "Sombreamento + Elementos vazados",
    inerciaExplain: "Cobogós, pátios internos sombreados e coberturas isoladas ou refletivas, com ventilação noturna.",
    contrast: "Na <strong>ZB 6B (Muito quente e seca)</strong>, o calor é intenso e o ar é seco. Petrolina e Palmas estão aqui.",
  },
};

// Rota da página real de análise (formulário + laudo)
const ROTA_ANALISE = "/wellness-analise-solar";

function ZonePreviewCard({ zone, profile }: { zone: ZoneKey; profile: ZoneProfile }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
          Cidade de referência · {profile.repCity}
        </span>
        <span className="text-mono text-[9px] uppercase tracking-[0.1em] text-primary border border-primary/30 rounded-md px-2 py-0.5">
          DEMO
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-4 border-b border-border">
        <div>
          <div className="text-display text-3xl font-extrabold text-primary">ZB {zone}</div>
          <div className="text-mono text-[9px] uppercase tracking-[0.1em] text-primary/80 mt-1">
            NBR 15220-3 · {profile.name}
          </div>
        </div>
        <div>
          <div className="text-display text-3xl font-extrabold text-foreground">{profile.az}</div>
          <div className="text-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground mt-1">
            {profile.azSub}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-xs">
        <div className="p-2.5 rounded-lg bg-background border border-border">
          <span className="font-semibold text-foreground">
            Radiação horizontal média: {profile.rad} kWh/m²/dia
          </span>
          <p className="text-muted-foreground mt-0.5">{profile.radExplain}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-background border border-border">
          <span className="font-semibold text-foreground">
            Amplitude {profile.amp} K · UR média {profile.ur}%
          </span>
          <p className="text-muted-foreground mt-0.5">{profile.ampExplain}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-background border border-border">
          <span className="font-semibold text-foreground">{profile.inerciaTitle}</span>
          <p className="text-muted-foreground mt-0.5">{profile.inerciaExplain}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Municípios na zona:</span>
          <span className="font-mono font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
            {profile.municipios}
          </span>
        </div>
        <p className="mt-2 text-[10px] font-mono text-muted-foreground leading-relaxed">
          Critério: {profile.criterio}. TBSm da cidade de referência: {profile.tbsm} °C.
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  // Estado para o simulador de Azimute nos 3 Pilares (5 fachadas)
  const [activeAzimuth, setActiveAzimuth] = useState<AzimuthKey>("NE");

  // Zona selecionada, estado (UF) selecionado e zoom do mapa
  const [activeZone, setActiveZone] = useState<ZoneKey>("2R");
  const [selectedUf, setSelectedUf] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState<MapView>(MAP_FULL);
  const [isDimmed, setIsDimmed] = useState(true);
  const [showStateList, setShowStateList] = useState(false);

  // Estado do Modal de Consulta por Endereço
  const [isModalOpen, setIsModalOpen] = useState(false);
  

  // Dados dinâmicos do Azimute para os 3 Pilares (com Leste, NE, Norte, Oeste e Sul)
  const azimuthData: Record<
    AzimuthKey,
    {
      energiaTag: string;
      energia: string;
      aguaTag: string;
      agua: string;
      matTag: string;
      materiais: string;
    }
  > = {
    L: {
      energiaTag: "Na fachada 90° L (Leste - Sol Nascente):",
      energia:
        "Recebe o sol direto desde o amanhecer até perto das 10h30, quando o ar externo ainda está fresco. Excelente para dormitórios: higieniza o ambiente, desperta com luz natural e deixa o quarto fresco à noite.",
      aguaTag: "Impacto Hídrico (90° L - Leste):",
      agua:
        "O sol da manhã seca rapidamente o orvalho das folhas (prevenindo fungos no paisagismo) sem causar evaporação severa do solo, economizando até 35% na irrigação em relação à face Oeste.",
      matTag: "Especificação p/ 90° L (Leste):",
      materiais:
        "Baixo estresse por choque térmico. Pede janelas com venezianas ou persianas integradas (para controle de claridade ao amanhecer) e vidros transparentes comuns ou laminados leves.",
    },
    NE: {
      energiaTag: "Na fachada 34° NE (Nordeste):",
      energia:
        "Recebe radiação suave até as 11h. Aquece o ambiente no inverno e permanece sombreada nas horas de pico de calor à tarde, minimizando o uso de ar-condicionado.",
      aguaTag: "Impacto Hídrico (34° NE):",
      agua:
        "Jardins e áreas permeáveis a Nordeste recebem sol ameno pela manhã, sofrendo até 40% menos perda de água por evaporação severa do que a face Oeste.",
      matTag: "Especificação p/ 34° NE:",
      materiais:
        "Permite vidros transparentes com fator solar moderado e beiral simples, sem necessidade de brises pesados ou isolantes térmicos de alto custo.",
    },
    N: {
      energiaTag: "Na fachada 0° N (Norte - Sol Constante no Inverno):",
      energia:
        "No hemisfério Sul, a face Norte recebe sol alto no verão (fácil de sombrear com um simples beiral) e sol inclinado no inverno que aquece a casa gratuitamente nas zonas mais frias (1R a 3B).",
      aguaTag: "Impacto Hídrico (0° N - Norte):",
      agua:
        "Insolação constante ao longo do dia: ideal para posicionar placas de aquecimento solar de água (boiões/coletores), piscinas e jardins tropicais resistentes ao sol pleno.",
      matTag: "Especificação p/ 0° N (Norte):",
      materiais:
        "Exige beiral horizontal ou brise fixo horizontal calculado pelo ângulo solar de verão, além de tintas externas com proteção UV e boa inércia térmica nas paredes.",
    },
    O: {
      energiaTag: "Na fachada 270° O (Oeste - Sol da Tarde):",
      energia:
        "Recebe insolação direta e baixa entre 13h e 18h quando o ar já está quente. Pode elevar a carga térmica interna em +6°C e dobrar o gasto com ar-condicionado.",
      aguaTag: "Impacto Hídrico (270° O):",
      agua:
        "Alta taxa de evapotranspiração superficial. Gramados e jardins sem sombreamento exigem até o dobro de rega; ideal alocar garagens, áreas técnicas ou brises vegetados.",
      matTag: "Especificação p/ 270° O:",
      materiais:
        "Exige paredes com baixa transmitância térmica, pinturas claras reflexivas (evitando fissuras por dilatação térmica), brises verticais móveis e vidros de controle solar.",
    },
    S: {
      energiaTag: "Na fachada 180° S (Sul - Pouca Insolação):",
      energia:
        "Praticamente não recebe sol direto no inverno. Oferece luz natural difusa constante (ótima para escritórios), mas exige atenção ao frio no Sul e Sudeste.",
      aguaTag: "Impacto Hídrico (180° S):",
      agua:
        "Baixíssima evaporação: o solo e as paredes demoram a secar após chuvas. Requer drenagem eficiente e espécies vegetais de meia-sombra que consumam pouca água.",
      matTag: "Especificação p/ 180° S:",
      materiais:
        "Alto risco de umidade, condensação e mofo se mal ventilada. Pede revestimentos impermeáveis/respiráveis, ventilação cruzada e esquadrias com corte térmico em climas frios.",
    },
  };

  const currentAzimuth = azimuthData[activeAzimuth];
  const currentZone = zbProfiles[activeZone];
  const zoomed = mapZoom.scale > 1;
  const selectedState = STATES.find((s) => s.uf === selectedUf) ?? null;
  const zoneCapitals = STATES.filter((s) => s.zone === activeZone);

  const focusLabel = zoomed
    ? selectedState
      ? `Zoom: ${selectedState.name} (${selectedState.uf}) · ZB ${selectedState.zone}`
      : `Zoom: ZB ${activeZone} · ${currentZone.name}`
    : `Foco: ZB ${activeZone} (clique numa sigla ou na lista)`;

  // Clique na zona: limpa o estado e foca nas capitais da zona
  const handleZoneSelect = (zoneKey: ZoneKey) => {
    setActiveZone(zoneKey);
    setSelectedUf(null);
    setMapZoom(focusForZone(zoneKey));
    setIsDimmed(true);
  };

  // Clique na sigla (pin, chip ou lista): mostra o estado, assume a zona da capital e dá zoom no estado
  const handleStateSelect = (uf: string) => {
    const s = STATES.find((st) => st.uf === uf);
    if (!s) return;
    setSelectedUf(uf);
    setActiveZone(s.zone);
    setMapZoom({ scale: 2.6, x: s.x, y: s.y });
    setIsDimmed(true);
  };

  const handleResetZoom = () => {
    setMapZoom(MAP_FULL);
    setIsDimmed(false);
    setShowStateList(false);
  };

  

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
              <span className="text-display text-sm sm:text-lg font-bold tracking-tight leading-none text-foreground">
                Vector-X
              </span>
              <span className="text-mono text-[8px] uppercase tracking-[0.15em] text-muted-foreground/70 mt-1">
                By EcomindsX
              </span>
            </div>
          </Link>

          <nav className="overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 sm:gap-2 px-1">
              {[
                { label: "Notícias", href: "/noticias" },
                { label: "Sobre", href: "/sobre" },
                { label: "Certificações", href: "/referencias" },
              ].map((item) => (
                <Link
                  key={item.label}
                  to={item.href as any}
                  className="text-sm text-muted-foreground px-2 sm:px-3 py-1.5 rounded-lg outline-none hover:text-foreground hover:bg-card/60 focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-sm font-medium text-primary px-3 sm:px-4 py-1.5 rounded-lg border border-primary/40 bg-primary/5 outline-none hover:border-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors whitespace-nowrap ml-1 cursor-pointer"
              >
                Diagnóstico Bioclimático
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 pb-32">
        <div className="mt-8 animate-fade-up">
          <HeroCarousel />
        </div>

        {/* ── 1. HERO SECTION & APRESENTAÇÃO (NO TOPO) ── */}
        <section className="pt-6 sm:pt-8 md:pt-12 pb-12 sm:pb-16">
          <div className="animate-fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono uppercase tracking-wider mb-4">
            <span>NBR 15220-3:2024</span>
            <span>•</span>
            <span>Série Histórica INMET</span>
            <span>•</span>
            <span>Trajetória Solar Exata</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.12] max-w-4xl">
            Entenda como a trajetória do sol e o clima impactam seu imóvel, <span className="text-primary">no endereço exato.</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
            Seja para <strong>comprar um imóvel pronto, escolher um terreno ou iniciar um projeto</strong>: descubra em segundos como a posição do sol (azimute), o regime de chuvas e ventos (INMET) e a Zona Bioclimática definem o conforto térmico, a conta de luz e água e a vida útil dos materiais.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 mt-0.5 font-mono text-xs">1</div>
              <div>
                <p className="text-xs font-mono uppercase text-primary font-semibold">Para quem vai comprar um imóvel ou lote</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Evite descobrir só depois da mudança que os quartos viram uma estufa à tarde (fachada oeste) ou sofrem com mofo e frio por falta de sol (fachada sul).</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 mt-0.5 font-mono text-xs">2</div>
              <div>
                <p className="text-xs font-mono uppercase text-primary font-semibold">Para quem vai construir ou projetar</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Dimensione aberturas, brises, reservatórios e especifique materiais (inércia térmica e transmitância) guiados pelo microclima real do lote.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. SEÇÃO DOS 3 PILARES + SIMULADOR DE AZIMUTE (5 FACHADAS) ── */}
        <section id="sec-pilares" className="mb-16 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Por que a trajetória solar é decisiva?</span>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-1">
                O que a posição do sol e o microclima impactam na prática
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 bg-card p-1.5 rounded-xl border border-border">
              <span className="text-xs text-muted-foreground px-2 font-medium">Simular fachada:</span>
              <button
                type="button"
                onClick={() => setActiveAzimuth("L")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activeAzimuth === "L" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-card/80"
                }`}
              >
                90° L (Leste · Nascente)
              </button>
              <button
                type="button"
                onClick={() => setActiveAzimuth("NE")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activeAzimuth === "NE" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-card/80"
                }`}
              >
                34° NE (Sol da Manhã)
              </button>
              <button
                type="button"
                onClick={() => setActiveAzimuth("N")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activeAzimuth === "N" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-card/80"
                }`}
              >
                0° N (Norte)
              </button>
              <button
                type="button"
                onClick={() => setActiveAzimuth("O")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activeAzimuth === "O" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-card/80"
                }`}
              >
                270° O (Sol da Tarde)
              </button>
              <button
                type="button"
                onClick={() => setActiveAzimuth("S")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activeAzimuth === "S" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-card/80"
                }`}
              >
                180° S (Pouco Sol)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-card border border-border p-5 rounded-2xl flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-mono font-semibold">
                    01 · EFICIÊNCIA ENERGÉTICA
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">kWh/m² · Carga Térmica</span>
                </div>
                <h3 className="text-base font-bold text-foreground">Climatização Passiva e Luz Natural</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  A trajetória do sol define o <strong>ganho térmico pelas fachadas e cobertura</strong>. Posicionar salas e quartos na orientação certa aproveita a iluminação natural e reduz em até <strong>35% a 50%</strong> o consumo elétrico com ar-condicionado ou calefação.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border bg-background/50 -mx-5 -mb-5 p-4 rounded-b-2xl">
                <p className="text-xs font-mono uppercase text-primary font-semibold">{currentAzimuth.energiaTag}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{currentAzimuth.energia}</p>
              </div>
            </div>

            <div className="bg-card border border-border p-5 rounded-2xl flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 text-xs font-mono font-semibold">
                    02 · EFICIÊNCIA HÍDRICA
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">INMET · Evapotranspiração</span>
                </div>
                <h3 className="text-base font-bold text-foreground">Evaporação, Irrigação e Pluvial</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  A insolação direta somada à umidade e aos ventos locais (dados horários INMET) governa a <strong>taxa de evaporação da água no lote</strong>. Isso define onde alocar jardins, espelhos d'água e áreas permeáveis para não desperdiçar água na irrigação.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border bg-background/50 -mx-5 -mb-5 p-4 rounded-b-2xl">
                <p className="text-xs font-mono uppercase text-primary font-semibold">{currentAzimuth.aguaTag}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{currentAzimuth.agua}</p>
              </div>
            </div>

            <div className="bg-card border border-border p-5 rounded-2xl flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-mono font-semibold">
                    03 · MATERIAIS & VIDA ÚTIL
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">Transmitância · Inércia</span>
                </div>
                <h3 className="text-base font-bold text-foreground">Especificação Técnica sem Patologias</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  A radiação UV e o choque térmico diário (amplitude térmica) ditam <strong>quais materiais resistem e isolam melhor</strong>. Conhecer o sol de cada parede evita trincas por dilatação, desbotamento precoce, condensação e mofo.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border bg-background/50 -mx-5 -mb-5 p-4 rounded-b-2xl">
                <p className="text-xs font-mono uppercase text-primary font-semibold">{currentAzimuth.matTag}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{currentAzimuth.materiais}</p>
              </div>
            </div>
          </div>
        </section>


         {/* ── 4. TABELA / GUIA COMPARATIVO ENTRE ZONAS ── */}
        <section className="mb-16 pt-8 border-t border-border">
          <div className="mb-6">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Entenda a Diferença Entre Zonas</span>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-1">
              Por que o mesmo imóvel funciona em uma região e falha em outra?
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Veja como a Zona Bioclimática muda completamente a escolha de materiais, o consumo de energia e a gestão de água:
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-background/80 text-foreground border-b border-border font-mono text-xs uppercase">
                  <th className="py-3.5 px-4">Zona Bioclimática</th>
                  <th className="py-3.5 px-4">Comportamento do Sol e Clima</th>
                  <th className="py-3.5 px-4">Erro Comum na Compra / Obra</th>
                  <th className="py-3.5 px-4">Especificação Correta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-muted-foreground">
                <tr className="hover:bg-card/50">
                  <td className="py-3.5 px-4 font-semibold text-foreground whitespace-nowrap">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5" />
                    ZB 1 e 2 (1R · 1M · 2R · 2M)<br />
                    <span className="text-xs font-normal text-muted-foreground">Muito fria e Fria</span>
                  </td>
                  <td className="py-3.5 px-4">Inverno é a estação crítica, com radiação baixa e umidade relativa média entre 71% e 83% nas cidades de referência.</td>
                  <td className="py-3.5 px-4 text-red-600 dark:text-red-400">Quartos voltados para o <strong>Sul</strong>: ambientes gelados, mofo e alto gasto com aquecimento.</td>
                  <td className="py-3.5 px-4">Orientar dormitórios ao <strong>Norte/Nordeste</strong>; usar esquadrias vedadas e isolamento térmico (mais rigoroso nas zonas R).</td>
                </tr>
                <tr className="hover:bg-card/50 bg-primary/5">
                  <td className="py-3.5 px-4 font-semibold text-primary whitespace-nowrap">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary mr-1.5" />
                    ZB 3 e 4 (3A · 3B · 4A · 4B)<br />
                    <span className="text-xs font-normal text-muted-foreground">Mista e Levemente quente</span>
                  </td>
                  <td className="py-3.5 px-4">Sol forte à tarde; nas zonas secas (B) a amplitude térmica passa de 11 K em Brasília e Goiânia, e nas úmidas (A) a umidade pesa mais.</td>
                  <td className="py-3.5 px-4 text-red-600 dark:text-red-400">Paredes finas ou panos de vidro a <strong>Oeste</strong> sem proteção: superaquecimento às 16h.</td>
                  <td className="py-3.5 px-4">Zonas B: <strong>alta inércia térmica</strong> sombreada e ventilação noturna. Zonas A: ventilação cruzada. Em ambas, brises a Oeste.</td>
                </tr>
                <tr className="hover:bg-card/50">
                  <td className="py-3.5 px-4 font-semibold text-foreground whitespace-nowrap">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5" />
                    ZB 5 e 6 (5A · 5B · 6A · 6B)<br />
                    <span className="text-xs font-normal text-muted-foreground">Quente e Muito quente</span>
                  </td>
                  <td className="py-3.5 px-4">Radiação solar intensa o ano inteiro e temperatura média anual a partir de 25 °C.</td>
                  <td className="py-3.5 px-4 text-red-600 dark:text-red-400">Lajes e paredes pesadas sem sombreamento acumulando calor interno.</td>
                  <td className="py-3.5 px-4">Sombreamento integral, vedações leves e reflexivas, ventilação cruzada permanente e beirais largos.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 3. MAPA DE ZONAS BIOCLIMÁTICAS + ZOOM + 27 SIGLAS ── */}
        <section id="diagnostico" className="mb-16 pt-8 border-t border-border">
          <div className="relative overflow-hidden border border-primary/20 bg-card p-6 sm:p-10 rounded-2xl shadow-sm">
            <div
              className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(0,198,122,0.10) 0%, transparent 70%)" }}
            />

            <div className="relative z-10 mb-6">
              <div className="text-mono text-[10px] uppercase tracking-[0.15em] text-primary mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Zonas Bioclimáticas Brasileiras · NBR 15220-3:2024
              </div>
              <h2 className="text-display text-2xl sm:text-3xl font-extrabold leading-tight mb-2">
                Zoneamento térmico e solar <span className="text-primary">para o seu endereço.</span>
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
                Selecione uma das 12 zonas ou clique na sigla de um estado para ver a zona da capital e os parâmetros da norma. A zona de cada município pode variar dentro do mesmo estado.
              </p>
            </div>

            {/* Seletor de Zonas (12) */}
            <div className="relative z-10 mb-6 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Selecione a Zona:</span>
              {ZONE_ORDER.map((zb) => (
                <button
                  key={zb}
                  type="button"
                  onClick={() => handleZoneSelect(zb)}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition cursor-pointer ${
                    activeZone === zb
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-background/80 border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ZB {zb}
                </button>
              ))}
            </div>

            {/* Mapa Interativo Integrado com Pins, Lista de Estados e Zoom + Card Demo */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-stretch">
              {/* Coluna do Mapa */}
              <div className="border border-border bg-background/60 p-4 sm:p-5 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border text-[11px] font-mono font-semibold text-primary">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ZONE_DOT[activeZone] }} />
                      <span>{focusLabel}</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleResetZoom}
                      className="px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-mono transition cursor-pointer hover:opacity-90"
                    >
                      Ver Brasil 100% ⟲
                    </button>
                  </div>
                </div>

                {/* Caixa do mapa: proporção fixa igual à do SVG (480:460) */}
                <div className="relative mx-auto my-2 w-full max-w-md aspect-[480/460] overflow-hidden rounded-xl bg-background/50 border border-border">
                  <div
                    className="absolute inset-0 transition-transform duration-500 ease-out"
                    style={{
                      transformOrigin: "50% 50%",
                      transform: `translate(${(50 - mapZoom.x) * mapZoom.scale}%, ${(50 - mapZoom.y) * mapZoom.scale}%) scale(${mapZoom.scale})`,
                    }}
                  >
                    {/*
                      ATENÇÃO: o desenho de BrazilMapSvg ainda segue as 6 zonas antigas.
                      Por isso NÃO passamos activeZone: o destaque por região ficaria errado
                      com as 12 zonas por município. Troque o SVG pelo mapa novo da norma.
                    */}
                    <BrazilMapSvg className="absolute inset-0 h-full w-full" />

                    {/* Pins flutuantes com as 27 siglas dos Estados */}
                    <div className="absolute inset-0 pointer-events-none">
                      {STATES.map((p) => {
                        const isPinActive = p.zone === activeZone;
                        const isSelected = p.uf === selectedUf;
                        return (
                          <button
                            key={p.uf}
                            type="button"
                            title={`${p.name} · capital ${p.capital}: ZB ${p.zone}`}
                            onClick={() => handleStateSelect(p.uf)}
                            className={`absolute pointer-events-auto cursor-pointer text-[9px] font-mono font-bold px-1 py-0.5 rounded transition-all duration-300 select-none ${
                              isSelected
                                ? "bg-primary text-primary-foreground border border-white shadow-[0_0_0_3px_rgba(53,116,83,0.55),0_2px_6px_rgba(0,0,0,0.3)] z-30"
                                : isPinActive
                                ? "bg-[#1e2622] text-white border border-white shadow-[0_0_0_3px_rgba(53,116,83,0.35),0_2px_6px_rgba(0,0,0,0.25)] z-20"
                                : `bg-white/95 text-gray-900 border border-black/20 shadow z-10 hover:z-30 ${
                                    isDimmed ? "opacity-45 hover:opacity-100" : "opacity-100"
                                  }`
                            }`}
                            style={{
                              left: `${p.x}%`,
                              top: `${p.y}%`,
                              transform: `translate(-50%, -50%) scale(${1 / mapZoom.scale})`,
                            }}
                          >
                            {p.uf}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Estado selecionado (aparece ao clicar numa sigla ou na lista) */}
                {selectedState && (
                  <div className="mt-2 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-xs leading-relaxed">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        {selectedState.name} ({selectedState.uf})
                      </span>
                      <span
                        className="font-mono font-semibold text-[11px] px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: ZONE_DOT[selectedState.zone] }}
                      >
                        ZB {selectedState.zone}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      Zona da capital, {selectedState.capital}. O zoneamento é por município: outras cidades de {selectedState.name} podem estar em outra zona.
                    </p>
                  </div>
                )}

                {/* Lista de estados: aparece com o mapa em 100% */}
                {!zoomed && (
                  <div className="mt-2 rounded-lg bg-card border border-border text-xs">
                    <button
                      type="button"
                      onClick={() => setShowStateList((v) => !v)}
                      aria-expanded={showStateList}
                      className="w-full flex items-center justify-between px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <span>Lista de estados (27)</span>
                      <span>{showStateList ? "Ocultar ▲" : "Mostrar ▼"}</span>
                    </button>
                    {showStateList && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2 pt-0 max-h-56 overflow-y-auto">
                        {STATES_SORTED.map((s) => (
                          <button
                            key={s.uf}
                            type="button"
                            onClick={() => handleStateSelect(s.uf)}
                            className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded text-left transition cursor-pointer ${
                              s.uf === selectedUf
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-primary/10 text-foreground"
                            }`}
                          >
                            <span>
                              <span className="font-mono font-bold">{s.uf}</span>{" "}
                              <span className="text-[11px] opacity-80">{s.name}</span>
                            </span>
                            <span
                              className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded text-white shrink-0"
                              style={{ backgroundColor: ZONE_DOT[s.zone] }}
                            >
                              {s.zone}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Capitais da zona selecionada */}
                <div className="mt-2 px-3 py-2.5 rounded-lg bg-card border border-border flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[11px] uppercase text-muted-foreground">Capitais na zona:</span>
                    {zoneCapitals.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {zoneCapitals.map((s) => (
                          <button
                            key={s.uf}
                            type="button"
                            title={`${s.name} · ${s.capital}`}
                            onClick={() => handleStateSelect(s.uf)}
                            className="px-2 py-0.5 rounded bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground font-mono font-semibold text-[11px] transition cursor-pointer"
                          >
                            {s.uf}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">nenhuma capital nesta zona</span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Cidade de referência: <strong className="text-foreground">{currentZone.repCity}</strong>
                  </span>
                </div>

                <div className="mt-3 p-3 rounded-xl bg-background border border-border text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Diferença Chave:</strong>{" "}
                  <span dangerouslySetInnerHTML={{ __html: currentZone.contrast }} />
                </div>
              </div>

              {/* Card Demo e Ação */}
              <div className="flex flex-col justify-between gap-4">
                <div className="border-2 border-primary/30 bg-background/60 p-5 sm:p-6 rounded-xl flex-1 flex flex-col justify-between shadow-sm">
  <ZonePreviewCard zone={activeZone} profile={currentZone} />
</div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-3.5 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Gerar minha análise por endereço</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        
        {/* ── CTA Notícias ── */}
        <section className="border-t border-border pt-16 sm:pt-20 flex flex-col items-center text-center gap-4">
          <div className="text-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Quer ir mais fundo?
          </div>
          <h3 className="text-display text-2xl sm:text-3xl font-extrabold max-w-lg leading-tight">
            Novidades, tecnologias e tendências da construção, num só lugar.
          </h3>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-sm leading-relaxed">
            Do radar técnico às análises de wellness: filtre pelo que importa pro seu projeto ou investimento.
          </p>
          <Link
            to="/noticias"
            className="mt-2 text-sm font-semibold bg-primary text-primary-foreground px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
          >
            Explorar notícias →
          </Link>
        </section>
      </main>

      {/* ── Modal de Consulta por Endereço ── */}
      {isModalOpen && (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={() => setIsModalOpen(false)}
  >
    <div
      className="bg-card rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 border border-border shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between pb-3 border-b border-border">
        <div>
          <span className="text-[11px] font-mono uppercase text-primary font-semibold">
            Vector-X · Diagnóstico Bioclimático
          </span>
          <h3 className="text-lg font-bold text-foreground leading-snug mt-0.5">
            A zona é só o ponto de partida. O seu lote é outra história.
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(false)}
          className="text-muted-foreground hover:text-foreground text-sm font-medium px-2 py-1 rounded cursor-pointer shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Etiqueta da zona + gancho (sem repetir o card do mapa) */}
      <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border">
        <span
          className="font-mono font-bold text-[11px] px-2 py-1 rounded text-white shrink-0"
          style={{ backgroundColor: ZONE_DOT[activeZone] }}
        >
          ZB {activeZone}
        </span>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Na zona de <strong className="text-foreground">{currentZone.repCity}</strong> a radiação média é de{" "}
          {currentZone.rad} kWh/m²/dia. No seu endereço, prédios, árvores e morros ao redor podem
          tirar boa parte disso, ou nem chegar a fazer diferença. Só dá pra saber medindo.
        </p>
      </div>

      {/* Ilustração: perfil de horizonte (exemplo ilustrativo) */}
      <div className="mt-4 rounded-xl border border-border bg-background/60 overflow-hidden">
        <svg viewBox="0 0 400 130" className="w-full h-auto" role="img" aria-label="Exemplo ilustrativo de perfil de horizonte com o caminho do sol">
          {/* trajetórias do sol */}
          <path d="M10 118 Q200 -10 390 118" fill="none" stroke="currentColor" className="text-primary" strokeOpacity="0.9" strokeWidth="2" strokeDasharray="5 4" />
          <path d="M40 118 Q200 40 360 118" fill="none" stroke="currentColor" className="text-primary" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="5 4" />
          {/* sol */}
          <circle cx="250" cy="38" r="7" className="fill-primary" />
          {/* silhueta do entorno */}
          <path
            d="M0 130 L0 98 L28 98 L28 80 L58 80 L58 104 L84 104 L84 70 L112 70 L112 92
               L128 76 L146 100 L170 100 L170 84 L206 84 L206 108 L238 108 L238 56 L268 56
               L268 96 L296 96 L296 112 L322 112 L322 78 L352 78 L352 100 L400 100 L400 130 Z"
            className="fill-foreground/80"
          />
        </svg>
        <p className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-t border-border">
          Exemplo ilustrativo · o seu perfil é calculado a partir do modelo digital de superfície (DSM)
        </p>
      </div>

      {/* O que só a análise entrega */}
      <div className="mt-5">
        <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground mb-2">
          O que você descobre na análise do seu endereço
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[
            { tag: "Sombreamento do entorno", valor: "00h de sol direto", desc: "Quanto sol a fachada escolhida realmente recebe, descontando o que está ao redor." },
            { tag: "Potencial fotovoltaico", valor: "000 kWh/mês", desc: "O que o seu telhado pode gerar de verdade, com as sombras do entorno." },
            { tag: "Gestão hídrica", valor: "00% de economia", desc: "Captação de chuva e perda por evaporação no seu terreno." },
            { tag: "Materiais por fachada", valor: "Específico", desc: "Recomendação para cada parede, em vez de uma lista genérica." },
            { tag: "Carta solar do lote", valor: "Sol × obstruções", desc: "Em que horas e em que meses o entorno bloqueia o sol." },
            { tag: "Estação INMET próxima", valor: "Dados do local", desc: "Chuva, vento e temperatura da estação mais próxima de você." },
          ].map((item) => (
            <div key={item.tag} className="p-3 rounded-lg bg-background border border-border">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-foreground">{item.tag}</span>
                <span className="text-[9px] font-mono uppercase text-primary border border-primary/30 rounded px-1.5 py-0.5 shrink-0">
                  🔒 na sua análise
                </span>
              </div>
              <div
                className="mt-1.5 text-base font-extrabold font-mono text-primary blur-[5px] select-none"
                aria-hidden="true"
              >
                {item.valor}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      {LIBERAR_ANALISES ? (
  <Link
    to={ROTA_ANALISE as any}
    onClick={() => setIsModalOpen(false)}
    className="mt-5 w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-md transition flex items-center justify-center gap-2"
  >
    <span>Ver o sombreamento e o potencial do meu lote</span>
    <span>→</span>
  </Link>
) : (
  <button
    type="button"
    disabled
    className="mt-5 w-full py-3.5 px-4 rounded-xl bg-muted text-muted-foreground font-semibold text-sm border border-border cursor-not-allowed flex items-center justify-center gap-2"
  >
    <span>Análise por endereço · em breve</span>
  </button>
)}
      <p className="mt-2 text-center text-[10px] font-mono text-muted-foreground">
        {LIBERAR_ANALISES
          ? "Leva poucos minutos · você informa o endereço e confirma o ponto no mapa"
          : "Estamos finalizando esta etapa. Em breve você poderá gerar o seu laudo aqui."}
      </p>
    </div>  
  </div>    
)}          
    </div>  
  );
}