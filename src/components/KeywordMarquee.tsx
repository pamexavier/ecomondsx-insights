import { useRef } from "react";

interface KeywordMarqueeProps {
  keywords: string[];
  activeKeyword?: string | null;
  onSelect?: (kw: string) => void;
}

const CATEGORY_COLORS: Record<string, { base: string; active: string }> = {
  material:   { base: "border-emerald-400/40 text-emerald-400", active: "border-emerald-400 text-emerald-400 shadow-[0_0_12px] shadow-emerald-400/60 [text-shadow:_0_0_8px_currentColor]" },
  materiais:  { base: "border-emerald-400/40 text-emerald-400", active: "border-emerald-400 text-emerald-400 shadow-[0_0_12px] shadow-emerald-400/60 [text-shadow:_0_0_8px_currentColor]" },
  regulação:  { base: "border-rose-400/40 text-rose-400",       active: "border-rose-400 text-rose-400 shadow-[0_0_12px] shadow-rose-400/60 [text-shadow:_0_0_8px_currentColor]" },
  tecnologia: { base: "border-cyan-400/40 text-cyan-400",       active: "border-cyan-400 text-cyan-400 shadow-[0_0_12px] shadow-cyan-400/60 [text-shadow:_0_0_8px_currentColor]" },
  mercado:    { base: "border-amber-400/40 text-amber-400",     active: "border-amber-400 text-amber-400 shadow-[0_0_12px] shadow-amber-400/60 [text-shadow:_0_0_8px_currentColor]" },
  energia:    { base: "border-yellow-400/40 text-yellow-400",   active: "border-yellow-400 text-yellow-400 shadow-[0_0_12px] shadow-yellow-400/60 [text-shadow:_0_0_8px_currentColor]" },
  hídrico:    { base: "border-blue-400/40 text-blue-400",       active: "border-blue-400 text-blue-400 shadow-[0_0_12px] shadow-blue-400/60 [text-shadow:_0_0_8px_currentColor]" },
};

export function KeywordMarquee({
  keywords,
  activeKeyword,
  onSelect,
}: KeywordMarqueeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);
  const dragMoved = useRef(false);

  // Funções para permitir arrastar com o mouse no PC
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    isDragging.current = true;
    dragMoved.current = false;
    startX.current = e.clientX;
    scrollStart.current = scrollRef.current?.scrollLeft ?? 0;
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current || !scrollRef.current) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 4) dragMoved.current = true;
    scrollRef.current.scrollLeft = scrollStart.current - dx;
  }

  function onPointerUp() {
    isDragging.current = false;
  }

  return (
    <div className="relative w-full border-y border-border py-3">
      {/* Fade esquerda */}
      <div
        className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 sm:w-16"
        style={{ background: "linear-gradient(90deg, oklch(0.17 0.008 152), transparent)" }}
      />
      {/* Fade direita */}
      <div
        className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 sm:w-16"
        style={{ background: "linear-gradient(-90deg, oklch(0.17 0.008 152), transparent)" }}
      />

      {/* Removemos a animação marquee e o w-max. 
        Adicionamos overflow-x-auto para rolagem nativa e removemos a duplicata de keywords.
      */}
      <div
        ref={scrollRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto px-6 select-none touch-pan-x"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Escondemos a barra de rolagem via CSS na linha acima, mas o scroll nativo continua funcionando */}
        {keywords.map((kw, i) => {
          const isActive = activeKeyword === kw;
          const colors = CATEGORY_COLORS[(kw ?? "").toLowerCase()] ?? {
            base: "border-primary/40 text-primary",
            active: "border-primary text-primary shadow-[0_0_12px] shadow-primary/60 [text-shadow:_0_0_8px_currentColor]",
          };

          return (
            <span
              key={`${kw}-${i}`}
              onClick={(e) => {
                if (dragMoved.current) {
                  e.preventDefault();
                  return;
                }
                onSelect?.(kw);
              }}
              className={`text-mono shrink-0 cursor-pointer border bg-transparent px-4 py-2 text-[11px] uppercase tracking-[0.15em] transition-all duration-300
                ${isActive
                  ? colors.active
                  : `${colors.base} hover:opacity-80`
                }`}
            >
              #{kw}
            </span>
          );
        })}
      </div>
    </div>
  );
}