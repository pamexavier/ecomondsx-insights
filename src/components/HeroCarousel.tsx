import { Link } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import type { ComponentType } from "react";

/* ────────────────────────────────────────────────────────────────────────
   HeroCarousel · Integrado ao Tema Claro/Suave da Página
   Troca automática contínua (sem travar no hover/foco), ilustrações
   leves integradas ao fundo do card e link direto para #laboratorio-3d.
──────────────────────────────────────────────────────────────────────── */

interface SlideMetric {
  label: string;
  value: string;
}

interface Slide {
  id: string;
  tabLabel: string;
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  ctaHash?: string;
  secondaryLabel: string;
  secondaryHref: string;
  secondaryHash?: string;
  metrics: SlideMetric[];
  Illustration: ComponentType;
}

/* ── SLIDE 1: RADAR VECTOR-X & INTELIGÊNCIA DE MERCADO ── */
function IllustrationNoticiasPremium() {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 620 460"
      className="h-full w-full select-none"
      role="img"
      aria-label="Central de inteligência e notícias sobre construção eficiente"
    >
      <defs>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="48%" r="55%">
          <stop offset="0%" stopColor="var(--primary, #2A6F4E)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary, #2A6F4E)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-chart`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary, #2A6F4E)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--primary, #2A6F4E)" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      <circle cx="310" cy="230" r="220" fill={`url(#${uid}-glow)`} />

      {/* Janela Principal Flutuante */}
      <g transform="translate(85, 42)">
        <rect
          width="390"
          height="336"
          rx="20"
          fill="var(--card, #ffffff)"
          stroke="var(--border, #dce5df)"
          strokeWidth="1.5"
        />
        {/* Barra superior da janela */}
        <path
          d="M1 19 C1 9 9 1 19 1 L371 1 C381 1 389 9 389 19 L389 42 L1 42 Z"
          fill="var(--primary, #2A6F4E)"
          fillOpacity="0.07"
        />
        <circle cx="22" cy="21" r="4.5" fill="#EF4444" opacity="0.65" />
        <circle cx="38" cy="21" r="4.5" fill="#F59E0B" opacity="0.65" />
        <circle cx="54" cy="21" r="4.5" fill="var(--primary, #2A6F4E)" opacity="0.75" />
        <text
          x="76"
          y="25"
          fontSize="9.5"
          fill="var(--muted-foreground, #64748B)"
          fontFamily="monospace"
          fontWeight="bold"
          letterSpacing="1.4"
        >
          VECTOR-X // CURADORIA TÉCNICA
        </text>

        {/* Tag de destaque */}
        <rect
          x="24"
          y="58"
          width="118"
          height="22"
          rx="11"
          fill="var(--primary, #2A6F4E)"
          fillOpacity="0.1"
          stroke="var(--primary, #2A6F4E)"
          strokeOpacity="0.35"
        />
        <circle cx="37" cy="69" r="3.5" fill="var(--primary, #2A6F4E)">
          <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <text
          x="47"
          y="72.5"
          fontSize="8.5"
          fill="var(--primary, #2A6F4E)"
          fontFamily="monospace"
          fontWeight="bold"
          letterSpacing="1"
        >
          RADAR ATIVO
        </text>

        {/* Manchete principal */}
        <text
          x="24"
          y="105"
          fontSize="18.5"
          fill="var(--foreground, #1E293B)"
          fontFamily="sans-serif"
          fontWeight="800"
        >
          Eficiência, materiais e clima
        </text>
        <text
          x="24"
          y="129"
          fontSize="18.5"
          fill="var(--primary, #2A6F4E)"
          fontFamily="sans-serif"
          fontWeight="800"
        >
          traduzidos em decisão.
        </text>

        {/* Gráfico de tendência */}
        <g transform="translate(24, 148)">
          <rect
            width="342"
            height="108"
            rx="12"
            fill="var(--background, #F8FAF9)"
            stroke="var(--border, #dce5df)"
            strokeWidth="1.2"
          />
          <text
            x="14"
            y="22"
            fontSize="8.5"
            fill="var(--muted-foreground, #64748B)"
            fontFamily="monospace"
            letterSpacing="1"
          >
            ÍNDICE DE DESEMPENHO & INOVAÇÃO CONSTRUTIVA
          </text>

          <path
            d="M16 92 L68 74 L122 80 L176 48 L230 56 L284 28 L326 36 L326 96 L16 96 Z"
            fill={`url(#${uid}-chart)`}
          />
          <path
            d="M16 92 L68 74 L122 80 L176 48 L230 56 L284 28 L326 36"
            fill="none"
            stroke="var(--primary, #2A6F4E)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {[
            { cx: 68, cy: 74 },
            { cx: 176, cy: 48 },
            { cx: 284, cy: 28 },
          ].map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.cx}
                cy={pt.cy}
                r="4.5"
                fill="var(--card, #ffffff)"
                stroke="var(--primary, #2A6F4E)"
                strokeWidth="2.2"
              />
              <circle cx={pt.cx} cy={pt.cy} r="7" fill="var(--primary, #2A6F4E)" opacity="0.25">
                <animate
                  attributeName="r"
                  values="4;10;4"
                  dur="2.4s"
                  begin={`${i * 0.5}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.45;0;0.45"
                  dur="2.4s"
                  begin={`${i * 0.5}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          ))}
        </g>

        {/* Pílulas de tópicos monitorados */}
        <g transform="translate(24, 274)">
          {[
            { tag: "BIOCLIMÁTICA", x: 0, w: 104 },
            { tag: "MATERIAIS", x: 112, w: 92 },
            { tag: "CERTIFICAÇÕES", x: 212, w: 118 },
          ].map((item) => (
            <g key={item.tag} transform={`translate(${item.x}, 0)`}>
              <rect
                width={item.w}
                height="26"
                rx="8"
                fill="var(--primary, #2A6F4E)"
                fillOpacity="0.08"
                stroke="var(--primary, #2A6F4E)"
                strokeOpacity="0.3"
              />
              <text
                x={item.w / 2}
                y="16.5"
                textAnchor="middle"
                fontSize="8.5"
                fill="var(--primary, #2A6F4E)"
                fontFamily="monospace"
                fontWeight="bold"
                letterSpacing="1"
              >
                {item.tag}
              </text>
            </g>
          ))}
        </g>
      </g>

      {/* Card Flutuante Direito */}
      <g transform="translate(405, 74)">
        <rect
          width="178"
          height="82"
          rx="14"
          fill="var(--card, #ffffff)"
          stroke="var(--primary, #2A6F4E)"
          strokeOpacity="0.4"
          strokeWidth="1.5"
        />
        <text
          x="16"
          y="24"
          fontSize="8.5"
          fill="var(--primary, #2A6F4E)"
          fontFamily="monospace"
          fontWeight="bold"
          letterSpacing="1.2"
        >
          FONTES GLOBAIS & LOCAIS
        </text>
        <text
          x="16"
          y="52"
          fontSize="24"
          fill="var(--foreground, #1E293B)"
          fontFamily="monospace"
          fontWeight="bold"
        >
          100%
        </text>
        <text x="84" y="45" fontSize="9" fill="var(--muted-foreground, #64748B)" fontFamily="monospace">
          curadoria
        </text>
        <text x="84" y="57" fontSize="9" fill="var(--primary, #2A6F4E)" fontFamily="monospace" fontWeight="bold">
          técnica aplicada
        </text>
      </g>

      {/* Card Flutuante Inferior Esquerdo */}
      <g transform="translate(36, 326)">
        <rect
          width="192"
          height="72"
          rx="14"
          fill="var(--card, #ffffff)"
          stroke="var(--border, #dce5df)"
          strokeWidth="1.5"
        />
        <text
          x="16"
          y="23"
          fontSize="8.5"
          fill="var(--primary, #2A6F4E)"
          fontFamily="monospace"
          fontWeight="bold"
          letterSpacing="1"
        >
          IMPACTO NA PRÁTICA
        </text>
        <text
          x="16"
          y="44"
          fontSize="13"
          fill="var(--foreground, #1E293B)"
          fontFamily="sans-serif"
          fontWeight="bold"
        >
          Menos achismo,
        </text>
        <text
          x="16"
          y="60"
          fontSize="13"
          fill="var(--primary, #2A6F4E)"
          fontFamily="sans-serif"
          fontWeight="bold"
        >
          mais engenharia real.
        </text>
      </g>
    </svg>
  );
}

