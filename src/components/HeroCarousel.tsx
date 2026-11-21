import { useId, useState } from "react";
import type { ComponentType } from "react";
import { Building2, DraftingCompass, HeartPulse } from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────
   Hero · Engenharia Ambiental, Construção Eficiente & Wellness
   - Sem o termo "Construção Sustentável"
   - Apresenta os temas sem rotação e abre detalhes somente após seleção
──────────────────────────────────────────────────────────────────────── */

interface Pillar {
  id: string;
  badge: string;
  shortTitle: string;
  headline: string;
  highlight: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  highlights: { title: string; detail: string }[];
  Icon: ComponentType<{ className?: string }>;
  Illustration: ComponentType;
}

/* ── ILUSTRAÇÃO 1: CONSTRUÇÃO EFICIENTE & DESEMPENHO TÉRMICO ── */
function IllustrationConstrucaoEficiente() {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 560 380"
      className="h-full w-full select-none"
      role="img"
      aria-label="Corte arquitetônico de uma construção eficiente com orientação solar, ventilação cruzada e isolamento térmico"
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#255841" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#255841" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id={`${uid}-sunRay`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      <rect width="560" height="380" rx="18" fill={`url(#${uid}-sky)`} />

      {/* Trajetória Solar Superior */}
      <path
        d="M 55 155 Q 280 18 505 155"
        fill="none"
        stroke="#D97706"
        strokeWidth="1.8"
        strokeDasharray="6 6"
        opacity="0.7"
      />
      <g transform="translate(415, 76)">
        <circle r="24" fill="#F59E0B" fillOpacity="0.18" />
        <circle r="13" fill="#F59E0B" />
        <text x="-38" y="-20" fontSize="10" fill="#B45309" fontFamily="sans-serif" fontWeight="700">
          SOL & CLIMA LOCAL
        </text>
      </g>

      {/* Feixe de incidência solar controlado pelo brise/beiral */}
      <polygon points="404,86 355,148 395,185 426,95" fill={`url(#${uid}-sunRay)`} />

      {/* Linha de Solo */}
      <line x1="40" y1="305" x2="520" y2="305" stroke="#255841" strokeWidth="2" strokeOpacity="0.4" />

      {/* Casa / Edifício Moderno de Alta Eficiência (Corte) */}
      <g transform="translate(135, 130)">
        {/* Laje inclinada / Cobertura */}
        <polygon
          points="-25,22 145,-18 275,22 255,34 145,0 -5,34"
          fill="#255841"
        />
        {/* Corpo da construção */}
        <rect
          x="0"
          y="26"
          width="250"
          height="149"
          rx="4"
          fill="#FFFFFF"
          stroke="#255841"
          strokeWidth="2"
        />
        {/* Divisória interna e laje intermediária */}
        <line x1="0" y1="100" x2="250" y2="100" stroke="#DCE2DD" strokeWidth="2" />
        <line x1="130" y1="26" x2="130" y2="175" stroke="#DCE2DD" strokeWidth="1.5" />

        {/* Grandes aberturas de vidro de alta performance */}
        <rect x="15" y="42" width="95" height="46" rx="4" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.5" />
        <rect x="150" y="42" width="85" height="46" rx="4" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.5" />
        <rect x="150" y="114" width="85" height="48" rx="4" fill="#ECFDF5" stroke="#255841" strokeWidth="1.5" />

        {/* Brises de proteção solar na fachada direita */}
        {[46, 62, 78, 120, 136, 152].map((y, idx) => (
          <line key={idx} x1="252" y1={y} x2="268" y2={y + 6} stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
        ))}

        {/* Fluxo de Ventilação Cruzada */}
        <path
          d="M -45 70 C 15 58, 85 82, 155 68 C 210 58, 255 72, 305 62"
          fill="none"
          stroke="#0284C7"
          strokeWidth="2.2"
          strokeDasharray="5 5"
        />
        <polygon points="308,61 298,57 300,67" fill="#0284C7" />
      </g>

      {/* Cards de Indicadores Claros */}
      <g transform="translate(26, 26)">
        <rect width="195" height="58" rx="12" fill="#FFFFFF" stroke="#DCE2DD" strokeWidth="1.5" />
        <text x="14" y="22" fontSize="9.5" fill="#255841" fontFamily="sans-serif" fontWeight="700">
          CONSTRUÇÃO OTIMIZADA
        </text>
        <text x="14" y="42" fontSize="13.5" fill="#18221F" fontFamily="sans-serif" fontWeight="700">
          Menos gasto com energia
        </text>
      </g>

      <g transform="translate(26, 318)">
        <rect width="235" height="46" rx="10" fill="#FFFFFF" stroke="#DCE2DD" strokeWidth="1.5" />
        <circle cx="18" cy="23" r="5" fill="#0284C7" />
        <text x="32" y="27" fontSize="11.5" fill="#18221F" fontFamily="sans-serif" fontWeight="700">
          Ventilação natural & conforto térmico
        </text>
      </g>

      <g transform="translate(305, 318)">
        <rect width="228" height="46" rx="10" fill="#FFFFFF" stroke="#DCE2DD" strokeWidth="1.5" />
        <circle cx="18" cy="23" r="5" fill="#D97706" />
        <text x="32" y="27" fontSize="11.5" fill="#18221F" fontFamily="sans-serif" fontWeight="700">
          Posição solar correta no terreno
        </text>
      </g>
    </svg>
  );
}

