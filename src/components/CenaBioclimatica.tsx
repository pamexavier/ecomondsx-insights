import { useId } from "react";
import type { EnvoltoriaKey, OrientacaoKey, TipoComodoKey } from "@/data/wellness";

/* ───────── helpers ───────── */
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rgb = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: string, b: string, t: number) => {
  const A = rgb(a);
  const B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(",")})`;
};

// [hora, topo do céu, horizonte]
const CEU: [number, string, string][] = [
  [5, "#1e1b4b", "#fb923c"],
  [7, "#7dd3fc", "#fde68a"],
  [12, "#38bdf8", "#e0f2fe"],
  [17, "#60a5fa", "#fed7aa"],
  [19, "#6d28d9", "#fb7185"],
  [21, "#0b1026", "#1e1b4b"],
  [27, "#0b1026", "#1e1b4b"],
  [29, "#1e1b4b", "#fb923c"],
];

function corDoCeu(hora: number) {
  const h = hora < 5 ? hora + 24 : hora;
  for (let i = 0; i < CEU.length - 1; i++) {
    const [h0, t0, b0] = CEU[i];
    const [h1, t1, b1] = CEU[i + 1];
    if (h >= h0 && h <= h1) {
      const k = (h - h0) / (h1 - h0);
      return { topo: mix(t0, t1, k), base: mix(b0, b1, k) };
    }
  }
  return { topo: "#0b1026", base: "#1e1b4b" };
}

const ESPESSURA: Record<EnvoltoriaKey, number> = { concreto: 22, ceramica: 32, termica: 42 };

type Props = {
  hora: number; // 0–24
  orientacao: OrientacaoKey;
  tipoComodo: TipoComodoKey;
  corParede: string; // hex da tinta externa
  envoltoria: EnvoltoriaKey;
  percentualVidro: number; // 0–80
  reducaoSolarBrise: number; // 0–95
  intensidadeSolar: number; // 0–1 (ex.: irradiância / 700)
  calor: number; // 0–1 (ex.: (densidade W/m² − 40) / 120)
};

const HX0 = 292;
const HX1 = 608;
const CY = 262;
const FY = 430;

export default function CenaBioclimatica({
  hora,
  orientacao,
  tipoComodo,
  corParede,
  envoltoria,
  percentualVidro,
  reducaoSolarBrise,
  intensidadeSolar,
  calor,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const id = (n: string) => `${uid}-${n}`;
  const ceu = corDoCeu(hora);
  const estrelas = hora >= 18.5 ? clamp((hora - 18.5) / 2) : hora <= 5.5 ? clamp((5.5 - hora) / 2) : 0;

  /* sol e lua */
  const dia = hora >= 6 && hora <= 18;
  const st = clamp((hora - 6) / 12);
  const sunX = 90 + st * 720;
  const sunY = 395 - Math.sin(st * Math.PI) * 320;
  const nh = hora >= 18 ? hora - 18 : hora + 6;
  const mt = clamp(nh / 12);
  const moonX = 90 + mt * 720;
  const moonY = 395 - Math.sin(mt * Math.PI) * 300;
  const corSol = mix("#fb923c", "#fde047", Math.sin(st * Math.PI));

  /* casa */
  const t = ESPESSURA[envoltoria];
  const fachadaEsq = orientacao === "L" ? true : orientacao === "O" ? false : sunX < 450;
  const wx = fachadaEsq ? HX0 - t : HX1 + t; // face externa
  const inX = fachadaEsq ? HX0 : HX1;
  const outroX = fachadaEsq ? HX1 : HX0;
  const dir = fachadaEsq ? -1 : 1;
  const wh = clamp(34 + percentualVidro * 1.7, 34, 140);
  const y0 = CY + 10 + (148 - wh) / 2;

  /* luz */
  const forcaFora = dia ? intensidadeSolar : 0;
  const forcaDentro = forcaFora * (1 - (reducaoSolarBrise / 100) * 0.75);
  const ox = fachadaEsq ? Math.min(sunX, wx - 40) : Math.max(sunX, wx + 40);
  const oy = sunY;
  const raio = (ye: number) => {
    const s = (ye - oy) / (wx - ox);
    const yi = Math.min(FY, ye + s * (inX - wx));
    const xFloor = wx + (FY - ye) / s;
    const xe = fachadaEsq ? Math.min(xFloor, outroX) : Math.max(xFloor, outroX);
    return { xi: inX, yi, xe, ye: Math.min(FY, ye + s * (xe - wx)) };
  };
  const raioOk = forcaDentro > 0.02 && oy < y0 - 5;
  const r1 = raio(y0);
  const r2 = raio(y0 + wh);

  /* conforto */
  const verdict = calor < 0.25 ? "Fresquinho" : calor < 0.5 ? "Confortável" : calor < 0.75 ? "Esquentando" : "Um forno";
  const paredeInt = mix("#e8f1ee", "#fcd9b6", calor);
  const personX = fachadaEsq ? 540 : 360;
  const mouth =
    calor < 0.4
      ? `M${personX - 6} ${FY - 56} Q${personX} ${FY - 49} ${personX + 6} ${FY - 56}`
      : calor < 0.7
        ? `M${personX - 5} ${FY - 53} L${personX + 5} ${FY - 53}`
        : `M${personX - 6} ${FY - 50} Q${personX} ${FY - 58} ${personX + 6} ${FY - 50}`;
  const plantaX = fachadaEsq ? HX1 - 40 : HX0 + 40;
  const acX = fachadaEsq ? HX1 - 92 : HX0 + 16;

  return (
    <div className="overflow-hidden rounded-3xl bg-slate-900 shadow-lg">
      <svg viewBox="0 0 900 520" className="mx-auto block h-auto max-h-[34vh] w-full lg:max-h-none" role="img"
        aria-label={`Casa ilustrada às ${Math.floor(hora)}h, fachada ${orientacao}. Ambiente: ${verdict}.`}>
        <style>{`
          .cb-sw{transform-box:fill-box;transform-origin:50% 100%;animation:cb-sw 5s ease-in-out infinite alternate}
          @keyframes cb-sw{to{transform:rotate(2.5deg)}}
          .cb-dr{animation:cb-dr 40s ease-in-out infinite alternate}
          @keyframes cb-dr{to{transform:translateX(60px)}}
          .cb-rot{transform-box:fill-box;transform-origin:center;animation:cb-rot 70s linear infinite}
          @keyframes cb-rot{to{transform:rotate(360deg)}}
          .cb-up{animation:cb-up 2.6s ease-in infinite}
          @keyframes cb-up{0%{transform:translateY(8px);opacity:0}30%{opacity:1}100%{transform:translateY(-22px);opacity:0}}
          .cb-sd{animation:cb-sd 2s ease-in infinite}
          @keyframes cb-sd{0%{transform:translateY(0);opacity:0}20%{opacity:.9}100%{transform:translateY(16px);opacity:0}}
          @media (prefers-reduced-motion:reduce){.cb-sw,.cb-dr,.cb-rot,.cb-up,.cb-sd{animation:none}}
        `}</style>
        <defs>
          <linearGradient id={id("ceu")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={ceu.topo} />
            <stop offset="1" stopColor={ceu.base} />
          </linearGradient>
          <radialGradient id={id("glow")}>
            <stop offset="0" stopColor={corSol} stopOpacity="0.9" />
            <stop offset="1" stopColor={corSol} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id("calor")} cx="0.5" cy="0" r="1">
            <stop offset="0" stopColor="#fb923c" stopOpacity={calor * 0.7} />
            <stop offset="1" stopColor="#fb923c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id("vidro")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e0f2fe" stopOpacity="0.9" />
            <stop offset="1" stopColor="#7dd3fc" stopOpacity="0.55" />
          </linearGradient>
          <pattern id={id("eps")} width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#fde68a" />
            <circle cx="2" cy="2" r="1.3" fill="#f59e0b" opacity=".6" />
            <circle cx="6" cy="6" r="1.3" fill="#f59e0b" opacity=".6" />
          </pattern>
          <filter id={id("b4")} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" /></filter>
          <filter id={id("b10")} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10" /></filter>
          <clipPath id={id("sala")}><rect x={HX0} y={CY} width={HX1 - HX0} height={FY - CY} rx="12" /></clipPath>
        </defs>

        {/* céu */}
        <rect width="900" height="520" fill={`url(#${id("ceu")})`} />
        <g opacity={estrelas}>
          {[[80, 50], [190, 110], [300, 40], [430, 90], [560, 36], [680, 100], [790, 58], [850, 150], [140, 190], [610, 170]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.2 : 1.4} fill="#fff" />
          ))}
        </g>

        {dia ? (
          <g transform={`translate(${sunX},${sunY})`}>
            <circle r={90 + intensidadeSolar * 30} fill={`url(#${id("glow")})`} />
            <g className="cb-rot">
              {Array.from({ length: 14 }, (_, i) => (
                <line key={i} x1="0" y1="-38" x2="0" y2="-52" stroke={corSol} strokeWidth="4" strokeLinecap="round"
                  transform={`rotate(${(i * 360) / 14})`} opacity="0.85" />
              ))}
            </g>
            <circle r="27" fill={corSol} />
          </g>
        ) : (
          <g transform={`translate(${moonX},${moonY})`}>
            <circle r="60" fill="#e2e8f0" opacity="0.12" />
            <circle r="22" fill="#f1f5f9" />
            <circle cx="-7" cy="-4" r="4" fill="#cbd5e1" opacity=".7" />
            <circle cx="7" cy="7" r="3" fill="#cbd5e1" opacity=".7" />
          </g>
        )}

        {/* nuvens */}
        <g className="cb-dr" opacity={0.9 - estrelas * 0.7} fill="#fff">
          <g transform="translate(120,110)"><ellipse rx="46" ry="14" /><ellipse cx="-16" cy="-10" rx="22" ry="16" /><ellipse cx="14" cy="-14" rx="26" ry="18" /></g>
          <g transform="translate(640,70)"><ellipse rx="38" ry="11" /><ellipse cx="-10" cy="-9" rx="18" ry="13" /><ellipse cx="12" cy="-11" rx="20" ry="14" /></g>
        </g>

        {/* colinas ao fundo */}
        <path d="M0 405 Q140 335 300 392 T600 378 T900 360 V520 H0Z" fill={mix("#9bd3a4", ceu.base, 0.25 + estrelas * 0.4)} />
        <path d="M0 430 Q200 380 420 424 T900 405 V520 H0Z" fill={mix("#6cbf78", "#14301f", estrelas * 0.65)} />

        {/* feixe de sol do lado de fora */}
        {dia && forcaFora > 0.02 && oy < y0 && (
          <polygon points={`${ox},${oy} ${wx},${y0} ${wx},${y0 + wh}`} fill="#fde68a"
            opacity={forcaFora * 0.55} filter={`url(#${id("b10")})`} />
        )}

        {/* árvore */}
        <g transform="translate(796,432)">
          <g className="cb-sw">
            <path d="M-7 0 Q-5 -50 -2 -92 L6 -92 Q4 -50 8 0Z" fill="#7c5a43" />
            <circle cx="0" cy="-122" r="40" fill={mix("#4f9d5b", "#10261a", estrelas * 0.6)} />
            <circle cx="-30" cy="-98" r="28" fill={mix("#5fb26a", "#14301f", estrelas * 0.6)} />
            <circle cx="30" cy="-100" r="30" fill={mix("#45905a", "#10261a", estrelas * 0.6)} />
            <circle cx="6" cy="-150" r="26" fill={mix("#6cc277", "#14301f", estrelas * 0.6)} />
          </g>
        </g>

        {/* sombra no chão */}
        <ellipse cx="450" cy={FY + 12} rx="250" ry="12" fill="#0f172a" opacity="0.22" />

        {/* interior */}
        <g clipPath={`url(#${id("sala")})`}>
          <rect x={HX0} y={CY} width={HX1 - HX0} height={FY - CY} fill={paredeInt} />
          <rect x={HX0} y={CY} width={HX1 - HX0} height={FY - CY} fill={`url(#${id("calor")})`} />
          <rect x={HX0} y={FY - 14} width={HX1 - HX0} height="14" fill="#c9b49b" />
          <rect x={HX0} y={FY - 16} width={HX1 - HX0} height="3" fill="#a8927a" />

          {raioOk && (
            <g>
              <polygon points={`${r1.xi},${r1.yi} ${r1.xe},${r1.ye} ${r2.xe},${r2.ye} ${r2.xi},${r2.yi}`}
                fill="#fde68a" opacity={forcaDentro * 0.5} filter={`url(#${id("b4")})`} />
              <ellipse cx={(r1.xe + r2.xe) / 2} cy={FY - 6} rx={Math.abs(r2.xe - r1.xe) / 2 + 34} ry="9"
                fill="#fbbf24" opacity={forcaDentro * 0.6} filter={`url(#${id("b4")})`} />
            </g>
          )}

          {/* ar-condicionado */}
          <g>
            <rect x={acX} y={CY + 12} width="76" height="22" rx="11" fill="#f8fafc" stroke="#cbd5e1" />
            <line x1={acX + 14} y1={CY + 27} x2={acX + 62} y2={CY + 27} stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
            {calor > 0.5 && [0, 1, 2].map((i) => (
              <path key={i} className="cb-sd" style={{ animationDelay: `${i * 0.5}s` }}
                d={`M${acX + 20 + i * 18} ${CY + 38} q5 6 0 12 t0 12`} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            ))}
          </g>

          {/* móveis */}
          {tipoComodo === "sala" && (
            <g>
              <rect x="352" y={FY - 70} width="136" height="32" rx="14" fill="#a8b5c6" />
              <rect x="346" y={FY - 46} width="148" height="34" rx="16" fill="#94a3b8" />
              <rect x="340" y={FY - 54} width="26" height="42" rx="13" fill="#8696aa" />
              <rect x="474" y={FY - 54} width="26" height="42" rx="13" fill="#8696aa" />
              <rect x="372" y={FY - 40} width="96" height="18" rx="9" fill="#a8b5c6" />
            </g>
          )}
          {tipoComodo === "quarto" && (
            <g>
              <rect x="350" y={FY - 70} width="14" height="58" rx="7" fill="#7c5a43" />
              <rect x="350" y={FY - 30} width="170" height="26" rx="12" fill="#e2e8f0" />
              <rect x="358" y={FY - 44} width="158" height="22" rx="11" fill="#fff" />
              <ellipse cx="384" cy={FY - 44} rx="20" ry="9" fill="#cbd5e1" />
              <rect x="430" y={FY - 40} width="86" height="14" rx="7" fill="#93c5fd" />
            </g>
          )}
          {tipoComodo === "escritorio" && (
            <g>
              <rect x="352" y={FY - 62} width="150" height="9" rx="4.5" fill="#7c5a43" />
              <rect x="362" y={FY - 54} width="8" height="42" rx="4" fill="#6b4d39" />
              <rect x="484" y={FY - 54} width="8" height="42" rx="4" fill="#6b4d39" />
              <rect x="400" y={FY - 104} width="62" height="40" rx="7" fill="#1e293b" />
              <rect x="428" y={FY - 66} width="6" height="6" fill="#475569" />
              <circle cx="505" cy={FY - 26} r="17" fill="#64748b" />
            </g>
          )}
          {tipoComodo === "banheiro" && (
            <g>
              <rect x="346" y={FY - 40} width="156" height="40" rx="20" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
              <rect x="356" y={FY - 32} width="136" height="22" rx="11" fill="#bae6fd" />
              <path d={`M368 ${FY - 40} v-16 q0 -8 8 -8 h8`} fill="none" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
            </g>
          )}

          {/* planta */}
          <g className="cb-sw">
            <rect x={plantaX - 12} y={FY - 28} width="24" height="26" rx="8" fill="#c2714f" />
            <ellipse cx={plantaX - 10} cy={FY - 46} rx="9" ry="22" fill="#4ade80" transform={`rotate(-22 ${plantaX - 10} ${FY - 46})`} />
            <ellipse cx={plantaX + 10} cy={FY - 46} rx="9" ry="22" fill="#22c55e" transform={`rotate(22 ${plantaX + 10} ${FY - 46})`} />
            <ellipse cx={plantaX} cy={FY - 52} rx="8" ry="24" fill="#16a34a" />
          </g>

          {/* pessoa */}
          <g>
            <rect x={personX - 15} y={FY - 46} width="30" height="44" rx="14" fill="#6366f1" />
            <circle cx={personX} cy={FY - 62} r="17" fill="#fcd9b0" />
            {calor >= 0.7 ? (
              <g fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={`M${personX - 9} ${FY - 69} L${personX - 4} ${FY - 66} L${personX - 9} ${FY - 63}`} />
                <path d={`M${personX + 9} ${FY - 69} L${personX + 4} ${FY - 66} L${personX + 9} ${FY - 63}`} />
              </g>
            ) : (
              <>
                <circle cx={personX - 6} cy={FY - 65} r="1.9" fill="#1e293b" />
                <circle cx={personX + 6} cy={FY - 65} r="1.9" fill="#1e293b" />
              </>
            )}
            {calor > 0.6 && (
              <>
                <circle cx={personX - 11} cy={FY - 58} r="3.5" fill="#f87171" opacity=".5" />
                <circle cx={personX + 11} cy={FY - 58} r="3.5" fill="#f87171" opacity=".5" />
                <path className="cb-sd" d={`M${personX + 14} ${FY - 78} q4 6 0 9 q-4 -3 0 -9z`} fill="#38bdf8" />
              </>
            )}
            {calor >= 0.7 ? (
              <>
                <ellipse cx={personX} cy={FY - 54} rx="5.5" ry="4.5" fill="#be123c" />
                <ellipse cx={personX} cy={FY - 51.5} rx="3" ry="2" fill="#fb7185" />
              </>
            ) : (
              <path d={mouth} fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
            )}
          </g>
        </g>

        {/* paredes (espessura real da envoltória) */}
        {[{ x: HX0 - t, face: true }, { x: HX1, face: false }].map(({ x }) => {
          const ehFachada = (x < HX0) === fachadaEsq;
          return (
            <g key={x}>
              <rect x={x} y="250" width={t} height={FY + 10 - 250} rx="9" fill={corParede} />
              {envoltoria === "termica" && (
                <rect x={x < HX0 ? x + t * 0.3 : x + t * 0.05} y="256" width={t * 0.65} height={FY - 252} rx="4"
                  fill={`url(#${id("eps")})`} />
              )}
              {ehFachada && (
                <rect x={x} y="250" width={t} height={FY + 10 - 250} rx="9" fill="#f59e0b"
                  opacity={forcaFora * 0.38} />
              )}
            </g>
          );
        })}

        {/* janela */}
        <g>
          <rect x={Math.min(wx, inX)} y={y0} width={t} height={wh} rx="6" fill={`url(#${id("vidro")})`}
            stroke="#334155" strokeWidth="3.5" />
          <line x1={Math.min(wx, inX) + t / 2} y1={y0} x2={Math.min(wx, inX) + t / 2} y2={y0 + wh}
            stroke="#334155" strokeWidth="2" opacity=".6" />
        </g>

        {/* beiral / brise */}
        {reducaoSolarBrise > 0 && (
          <g fill="#334155" stroke="#334155" strokeLinecap="round">
            <rect x={dir < 0 ? wx - (8 + reducaoSolarBrise * 0.5) : wx} y={y0 - 9}
              width={8 + reducaoSolarBrise * 0.5} height="6" rx="3" stroke="none" />
            {reducaoSolarBrise >= 60 &&
              [0.2, 0.45, 0.7].map((f) => (
                <line key={f} x1={wx} y1={y0 + wh * f} x2={wx + dir * 22} y2={y0 + wh * f + 7} strokeWidth="4.5" />
              ))}
          </g>
        )}

        {/* telhado com cantos arredondados */}
        <path d={`M${HX0 - t - 30} 256 L450 138 L${HX1 + t + 30} 256Z`} fill="#3f5b63" stroke="#3f5b63"
          strokeWidth="16" strokeLinejoin="round" />
        <path d={`M${HX0 - t - 10} 252 L450 150`} stroke="#5b8089" strokeWidth="4" strokeLinecap="round" opacity=".6" />

        {/* ondas de calor sobre a fachada */}
        {forcaFora > 0.25 && [0, 1, 2].map((i) => (
          <path key={i} className="cb-up" style={{ animationDelay: `${i * 0.8}s` }}
            transform={`translate(${wx + dir * (14 + i * 14)},${y0 + wh * 0.8})`}
            d="M0 20 C6 12 -6 4 0 -4 S6 -20 0 -28" fill="none" stroke="#f97316"
            strokeWidth="3" strokeLinecap="round" opacity={clamp(forcaFora)} />
        ))}

        {/* grama da frente */}
        <path d="M0 448 Q220 426 450 442 T900 436 V520 H0Z" fill={mix("#58a867", "#0f2a1a", estrelas * 0.65)} />
        <g fill={mix("#4f9d5b", "#0f2a1a", estrelas * 0.65)}>
          <circle cx="120" cy="456" r="22" /><circle cx="148" cy="462" r="16" /><circle cx="98" cy="464" r="14" />
        </g>

        {/* etiqueta */}
        <g transform="translate(24,24)">
          <rect width="214" height="42" rx="21" fill="#fff" opacity=".9" />
          <text x="20" y="27" fontSize="15" fontWeight="700" fill="#0f172a" fontFamily="inherit">
            {String(Math.floor(hora)).padStart(2, "0")}h
          </text>
          <text x="62" y="27" fontSize="15" fill="#334155" fontFamily="inherit">{verdict}</text>
        </g>
      </svg>
    </div>
  );
}