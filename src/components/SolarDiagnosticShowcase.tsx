import { useEffect, useRef, useState } from "react";
import { BRAZIL_STATES, ZONE_INFO } from "@/components/BrazilZonesMap";

/* ────────────────────────────────────────────────────────────────────────
   SolarDiagnosticShowcase
   Card único, autoplay, 5 slides:
     0 — Demo do diagnóstico: o pino cai sozinho num ponto do mapa,
         a zona daquele estado é destacada, e um painel resumo aparece
         com os dados que o fluxo (n8n) realmente calcula: zona
         bioclimática, radiação, umidade, vento, chuva acumulada e
         azimute. É ilustrativo — não é clicável, é uma animação em
         loop pra pessoa entender o que a ferramenta entrega.
     1-4 — Os cards de insight (por que isso importa) já existentes.

   Substitui o grid "mapa + card" da Home por um único bloco central.
──────────────────────────────────────────────────────────────────────── */

/* ── Slide 0: demo animada do mapa ──────────────────────────────────── */

// Coordenadas dentro do viewBox 480x460 do mapa, caindo sobre o Rio
// Grande do Sul — Porto Alegre.
//
// Fonte dos dados: ABNT NBR 15220-3:2024 (publicada dez/2024, em vigor
// desde jun/2025), tabela de cidades representativas por zona. A norma
// nova reduziu de 8 pra 6 zonas principais e reclassificou várias
// cidades — Porto Alegre saiu da antiga ZB 03 (norma 2005) pra ZB 02,
// subzona 2R (fria, inverno rigoroso).
//
// NOTA: no mapa simplificado por estado, o RS inteiro ainda está
// classificado como ZB 01 — aproximação documentada no header do
// BrazilZonesMap.tsx. Por isso o destaque do pino e o painel usam
// DEMO_TARGET_ZONE (a zona real da cidade), independente da cor de
// preenchimento do estado no mapa, que continua mostrando a
// aproximação até existir uma malha por município.
const DEMO_TARGET_UF = "BR-RS";
const DEMO_TARGET_ZONE = 2; // ZB 02 · Fria (2R) — Porto Alegre, NBR 15220-3:2024
const DEMO_PIN = { x: 258, y: 402 };

const DEMO_DATA = {
  local: "Porto Alegre, RS",
  zona: "ZB 02 · Fria (2R)",
  radiacao: "4.603 kWh/m²/ano",
  umidade: "78,9%",
  vento: "3,4 m/s",
  amplitude: "9,18 K",
  azimute: "28° NE",
};