/* ── ILUSTRAÇÃO 2: WELLNESS, SAÚDE & QUALIDADE DO AMBIENTE INTERNO ── */
function IllustrationWellnessAmbiente() {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 560 380"
      className="h-full w-full select-none"
      role="img"
      aria-label="Indicadores de Wellness na construção: qualidade do ar, conforto térmico, iluminação natural e acústica"
    >
      <defs>
        <radialGradient id={`${uid}-centerGlow`} cx="50%" cy="50%" r="52%">
          <stop offset="0%" stopColor="#255841" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#255841" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="560" height="380" rx="18" fill="#F5F6F2" />
      <circle cx="280" cy="190" r="175" fill={`url(#${uid}-centerGlow)`} />

      {/* Círculo Central */}
      <g transform="translate(280, 190)">
        <circle r="76" fill="#FFFFFF" stroke="#255841" strokeWidth="2" />
        <circle r="64" fill="#255841" fillOpacity="0.06" />
        <text x="0" y="-12" textAnchor="middle" fontSize="10" fill="#255841" fontFamily="sans-serif" fontWeight="800">
          ENGENHARIA
        </text>
        <text x="0" y="8" textAnchor="middle" fontSize="18" fill="#18221F" fontFamily="sans-serif" fontWeight="800">
          WELLNESS
        </text>
        <text x="0" y="27" textAnchor="middle" fontSize="10.5" fill="#6E7D77" fontFamily="sans-serif" fontWeight="600">
          Saúde & Bem-Estar
        </text>
      </g>

      <g stroke="#255841" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.45">
        <line x1="215" y1="145" x2="165" y2="105" />
        <line x1="345" y1="145" x2="395" y2="105" />
        <line x1="215" y1="235" x2="165" y2="275" />
        <line x1="345" y1="235" x2="395" y2="275" />
      </g>

      <g transform="translate(28, 36)">
        <rect width="195" height="78" rx="14" fill="#FFFFFF" stroke="#255841" strokeOpacity="0.35" strokeWidth="1.5" />
        <circle cx="22" cy="24" r="5" fill="#255841" />
        <text x="34" y="28" fontSize="10" fill="#255841" fontFamily="sans-serif" fontWeight="800">
          QUALIDADE DO AR
        </text>
        <text x="16" y="50" fontSize="14.5" fill="#18221F" fontFamily="sans-serif" fontWeight="800">
          Renovação & Ar Puro
        </text>
        <text x="16" y="66" fontSize="11" fill="#6E7D77" fontFamily="sans-serif">
          Controle de CO₂ e umidade
        </text>
      </g>

      <g transform="translate(337, 36)">
        <rect width="195" height="78" rx="14" fill="#FFFFFF" stroke="#D97706" strokeOpacity="0.45" strokeWidth="1.5" />
        <circle cx="22" cy="24" r="5" fill="#D97706" />
        <text x="34" y="28" fontSize="10" fill="#D97706" fontFamily="sans-serif" fontWeight="800">
          CONFORTO VISUAL
        </text>
        <text x="16" y="50" fontSize="14.5" fill="#18221F" fontFamily="sans-serif" fontWeight="800">
          Luz Natural & 2700K
        </text>
        <text x="16" y="66" fontSize="11" fill="#6E7D77" fontFamily="sans-serif">
          Foco de dia, descanso à noite
        </text>
      </g>

      <g transform="translate(28, 266)">
        <rect width="195" height="78" rx="14" fill="#FFFFFF" stroke="#0284C7" strokeOpacity="0.4" strokeWidth="1.5" />
        <circle cx="22" cy="24" r="5" fill="#0284C7" />
        <text x="34" y="28" fontSize="10" fill="#0284C7" fontFamily="sans-serif" fontWeight="800">
          TÉRMICA & ACÚSTICA
        </text>
        <text x="16" y="50" fontSize="14.5" fill="#18221F" fontFamily="sans-serif" fontWeight="800">
          Silêncio & Clima Ideal
        </text>
        <text x="16" y="66" fontSize="11" fill="#6E7D77" fontFamily="sans-serif">
          Isolamento inteligente
        </text>
      </g>

      <g transform="translate(337, 266)">
        <rect width="195" height="78" rx="14" fill="#FFFFFF" stroke="#255841" strokeOpacity="0.35" strokeWidth="1.5" />
        <circle cx="22" cy="24" r="5" fill="#255841" />
        <text x="34" y="28" fontSize="10" fill="#255841" fontFamily="sans-serif" fontWeight="800">
          BIOFILIA & VALOR
        </text>
        <text x="16" y="50" fontSize="14.5" fill="#18221F" fontFamily="sans-serif" fontWeight="800">
          Natureza Integrada
        </text>
        <text x="16" y="66" fontSize="11" fill="#6E7D77" fontFamily="sans-serif">
          Padrões WELL, LEED e AQUA
        </text>
      </g>
    </svg>
  );
}

