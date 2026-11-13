// src/components/laudo/PaginaLeituraAplicada.tsx
//
// Página 4: leitura aplicada. A matriz horária (uma linha por estação, uma coluna por
// horário) mostra de relance onde há sol, meia-sombra, bloqueio do entorno e sombra
// própria da fachada. Os números continuam sendo AMOSTRAS classificadas, não horas
// acumuladas, e o texto interpretativo mantém as ressalvas do laudo anterior.

import { Eye, Thermometer } from "lucide-react";
import { COR_ESTACAO, ESTACOES, FOLHA_A4, LaudoFooter, LaudoHeader, ROTULO_ESTACAO } from "./LaudoChrome";

type Estado = "pleno" | "meia" | "bloqueado" | "sombra" | "noite";

function estadoDaAmostra(d: any): Estado {
  if (!d || !(Number(d.elevacao) > 0)) return "noite";
  const s = String(d.status || "");
  if (s === "Pleno Sol") return "pleno";
  if (s === "Meia Sombra") return "meia";
  const baixo = s.toLowerCase();
  if (d.obstruidoReal === true || baixo.includes("obstru") || baixo.includes("vegeta")) return "bloqueado";
  return "sombra";
}

const CELULA: Record<Estado, string> = {
  pleno: "bg-brand-deep text-white font-bold",
  meia: "bg-brand/60 text-ink-deep font-bold",
  bloqueado: "bg-rose-600 text-white font-bold",
  sombra: "bg-line text-ink-soft",
  noite: "border border-dashed border-line bg-canvas text-ink-faint",
};