function MapDemoIllustration() {
  const targetZone = BRAZIL_STATES.find((s) => s.uf === DEMO_TARGET_UF)?.zone ?? 3;

  return (
    <div className="relative w-full" style={{ aspectRatio: "480 / 460" }}>
      <svg viewBox="0 0 480 460" className="absolute inset-0 w-full h-full">
        {BRAZIL_STATES.map((s) => {
          const isTarget = s.uf === DEMO_TARGET_UF;
          const fillZone = isTarget ? DEMO_TARGET_ZONE : s.zone;
          return (
            <path
              key={s.uf}
              d={s.d}
              fill={ZONE_INFO[fillZone].cor}
              fillOpacity={isTarget ? 0.9 : 0.22}
              stroke="currentColor"
              strokeOpacity={isTarget ? 0.15 : 0.08}
              strokeWidth={1}
              className={isTarget ? "map-target-glow" : ""}
            />
          );
        })}

        {/* onda de pouso do pino */}
        <circle
          cx={DEMO_PIN.x}
          cy={DEMO_PIN.y + 2}
          r={6}
          fill="none"
          stroke="rgb(0,198,122)"
          strokeWidth={1.5}
          className="pin-ripple"
        />

        {/* pino */}
        <g className="pin-drop" style={{ transformOrigin: `${DEMO_PIN.x}px ${DEMO_PIN.y}px` }}>
          <path
            d={`M${DEMO_PIN.x} ${DEMO_PIN.y - 22}
                c-7 0 -12 5 -12 12
                c0 9 12 24 12 24
                s12 -15 12 -24
                c0 -7 -5 -12 -12 -12 Z`}
            fill="rgb(0,198,122)"
          />
          <circle cx={DEMO_PIN.x} cy={DEMO_PIN.y - 10} r={4} fill="var(--color-background, #0B0F0D)" />
        </g>
      </svg>

     {/* painel de dados */}
      <div
        className="data-panel absolute rounded-lg border border-primary/30 bg-background/95 backdrop-blur-sm px-3 py-2.5 shadow-lg"
        style={{ left: "5%", bottom: "4%", width: "min(58%, 190px)" }}
      >
        <div className="text-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground mb-1">
          {DEMO_DATA.local}
        </div>
        <div className="text-xs font-bold text-primary mb-2">{DEMO_DATA.zona}</div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {[
            ["Radiação", DEMO_DATA.radiacao],
            ["Umidade", DEMO_DATA.umidade],
            ["Vento", DEMO_DATA.vento],
            ["Amplitude térmica", DEMO_DATA.amplitude],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-[8px] text-muted-foreground uppercase tracking-[0.06em]">{label}</div>
              <div className="text-[10px] font-semibold text-foreground">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-border/50 text-[9px] text-muted-foreground">
          Azimute ideal <span className="text-foreground font-semibold">{DEMO_DATA.azimute}</span>
        </div>
      </div>

      <style>{`
        @keyframes pinDrop {
          0%   { transform: translateY(-70px) scale(0.9); opacity: 0; }
          55%  { transform: translateY(0) scale(1); opacity: 1; }
          70%  { transform: translateY(-6px) scale(1); }
          85%  { transform: translateY(0) scale(1); }
          100% { transform: translateY(0) scale(1); }
        }
        .pin-drop {
          animation: pinDrop 1s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes pinRipple {
          0%   { r: 3; stroke-opacity: 0.9; }
          100% { r: 22; stroke-opacity: 0; }
        }
        .pin-ripple {
          animation: pinRipple 1.3s ease-out 0.85s both;
        }
        @keyframes panelIn {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .data-panel {
          animation: panelIn 0.5s ease-out 1.05s both;
        }
        @keyframes targetGlow {
          0%, 100% { filter: drop-shadow(0 0 0px rgba(0,198,122,0)); }
          50%      { filter: drop-shadow(0 0 6px rgba(0,198,122,0.55)); }
        }
        .map-target-glow {
          animation: targetGlow 2.4s ease-in-out 1.4s infinite;
        }
      `}</style>
    </div>
  );
}

/* ── Slides 1–4: ilustrações técnicas de insight ─────────────────────
   (mesmas 4 ilustrações da versão anterior — sol na fachada, ambiente
   estufa, inércia térmica, colorimetria) */

function IllustrationSunHit() {
  return (
    <svg viewBox="0 0 240 150" className="w-full h-auto" fill="none">
      <defs>
        <pattern id="grid1" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
        </pattern>
        <marker id="arrow1" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="rgb(0,198,122)" />
        </marker>
      </defs>
      <rect width="240" height="150" fill="url(#grid1)" />
      <circle cx="196" cy="34" r="14" stroke="rgb(0,198,122)" strokeWidth="2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 196 + Math.cos(rad) * 20;
        const y1 = 34 + Math.sin(rad) * 20;
        const x2 = 196 + Math.cos(rad) * 27;
        const y2 = 34 + Math.sin(rad) * 27;
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgb(0,198,122)" strokeWidth="2" strokeLinecap="round" />;
      })}
      <line x1="182" y1="46" x2="118" y2="86" stroke="rgb(0,198,122)" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="196" y1="52" x2="128" y2="102" stroke="rgb(0,198,122)" strokeWidth="1.5" strokeDasharray="4 3" />
      <rect x="40" y="60" width="90" height="70" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.5" />
      <line x1="40" y1="96" x2="130" y2="96" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
      <rect x="112" y="72" width="14" height="20" stroke="rgb(0,198,122)" strokeWidth="1.5" />
      <path d="M116 96 L104 108" stroke="rgb(0,198,122)" strokeWidth="1.5" strokeLinecap="round" markerEnd="url(#arrow1)" />
      <path d="M120 100 L106 116" stroke="rgb(0,198,122)" strokeWidth="1.2" strokeOpacity="0.6" strokeLinecap="round" />
      <text x="20" y="146" fontSize="8" fill="currentColor" fillOpacity="0.5" fontFamily="monospace">
        AZIMUTE · INCIDÊNCIA DIRETA
      </text>
    </svg>
  );
}

