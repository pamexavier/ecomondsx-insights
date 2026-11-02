import { Link } from "@tanstack/react-router";
import { EcomondsLogo } from "@/components/EcomondsLogo";

const ITEMS = [
  { label: "Notícias", href: "/noticias" },
  { label: "Sobre", href: "/sobre" },
  { label: "Educativo", href: "/educativo" },
  { label: "Certificações", href: "/referencias" },
  { label: "Wellness", href: "/padroes-wellness" },
] as const;

export function GlobalNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80 sm:gap-3">
          <EcomondsLogo size={32} />
          <div className="flex flex-col">
            <span className="font-sans text-sm font-semibold leading-none tracking-tight sm:text-xl">Vector-X</span>
            <span className="mt-1 text-xs font-medium text-ink-soft opacity-70 sm:text-sm">By EcomindsX</span>
          </div>
        </Link>

        <nav className="overflow-x-auto no-scrollbar" aria-label="Navegação principal">
          <div className="flex items-center gap-1 px-1 sm:gap-2">
            {ITEMS.map((item) => (
              <Link key={item.label} to={item.href as any} className="whitespace-nowrap px-2 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:text-brand-strong sm:px-3 sm:text-sm">
                {item.label}
              </Link>
            ))}
            <Link to={"/wellness-analise-solar" as any} search={{} as any} className="ml-1 whitespace-nowrap rounded-full border-transparent bg-brand-strong px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand sm:px-4 sm:text-sm">
              <span className="hidden sm:inline">Diagnóstico bioclimático</span>
              <span className="sm:hidden">Diagnóstico</span>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}