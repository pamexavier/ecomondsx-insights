import { useEffect, useState } from "react";
import type { ComponentType } from "react";

/* ────────────────────────────────────────────────────────────────────────
   HeroCarousel
   3 slides ilustrados (SVG próprio, sem imagens externas) que alternam
   automaticamente. Usa as mesmas variáveis de cor/estilo do resto do site
   (bg-background, text-primary, glow verde, grid sutil).
──────────────────────────────────────────────────────────────────────── */

interface Slide {
  eyebrow: string;
  title: string;
  subtitle: string;
  Illustration: ComponentType;
}

function IllustrationConstrucao() {
  return (
    <svg viewBox="0 0 600 500" className="h-full w-full">
      <defs>
        <linearGradient id="glowFacade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary, #00c67a)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--primary, #00c67a)" stopOpacity="0.08" />
        </linearGradient>
        <radialGradient id="glowCore" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="var(--primary, #00c67a)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--primary, #00c67a)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="300" cy="200" r="230" fill="url(#glowCore)" />

      {/* skyline de fundo */}
      <g opacity="0.18">
        <rect x="40" y="300" width="50" height="150" fill="var(--primary, #00c67a)" />
        <rect x="500" y="260" width="60" height="190" fill="var(--primary, #00c67a)" />
        <rect x="120" y="340" width="40" height="110" fill="var(--primary, #00c67a)" />
      </g>

      {/* edifício biofílico central */}
      <g>
        <rect x="200" y="150" width="200" height="300" rx="6" fill="url(#glowFacade)" stroke="var(--primary, #00c67a)" strokeOpacity="0.5" strokeWidth="1" />
        {Array.from({ length: 6 }).map((_, row) =>
          Array.from({ length: 3 }).map((_, col) => (
            <rect
              key={`${row}-${col}`}
              x={215 + col * 62}
              y={165 + row * 46}
              width="48"
              height="32"
              rx="3"
              fill="var(--primary, #00c67a)"
              opacity={0.12 + ((row + col) % 3) * 0.09}
            />
          ))
        )}

        {/* módulos verdes (jardins verticais) saindo da fachada */}
        <rect x="150" y="220" width="45" height="26" rx="4" fill="var(--primary, #00c67a)" opacity="0.5" />
        <rect x="150" y="300" width="45" height="26" rx="4" fill="var(--primary, #00c67a)" opacity="0.35" />
        <rect x="405" y="260" width="45" height="26" rx="4" fill="var(--primary, #00c67a)" opacity="0.4" />

        {/* painel solar no topo */}
        <g transform="translate(210,120)">
          <rect width="180" height="24" rx="3" fill="var(--primary, #00c67a)" opacity="0.6" />
          <line x1="30" y1="0" x2="30" y2="24" stroke="var(--background, #0a0f0c)" strokeWidth="1" opacity="0.5" />
          <line x1="90" y1="0" x2="90" y2="24" stroke="var(--background, #0a0f0c)" strokeWidth="1" opacity="0.5" />
          <line x1="150" y1="0" x2="150" y2="24" stroke="var(--background, #0a0f0c)" strokeWidth="1" opacity="0.5" />
        </g>
      </g>

      {/* linhas de dados / conexões holográficas */}
      <g stroke="var(--primary, #00c67a)" strokeWidth="1" opacity="0.55" strokeDasharray="4 4">
        <line x1="400" y1="200" x2="480" y2="150" />
        <line x1="400" y1="280" x2="490" y2="300" />
        <line x1="200" y1="240" x2="110" y2="190" />
      </g>

      {/* nós de dados pulsando */}
      {[
        [480, 150],
        [490, 300],
        [110, 190],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="4" fill="var(--primary, #00c67a)">
          <animate attributeName="opacity" values="1;0.3;1" dur="2.4s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* mini card de métrica flutuante */}
      <g transform="translate(410,135)">
        <rect width="140" height="60" rx="8" fill="var(--card, #0d1410)" stroke="var(--border, #1f2e27)" strokeWidth="1.5" />
        <text x="14" y="22" fontSize="10" fill="var(--primary, #00c67a)" fontFamily="monospace" letterSpacing="1">EFICIÊNCIA</text>
        <text x="14" y="42" fontSize="18" fill="var(--foreground, #f5f5f5)" fontFamily="monospace" fontWeight="bold">+42%</text>
      </g>
    </svg>
  );
}

function IllustrationTecnologia() {
  return (
    <svg viewBox="0 0 600 500" className="h-full w-full">
      <defs>
        <radialGradient id="glowCore2" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="var(--primary, #00c67a)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--primary, #00c67a)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="300" cy="230" r="220" fill="url(#glowCore2)" />

      {/* grid isométrico sutil de plantas/blueprint */}
      <g opacity="0.2" stroke="var(--primary, #00c67a)" strokeWidth="1">
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`h${i}`} x1="120" y1={140 + i * 30} x2="480" y2={140 + i * 30} />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`v${i}`} x1={120 + i * 51} y1="140" x2={120 + i * 51} y2="350" />
        ))}
      </g>

      {/* núcleo de circuito central */}
      <g transform="translate(300,245)">
        <circle r="46" fill="none" stroke="var(--primary, #00c67a)" strokeWidth="1.5" opacity="0.8" />
        <circle r="46" fill="var(--primary, #00c67a)" opacity="0.1" />
        <circle r="10" fill="var(--primary, #00c67a)" />
        {[0, 60, 120, 180, 240, 300].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const x2 = Math.cos(rad) * 46;
          const y2 = Math.sin(rad) * 46;
          const x3 = Math.cos(rad) * 90;
          const y3 = Math.sin(rad) * 90;
          return (
            <g key={i}>
              <line x1={x2} y1={y2} x2={x3} y2={y3} stroke="var(--primary, #00c67a)" strokeWidth="1" opacity="0.6" strokeDasharray="3 3" />
              <circle cx={x3} cy={y3} r="4" fill="var(--primary, #00c67a)" opacity="0.85">
                <animate attributeName="r" values="4;6;4" dur="2.6s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}
      </g>

      {/* barras de gráfico de performance */}
      <g transform="translate(160,340)">
        {[26, 40, 18, 52, 34].map((h, i) => (
          <rect key={i} x={i * 22} y={60 - h} width="14" height={h} rx="2" fill="var(--primary, #00c67a)" opacity={0.35 + i * 0.12} />
        ))}
      </g>

      {/* card lateral de dados */}
      <g transform="translate(365,310)">
        <rect width="160" height="72" rx="8" fill="var(--card, #0d1410)" stroke="var(--border, #1f2e27)" strokeWidth="1.5" />
        <text x="14" y="24" fontSize="10" fill="var(--primary, #00c67a)" fontFamily="monospace" letterSpacing="1">CUSTO/M²</text>
        <text x="14" y="46" fontSize="18" fill="var(--foreground, #f5f5f5)" fontFamily="monospace" fontWeight="bold">-18%</text>
        <text x="14" y="60" fontSize="9" fill="var(--muted-foreground, #8a938e)" fontFamily="monospace">vs. método tradicional</text>
      </g>
    </svg>
  );
}

function IllustrationNoticias() {
  const articles = [
    { y: 120, width: 300, label: "MATERIAIS", title: "Tecnologia que muda o canteiro" },
    { y: 210, width: 340, label: "CIDADES", title: "Eficiência começa no projeto" },
    { y: 300, width: 275, label: "BEM-ESTAR", title: "Construir também é cuidar" },
  ];

  return (
    <svg viewBox="0 0 600 500" className="h-full w-full" role="img" aria-label="Feed de notícias sobre construção sustentável">
      <defs>
        <radialGradient id="newsGlow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="var(--primary, #00c67a)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--primary, #00c67a)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="300" cy="245" r="235" fill="url(#newsGlow)" />
      <g transform="translate(120,65)">
        <rect width="360" height="370" rx="16" fill="var(--card, #0d1410)" stroke="var(--border, #1f2e27)" strokeWidth="1.5" />
        <rect x="22" y="22" width="36" height="36" rx="9" fill="var(--primary, #00c67a)" opacity="0.18" />
        <path d="M33 33h14M33 39h14M33 45h9" stroke="var(--primary, #00c67a)" strokeWidth="2" strokeLinecap="round" />
        <text x="70" y="39" fontSize="11" fill="var(--foreground, #f5f5f5)" fontFamily="monospace" fontWeight="bold" letterSpacing="1">ECOMINDSX NEWS</text>
        <text x="70" y="53" fontSize="8" fill="var(--muted-foreground, #8a938e)" fontFamily="monospace">CONSTRUÇÃO EM TRANSFORMAÇÃO</text>
        {articles.map((article, i) => (
          <g key={article.label} transform={`translate(22, ${article.y})`}>
            <rect width="316" height="72" rx="9" fill="var(--primary, #00c67a)" opacity={0.05 + i * 0.025} />
            <rect x="12" y="12" width="48" height="48" rx="6" fill="var(--primary, #00c67a)" opacity={0.15 + i * 0.08} />
            <path d={`M21 48l10-${8 + i * 2} 9 7 9-${14 + i * 2}`} fill="none" stroke="var(--primary, #00c67a)" strokeWidth="1.5" opacity="0.9" />
            <text x="72" y="27" fontSize="8" fill="var(--primary, #00c67a)" fontFamily="monospace" letterSpacing="1">{article.label}</text>
            <text x="72" y="48" fontSize="12" fill="var(--foreground, #f5f5f5)" fontFamily="sans-serif" fontWeight="bold">{article.title}</text>
            <rect x="72" y="55" width={article.width - 120} height="3" rx="2" fill="var(--muted-foreground, #8a938e)" opacity="0.35" />
          </g>
        ))}
      </g>
      <circle cx="485" cy="100" r="5" fill="var(--primary, #00c67a)"><animate attributeName="opacity" values="1;.25;1" dur="2s" repeatCount="indefinite" /></circle>
    </svg>
  );
}

function IllustrationNoticiasPremium() {
  return (
    <svg viewBox="0 0 600 500" className="h-full w-full" role="img" aria-label="Central de notícias e tendências da construção sustentável">
      <defs>
        <radialGradient id="newsPremiumGlow" cx="48%" cy="46%" r="62%">
          <stop offset="0%" stopColor="var(--primary, #00c67a)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--primary, #00c67a)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="newsChart" x1="0" y1="1" x2="1" y2="0"><stop stopColor="var(--primary, #00c67a)" stopOpacity="0.04" /><stop offset="1" stopColor="var(--primary, #00c67a)" stopOpacity="0.28" /></linearGradient>
      </defs>
      <circle cx="295" cy="240" r="235" fill="url(#newsPremiumGlow)" />

      {/* papel de fundo e manchete principal */}
      <g transform="translate(103,70) rotate(-4 170 170)">
        <rect width="340" height="342" rx="16" fill="var(--card, #0d1410)" stroke="var(--border, #1f2e27)" strokeWidth="1.5" />
        <rect x="22" y="23" width="52" height="21" rx="10" fill="var(--primary, #00c67a)" fillOpacity="0.16" />
        <text x="34" y="38" fontSize="9" fill="var(--primary, #00c67a)" fontFamily="monospace" fontWeight="bold" letterSpacing="1">EM DESTAQUE</text>
        <text x="22" y="82" fontSize="24" fill="var(--foreground, #f5f5f5)" fontFamily="sans-serif" fontWeight="bold">O futuro da construção</text>
        <text x="22" y="110" fontSize="24" fill="var(--foreground, #f5f5f5)" fontFamily="sans-serif" fontWeight="bold">é mais inteligente.</text>
        <rect x="22" y="128" width="230" height="4" rx="2" fill="var(--muted-foreground, #8a938e)" fillOpacity="0.45" />
        <rect x="22" y="139" width="194" height="4" rx="2" fill="var(--muted-foreground, #8a938e)" fillOpacity="0.24" />

        {/* imagem abstrata de arquitetura + dados */}
        <g transform="translate(22,170)">
          <rect width="296" height="112" rx="10" fill="url(#newsChart)" stroke="var(--primary, #00c67a)" strokeOpacity="0.25" />
          <path d="M0 93L43 69 81 80 122 43 166 59 213 19 296 48V112H0z" fill="var(--primary, #00c67a)" fillOpacity="0.15" />
          <path d="M0 93L43 69 81 80 122 43 166 59 213 19 296 48" fill="none" stroke="var(--primary, #00c67a)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {[43, 122, 213].map((x, i) => <circle key={x} cx={x} cy={[69, 43, 19][i]} r="4" fill="var(--primary, #00c67a)"><animate attributeName="r" values="3;5;3" dur="2.4s" begin={`${i * 0.45}s`} repeatCount="indefinite" /></circle>)}
          <g fill="none" stroke="var(--primary, #00c67a)" strokeOpacity="0.42"><path d="M18 105V78l17-10v37M47 105V57l21-12v60M76 105V68l23-13v50" /><path d="M204 105V43l25-14v76M234 105V56l21-12v61M260 105V45l18-10v70" /></g>
        </g>
        <text x="22" y="312" fontSize="9" fill="var(--muted-foreground, #8a938e)" fontFamily="monospace">TECNOLOGIA · EFICIÊNCIA · SAÚDE</text>
      </g>

      {/* cards flutuantes: sensação de feed atualizado */}
      <g transform="translate(370,105)">
        <rect width="162" height="76" rx="11" fill="var(--card, #0d1410)" stroke="var(--primary, #00c67a)" strokeOpacity="0.35" />
        <circle cx="20" cy="20" r="4" fill="var(--primary, #00c67a)"><animate attributeName="opacity" values="1;.25;1" dur="1.6s" repeatCount="indefinite" /></circle>
        <text x="32" y="24" fontSize="9" fill="var(--primary, #00c67a)" fontFamily="monospace" letterSpacing="1">ATUALIZADO AGORA</text>
        <text x="14" y="48" fontSize="12" fill="var(--foreground, #f5f5f5)" fontFamily="sans-serif" fontWeight="bold">Tendências que</text>
        <text x="14" y="64" fontSize="12" fill="var(--foreground, #f5f5f5)" fontFamily="sans-serif" fontWeight="bold">merecem atenção</text>
      </g>
      <g transform="translate(42,345)">
        <rect width="168" height="65" rx="11" fill="var(--card, #0d1410)" stroke="var(--border, #1f2e27)" />
        <text x="14" y="22" fontSize="9" fill="var(--primary, #00c67a)" fontFamily="monospace" letterSpacing="1">RADAR ECOMINDSX</text>
        <text x="14" y="46" fontSize="18" fill="var(--foreground, #f5f5f5)" fontFamily="monospace" fontWeight="bold">+128</text>
        <text x="66" y="46" fontSize="9" fill="var(--muted-foreground, #8a938e)" fontFamily="monospace">insights publicados</text>
      </g>
    </svg>
  );
}

function IllustrationDiagnostico() {
  return (
    <svg viewBox="0 0 600 500" className="h-full w-full" role="img" aria-label="Diagnóstico bioclimático com mapa, sol e terreno">
      <defs>
        <radialGradient id="solarGlow" cx="68%" cy="28%" r="48%"><stop offset="0%" stopColor="#fbbf24" stopOpacity="0.28" /><stop offset="100%" stopColor="#fbbf24" stopOpacity="0" /></radialGradient>
        <linearGradient id="terrainFill" x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--primary, #00c67a)" stopOpacity="0.3" /><stop offset="1" stopColor="var(--primary, #00c67a)" stopOpacity="0.04" /></linearGradient>
      </defs>
      <circle cx="395" cy="145" r="165" fill="url(#solarGlow)" />
      <g stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" opacity="0.85"><circle cx="405" cy="135" r="30" fill="#fbbf24" fillOpacity="0.12" />{Array.from({ length: 8 }).map((_, i) => { const a = (i * Math.PI) / 4; return <line key={i} x1={405 + Math.cos(a) * 43} y1={135 + Math.sin(a) * 43} x2={405 + Math.cos(a) * 56} y2={135 + Math.sin(a) * 56} />; })}</g>
      <g transform="translate(95,95)">
        <path d="M130 12l51 24 16 48-31 39 3 61-67 40-49-22-22-62 25-46-5-49 38-33z" fill="var(--card, #0d1410)" stroke="var(--primary, #00c67a)" strokeWidth="1.5" />
        <path d="M130 12l51 24-28 28-34-10-30 24-38-33 38-33z" fill="var(--primary, #00c67a)" opacity="0.45" /><path d="M31 140l58-62 40 34 37 11-3 61-67 40z" fill="var(--primary, #00c67a)" opacity="0.25" /><path d="M166 123l31-39-16-48-28 28-24 48z" fill="#fbbf24" opacity="0.45" />
        <circle cx="119" cy="112" r="5" fill="#fbbf24"><animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" /></circle>
        <text x="67" y="258" fontSize="10" fill="var(--primary, #00c67a)" fontFamily="monospace" letterSpacing="1">ZONAS BIOCLIMÁTICAS</text>
      </g>
      <g transform="translate(245,286)">
        <path d="M-100 84L58 5 200 84H-100z" fill="url(#terrainFill)" stroke="var(--primary, #00c67a)" strokeWidth="1.5" />
        <path d="M-58 84L58 27 151 84M-12 84L58 49 113 84M58 5v79" fill="none" stroke="var(--primary, #00c67a)" strokeWidth="1" opacity="0.5" />
        <path d="M58 5l38 20v34L58 40z" fill="var(--primary, #00c67a)" opacity="0.7" />
        <path d="M405 135L303 286" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.8" />
      </g>
      <g transform="translate(365,345)"><rect width="150" height="58" rx="8" fill="var(--card, #0d1410)" stroke="var(--border, #1f2e27)" /><text x="14" y="22" fontSize="9" fill="var(--primary, #00c67a)" fontFamily="monospace" letterSpacing="1">ORIENTAÇÃO SOLAR</text><text x="14" y="43" fontSize="17" fill="var(--foreground, #f5f5f5)" fontFamily="monospace" fontWeight="bold">34° NE</text></g>
    </svg>
  );
}

function IllustrationWellnessPremium() {
  return (
    <svg viewBox="0 0 600 500" className="h-full w-full" role="img" aria-label="Ambiente saudável com luz, ventilação, vegetação e indicadores de conforto">
      <defs>
        <linearGradient id="wellnessRoom" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--card, #0d1410)" />
          <stop offset="1" stopColor="var(--primary, #00c67a)" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="sunBeam" x1="0" y1="0" x2="0.8" y2="1">
          <stop stopColor="#fbbf24" stopOpacity="0.3" />
          <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="roomGlow" cx="55%" cy="42%" r="65%">
          <stop stopColor="var(--primary, #00c67a)" stopOpacity="0.18" />
          <stop offset="1" stopColor="var(--primary, #00c67a)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="305" cy="245" r="235" fill="url(#roomGlow)" />

      {/* corte isométrico do ambiente */}
      <g transform="translate(72,72)">
        <path d="M55 290L245 190 450 290 260 392z" fill="url(#wellnessRoom)" stroke="var(--primary, #00c67a)" strokeOpacity="0.5" strokeWidth="1.5" />
        <path d="M55 75L245 0v190L55 290z" fill="var(--card, #0d1410)" stroke="var(--primary, #00c67a)" strokeOpacity="0.5" strokeWidth="1.5" />
        <path d="M245 0L450 75v215L245 190z" fill="var(--primary, #00c67a)" fillOpacity="0.09" stroke="var(--primary, #00c67a)" strokeOpacity="0.5" strokeWidth="1.5" />

        {/* janela e a luz natural atravessando o espaço */}
        <path d="M282 48l115 42v123l-115-47z" fill="#7dd3fc" fillOpacity="0.18" stroke="#7dd3fc" strokeOpacity="0.7" strokeWidth="1.5" />
        <path d="M321 63v119M359 77v120M282 88l115 44M282 128l115 45" stroke="#7dd3fc" strokeOpacity="0.4" strokeWidth="1" />
        <path d="M396 103L245 190 192 292 397 213z" fill="url(#sunBeam)" />
        <g stroke="#fbbf24" strokeLinecap="round" opacity="0.9"><circle cx="419" cy="35" r="15" fill="#fbbf24" fillOpacity="0.15" />{[0, 45, 90, 135, 180, 225, 270, 315].map((d) => { const r = (d * Math.PI) / 180; return <line key={d} x1={419 + Math.cos(r) * 23} y1={35 + Math.sin(r) * 23} x2={419 + Math.cos(r) * 31} y2={35 + Math.sin(r) * 31} />; })}</g>

        {/* mesa de trabalho */}
        <path d="M142 241l83-43 95 42-84 44z" fill="var(--primary, #00c67a)" fillOpacity="0.25" stroke="var(--primary, #00c67a)" strokeOpacity="0.75" />
        <path d="M151 246v42M309 244v42M236 284v42" stroke="var(--primary, #00c67a)" strokeOpacity="0.65" strokeWidth="2" />
        <path d="M199 225l28-14 35 15-28 15z" fill="#7dd3fc" fillOpacity="0.35" stroke="#7dd3fc" strokeOpacity="0.7" />

        {/* vegetação interna */}
        <g fill="var(--primary, #00c67a)"><path d="M96 259c-35-31-22-73 7-84 23 22 17 58-7 84z" opacity="0.8" /><path d="M104 252c1-42 31-58 55-43-6 29-25 45-55 43z" opacity="0.58" /><path d="M115 275v-70" stroke="var(--primary, #00c67a)" strokeWidth="3" /><path d="M100 275h31l-5 15h-22z" fill="var(--card, #0d1410)" stroke="var(--primary, #00c67a)" strokeOpacity="0.7" /></g>

        {/* fluxo de ventilação */}
        <g fill="none" stroke="var(--primary, #00c67a)" strokeWidth="2" strokeLinecap="round" opacity="0.78">
          <path d="M72 145c32-22 52-16 66 1 13 17 28 18 49 3"><animate attributeName="stroke-dashoffset" from="0" to="-28" dur="2.4s" repeatCount="indefinite" /></path>
          <path d="M82 161c28-18 46-12 58 3 13 14 27 14 42 3" strokeDasharray="5 6"><animate attributeName="stroke-dashoffset" from="0" to="-22" dur="2s" repeatCount="indefinite" /></path>
        </g>
      </g>

      {/* indicadores do ambiente */}
      <g transform="translate(30,112)">
        <rect width="126" height="69" rx="10" fill="var(--card, #0d1410)" stroke="var(--border, #1f2e27)" strokeWidth="1.2" />
        <circle cx="18" cy="20" r="4" fill="var(--primary, #00c67a)"><animate attributeName="opacity" values="1;.35;1" dur="2s" repeatCount="indefinite" /></circle>
        <text x="30" y="24" fontSize="9" fill="var(--primary, #00c67a)" fontFamily="monospace" letterSpacing="1">QUALIDADE DO AR</text>
        <text x="14" y="49" fontSize="19" fill="var(--foreground, #f5f5f5)" fontFamily="monospace" fontWeight="bold">98</text>
        <text x="48" y="49" fontSize="9" fill="var(--muted-foreground, #8a938e)" fontFamily="monospace">índice saudável</text>
      </g>
      <g transform="translate(400,366)">
        <rect width="145" height="57" rx="10" fill="var(--card, #0d1410)" stroke="var(--border, #1f2e27)" strokeWidth="1.2" />
        <text x="14" y="21" fontSize="9" fill="var(--primary, #00c67a)" fontFamily="monospace" letterSpacing="1">CONFORTO TÉRMICO</text>
        <text x="14" y="42" fontSize="17" fill="var(--foreground, #f5f5f5)" fontFamily="monospace" fontWeight="bold">23,4°</text>
        <circle cx="122" cy="34" r="11" fill="none" stroke="var(--primary, #00c67a)" strokeWidth="2" opacity="0.7" />
      </g>
    </svg>
  );
}

function IllustrationWellness() {
  return (
    <svg viewBox="0 0 600 500" className="h-full w-full">
      <defs>
        <radialGradient id="glowCore3" cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="var(--primary, #00c67a)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--primary, #00c67a)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="300" cy="260" r="220" fill="url(#glowCore3)" />

      {/* terraço */}
      <rect x="90" y="360" width="420" height="14" fill="var(--primary, #00c67a)" opacity="0.25" />

      {/* folhagem estilizada (biofilia) */}
      <g opacity="0.55" fill="var(--primary, #00c67a)">
        <ellipse cx="140" cy="330" rx="26" ry="40" />
        <ellipse cx="120" cy="350" rx="20" ry="30" opacity="0.7" />
        <ellipse cx="470" cy="320" rx="30" ry="46" />
        <ellipse cx="495" cy="345" rx="18" ry="26" opacity="0.7" />
      </g>

      {/* figura serena, silhueta simples */}
      <g transform="translate(300,300)" stroke="var(--primary, #00c67a)" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <circle cx="0" cy="-58" r="14" fill="var(--primary, #00c67a)" stroke="none" />
        <path d="M -26 0 C -26 -24 26 -24 26 0 L 30 40 L -30 40 Z" fill="var(--primary, #00c67a)" opacity="0.9" stroke="none" />
        <path d="M -26 4 L -46 26" />
        <path d="M 26 4 L 46 26" />
      </g>

      {/* ondas de bem-estar / respiração */}
      <g stroke="var(--primary, #00c67a)" strokeWidth="1" fill="none" opacity="0.5">
        <circle cx="300" cy="255" r="70">
          <animate attributeName="r" values="60;90;60" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx="300" cy="255" r="95">
          <animate attributeName="r" values="80;110;80" dur="4s" begin="0.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.35;0;0.35" dur="4s" begin="0.6s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* card de métrica */}
      <g transform="translate(60,150)">
        <rect width="160" height="72" rx="8" fill="var(--card, #0d1410)" stroke="var(--border, #1f2e27)" strokeWidth="1.5" />
        <text x="14" y="24" fontSize="10" fill="var(--primary, #00c67a)" fontFamily="monospace" letterSpacing="1">QUALIDADE DO AR</text>
        <text x="14" y="46" fontSize="18" fill="var(--foreground, #f5f5f5)" fontFamily="monospace" fontWeight="bold">+35%</text>
        <text x="14" y="60" fontSize="9" fill="var(--muted-foreground, #8a938e)" fontFamily="monospace">índice de conforto</text>
      </g>
    </svg>
  );
}

const SLIDES: Slide[] = [
  {
    eyebrow: "Radar EcomindsX",
    title: "Notícias que movem a construção",
    subtitle: "Encontre atualizações sobre tecnologia, eficiência e saúde para projetar e construir melhor.",
    Illustration: IllustrationNoticiasPremium,
  },
  {
    eyebrow: "Vector-X",
    title: "Entenda o clima antes de projetar",
    subtitle: "Obtenha um diagnóstico bioclimático: terreno, posição solar e zoneamento para decisões mais precisas.",
    Illustration: IllustrationDiagnostico,
  },
  {
    eyebrow: "Wellness",
    title: "Espaços saudáveis para as pessoas",
    subtitle: "Use dados de conforto, qualidade do ar e bem-estar para criar ambientes que cuidam de quem os vive.",
    Illustration: IllustrationWellnessPremium,
  },
];

export default function HeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-40" />

      <div className="relative grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] items-center gap-6 p-6 sm:p-10">
        {/* Texto */}
        <div className="relative z-10 min-h-[220px] sm:min-h-[260px]">
          {SLIDES.map((slide, i) => (
            <div
              key={i}
              className={`transition-opacity duration-700 ${
                i === active ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"
              }`}
            >
              <div className="flex items-center gap-2 text-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-4">
                <span className="h-px w-6 bg-primary" /> {slide.eyebrow}
              </div>
              <h2 className="text-display text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.15] text-primary">
                {slide.title}
              </h2>
              <p className="text-mono mt-4 max-w-md text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {slide.subtitle}
              </p>
            </div>
          ))}

          {/* Indicadores */}
          <div className="mt-8 flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Ver slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active ? "w-8 bg-primary" : "w-1.5 bg-border hover:bg-primary/40"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Ilustração */}
        <div className="relative z-10 h-[260px] sm:h-[320px] md:h-[380px] lg:h-[420px]">
          {SLIDES.map((slide, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-700 ${
                i === active ? "opacity-100" : "opacity-0"
              }`}
            >
              <slide.Illustration />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}