/* ── ILUSTRAÇÃO 3: ENGENHARIA AMBIENTAL, SIMULAÇÃO 3D & DADOS ── */
function IllustrationEngenhariaDados() {
  return (
    <svg
      viewBox="0 0 560 380"
      className="h-full w-full select-none"
      role="img"
      aria-label="Painel de engenharia ambiental com simulador 3D, dados climáticos e notícias técnicas"
    >
      <rect width="560" height="380" rx="18" fill="#F5F6F2" />

      <g transform="translate(35, 28)">
        <rect width="490" height="324" rx="16" fill="#FFFFFF" stroke="#DCE2DD" strokeWidth="1.5" />
        <rect width="490" height="44" rx="16" fill="#255841" fillOpacity="0.08" />
        <circle cx="24" cy="22" r="5" fill="#255841" />
        <text x="38" y="26" fontSize="11" fill="#255841" fontFamily="sans-serif" fontWeight="800">
          FERRAMENTAS & INTELIGÊNCIA EM ENGENHARIA AMBIENTAL
        </text>

        <g transform="translate(22, 62)">
          <rect width="215" height="165" rx="12" fill="#F5F6F2" stroke="#DCE2DD" strokeWidth="1.2" />
          <text x="16" y="26" fontSize="10" fill="#255841" fontFamily="sans-serif" fontWeight="800">
            LABORATÓRIO & SIMULADOR 3D
          </text>
          <g transform="translate(105, 95)">
            <polygon points="0,-38 48,-16 0,6 -48,-16" fill="#255841" fillOpacity="0.25" stroke="#255841" strokeWidth="1.5" />
            <polygon points="-48,-16 0,6 0,48 -48,26" fill="#FFFFFF" stroke="#255841" strokeWidth="1.5" />
            <polygon points="0,6 48,-16 48,26 0,48" fill="#255841" fillOpacity="0.12" stroke="#255841" strokeWidth="1.5" />
          </g>
          <text x="16" y="152" fontSize="11" fill="#4A5853" fontFamily="sans-serif" fontWeight="600">
            Teste sol, sombras e ventilação
          </text>
        </g>

        <g transform="translate(253, 62)">
          <rect width="215" height="165" rx="12" fill="#F5F6F2" stroke="#DCE2DD" strokeWidth="1.2" />
          <text x="16" y="26" fontSize="10" fill="#D97706" fontFamily="sans-serif" fontWeight="800">
            RADAR TÉCNICO & MATERIAIS
          </text>
          <g transform="translate(16, 46)">
            <text x="0" y="12" fontSize="11" fill="#18221F" fontFamily="sans-serif" fontWeight="700">
              Desempenho Térmico
            </text>
            <rect x="0" y="20" width="180" height="8" rx="4" fill="#E2E8F0" />
            <rect x="0" y="20" width="155" height="8" rx="4" fill="#255841" />

            <text x="0" y="50" fontSize="11" fill="#18221F" fontFamily="sans-serif" fontWeight="700">
              Economia Hídrica & Energia
            </text>
            <rect x="0" y="58" width="180" height="8" rx="4" fill="#E2E8F0" />
            <rect x="0" y="58" width="166" height="8" rx="4" fill="#0284C7" />

            <text x="0" y="88" fontSize="11" fill="#18221F" fontFamily="sans-serif" fontWeight="700">
              Qualidade & Bem-Estar (Wellness)
            </text>
            <rect x="0" y="96" width="180" height="8" rx="4" fill="#E2E8F0" />
            <rect x="0" y="96" width="172" height="8" rx="4" fill="#D97706" />
          </g>
        </g>

        <g transform="translate(22, 244)">
          <rect width="446" height="58" rx="12" fill="#255841" fillOpacity="0.06" stroke="#255841" strokeOpacity="0.25" />
          <text x="18" y="24" fontSize="11" fill="#255841" fontFamily="sans-serif" fontWeight="800">
            DECISÃO BASEADA EM ENGENHARIA
          </text>
          <text x="18" y="43" fontSize="13" fill="#18221F" fontFamily="sans-serif" fontWeight="700">
            Dados climáticos, normas técnicas e guias práticos em um só lugar.
          </text>
        </g>
      </g>
    </svg>
  );
}

