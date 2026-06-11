 import { createFileRoute } from "@tanstack/react-router";
import { EcomondsLogo } from "@/components/EcomondsLogo";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/inteligencia")({
  component: Inteligencia,
});

const WA_LINK = "https://wa.me/5551980153991?text=Olá!%20Vim%20pelo%20EcomindsX%20e%20quero%20saber%20mais%20sobre%20Inteligência%20de%20Projeto.";

const CARDS = [
 {
  index: "01",
  categoria: "Zoneamento Bioclimático",
  titulo: "Projeto para o clima, não contra ele",
  descricao:
    "O Brasil é dividido em zonas bioclimáticas definidas pela ABNT NBR 15220. Cada região exige estratégias específicas de ventilação, sombreamento, inércia térmica e desempenho da envoltória da edificação. A especificação inadequada de materiais e fachadas pode aumentar significativamente a demanda de climatização e comprometer o conforto térmico dos ambientes ao longo do ano.",
  aplicacao:
    "Consulte a zona bioclimática antes de definir envelope, aberturas e sistemas de climatização.",
  icone: "◈",
},
{
  index: "02",
  categoria: "Efeito Túnel e Pressão de Vento",
  titulo: "Pressão de vento e desempenho de fachada",
  descricao:
    "Em edifícios altos, o efeito túnel entre torres pode gerar alterações relevantes na pressão do vento sobre fachadas e estruturas. Em regiões com ventos dominantes conhecidos — como o Minuano no RS — esses efeitos podem ser previstos e considerados ainda na fase de projeto. Estudos aerológicos e reforços específicos de fachada contribuem diretamente para desempenho e segurança da edificação.",
  aplicacao:
    "Considere estudo aerológico em projetos acima de 8 pavimentos ou em regiões com ventos históricos intensos.",
  icone: "◎",
},
{
  index: "03",
  categoria: "Conforto Térmico",
  titulo: "Desempenho térmico e conforto dos ambientes",
  descricao:
    "Coberturas metálicas sem isolamento térmico podem elevar significativamente a temperatura interna em climas quentes. Já materiais com alta condutividade térmica, quando aplicados sem tratamento adequado, contribuem para perda de calor em períodos frios. As escolhas de materiais influenciam diretamente conforto, consumo energético e desempenho da edificação.",
  aplicacao:
    "Especifique transmitância térmica (U) e absortância dos materiais. A NBR 15575 estabelece parâmetros importantes para desempenho térmico em habitações.",
  icone: "◐",
},
{
  index: "04",
  categoria: "Manutenabilidade",
  titulo: "Manutenção também faz parte do projeto",
  descricao:
    "Algumas escolhas estéticas podem gerar dificuldades operacionais e custos elevados de manutenção ao longo do tempo. Elementos com acesso restrito para limpeza, materiais inadequados para determinadas condições de uso ou fachadas de alta complexidade exigem planejamento desde a fase de especificação.",
  aplicacao:
    "Para cada elemento especificado, considere acesso, limpeza, manutenção e possibilidade de substituição ao longo da vida útil da edificação.",
  icone: "◇",
},
{
  index: "05",
  categoria: "Iluminação Natural",
  titulo: "Iluminação natural com desempenho e conforto visual",
  descricao:
    "A iluminação natural pode reduzir significativamente o consumo energético e melhorar a qualidade dos ambientes internos. No entanto, sem controle solar adequado, aberturas mal posicionadas podem gerar ofuscamento, ganho térmico excessivo e desconforto visual ao longo do dia.",
  aplicacao:
    "Simule trajetória solar e incidência luminosa antes de definir aberturas e proteções solares. Ferramentas como Ladybug (Grasshopper) e Climate Consultant auxiliam nessa análise.",
  icone: "◉",
},
{
  index: "06",
  categoria: "Eficiência Hídrica",
  titulo: "Gestão hídrica integrada ao projeto",
  descricao:
    "Paisagismo, drenagem e impermeabilização influenciam diretamente o desempenho hídrico da edificação e do entorno urbano. Espécies inadequadas ao clima local podem aumentar a demanda de irrigação, enquanto áreas excessivamente impermeáveis contribuem para sobrecarga do sistema de drenagem e redução da infiltração natural do solo.",
  aplicacao:
    "Priorize espécies nativas regionais e considere sistemas de captação e reaproveitamento de água pluvial para usos não potáveis.",
  icone: "◑",
},
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Card({ card, i }: { card: typeof CARDS[0]; i: number }) {
  const { ref, visible } = useInView();
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current || !glowRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    glowRef.current.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    glowRef.current.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${i * 80}ms` }}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => glowRef.current && (glowRef.current.style.opacity = "1")}
        onMouseLeave={() => glowRef.current && (glowRef.current.style.opacity = "0")}
        className="group relative flex flex-col h-full border border-border bg-card p-7 transition-[border-color] duration-300 hover:border-primary/40 overflow-hidden"
      >
        <span className="absolute left-0 top-0 h-px w-0 bg-primary transition-all duration-500 group-hover:w-full" />
        <span
          ref={glowRef}
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
          style={{ background: "radial-gradient(circle 120px at var(--mx,50%) var(--my,50%), hsl(var(--primary)/.07), transparent)" }}
        />

        <div className="flex items-start justify-between mb-5">
          <div className="text-mono text-[9px] uppercase tracking-[0.25em] text-primary/60">
            {card.index} / {card.categoria}
          </div>
          <span className="text-primary/30 text-xl">{card.icone}</span>
        </div>

        <h3 className="text-display text-lg font-bold leading-snug text-foreground mb-4">
          {card.titulo}
        </h3>

        <p className="text-mono text-xs leading-relaxed text-muted-foreground flex-1 mb-5">
          {card.descricao}
        </p>

        <div className="border-t border-border pt-4">
          <div className="text-mono text-[9px] uppercase tracking-[0.2em] text-primary mb-2">
            Como aplicar
          </div>
          <p className="text-mono text-xs leading-relaxed text-foreground/70">
            {card.aplicacao}
          </p>
        </div>
      </div>
    </div>
  );
}

function Inteligencia() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { ref: manifestoRef, visible: manifestoVisible } = useInView(0.1);

  return (
    <div className="relative min-h-screen bg-background text-foreground bg-noise">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{ background: "var(--gradient-radial-glow)" }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo Vector-X */}
          <a href="/" className="flex items-center gap-3 group transition-opacity hover:opacity-80">
            <EcomondsLogo size={36} />
            <div className="flex flex-col justify-center">
              <span className="text-display text-xl font-extrabold tracking-tight text-foreground leading-none uppercase">
                Vector-X
              </span>
              <span className="text-mono text-[8px] uppercase tracking-[0.3em] text-muted-foreground mt-1.5 opacity-70">
                By EcomindsX
              </span>
            </div>
          </a>
          <a
            href="/"
            className="text-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
          >
            ← Dashboard
          </a>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 pb-24">

        {/* Hero */}
        <section ref={heroRef} className="pt-16 md:pt-24 pb-16 border-b border-border">
          <div className="animate-fade-up flex items-center gap-2 text-mono text-[11px] uppercase tracking-[0.25em] text-primary">
            <span className="h-px w-8 bg-primary" /> Inteligência de Projeto
          </div>

          <h1
            className="text-display mt-5 max-w-5xl text-5xl md:text-7xl font-extrabold leading-[0.95] animate-fade-up"
            style={{ animationDelay: "80ms" }}
          >
            O que o projeto precisa considerar
            <br />
            <span className="text-primary text-glow">antes da obra começar.</span>
          </h1>

          {/* Manifesto */}
         <div
  ref={manifestoRef}
  className={`mt-12 max-w-3xl space-y-5 transition-all duration-700 ${
    manifestoVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
  }`}
>
  <p className="text-mono text-base md:text-lg leading-relaxed text-foreground border-l-2 border-primary/40 pl-5">
    Engenharia ambiental também é desempenho. As decisões tomadas na fase de projeto influenciam diretamente conforto térmico, consumo energético, durabilidade, manutenção e qualidade de vida ao longo dos anos.
  </p>

  <p className="text-mono text-base md:text-lg leading-relaxed text-muted-foreground pl-5 border-l-2 border-border">
    A especificação de materiais, a orientação solar, a ventilação e as características climáticas locais impactam diretamente o funcionamento e a eficiência da edificação.
  </p>

  <p className="text-mono text-base md:text-lg leading-relaxed text-muted-foreground pl-5 border-l-2 border-border">
    Um edifício envidraçado sem análise bioclimática pode aumentar significativamente a demanda de climatização. Em determinadas regiões, pressão de vento e efeitos aerodinâmicos exigem reforços específicos de fachada e estrutura.
  </p>

  <p className="text-mono text-base md:text-lg leading-relaxed text-foreground pl-5 border-l-2 border-primary/40">
    Conforto, desempenho e eficiência não acontecem por acaso. São resultado de decisões técnicas tomadas antes da obra começar.
  </p>

  <p className="text-mono text-base md:text-lg leading-relaxed text-muted-foreground pl-5 border-l-2 border-border">
    A EcomindsX atua integrando variáveis ambientais, desempenho construtivo e inteligência técnica ao processo de projeto — reduzindo retrabalho e antecipando problemas ainda na etapa de especificação.
  </p>

  <p className="text-display text-xl md:text-2xl font-extrabold text-primary pl-5 border-l-2 border-primary">
    Isso é Inteligência de Projeto.
  </p>
</div>
        </section>

        {/* Cards */}
        <section className="mt-20">
          <div className="flex items-end justify-between border-b border-border pb-4 mb-12">
            <div>
              <div className="text-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                /casos-práticos
              </div>
              <h2 className="text-display mt-2 text-2xl md:text-3xl font-bold">
                O que todo projeto deveria considerar
              </h2>
            </div>
            <div className="text-mono hidden md:block text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {CARDS.length} cenários
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {CARDS.map((card, i) => (
              <Card key={card.index} card={card} i={i} />
            ))}
          </div>
        </section>

        {/* CTA WhatsApp */}
        <section className="mt-24">
          <div className="relative border border-primary/30 p-10 md:p-14 overflow-hidden">
            <span className="absolute top-0 left-0 h-px w-1/2 bg-primary" />
            <span className="absolute bottom-0 right-0 h-px w-1/2 bg-primary/30" />

            <div className="text-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 bg-primary animate-pulse-dot rounded-full" />
              Fale com a equipe
            </div>

            <h3 className="text-display text-3xl md:text-4xl font-extrabold leading-tight mb-4 max-w-2xl">
              Seu projeto tem alguma dessas questões em aberto?
            </h3>

            <p className="text-mono text-sm text-muted-foreground leading-relaxed mb-8 max-w-xl">
              Converse com nossa equipe. Analisamos o contexto do seu projeto e indicamos quais variáveis ambientais merecem atenção antes da especificação.
            </p>

            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 font-bold text-mono text-xs tracking-tighter hover:bg-primary/90 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Conversar no WhatsApp
            </a>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <EcomondsLogo size={24} />
            <span className="text-mono text-xs text-muted-foreground">
              EcomindsX — Inteligência Sustentável
            </span>
          </div>
          <div className="text-mono text-xs text-muted-foreground flex items-center gap-2">
            <span>Automação via n8n</span>
            <span className="text-border-strong">·</span>
            <span>Curadoria por IA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}