function IllustrationOverheat() {
  return (
    <svg viewBox="0 0 240 150" className="w-full h-auto" fill="none">
      <defs>
        <pattern id="grid2" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="240" height="150" fill="url(#grid2)" />
      <rect x="30" y="40" width="120" height="90" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.5" />
      <line x1="30" y1="76" x2="150" y2="76" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
      <circle cx="70" cy="98" r="7" stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.5" />
      <line x1="70" y1="105" x2="70" y2="122" stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.5" />
      <line x1="70" y1="110" x2="61" y2="118" stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.5" />
      <line x1="70" y1="110" x2="79" y2="118" stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.5" />
      <line x1="70" y1="122" x2="63" y2="130" stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.5" />
      <line x1="70" y1="122" x2="77" y2="130" stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.5" />
      <path d="M60 84 q4 -6 8 0 q4 -6 8 0" stroke="#E8623D" strokeWidth="1.3" strokeOpacity="0.85" />
      <path d="M58 76 q4 -6 8 0 q4 -6 8 0" stroke="#E8623D" strokeWidth="1.1" strokeOpacity="0.55" />
      <line x1="118" y1="52" x2="118" y2="92" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.5" />
      <circle cx="118" cy="98" r="6" stroke="#E8623D" strokeWidth="1.5" fill="#E8623D" fillOpacity="0.25" />
      <line x1="118" y1="92" x2="118" y2="68" stroke="#E8623D" strokeWidth="3" strokeLinecap="round" />
      <rect x="30" y="44" width="24" height="8" rx="1.5" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.2" />
      <path d="M56 48 h8 M56 44 h10 M56 52 h6" stroke="#E8623D" strokeWidth="1.3" strokeLinecap="round" />
      <text x="18" y="146" fontSize="8" fill="currentColor" fillOpacity="0.5" fontFamily="monospace">
        DESCONFORTO · CONSUMO ENERGÉTICO ↑
      </text>
    </svg>
  );
}

function IllustrationThermalMass() {
  return (
    <svg viewBox="0 0 240 150" className="w-full h-auto" fill="none">
      <defs>
        <pattern id="grid3" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="240" height="150" fill="url(#grid3)" />
      <path d="M20 100 Q35 60 50 100 T80 100 T110 100" stroke="#E8623D" strokeWidth="1.6" strokeOpacity="0.85" fill="none" />
      <path d="M20 108 Q60 96 110 100" stroke="rgb(0,198,122)" strokeWidth="1.8" fill="none" />
      <line x1="20" y1="118" x2="130" y2="118" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
      <text x="20" y="130" fontSize="7" fill="currentColor" fillOpacity="0.5" fontFamily="monospace">6H</text>
      <text x="118" y="130" fontSize="7" fill="currentColor" fillOpacity="0.5" fontFamily="monospace">18H</text>
      <g transform="translate(150,50)">
        <rect x="0" y="0" width="14" height="70" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.3" />
        <rect x="3" y="0" width="4" height="70" fill="currentColor" fillOpacity="0.12" />
        <text x="0" y="82" fontSize="7" fill="currentColor" fillOpacity="0.5" fontFamily="monospace">BAIXA INÉRCIA</text>
      </g>
      <g transform="translate(190,50)">
        <rect x="0" y="0" width="20" height="70" stroke="rgb(0,198,122)" strokeWidth="1.3" />
        <rect x="4" y="0" width="12" height="70" fill="rgb(0,198,122)" fillOpacity="0.18" />
        <text x="-4" y="82" fontSize="7" fill="rgb(0,198,122)" fontFamily="monospace">ALTA INÉRCIA</text>
      </g>
    </svg>
  );
}

function IllustrationColorimetry() {
  return (
    <svg viewBox="0 0 240 150" className="w-full h-auto" fill="none">
      <defs>
        <pattern id="grid4" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
        </pattern>
        <marker id="arrow2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="rgb(0,198,122)" />
        </marker>
        <marker id="arrow3" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#E8623D" />
        </marker>
      </defs>
      <rect width="240" height="150" fill="url(#grid4)" />
      <g transform="translate(30,50)">
        <rect x="0" y="0" width="70" height="60" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.5" fill="currentColor" fillOpacity="0.04" />
        <circle cx="90" cy="-6" r="8" stroke="rgb(0,198,122)" strokeWidth="1.6" />
        <line x1="83" y1="2" x2="60" y2="18" stroke="rgb(0,198,122)" strokeWidth="1.3" strokeDasharray="3 2" />
        <line x1="60" y1="18" x2="40" y2="-4" stroke="rgb(0,198,122)" strokeWidth="1.3" strokeDasharray="3 2" markerEnd="url(#arrow2)" />
        <text x="6" y="76" fontSize="7" fill="currentColor" fillOpacity="0.55" fontFamily="monospace">CLARA · REFLETE</text>
      </g>
      <g transform="translate(140,50)">
        <rect x="0" y="0" width="70" height="60" fill="currentColor" fillOpacity="0.65" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.5" />
        <circle cx="90" cy="-6" r="8" stroke="#E8623D" strokeWidth="1.6" />
        <line x1="83" y1="2" x2="55" y2="26" stroke="#E8623D" strokeWidth="1.3" strokeDasharray="3 2" markerEnd="url(#arrow3)" />
        <text x="4" y="76" fontSize="7" fill="currentColor" fillOpacity="0.55" fontFamily="monospace">ESCURA · ABSORVE</text>
      </g>
    </svg>
  );
}