/* ── SLIDE 2: MOTOR BIOCLIMÁTICO (CARTA SOLAR 3D + NBR 15220) ── */
function IllustrationDiagnostico() {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 620 460"
      className="h-full w-full select-none"
      role="img"
      aria-label="Simulação solar 3D, topografia e seis zonas bioclimáticas NBR 15220"
    >
      <defs>
        <radialGradient id={`${uid}-sunGlow`} cx="68%" cy="22%" r="48%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-terrain`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary, #2A6F4E)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--primary, #2A6F4E)" stopOpacity="0.03" />
        </linearGradient>
      </defs>

      <circle cx="420" cy="105" r="170" fill={`url(#${uid}-sunGlow)`} />

      {/* Domo de Carta Solar Isométrica */}
      <g transform="translate(310, 255)">
        <ellipse
          rx="215"
          ry="96"
          fill={`url(#${uid}-terrain)`}
          stroke="var(--primary, #2A6F4E)"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        <ellipse
          rx="155"
          ry="68"
          fill="none"
          stroke="var(--primary, #2A6F4E)"
          strokeOpacity="0.3"
          strokeDasharray="4 5"
        />
        <line x1="-225" y1="0" x2="225" y2="0" stroke="var(--primary, #2A6F4E)" strokeOpacity="0.25" />
        <line x1="0" y1="-102" x2="0" y2="102" stroke="var(--primary, #2A6F4E)" strokeOpacity="0.25" />

        {/* Pontos Cardeais */}
        <text
          x="0"
          y="-110"
          textAnchor="middle"
          fontSize="11"
          fill="var(--primary, #2A6F4E)"
          fontFamily="monospace"
          fontWeight="bold"
        >
          N
        </text>
        <text
          x="238"
          y="4"
          textAnchor="middle"
          fontSize="11"
          fill="var(--muted-foreground, #64748B)"
          fontFamily="monospace"
          fontWeight="bold"
        >
          L
        </text>
        <text
          x="0"
          y="120"
          textAnchor="middle"
          fontSize="11"
          fill="var(--muted-foreground, #64748B)"
          fontFamily="monospace"
          fontWeight="bold"
        >
          S
        </text>
        <text
          x="-238"
          y="4"
          textAnchor="middle"
          fontSize="11"
          fill="#D97706"
          fontFamily="monospace"
          fontWeight="bold"
        >
          O
        </text>

        {/* Arcos de trajetória solar */}
        <path
          d="M -195 32 Q -10 -220 195 -28"
          fill="none"
          stroke="#D97706"
          strokeWidth="2"
          strokeDasharray="6 5"
          opacity="0.85"
        />
        <path
          d="M -165 -15 Q -20 -160 165 -55"
          fill="none"
          stroke="var(--primary, #2A6F4E)"
          strokeWidth="1.4"
          strokeDasharray="3 5"
          opacity="0.55"
        />

        {/* Sombra projetada suave */}
        <polygon
          points="-48,18 -135,52 -75,78 18,42"
          fill="var(--primary, #2A6F4E)"
          opacity="0.18"
        />

        {/* Edifício Bioclimático Central */}
        <g transform="translate(0, -18)">
          <polygon
            points="-52,32 -52,-58 0,-84 0,6"
            fill="var(--card, #ffffff)"
            stroke="var(--primary, #2A6F4E)"
            strokeWidth="1.6"
          />
          <polygon
            points="0,6 0,-84 62,-52 62,38"
            fill="var(--primary, #2A6F4E)"
            fillOpacity="0.14"
            stroke="var(--primary, #2A6F4E)"
            strokeWidth="1.6"
          />
          <polygon
            points="-52,-58 0,-84 62,-52 10,-26"
            fill="var(--primary, #2A6F4E)"
            fillOpacity="0.28"
            stroke="var(--primary, #2A6F4E)"
            strokeWidth="1.6"
          />
          {[-42, -24, -6, 12].map((yOffset, idx) => (
            <line
              key={idx}
              x1="8"
              y1={yOffset}
              x2="54"
              y2={yOffset + 23}
              stroke="#D97706"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Feixe de radiação solar direto */}
        <line
          x1="112"
          y1="-145"
          x2="28"
          y2="-45"
          stroke="#D97706"
          strokeWidth="2"
          strokeDasharray="4 4"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="16"
            to="0"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </line>

        {/* Sol na abóbada celeste */}
        <g transform="translate(112, -145)">
          <circle r="22" fill="#F59E0B" fillOpacity="0.22">
            <animate attributeName="r" values="18;25;18" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <circle r="12" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1.5" />
        </g>
      </g>

      {/* Card Topo Esquerdo: NBR 15220 */}
      <g transform="translate(34, 42)">
        <rect
          width="196"
          height="74"
          rx="12"
          fill="var(--card, #ffffff)"
          stroke="var(--border, #dce5df)"
          strokeWidth="1.5"
        />
        <circle cx="20" cy="22" r="4" fill="var(--primary, #2A6F4E)" />
        <text
          x="32"
          y="25"
          fontSize="9"
          fill="var(--primary, #2A6F4E)"
          fontFamily="monospace"
          fontWeight="bold"
          letterSpacing="1"
        >
          ABNT NBR 15220
        </text>
        <text
          x="16"
          y="47"
          fontSize="15.5"
          fill="var(--foreground, #1E293B)"
          fontFamily="monospace"
          fontWeight="bold"
        >
          6 Zonas Bioclimáticas
        </text>
        <text x="16" y="63" fontSize="9.5" fill="var(--muted-foreground, #64748B)" fontFamily="monospace">
          INMET · Topografia · Carta Solar
        </text>
      </g>

      {/* Card Inferior Direito: Telemetria Solar */}
      <g transform="translate(392, 348)">
        <rect
          width="192"
          height="72"
          rx="12"
          fill="var(--card, #ffffff)"
          stroke="#F59E0B"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        <text
          x="16"
          y="22"
          fontSize="8.5"
          fill="#D97706"
          fontFamily="monospace"
          fontWeight="bold"
          letterSpacing="1"
        >
          RADIAÇÃO & AZIMUTE
        </text>
        <text
          x="16"
          y="46"
          fontSize="18"
          fill="var(--foreground, #1E293B)"
          fontFamily="monospace"
          fontWeight="bold"
        >
          4,85 kWh/m²
        </text>
        <text x="16" y="61" fontSize="9.5" fill="var(--primary, #2A6F4E)" fontFamily="monospace" fontWeight="bold">
          ↑ Diretriz passiva calibrada
        </text>
      </g>
    </svg>
  );
}

/* ── SLIDE 3: WELLNESS MENSURÁVEL & BIOFILIA (2700K + AR + CONFORTO) ── */
function IllustrationWellnessPremium() {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 620 460"
      className="h-full w-full select-none"
      role="img"
      aria-label="Ambiente biofílico com iluminação quente 2700K, ventilação natural e sensores de saúde"
    >
      <defs>
        <radialGradient id={`${uid}-warmGlow`} cx="48%" cy="48%" r="55%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.16" />
          <stop offset="55%" stopColor="var(--primary, #2A6F4E)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--primary, #2A6F4E)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-daylight`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      <circle cx="310" cy="230" r="220" fill={`url(#${uid}-warmGlow)`} />

      {/* Corte Isométrico Claro e Acolhedor */}
      <g transform="translate(80, 52)">
        {/* Piso */}
        <polygon
          points="50,285 235,190 440,285 255,382"
          fill="var(--primary, #2A6F4E)"
          fillOpacity="0.12"
          stroke="var(--primary, #2A6F4E)"
          strokeOpacity="0.55"
          strokeWidth="1.6"
        />
        {/* Parede Esquerda */}
        <polygon
          points="50,80 235,0 235,190 50,285"
          fill="var(--card, #ffffff)"
          stroke="var(--primary, #2A6F4E)"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        {/* Sanca de Luz Indireta Quente (2700K) */}
        <line
          x1="58"
          y1="84"
          x2="228"
          y2="10"
          stroke="#D97706"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <polygon
          points="58,84 228,10 228,48 58,122"
          fill={`url(#${uid}-daylight)`}
          opacity="0.55"
        />

        {/* Parede Direita */}
        <polygon
          points="235,0 440,80 440,285 235,190"
          fill="var(--primary, #2A6F4E)"
          fillOpacity="0.07"
          stroke="var(--primary, #2A6F4E)"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />

        {/* Esquadria com Vidro Low-E */}
        <path
          d="M275 56 L395 104 L395 220 L275 166 Z"
          fill="#38BDF8"
          fillOpacity="0.2"
          stroke="#0284C7"
          strokeWidth="1.6"
        />
        <line
          x1="335"
          y1="80"
          x2="335"
          y2="193"
          stroke="#0284C7"
          strokeOpacity="0.45"
          strokeWidth="1.4"
        />

        {/* Feixe de Luz Natural */}
        <polygon
          points="275,166 395,220 285,315 170,255"
          fill={`url(#${uid}-daylight)`}
        />

        {/* Mesa Orgânica Curva */}
        <path
          d="M155 245 Q225 205 298 242 Q235 282 155 245 Z"
          fill="#D97706"
          fillOpacity="0.28"
          stroke="#B45309"
          strokeWidth="1.5"
        />
        <line x1="175" y1="252" x2="175" y2="288" stroke="#64748B" strokeWidth="1.8" />
        <line x1="276" y1="248" x2="276" y2="284" stroke="#64748B" strokeWidth="1.8" />

        {/* Vegetação Interna Biofílica */}
        <g transform="translate(105, 248)">
          <ellipse cx="0" cy="18" rx="14" ry="8" fill="#92400E" stroke="#78350F" strokeWidth="1.2" />
          <path
            d="M0 15 C-22 -12 -14 -45 4 -54 C20 -35 16 -8 0 15 Z"
            fill="var(--primary, #2A6F4E)"
            opacity="0.9"
          />
          <path
            d="M2 15 C12 -22 36 -34 52 -20 C38 2 18 16 2 15 Z"
            fill="var(--primary, #2A6F4E)"
            opacity="0.7"
          />
          <path
            d="M-2 15 C-28 0 -36 -22 -20 -34 C-6 -24 -2 -4 -2 15 Z"
            fill="var(--primary, #2A6F4E)"
            opacity="0.55"
          />
        </g>

        {/* Correntes de Ventilação Natural Cruzada */}
        <g
          fill="none"
          stroke="var(--primary, #2A6F4E)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="6 6"
        >
          <path d="M82 155 C135 130 175 165 228 142 C275 122 315 148 365 130">
            <animate
              attributeName="stroke-dashoffset"
              from="24"
              to="0"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </path>
          <path d="M98 182 C148 160 188 190 240 168 C288 148 325 170 375 155" opacity="0.6">
            <animate
              attributeName="stroke-dashoffset"
              from="24"
              to="0"
              dur="2.2s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      </g>

      {/* Card Topo Esquerdo: Qualidade do Ar & CO2 */}
      <g transform="translate(32, 54)">
        <rect
          width="178"
          height="74"
          rx="12"
          fill="var(--card, #ffffff)"
          stroke="var(--primary, #2A6F4E)"
          strokeOpacity="0.4"
          strokeWidth="1.5"
        />
        <circle cx="20" cy="22" r="4" fill="var(--primary, #2A6F4E)">
          <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <text
          x="32"
          y="25"
          fontSize="8.5"
          fill="var(--primary, #2A6F4E)"
          fontFamily="monospace"
          fontWeight="bold"
          letterSpacing="1"
        >
          RENOVAÇÃO DE AR
        </text>
        <text
          x="16"
          y="48"
          fontSize="19"
          fill="var(--foreground, #1E293B)"
          fontFamily="monospace"
          fontWeight="bold"
        >
          420 ppm
        </text>
        <text
          x="108"
          y="48"
          fontSize="9"
          fill="var(--primary, #2A6F4E)"
          fontFamily="monospace"
          fontWeight="bold"
        >
          CO₂ ideal
        </text>
        <text x="16" y="63" fontSize="8.5" fill="var(--muted-foreground, #64748B)" fontFamily="monospace">
          Padrão WELL / ASHRAE
        </text>
      </g>

      {/* Card Inferior Direito: Iluminação Circadiana & Conforto */}
      <g transform="translate(390, 345)">
        <rect
          width="194"
          height="74"
          rx="12"
          fill="var(--card, #ffffff)"
          stroke="#D97706"
          strokeOpacity="0.45"
          strokeWidth="1.5"
        />
        <text
          x="16"
          y="22"
          fontSize="8.5"
          fill="#D97706"
          fontFamily="monospace"
          fontWeight="bold"
          letterSpacing="1"
        >
          CONFORTO & LUZ QUENTE
        </text>
        <text
          x="16"
          y="46"
          fontSize="18"
          fill="var(--foreground, #1E293B)"
          fontFamily="monospace"
          fontWeight="bold"
        >
          23,5°C · 2700K
        </text>
        <text x="16" y="62" fontSize="9" fill="var(--muted-foreground, #64748B)" fontFamily="monospace">
          Saúde visual, térmica e acústica
        </text>
      </g>
    </svg>
  );
}