const PILLARS: Pillar[] = [
  {
    id: "eficiencia",
    badge: "01 · Construção Eficiente",
    shortTitle: "Construção eficiente",
    headline: "Construções inteligentes que trabalham",
    highlight: "a favor do clima e do seu bolso.",
    description:
      "Usamos engenharia ambiental para posicionar e otimizar cada ambiente: aproveitando a luz do sol na medida certa, a ventilação natural e os materiais corretos para evitar ambientes abafados e contas altas de energia.",
    ctaLabel: "Fazer Diagnóstico Solar da Obra",
    ctaHref: "/wellness-analise-solar",
    secondaryLabel: "Abrir Simulador 3D",
    secondaryHref: "/educativo#laboratorio-3d",
    highlights: [
      {
        title: "Estudo Solar & Ventos",
        detail: "Saiba onde bate o sol da tarde e de onde vem a brisa antes de construir.",
      },
      {
        title: "Eficiência Térmica e Energética",
        detail: "Ambientes naturalmente frescos no verão e confortáveis no inverno.",
      },
      {
        title: "Obra Otimizada",
        detail: "Escolha técnica de vidros, isolamentos e aberturas sem desperdício.",
      },
    ],
    Icon: Building2,
    Illustration: IllustrationConstrucaoEficiente,
  },
  {
    id: "wellness",
    badge: "02 · Wellness & Bem-Estar",
    shortTitle: "Wellness & saúde",
    headline: "Ambientes planejados para melhorar",
    highlight: "o bem-estar, o sono e a produtividade.",
    description:
      "Passamos 90% da vida dentro de imóveis. Aplicamos critérios de engenharia Wellness para garantir ar sempre renovado, iluminação que respeita o relógio biológico, silêncio e integração com a natureza.",
    ctaLabel: "Conhecer Padrões Wellness",
    ctaHref: "/padroes-wellness",
    secondaryLabel: "Testar no Laboratório 3D",
    secondaryHref: "/educativo#laboratorio-3d",
    highlights: [
      {
        title: "Qualidade do Ar & Temperatura",
        detail: "Renovação constante de ar puro e conforto térmico em todos os cômodos.",
      },
      {
        title: "Luz Natural & Conforto Acústico",
        detail: "Iluminação saudável durante o dia, luz quente à noite e proteção contra ruídos.",
      },
      {
        title: "Valorização do Imóvel",
        detail: "Alinhado às certificações internacionais WELL, LEED e AQUA.",
      },
    ],
    Icon: HeartPulse,
    Illustration: IllustrationWellnessAmbiente,
  },
  {
    id: "engenharia",
    badge: "03 · Engenharia & Radar Técnico",
    shortTitle: "Engenharia & dados",
    headline: "Engenharia ambiental aplicada,",
    highlight: "sem achismo e fácil de entender.",
    description:
      "Explore nosso simulador interativo 3D, acompanhe novas tecnologias construtivas e consulte dados climáticos reais do Brasil para tomar decisões seguras no seu projeto ou reforma.",
    ctaLabel: "Explorar Notícias & Inovação",
    ctaHref: "/noticias",
    secondaryLabel: "Acessar Área Educativa",
    secondaryHref: "/educativo",
    highlights: [
      {
        title: "Laboratório Interativo 3D",
        detail: "Visualize na prática o comportamento do sol e do clima na edificação.",
      },
      {
        title: "Dados Climáticos Reais",
        detail: "Baseado nas zonas climáticas brasileiras (NBR 15220) e dados do INMET.",
      },
      {
        title: "Curadoria de Materiais",
        detail: "Novidades em materiais eficientes, gestão de água e engenharia moderna.",
      },
    ],
    Icon: DraftingCompass,
    Illustration: IllustrationEngenhariaDados,
  },
];

