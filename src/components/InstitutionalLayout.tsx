import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { EcomondsLogo } from "@/components/EcomondsLogo";

export function InstitutionalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[700px]"
        style={{ background: "var(--gradient-radial-glow)" }}
      />

      <header
        data-local-nav
        className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80 sm:gap-3"
          >
            <EcomondsLogo size={32} />
            <div className="flex flex-col">
              <span className="text-display text-sm font-extrabold uppercase leading-none tracking-tight sm:text-xl">
                Vector-X
              </span>
              <span className="mt-1 text-mono text-[6px] uppercase tracking-[0.3em] text-muted-foreground opacity-70 sm:text-[8px]">
                By EcomindsX
              </span>
            </div>
          </Link>

          <nav className="overflow-x-auto no-scrollbar" aria-label="Navegação principal">
            <div className="flex items-center gap-1 px-1 sm:gap-2">
              {(
                [
                  { label: "Sobre", href: "/sobre" },
                  { label: "Educativo", href: "/educativo" },
                  { label: "Certificações", href: "/referencias" },
                  { label: "Wellness", href: "/padroes-wellness" },
                  { label: "Notícias", href: "/noticias" },
                  { label: "Diagnóstico", href: "/wellness-analise-solar" },
                ] as const
              ).map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="whitespace-nowrap px-2 py-1.5 text-mono text-[8px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary sm:px-3 sm:text-[10px]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 pb-32 sm:px-6">{children}</main>
    </div>
  );
}