const SLIDES: Slide[] = [
  {
    id: "radar",
    tabLabel: "01 · Radar Vector-X",
    eyebrow: "Inteligência em Construção Sustentável",
    title: "Notícias e dados que",
    highlight: "movem a engenharia.",
    subtitle:
      "Acompanhe inovações em materiais, desempenho térmico, eficiência hídrica e certificações com curadoria técnica para projetar sem achismo.",
    ctaLabel: "Explorar Notícias",
    ctaHref: "/noticias",
    secondaryLabel: "Simulador 3D",
    secondaryHref: "/sobre",
    secondaryHash: "laboratorio-3d",
    metrics: [
      { label: "Foco", value: "Eficiência & Materiais" },
      { label: "Leitura", value: "Curadoria Técnica" },
      { label: "Aplicação", value: "Projeto & Obra" },
    ],
    Illustration: IllustrationNoticiasPremium,
  },
  {
    id: "diagnostico",
    tabLabel: "02 · Diagnóstico Solar",
    eyebrow: "Motor Bioclimático · ABNT NBR 15220",
    title: "Leia o clima e o sol",
    highlight: "antes do primeiro traço.",
    subtitle:
      "Cruze carta solar, dados meteorológicos INMET, topografia e as 6 zonas bioclimáticas brasileiras para acertar na orientação e na envoltória.",
    ctaLabel: "Abrir Diagnóstico Solar",
    ctaHref: "/wellness-analise-solar",
    secondaryLabel: "Testar Simulador 3D",
    secondaryHref: "/sobre",
    secondaryHash: "laboratorio-3d",
    metrics: [
      { label: "Norma Base", value: "NBR 15220 (6 Zonas)" },
      { label: "Clima", value: "Séries INMET + Sol" },
      { label: "Entrega", value: "Diretrizes Passivas" },
    ],
    Illustration: IllustrationDiagnostico,
  },
  {
    id: "wellness",
    tabLabel: "03 · Wellness & Pessoas",
    eyebrow: "Engenharia Centrada no Ocupante",
    title: "Bem-estar mensurável",
    highlight: "também é desempenho.",
    subtitle:
      "Luz natural, conforto térmico, acústica, qualidade do ar e biofilia transformados em critérios objetivos de saúde, permanência e valorização do imóvel.",
    ctaLabel: "Ver Certificações & Cases",
    ctaHref: "/referencias",
    secondaryLabel: "Laboratório 3D",
    secondaryHref: "/sobre",
    secondaryHash: "laboratorio-3d",
    metrics: [
      { label: "Referências", value: "WELL · LEED · AQUA" },
      { label: "Ambiência", value: "Luz Natural & 2700K" },
      { label: "Valor", value: "Saúde + Ativo" },
    ],
    Illustration: IllustrationWellnessPremium,
  },
];