export function PaginaLeituraAplicada({
  fachadaAtual,
  cidade,
  uf,
  zona,
  subzona,
  fonteSombreamentoResumo,
  leituraSolar,
  calculoSolarAtual,
  nomeProjeto,
  pagina,
  totalPaginas,
  codigo,
}: {
  fachadaAtual: string;
  cidade: string;
  uf: string;
  zona?: string;
  subzona?: string;
  fonteSombreamentoResumo?: string;
  leituraSolar: { porEstacao: any[]; pontosComDado: number };
  calculoSolarAtual: any;
  nomeProjeto: string;
  pagina: number;
  totalPaginas: number;
  codigo?: string;
}) {
  const porEstacao = leituraSolar.porEstacao;
  const comDados = porEstacao.filter((i) => i.percentualSol != null);
  const maior = [...comDados].sort((a, b) => (b.percentualSol ?? 0) - (a.percentualSol ?? 0))[0];
  const menor = [...comDados].sort((a, b) => (a.percentualSol ?? 0) - (b.percentualSol ?? 0))[0];

  // Colunas = união dos horários presentes em qualquer estação (ex.: 06h … 18h)
  const horas: number[] = Array.from(
    new Set(
      ESTACOES.flatMap((e) =>
        Object.keys(calculoSolarAtual?.[e] ?? {})
          .map((h) => parseInt(h, 10))
          .filter((h) => Number.isFinite(h)),
      ),
    ),
  ).sort((a, b) => a - b);

  const colunas = `84px repeat(${Math.max(horas.length, 1)}, minmax(0, 1fr)) 70px`;
  const fonteTxt = fonteSombreamentoResumo === "perfil_real_dsm" ? "Trajetória + DSM" : "Trajetória calculada";

  return (
    <article className={FOLHA_A4}>
      <LaudoHeader
        secao="03 · Leitura aplicada e matriz horária"
        nomeProjeto={nomeProjeto}
        pagina={pagina}
        totalPaginas={totalPaginas}
        codigo={codigo}
      />

      <div className="mb-3.5 flex shrink-0 items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-ink-deep">O que a orientação significa</h2>
          <p className="mt-0.5 text-[11px] text-ink-soft">
            Fachada {fachadaAtual} · {cidade}/{uf} · Zona {zona}
            {subzona}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[9px] font-bold uppercase tracking-widest text-ink-soft">Fonte solar</p>
          <p className="mt-0.5 text-sm font-black text-ink-deep">{fonteTxt}</p>
        </div>
      </div>

      {/* Maior x menor exposição */}
      {comDados.length > 0 && (
        <div className="mb-3.5 grid shrink-0 grid-cols-2 gap-3">
          <div className="rounded-2xl border border-brand/30 bg-surface-soft p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-brand-deep">Maior exposição observada</span>
              <span className="rounded-md bg-brand-deep px-2 py-0.5 text-[10px] font-black tabular-nums text-white">{maior.percentualSol}%</span>
            </div>
            <p className="mt-1 text-lg font-black tabular-nums text-ink-deep">{ROTULO_ESTACAO[maior.estacao] ?? maior.estacao}</p>
            <p className="text-[10.5px] text-ink-soft">
              {maior.solDireto} de {maior.total} amostras com sol direto
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-ink-soft">Menor exposição observada</span>
              <span className="rounded-md bg-line px-2 py-0.5 text-[10px] font-black tabular-nums text-ink-deep">{menor.percentualSol}%</span>
            </div>
            <p className="mt-1 text-lg font-black tabular-nums text-ink-deep">{ROTULO_ESTACAO[menor.estacao] ?? menor.estacao}</p>
            <p className="text-[10.5px] text-ink-soft">
              {menor.solDireto} de {menor.total} amostras com sol direto
            </p>
          </div>
        </div>
      )}

      {/* Matriz horária */}
      <section className="mb-3.5 shrink-0 rounded-2xl border border-line bg-white p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-ink-deep">Matriz horária de insolação e bloqueios</h3>
            <p className="mt-0.5 text-[10.5px] text-ink-soft">
              Cada célula é uma amostra classificada (elevação do sol em graus). São amostras, não horas acumuladas.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[9.5px] font-semibold text-ink-soft">
            <span className="flex items-center gap-1"><i className="inline-block size-2.5 rounded-sm bg-brand-deep" />Pleno sol</span>
            <span className="flex items-center gap-1"><i className="inline-block size-2.5 rounded-sm bg-brand/60" />Meia-sombra</span>
            <span className="flex items-center gap-1"><i className="inline-block size-2.5 rounded-sm bg-rose-600" />Bloqueado (entorno)</span>
            <span className="flex items-center gap-1"><i className="inline-block size-2.5 rounded-sm bg-line" />Sombra da fachada</span>
          </div>
        </div>

        <div className="mb-1.5 grid items-center gap-1 px-1 font-mono text-[9.5px] font-bold text-ink-soft" style={{ gridTemplateColumns: colunas }}>
          <span>ESTAÇÃO</span>
          {horas.map((h) => (
            <span key={h} className="text-center">{String(h).padStart(2, "0")}h</span>
          ))}
          <span className="text-right">SALDO</span>
        </div>

        <div className="space-y-1.5">
          {ESTACOES.map((est) => {
            const horarios = calculoSolarAtual?.[est] ?? {};
            const resumo = porEstacao.find((i) => i.estacao === est);
            return (
              <div key={est} className="rounded-xl border border-line bg-canvas p-1.5">
                <div className="grid items-center gap-1" style={{ gridTemplateColumns: colunas }}>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: COR_ESTACAO[est] }} />
                    <span className="text-[10.5px] font-extrabold text-ink-deep">{ROTULO_ESTACAO[est]}</span>
                  </div>

                  {horas.map((h) => {
                    const chave = Object.keys(horarios).find((k) => parseInt(k, 10) === h);
                    const d = chave ? horarios[chave] : undefined;
                    const estado = estadoDaAmostra(d);
                    const rotulo =
                      estado === "pleno" || estado === "meia"
                        ? `${Math.round(Number(d.elevacao))}°`
                        : estado === "bloqueado"
                        ? "BLQ"
                        : estado === "sombra"
                        ? "S"
                        : "–";
                    return (
                      <div
                        key={h}
                        className={`flex h-6 items-center justify-center rounded font-mono text-[9px] tabular-nums ${CELULA[estado]}`}
                        title={d ? `${ROTULO_ESTACAO[est]} ${String(h).padStart(2, "0")}h: ${d.status} (az ${d.azimute}°, elev ${d.elevacao}°)` : "Sol abaixo do horizonte"}
                      >
                        {rotulo}
                      </div>
                    );
                  })}

                  <div className="text-right">
                    <span className="text-xs font-black tabular-nums text-ink-deep">
                      {resumo ? `${resumo.solDireto}/${resumo.total}` : "–"}
                    </span>
                    <span className="block text-[9px] font-bold tabular-nums text-brand-deep">
                      {resumo?.percentualSol ?? 0}%{leituraSolar.pontosComDado > 0 && resumo ? ` · ${resumo.obstruidos} blq.` : ""}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {leituraSolar.pontosComDado === 0 && (
        <p className="mb-3.5 shrink-0 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[10px] leading-snug text-amber-900">
          Sem cobertura de elevação da Google para este endereço: as sombras do entorno (vizinhos e árvores) não foram medidas. O
          percentual de sol é uma estimativa pela trajetória solar e pelo telhado.
        </p>
      )}

      {/* Luz natural x térmico */}
      <section className="mb-3.5 grid shrink-0 grid-cols-2 gap-3">
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-800">
            <Eye className="size-3.5" aria-hidden="true" /> Luz natural e bem-estar
          </p>
          <p className="mt-1.5 text-[10.5px] leading-snug text-ink">
            Os períodos com incidência direta podem favorecer luz natural e contato com o ciclo do dia. Sol direto também pode causar
            ofuscamento; a carta indica quando investigar proteção ajustável. A iluminância interna não é calculada: faltam
            dimensões/orientação das aberturas, vidro e obstruções internas.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
            <Thermometer className="size-3.5" aria-hidden="true" /> Conforto térmico e energia
          </p>
          <p className="mt-1.5 text-[10.5px] leading-snug text-ink">
            Radiação na fachada representa ganho de calor: pode ser útil em períodos frios e aumentar carga de resfriamento em
            períodos quentes. A orientação ajuda a localizar horários críticos para brises, vegetação ou sombreamento externo; não
            substitui simulação térmica e não converte fachada em kWh de economia.
          </p>
        </div>
      </section>

      {/* Síntese */}
      <section className="rounded-2xl bg-ink-deep p-4 text-white">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-brand">Implicação para o partido arquitetônico</span>
          <span className="font-mono text-[9px] text-white/60">
            FACHADA {String(fachadaAtual).toUpperCase()} · ZONA {zona}
            {subzona}
          </span>
        </div>
        <p className="text-[10.5px] leading-snug text-white/85">
          Use a faixa horária observada para posicionar usos sensíveis ao calor/ofuscamento e dimensionar proteção solar externa.
          Preserve entrada de luz difusa e ventilação; não bloqueie toda a fachada com base apenas no percentual. Confirme a solução
          com geometria das aberturas, entorno construído atualizado e simulação térmica do edifício.
        </p>
      </section>

      <LaudoFooter nota="Interpretação baseada nos horários classificados e no horizonte DSM recebido" />
    </article>
  );
}

export default PaginaLeituraAplicada;