/* ── Definição dos 5 slides ───────────────────────────────────────────── */

type Slide = {
  eyebrow: string;
  title: string;
  body: string;
  illustration: React.ReactNode;
  durationMs: number;
};

const slides: Slide[] = [
  {
    eyebrow: "Diagnóstico ao vivo",
    title: "Um endereço vira zona, clima e orientação em segundos",
    body: "O motor localiza o terreno, cruza com a estação meteorológica mais próxima e devolve a leitura bioclimática completa do lote — antes da primeira decisão de projeto.",
    illustration: <MapDemoIllustration />,
    durationMs: 7500,
  },
  {
    eyebrow: "Posicionamento solar",
    title: "A arquitetura vernacular já sabia disso",
    body: "Muito antes de qualquer software, a orientação de uma construção em relação ao sol decidia se a casa era fresca ou uma estufa. O ângulo da fachada define quanto calor entra — e em que horário do dia.",
    illustration: <IllustrationSunHit />,
    durationMs: 5500,
  },
  {
    eyebrow: "Quando o posicionamento erra",
    title: "O ambiente vira estufa, e o ar-condicionado paga a conta",
    body: "Fachada mal orientada significa incidência direta nas horas mais quentes do dia. O resultado é desconforto térmico constante e uma conta de energia que sobe pra compensar um erro de projeto.",
    illustration: <IllustrationOverheat />,
    durationMs: 5500,
  },
  {
    eyebrow: "Escolha de materiais",
    title: "Inércia térmica muda a curva de temperatura do dia inteiro",
    body: "O mesmo sol, em duas paredes diferentes, produz dois resultados opostos. Material com boa inércia térmica suaviza a variação entre o pico do dia e a madrugada — menos climatização, mais estabilidade.",
    illustration: <IllustrationThermalMass />,
    durationMs: 5500,
  },
  {
    eyebrow: "Colorimetria",
    title: "A cor da fachada também é dado técnico",
    body: "Fachada escura absorve radiação; fachada clara reflete. A escolha certa depende da zona bioclimática do terreno — o que funciona em Porto Alegre não é o que funciona em Manaus.",
    illustration: <IllustrationColorimetry />,
    durationMs: 5500,
  },
];

/* ── Componente principal ─────────────────────────────────────────────── */

export function SolarDiagnosticShowcase() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slide = slides[index];
  const goTo = (i: number) => setIndex((i + slides.length) % slides.length);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, slide.durationMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, paused, slide.durationMs]);

  return (
    <div
      className="border border-primary/20 bg-card rounded-2xl overflow-hidden relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(0,198,122,0.10) 0%, transparent 70%)" }} />

      {/* barra de progresso do autoplay */}
      <div className="h-0.5 bg-border/50 relative z-10">
        <div
          key={`${index}-${paused}`}
          className="h-full bg-primary"
          style={{
            animation: paused ? "none" : `progressBar ${slide.durationMs}ms linear forwards`,
            width: paused ? undefined : undefined,
          }}
        />
        <style>{`
          @keyframes progressBar {
            from { width: 0%; }
            to   { width: 100%; }
          }
        `}</style>
      </div>

      <div className="relative z-10 p-5 sm:p-7">
        <div className="flex items-center justify-between mb-4">
          <span className="text-mono text-[9px] uppercase tracking-[0.1em] text-primary flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
            {slide.eyebrow}
          </span>
          <span className="text-mono text-[9px] text-muted-foreground">
            {index + 1} / {slides.length}
          </span>
        </div>

        <div key={index} className="mb-5 max-w-[280px] mx-auto text-foreground/80">
          {slide.illustration}
        </div>

        <h4 className="text-base sm:text-lg font-semibold text-foreground mb-2 leading-snug">
          {slide.title}
        </h4>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {slide.body}
        </p>
      </div>

      <div className="relative z-10 flex items-center justify-between px-5 sm:px-7 py-3 border-t border-border/60">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label="Slide anterior"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card/60 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3 L5 8 L10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex items-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ir para slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-primary" : "w-1.5 bg-border"}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label="Próximo slide"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card/60 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3 L11 8 L6 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}