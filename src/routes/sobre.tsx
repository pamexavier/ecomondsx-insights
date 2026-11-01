import { createFileRoute } from "@tanstack/react-router";
import { useId } from "react";
import { InstitutionalLayout } from "@/components/InstitutionalLayout";

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
          )),
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
        <rect width="148" height="60" rx="10" fill="#0d1410" stroke="#1f2e27" strokeWidth="1.2" />
        <circle cx="18" cy="20" r="4" fill="#00c67a">
          <animate attributeName="opacity" values="1;.3;1" dur="1.8s" repeatCount="indefinite" />
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
        <text x="14" y="44" fontSize="10" fill="#CBD5E1" fontFamily="monospace">
          sol · vento · água · solo
        </text>
      </g>
      <g transform="translate(420,383)">
        <rect width="172" height="61" rx="10" fill="#0d1410" stroke="#1f2e27" strokeWidth="1.2" />
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
        <text x="14" y="44" fontSize="10" fill="#CBD5E1" fontFamily="monospace">
          luz · ar · conforto · saúde
        </text>
      </g>
    </svg>
  );
}

type ParametrosSimulacao = {
  corTinta: CorTintaKey;
  comprimentoM: number;
  larguraM: number;
  larguraFachadaM: number;
  peDireitoM: number;
  areaVidroInformadaM2: number;
  uParede: number;
  temperaturaExternaC: number;
  irradianciaVerticalWm2: number;
  uVidro: number;
  fatorSolarVidro: number;
  reducaoSolarBrise: number;
  renovacoesArHora: number;
  ocupantes: number;
  ganhosInternosWm2: number;
  setpointC: number;
  horasOperacaoDia: number;
  cop: number;
};

/*
 * Modelo físico em regime estacionário (baseado na metodologia de temperatura Sol-Ar
 * da ASHRAE Fundamentals / ABNT NBR 15220-2):
 *
 * 1. Temperatura Sol-Ar na face externa opaca:
 *    T_sol_ar = T_ext + (alpha * I_vertical) / h_ext, onde h_ext = 25 W/(m²·K)
 * 2. Fluxo condutivo + solar na parede opaca:
 *    Q_parede_total = U_parede * A_opaca * max(0, T_sol_ar - T_int)
 *    Separado didaticamente em:
 *    - Condução pura por diferença de temperatura do ar: U_parede * A_opaca * max(0, T_ext - T_int)
 *    - Parcela adicional induzida pela radiação solar absorvida na superfície opaca:
 *      U_parede * A_opaca * (alpha * I_vertical / 25)
 * 3. Condução no envidraçamento:
 *    Q_vidro_cond = U_vidro * A_vidro * max(0, T_ext - T_int)
 * 4. Ganho solar transmitido pelo envidraçamento:
 *    Q_vidro_solar = A_vidro * I_vertical * FS * (1 - reducao_brise / 100)
 * 5. Carga sensível por ventilação/infiltração de ar externo:
 *    Q_ar = (rho * c_p / 3600) * ACH * Volume * max(0, T_ext - T_int)
 *    Onde rho * c_p ≈ 1200 J/(m³·K) -> 1200 / 3600 = 0,3333 W·h/(m³·K)
 * 6. Cargas internas sensíveis:
 *    Q_int = (ocupantes * 75 W/pessoa [metabolismo sensível sedentário ISO 7730/ASHRAE 55])
 *          + (A_piso * densidade_iluminacao_equipamentos_W_m2)
 */

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
        <path d="M13 57l27-14 27 14M40 17v40" stroke={color} strokeOpacity=".8" strokeWidth="1.5" />
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

function SobrePage() {
  return (
    <InstitutionalLayout>
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
            Da leitura bioclimática à qualidade dos ambientes, a EcomindsX une ciência, tecnologia e
            engenharia para tornar o desempenho ambiental uma escolha concreta, não uma promessa de
            marketing.
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
          Três leituras se encontram em cada decisão: o lugar onde se constrói, as pessoas que vão
          viver ali e as condições que sustentam seu bem-estar ao longo do tempo.
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
                  <span className="text-mono text-xs tracking-[0.2em]" style={{ color: pilar.cor }}>
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
    </InstitutionalLayout>
  );
}

export const Route = createFileRoute("/sobre")({ component: SobrePage });
