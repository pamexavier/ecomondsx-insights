interface Props {
  label: string;
  value: string;
  hint?: string;
  index?: number;
  live?: boolean;
}

export function StatCard({ label, value, hint, index = 0, live }: Props) {
  return (
    <div
      className="relative bg-card border border-border p-5 overflow-hidden animate-fade-up"
      style={{ animationDelay: `${index * 80 + 100}ms` }}
    >
      {/* Scanning line */}
      <div className="absolute inset-x-0 top-0 h-px overflow-hidden">
        <span className="block h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
      </div>

      <div className="flex items-center justify-between text-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>{label}</span>
        {live && <span className="h-1.5 w-1.5 bg-primary animate-pulse-dot" />}
      </div>
      <div className="text-display mt-3 text-3xl md:text-4xl font-extrabold text-foreground tabular-nums">
        {value}
      </div>
      {hint && (
        <div className="text-mono mt-2 text-[11px] text-muted-foreground">
          {hint}
        </div>
      )}
    </div>
  );
}
