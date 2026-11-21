import { formatarNumero } from "@/utils/calculosBioclimaticos";

export function ResumoEntorno({
  setores,
  direcaoPrincipal,
}: {
  setores: any[];
  direcaoPrincipal?: string;
  azimuteFachada?: number | null;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#DCE4DF]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#F7FAF8] border-b border-[#DCE4DF] text-[8px] font-black uppercase tracking-wider text-[#52605B]">
            <th className="py-1.5 px-2.5">Setor Cardeal</th>
            <th className="py-1.5 px-2.5">Ângulo Máx.</th>
            <th className="py-1.5 px-2.5">Distância</th>
            <th className="py-1.5 px-2.5">Altura Est.</th>
            <th className="py-1.5 px-2.5">Interferência na Fachada</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#DCE4DF] text-[9.5px]">
          {(setores || []).map((s) => {
            const ehPrincipal =
              direcaoPrincipal && s.direcao === direcaoPrincipal;
            const ang = s.pico?.anguloObstrucaoGraus;
            const dist = s.pico?.distanciaObstaculoMetros;
            const alt =
              s.pico?.alturaObstaculoAcimaDoSoloMetros ??
              s.pico?.alturaObstaculoMetros;

            return (
              <tr
                key={s.direcao}
                className={
                  ehPrincipal
                    ? "bg-rose-50/80 font-semibold"
                    : s.afetaFachada
                      ? "bg-cyan-50/40"
                      : "bg-white"
                }
              >
                <td className="py-1.5 px-2.5 font-bold text-[#18221F]">
                  {s.direcao}
                </td>
                <td className="py-1.5 px-2.5 font-mono tabular-nums">
                  {ang != null ? `${formatarNumero(ang, 1)}°` : "—"}
                </td>
                <td className="py-1.5 px-2.5 font-mono tabular-nums">
                  {dist != null ? `${formatarNumero(dist, 0)} m` : "—"}
                </td>
                <td className="py-1.5 px-2.5 font-mono tabular-nums">
                  {alt != null ? `${formatarNumero(alt, 1)} m` : "—"}
                </td>
                <td className="py-1.5 px-2.5">
                  {ehPrincipal ? (
                    <span className="inline-flex items-center rounded bg-rose-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-rose-800">
                      Obstáculo Principal{" "}
                      {s.bloqueio?.horas?.length
                        ? `(${s.bloqueio.horas.slice(0, 2).join(", ")})`
                        : ""}
                    </span>
                  ) : s.afetaFachada ? (
                    <span className="inline-flex items-center rounded bg-cyan-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-cyan-800">
                      Intercepta trajetória solar
                    </span>
                  ) : s.atrasDaFachada ? (
                    <span className="text-[8.5px] text-[#7A8883]">
                      Atrás do plano da fachada
                    </span>
                  ) : (
                    <span className="text-[8.5px] text-[#255841] font-medium">
                      Livre / abaixo da trajetória
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ResumoEntorno;