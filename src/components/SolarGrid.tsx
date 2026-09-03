import { cn } from "@/lib/utils";

export type SolarStatus = "Pleno Sol" | "Meia Sombra" | "Sombra";
export interface HourEntry {
  elevacao: number;
  azimute: number;
  status: SolarStatus;
}
export type SeasonData = Record<string, HourEntry>;
export type Classificacao = Record<string, SeasonData>;

const HOURS = ["6h", "8h", "10h", "12h", "14h", "16h", "18h"];
const SEASONS = ["Verao", "Outono", "Inverno", "Primavera"];

function statusStyle(s?: SolarStatus) {
  switch (s) {
    case "Pleno Sol":
      return "bg-[color-mix(in_oklab,var(--primary)_22%,transparent)] text-primary border-primary/40";
    case "Meia Sombra":
      return "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[var(--warning)] border-[color-mix(in_oklab,var(--warning)_40%,transparent)]";
    case "Sombra":
      return "bg-secondary text-muted-foreground border-border";
    default:
      return "bg-secondary/40 text-muted-foreground/60 border-border";
  }
}

export function SolarGrid({ classificacao }: { classificacao: Classificacao }) {
  const seasons = SEASONS.filter((s) => classificacao[s]);
  const hours = HOURS;

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <div className="min-w-[640px]">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `120px repeat(${hours.length}, minmax(0,1fr))` }}
        >
          <div />
          {hours.map((h) => (
            <div key={h} className="label-tag text-center py-2">{h}</div>
          ))}

          {seasons.map((season) => (
            <FragmentRow key={season} season={season} hours={hours} data={classificacao[season]} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FragmentRow({
  season,
  hours,
  data,
}: {
  season: string;
  hours: string[];
  data: SeasonData;
}) {
  return (
    <>
      <div className="flex items-center justify-start text-sm font-semibold uppercase tracking-wider text-foreground/90">
        {season === "Verao" ? "Verão" : season}
      </div>
      {hours.map((h) => {
        const entry = data[h];
        return (
          <div
            key={h}
            className={cn(
              "rounded-lg border px-2 py-3 text-center text-[11px] font-medium transition-all",
              statusStyle(entry?.status),
            )}
            title={entry ? `${entry.status} · elev ${entry.elevacao}° / az ${entry.azimute}°` : "—"}
          >
            <div className="truncate">{entry?.status ?? "—"}</div>
            {entry && (
              <div className="mt-1 text-[10px] opacity-70">
                {entry.elevacao}°
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
