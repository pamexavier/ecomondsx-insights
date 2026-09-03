import { Link } from "@tanstack/react-router";
import { EcomondsLogo } from "@/components/EcomondsLogo";

const ITEMS = [
  { label: "Notícias", href: "/noticias" },
  { label: "Sobre", href: "/sobre" },
  { label: "Certificações", href: "/referencias" },
] as const;

export function GlobalNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80 sm:gap-3">
          <EcomondsLogo size={32} />
          <div className="flex flex-col">
            <span className="text-display text-sm font-extrabold leading-none tracking-tight uppercase sm:text-xl">Vector-X</span>
            <span className="text-mono mt-1 text-[6px] uppercase tracking-[0.3em] text-muted-foreground opacity-70 sm:text-[8px]">By EcomindsX</span>
          </div>
        </Link>

        <nav className="overflow-x-auto no-scrollbar" aria-label="Navegação principal">
          <div className="flex items-center gap-1 px-1 sm:gap-2">
            {ITEMS.map((item) => (
              <Link key={item.label} to={item.href as any} className="text-mono whitespace-nowrap px-2 py-1.5 text-[8px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary sm:px-3 sm:text-[10px]">
                {item.label}
              </Link>
            ))}
            <Link to={"/wellness-analise-solar" as any} search={{} as any} className="text-mono ml-1 whitespace-nowrap rounded-lg border border-primary/50 bg-primary/5 px-3 py-1.5 text-[8px] uppercase tracking-[0.15em] text-primary transition-colors hover:border-primary hover:bg-primary/10 sm:px-4 sm:text-[10px]">
              <span className="hidden sm:inline">Diagnóstico Bioclimático</span>
              <span className="sm:hidden">Diagnóstico</span>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}