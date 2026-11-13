// src/components/ResumoEntorno.tsx
//
// Substitui a grade de 8 cards da página 4. Mostra:
//  - rosa de obstáculos: uma barra por direção, comprimento = ângulo do obstáculo
//  - tabela só com as direções que importam para a fachada
//  - uma linha para o que está atrás da fachada e não interfere
import { formatarNumero } from "@/utils/calculosBioclimaticos";

type Setor = {
  direcao: string;
  pico: any | null;
  afetaFachada: boolean;
  atrasDaFachada: boolean;
  bloqueio?: { horas: string[] } | null;
};

const AZIMUTE: Record<string, number> = {
  Norte: 0, Nordeste: 45, Leste: 90, Sudeste: 135,
  Sul: 180, Sudoeste: 225, Oeste: 270, Noroeste: 315,
};
const SIGLA: Record<string, string> = {
  Norte: "N", Nordeste: "NE", Leste: "L", Sudeste: "SE",
  Sul: "S", Sudoeste: "SO", Oeste: "O", Noroeste: "NO",
};

const polar = (cx: number, cy: number, r: number, az: number) => {
  const rad = (az * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
};

const fatia = (cx: number, cy: number, r: number, az0: number, az1: number) => {
  const a = polar(cx, cy, r, az0);
  const b = polar(cx, cy, r, az1);
  const grande = az1 - az0 > 180 ? 1 : 0;
  return `M${cx},${cy} L${a.x.toFixed(1)},${a.y.toFixed(1)} A${r},${r} 0 ${grande},1 ${b.x.toFixed(1)},${b.y.toFixed(1)} Z`;
};

const tipoObstaculo = (pico: any) =>
  pico?.ponto?.mascara === 0 ? "Vegetação provável" : pico?.ponto?.mascara === 1 ? "Edificação vizinha" : "Não classificado";

export function ResumoEntorno({
  setores,
  direcaoPrincipal,
  azimuteFachada,
}: {
  setores: Setor[];
  direcaoPrincipal?: string;
  azimuteFachada: number | null;
}) {
  const CX = 130, CY = 130, R = 98, R_MIN = 14;
  const maxAng = Math.max(10, ...setores.map((s) => Number(s.pico?.anguloObstrucaoGraus) || 0));
  const escala = Math.ceil(maxAng / 5) * 5; // topo da escala, em graus
  const raioDe = (ang: number) => R_MIN + (Math.min(ang, escala) / escala) * (R - R_MIN);

  const comDado = setores.filter((s) => s.pico);
  const atras = setores.filter((s) => !s.pico && s.atrasDaFachada).map((s) => s.direcao);
  const semDado = setores.filter((s) => !s.pico && !s.atrasDaFachada).map((s) => s.direcao);

  const corDaFatia = (s: Setor) =>
    s.direcao === direcaoPrincipal ? "fill-rose-500" : s.afetaFachada ? "fill-brand-strong" : "fill-slate-300";

  return (
    <div className="grid grid-cols-[250px_1fr] items-center gap-5">
      {/* Rosa */}
      <div>
        <svg viewBox="0 0 260 260" className="h-auto w-full" role="img" aria-label="Rosa de obstáculos por direção">
          {azimuteFachada !== null && (
            <path d={fatia(CX, CY, R, azimuteFachada - 90, azimuteFachada + 90)} className="fill-brand-soft/70" />
          )}
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <circle key={f} cx={CX} cy={CY} r={R_MIN + f * (R - R_MIN)} fill="none" className="stroke-line" strokeDasharray={f === 1 ? undefined : "3 3"} />
          ))}
          {Object.keys(AZIMUTE).map((d) => {
            const p = polar(CX, CY, R, AZIMUTE[d]);
            return <line key={d} x1={CX} y1={CY} x2={p.x} y2={p.y} className="stroke-line" />;
          })}

          {setores.map((s) => {
            const ang = Number(s.pico?.anguloObstrucaoGraus);
            if (!s.pico || !Number.isFinite(ang) || ang <= 0) return null;
            const az = AZIMUTE[s.direcao];
            return <path key={s.direcao} d={fatia(CX, CY, raioDe(ang), az - 18, az + 18)} className={corDaFatia(s)} fillOpacity={s.afetaFachada || s.direcao === direcaoPrincipal ? 0.9 : 0.7} />;
          })}

          {Object.keys(AZIMUTE).map((d) => {
            const p = polar(CX, CY, R + 13, AZIMUTE[d]);
            return (
              <text key={d} x={p.x} y={p.y + 3.5} textAnchor="middle" className={`text-[10px] ${d === direcaoPrincipal ? "fill-rose-600 font-bold" : "fill-ink-soft font-semibold"}`}>
                {SIGLA[d]}
              </text>
            );
          })}

          <text x={CX + 3} y={CY - R + 10} className="fill-ink-soft text-[8px]">{escala}°</text>
          <circle cx={CX} cy={CY} r={2} className="fill-ink" />
        </svg>

        <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[9px] text-ink-soft">
          <span className="flex items-center gap-1"><i className="size-2 bg-rose-500" />Principal</span>
          <span className="flex items-center gap-1"><i className="size-2 bg-brand-strong" />Atinge a fachada</span>
          <span className="flex items-center gap-1"><i className="size-2 bg-slate-300" />Sem efeito</span>
          <span className="flex items-center gap-1"><i className="size-2 bg-brand-soft" />Frente da fachada</span>
        </div>
      </div>

      {/* Tabela */}
      <div className="min-w-0">
        <p className="mb-1.5 text-[10px] leading-snug text-ink-soft">
          Cada barra mostra a que altura no céu (em graus) o maior obstáculo da direção bloqueia o sol. Quanto maior a barra, mais alto o obstáculo.
        </p>
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full border-collapse text-left text-[10px]">
            <thead>
              <tr className="bg-ink-deep text-[9.5px] font-extrabold uppercase tracking-wider text-white">
                <th className="px-3 py-2">Direção</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2 text-right">Ângulo</th>
                <th className="px-2 py-2 text-right">Dist.</th>
                <th className="px-2 py-2 text-right">Altura</th>
                <th className="px-3 py-2">Tipo · horários bloqueados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {comDado.map((s) => {
                const principal = s.direcao === direcaoPrincipal;
                const altura = s.pico.alturaObstaculoAcimaDoSoloMetros ?? s.pico.alturaObstaculoMetros;
                const horas = s.bloqueio?.horas ?? [];
                return (
                  <tr key={s.direcao} className={principal ? "bg-rose-50 font-semibold text-rose-900" : "bg-white text-ink"}>
                    <td className="px-3 py-1.5 font-bold tabular-nums">
                      {s.direcao}
                      <span className="ml-1 font-mono text-[9px] font-normal text-ink-soft">({AZIMUTE[s.direcao]}°)</span>
                    </td>
                    <td className="px-2 py-1.5">
                      {principal ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[9px] font-extrabold uppercase text-rose-700">
                          <span className="size-1.5 rounded-full bg-rose-600" />
                          Principal
                        </span>
                      ) : s.afetaFachada ? (
                        <span className="inline-flex rounded-full bg-surface-soft px-2 py-0.5 text-[9px] font-bold text-brand-deep">Atinge a fachada</span>
                      ) : (
                        <span className="inline-flex rounded-full bg-canvas px-2 py-0.5 text-[9px] font-semibold text-ink-soft">Sem efeito</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold tabular-nums">{formatarNumero(s.pico.anguloObstrucaoGraus, 1)}°</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{s.pico.distanciaObstaculoMetros != null ? `${formatarNumero(s.pico.distanciaObstaculoMetros, 0)} m` : "–"}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{altura != null ? `${formatarNumero(altura, 1)} m` : "–"}</td>
                    <td className="px-3 py-1.5 text-[9.5px]">
                      <span className="text-ink-soft">{tipoObstaculo(s.pico)}</span>
                      {horas.length > 0 && <span className="block font-bold text-rose-700">{horas.slice(0, 4).join(" · ")}{horas.length > 4 ? ` +${horas.length - 4}` : ""}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {atras.length > 0 && (
          <p className="mt-2 text-[9px] leading-snug text-ink-soft">
            Atrás da fachada, sem efeito no sol dela: {atras.join(", ")}.
          </p>
        )}
        {semDado.length > 0 && (
          <p className="mt-1 text-[9px] leading-snug text-ink-soft">Sem dado do satélite: {semDado.join(", ")}.</p>
        )}
      </div>
    </div>
  );
}

export default ResumoEntorno;