export default function HeroCarousel() {
  const [active, setActive] = useState<number | null>(0);
  const current = active === null ? null : PILLARS[active];

  return (
    <section
      aria-label="Apresentação Vector-X: Engenharia Ambiental, Construção Eficiente e Wellness"
      className="relative overflow-hidden rounded-3xl border border-[#DCE2DD] bg-white text-[#18221F]"
    >
      <div className="mx-auto max-w-3xl px-4 py-6 text-center sm:px-8 sm:py-9">
        <p className="text-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#255841]">
          Como atuamos
        </p>
        <h2 className="text-display mt-2 text-2xl font-medium leading-tight tracking-tight text-[#18221F] sm:text-4xl">
          Engenharia para ambientes melhores
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#4A5853] sm:text-base">
          Conheça nossas frentes de trabalho e veja como cada uma contribui para decisões mais
          informadas.
        </p>

        <div
          className="mx-auto mt-6 grid max-w-2xl grid-cols-3 gap-3 sm:mt-8 sm:gap-6"
          role="group"
          aria-label="Temas principais"
        >
          {PILLARS.map((pillar, idx) => {
            const isSelected = idx === active;
            const Icon = pillar.Icon;
            return (
              <button
                key={pillar.id}
                type="button"
                onClick={() => setActive((selected) => (selected === idx ? null : idx))}
                aria-pressed={isSelected}
                className="group flex min-w-0 flex-col items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#255841] focus-visible:ring-offset-4"
              >
                <span
                  className={`grid aspect-square w-full max-w-40 place-items-center rounded-full border transition-all ${
                    isSelected
                      ? "scale-[1.03] border-[#255841] bg-[#255841] text-white shadow-lg shadow-[#255841]/20"
                      : "border-[#DCE2DD] bg-[#F9FAF7] text-[#255841] group-hover:border-[#255841]/50 group-hover:bg-[#255841]/5"
                  }`}
                >
                  <span className="flex flex-col items-center gap-1.5 px-2">
                    <Icon className="size-6 sm:size-8" aria-hidden="true" />
                    <span className="text-[10px] font-extrabold leading-tight sm:text-xs">
                      {pillar.shortTitle}
                    </span>
                  </span>
                </span>
                <span className="text-[10px] font-medium text-[#6E7D77] sm:text-xs">
                  {isSelected ? "Selecionado" : "Conhecer"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL DO PILAR SELECIONADO */}
      {current && (
      <div className="grid grid-cols-1 items-center gap-8 border-t border-[#DCE2DD] bg-[#F9FAF7] p-5 sm:p-8 lg:grid-cols-12 lg:gap-10 lg:p-10">
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-lg bg-[#255841]/10 px-3 py-1 text-xs font-bold text-[#255841]">
            <span>{current.badge}</span>
          </div>

          <h3 className="text-display mt-3 text-2xl font-medium leading-tight tracking-tight text-[#18221F] sm:text-4xl">
            {current.headline}{" "}
            <span className="text-[#255841]">{current.highlight}</span>
          </h3>

          <p className="mt-3.5 text-sm leading-relaxed text-[#4A5853] sm:text-base">
            {current.description}
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {current.highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[#DCE2DD] bg-white p-3.5"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#255841]" />
                  <span className="text-xs font-bold text-[#18221F]">
                    {item.title}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#6E7D77]">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={current.ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-[#255841] px-6 py-3 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-95 sm:text-sm"
            >
              <span>{current.ctaLabel}</span>
              <span aria-hidden="true">→</span>
            </a>
            <a
              href={current.secondaryHref}
              className="inline-flex items-center gap-2 rounded-full border border-[#255841]/40 bg-[#255841]/5 px-5 py-3 text-xs font-semibold text-[#255841] transition-colors hover:bg-[#255841]/15 sm:text-sm"
            >
              <span>{current.secondaryLabel}</span>
              <span aria-hidden="true">↘</span>
            </a>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="relative h-[260px] w-full overflow-hidden rounded-2xl border border-[#DCE2DD] bg-white shadow-inner sm:h-[320px] lg:h-[360px]">
            <current.Illustration />
          </div>
        </div>
      </div>
      )}
    </section>
  );
}