const SLIDE_DURATION_MS = 5500;

export default function HeroCarousel() {
  const [active, setActive] = useState(0);

  // Troca automática contínua (reinicia o contador de 5.5s sempre que o slide muda)
  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % SLIDES.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(timer);
  }, [active]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Destaques da plataforma Vector-X by EcomindsX"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") setActive((prev) => (prev + 1) % SLIDES.length);
        if (e.key === "ArrowLeft")
          setActive((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
      }}
      className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_12px_40px_rgba(0,0,0,0.04)]"
    >
      {/* Fundo sutil de grid */}
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-35" />

      {/* Barra Superior de Navegação Rápida por Eixos */}
      <div className="relative z-20 flex items-center justify-between border-b border-border/70 bg-background/50 px-4 py-2.5 backdrop-blur-sm sm:px-8">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar sm:gap-2">
          {SLIDES.map((s, idx) => {
            const isCurrent = idx === active;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(idx)}
                className={`group relative rounded-full px-3 py-1 text-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] transition-all cursor-pointer whitespace-nowrap ${
                  isCurrent
                    ? "bg-primary/15 text-primary border border-primary/40"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {s.tabLabel}
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2 text-mono text-[9px] uppercase tracking-[0.2em] text-primary">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          <span>EM ROTAÇÃO</span>
        </div>
      </div>

      {/* Corpo Principal do Hero */}
      <div className="relative grid grid-cols-1 items-center gap-6 p-5 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:p-10">
        {/* Coluna Esquerda: Conteúdo Editorial + Métricas + CTAs */}
        <div className="relative z-10 flex flex-col justify-between">
          <div className="relative min-h-[250px] sm:min-h-[265px]">
            {SLIDES.map((slide, i) => {
              const isCurrent = i === active;
              return (
                <div
                  key={slide.id}
                  aria-hidden={!isCurrent}
                  className={`transition-all duration-500 ${
                    isCurrent
                      ? "opacity-100 translate-y-0 relative"
                      : "pointer-events-none absolute inset-0 opacity-0 translate-y-2"
                  }`}
                >
                  {/* Eyebrow */}
                  <div className="mb-3 flex items-center gap-2.5 text-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
                    <span className="h-px w-6 bg-primary" />
                    <span>{slide.eyebrow}</span>
                  </div>

                  {/* Título com destaque */}
                  <h2 className="text-display text-2xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-[42px]">
                    {slide.title}{" "}
                    <span className="text-primary block sm:inline">{slide.highlight}</span>
                  </h2>

                  {/* Subtítulo */}
                  <p className="mt-3.5 max-w-xl text-xs sm:text-base leading-relaxed text-muted-foreground">
                    {slide.subtitle}
                  </p>

                  {/* Mini-métricas do Slide */}
                  <div className="mt-5 grid grid-cols-3 gap-2 max-w-lg">
                    {slide.metrics.map((m) => (
                      <div
                        key={m.label}
                        className="rounded-xl border border-border/80 bg-background/60 px-2.5 py-2"
                      >
                        <span className="block text-mono text-[7px] sm:text-[8px] uppercase tracking-[0.15em] text-muted-foreground truncate">
                          {m.label}
                        </span>
                        <span className="mt-0.5 block text-mono text-[10px] sm:text-xs font-bold text-foreground truncate">
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Botões de Ação (CTAs) */}
                  <div className="mt-6 flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <Link
                      to={slide.ctaHref as any}
                      hash={slide.ctaHash}
                      tabIndex={isCurrent ? 0 : -1}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 sm:px-5 text-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
                    >
                      <span>{slide.ctaLabel}</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                    <Link
                      to={slide.secondaryHref as any}
                      hash={slide.secondaryHash}
                      tabIndex={isCurrent ? 0 : -1}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/5 px-4 py-2.5 text-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] text-primary hover:bg-primary/15 transition-colors"
                    >
                      <span>{slide.secondaryLabel}</span>
                      <span aria-hidden="true">↘</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barra de Progresso & Controles Inferiores */}
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-border/60 pt-4">
            <div className="flex flex-1 items-center gap-2 max-w-xs">
              {SLIDES.map((s, i) => {
                const isCurrent = i === active;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Ir para slide ${i + 1}: ${s.tabLabel}`}
                    className="group relative h-2 flex-1 overflow-hidden rounded-full bg-border/70 cursor-pointer"
                  >
                    <span
                      key={active}
                      className={`block h-full rounded-full ${
                        isCurrent ? "bg-primary" : "w-0 bg-primary/40 group-hover:w-full"
                      }`}
                      style={
                        isCurrent
                          ? {
                              width: "100%",
                              animation: `heroProgress ${SLIDE_DURATION_MS}ms linear forwards`,
                            }
                          : undefined
                      }
                    />
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setActive((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)
                }
                aria-label="Slide anterior"
                className="flex size-7 items-center justify-center rounded-full border border-border bg-background/70 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setActive((prev) => (prev + 1) % SLIDES.length)}
                aria-label="Próximo slide"
                className="flex size-7 items-center justify-center rounded-full border border-border bg-background/70 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Ilustração Leve e Integrada ao Tema Claro da Página */}
        <div className="relative z-10 h-[255px] sm:h-[340px] md:h-[365px] overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.05] via-background/80 to-primary/[0.02]">
          {SLIDES.map((slide, i) => {
            const isCurrent = i === active;
            return (
              <div
                key={slide.id}
                aria-hidden={!isCurrent}
                className={`absolute inset-0 transition-all duration-700 ${
                  isCurrent
                    ? "opacity-100 scale-100"
                    : "pointer-events-none opacity-0 scale-95"
                }`}
              >
                <slide.Illustration />
              </div>
            );
          })}
        </div>
      </div>

      {/* Keyframe inline para a barra de progresso */}
      <style>{`
        @keyframes heroProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </section>
  );
}