import { Link } from "@tanstack/react-router";
import { EcomondsLogo } from "@/components/EcomondsLogo";
import HeroCarousel from "@/components/HeroCarousel";
import { BrazilZonesMap } from "@/components/BrazilZonesMap";

/* ────────────────────────────────────────────────────────────────────────
   HOME
   Escopo enxuto de propósito: só o que é "ferramenta" (Diagnóstico) e o
   convite pro "conteúdo" (Notícias). Tudo que é tese/conceito (Pilares,
  Glossário de Certificações e Referências Globais moram em /referencias —
   ver esse arquivo se precisar editar aquele conteúdo.
──────────────────────────────────────────────────────────────────────── */

export default function Home() {
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
              <Link
                to="/wellness-analise-solar"
                className="text-sm font-medium text-primary px-3 sm:px-4 py-1.5 rounded-lg border border-primary/40 bg-primary/5 outline-none hover:border-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors whitespace-nowrap ml-1"
              >
                Diagnóstico Bioclimático
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 pb-32">

        {/* ── Hero ── */}
        <section className="pt-16 sm:pt-24 md:pt-32 pb-16 sm:pb-24">
          <div className="animate-fade-up flex items-center gap-3 text-mono text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-primary mb-6">
            <span className="h-px w-8 bg-primary" />
            EcomindsX · Engenharia Ambiental & Wellness
          </div>

          <div className="mt-6 md:mt-8 animate-fade-up" style={{ animationDelay: "60ms" }}>
            <HeroCarousel />
          </div>

          
        
        </section>

        {/* ── Diagnóstico Bioclimático — módulo central da home ──
             Antes chamado "Análise Solar": renomeado porque uma análise
             solar de verdade exige leitura de sombreamento, o que este
             módulo ainda não faz. O que ele entrega hoje — zona
             bioclimática (NBR 15220-3), clima horário (INMET) e
             recomendações de materiais/inércia térmica — já é rico o
             suficiente pra ter nome próprio, sem prometer o que falta. */}
        {/* ── Diagnóstico Bioclimático — módulo central da home ── */}
        <section id="diagnostico" className="mb-16 sm:mb-24">
  <div className="relative overflow-hidden border border-primary/20 bg-card p-6 sm:p-10 rounded-2xl">
    <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full"
      style={{ background: "radial-gradient(circle, rgba(0,198,122,0.10) 0%, transparent 70%)" }} />

    <div className="relative z-10 mb-3">
      <div className="text-mono text-[10px] uppercase tracking-[0.15em] text-primary mb-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
        Diagnóstico Bioclimático
      </div>
      <h2 className="text-display text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight mb-4 max-w-2xl">
        Radiação, azimute e zoneamento,<br />
        <span className="text-primary">calculados pra um endereço exato.</span>
      </h2>
      <p className="text-muted-foreground text-sm sm:text-base max-w-lg leading-relaxed mb-6">
        Um dado a mais na sua prancheta: zona bioclimática (NBR 15220-3:2024), clima horário
        histórico (INMET) e posicionamento solar do terreno, prontos antes da primeira decisão
        de projeto, pra embasar a especificação de material, ventilação e orientação.
      </p>
      {/* O BOTÃO FOI REMOVIDO DAQUI */}
    </div>

    {/* Mapa + card de exemplo lado a lado */}
    <div className="relative z-10 mt-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
      
      {/* Coluna 1: Mapa */}
      <div className="border border-border bg-background/60 p-4 sm:p-5 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
            Zonas bioclimáticas brasileiras · NBR 15220-3:2024
          </span>
        </div>
        <BrazilZonesMap />
      </div>
      
      {/* Coluna 2: Card + Botão (envolvidos em um flex-col) */}
      <div className="flex flex-col gap-4">
        <div className="border border-border bg-background/60 p-5 sm:p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
              Exemplo ilustrativo
            </span>
            <span className="text-mono text-[9px] uppercase tracking-[0.1em] text-primary border border-primary/30 rounded-md px-2 py-0.5">
              Demo
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <div className="text-display text-2xl sm:text-3xl font-extrabold text-primary">ZB 03</div>
              <div className="text-mono text-[9px] uppercase tracking-[0.1em] text-primary/80 mt-1">
                NBR 15220-3 · Mista
              </div>
            </div>
            <div>
              <div className="text-display text-2xl sm:text-3xl font-extrabold text-foreground">34° NE</div>
              <div className="text-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground mt-1">
                Azimute da fachada
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            {[
              "Radiação média: 4,8 kWh/m²/dia (estação INMET mais próxima)",
              "Amplitude térmica: moderada",
              "Inércia recomendada: alta",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-muted-foreground text-xs">
                <span className="h-1 w-1 rounded-full bg-primary/60 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* BOTÃO MOVIDO PARA CÁ (Abaixo do Card) */}
        <Link
          to="/wellness-analise-solar"
          className="inline-flex justify-center items-center gap-2 text-sm font-semibold bg-primary text-primary-foreground px-5 sm:px-6 py-3 rounded-lg outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors w-full"
        >
          Gerar minha análise →
        </Link>
      </div>
    </div>


    {/* Por que isso importa */}
    <div className="relative z-10 mt-10 pt-8 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-5">
      {[
        {
          title: "Ocupação sem retrabalho",
          desc: "Material e vedação certos pro clima do lote evitam intervenção corretiva: infiltração, mofo, fissura por dilatação térmica.",
        },
        {
          title: "Conforto sem depender de climatização",
          desc: "Ventilação cruzada e inércia térmica calculadas pro local reduzem a necessidade de ar-condicionado o ano todo.",
        },
        {
          title: "Decisão de projeto embasada em dado real",
          desc: "Zona bioclimática, clima horário e posicionamento solar do terreno real, prontos pra entrar direto na especificação.",
        },
      ].map((item) => (
        <div key={item.title}>
          <h4 className="text-sm font-semibold text-foreground mb-1.5">{item.title}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
        </div>
      ))}
    </div>
  </div>

  
</section>
        {/* ── CTA Notícias ── */}
        <section className="border-t border-border pt-16 sm:pt-20 flex flex-col items-center text-center gap-4">
          <div className="text-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Quer ir mais fundo?
          </div>
          <h3 className="text-display text-2xl sm:text-3xl font-extrabold max-w-lg leading-tight">
            Novidades, tecnologias e tendências da construção — num só lugar.
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
    </div>
  );
}