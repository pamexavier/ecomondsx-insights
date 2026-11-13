// src/components/laudo/LaudoChrome.tsx
//
// Peças compartilhadas pelas folhas A4 do laudo: cabeçalho corrido com
// paginação, rodapé normativo e constantes de estação.
// Todas as folhas continuam usando a classe "pdf-page" e a proporção A4,
// que é o que o gerarPDFPaginado procura.

export const ROTULO_ESTACAO: Record<string, string> = {
  Verao: "Verão",
  Outono: "Outono",
  Inverno: "Inverno",
  Primavera: "Primavera",
};

export const COR_ESTACAO: Record<string, string> = {
  Verao: "#F59E0B",
  Outono: "#DC2626",
  Inverno: "#3B82F6",
  Primavera: "#10B981",
};

export const ESTACOES = ["Verao", "Outono", "Inverno", "Primavera"] as const;

/** Classes-base de uma folha A4 do laudo. */
export const FOLHA_A4 =
  "pdf-page relative flex aspect-[210/297] w-full flex-col overflow-hidden rounded-lg border border-line bg-white p-8 text-ink shadow-[0_14px_40px_rgba(24,34,31,0.08)]";

const pad2 = (n: number) => String(n).padStart(2, "0");

export function LaudoHeader({
  secao,
  nomeProjeto,
  pagina,
  totalPaginas,
  codigo,
}: {
  secao: string;
  nomeProjeto: string;
  pagina: number;
  totalPaginas: number;
  codigo?: string;
}) {
  return (
    <header className="mb-4 flex shrink-0 items-center justify-between gap-3 border-b border-line pb-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brand-deep" />
          <span className="text-[11px] font-black tracking-tight text-ink-deep">
            VECTOR<span className="text-brand-deep">-X</span>
          </span>
        </div>
        <span className="text-line">|</span>
        <span className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-brand-deep">{secao}</span>
        <span className="text-line">·</span>
        <span className="truncate text-[10px] font-medium text-ink-soft">{nomeProjeto}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        {codigo && <span className="font-mono text-[10px] font-semibold tabular-nums text-ink-soft">{codigo}</span>}
        <span className="rounded-md border border-brand/30 bg-surface-soft px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-deep tabular-nums">
          Pág. {pad2(pagina)} / {pad2(totalPaginas)}
        </span>
      </div>
    </header>
  );
}

export function LaudoFooter({ nota }: { nota?: string }) {
  return (
    <footer className="mt-auto flex shrink-0 items-center justify-between gap-4 border-t border-line pt-3 text-[9.5px] text-ink-soft">
      <span className="truncate font-medium">
        {nota ?? "ABNT NBR 15220-3:2024 · NBR 15575:2024 · INMET e Google Solar (DSM)"}
      </span>
      <span className="shrink-0 font-semibold tabular-nums text-ink-deep">
        Laudo Vector-X · Emissão {new Date().toLocaleDateString("pt-BR")}
      </span>
    </footer>
  );
}
