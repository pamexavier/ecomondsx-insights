import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  Copy,
  ExternalLink,
  MapPin,
  RefreshCw,
  Search,
  Volume2,
} from "lucide-react";
import {
  chaveArea,
  listarMunicipiosRs,
  mesorregiaoDoMunicipio,
  type AlertaInmet,
} from "@/lib/inmet-alertas";
import { CANAIS_TELEGRAM_RS, TOPICOS_NTFY_RS } from "@/lib/alertas-rs-telegram";

interface RespostaAlertas {
  alerts: AlertaInmet[];
  updatedAt: string | null;
  isStale: boolean;
  error: string | null;
}

const CHAVE_MUNICIPIO = "ecomindsx-alertas-rs-municipio";
const municipios = listarMunicipiosRs();



export const Route = createFileRoute("/alertas-rs")({
  component: AlertasRsPage,
});

function formatarData(valor: string | null): string {
  if (!valor) return "Não informado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(valor));
}

function nivelVisual(nivel: number): { label: string; className: string } {
  if (nivel === 3) {
    return {
      label: "Vermelho · Grande perigo",
      className: "border-red-300 bg-red-50 text-red-800",
    };
  }
  if (nivel === 2) {
    return { label: "Laranja · Perigo", className: "border-orange-300 bg-orange-50 text-orange-800" };
  }
  if (nivel === 1) {
    return {
      label: "Amarelo · Perigo potencial",
      className: "border-amber-300 bg-amber-50 text-amber-800",
    };
  }
  return { label: "Nível não informado", className: "border-line bg-surface-soft text-ink-soft" };
}

function AlertCard({
  alerta,
  regiaoSelecionada,
}: {
  alerta: AlertaInmet;
  regiaoSelecionada: string | null;
}) {
  const nivel = nivelVisual(alerta.nivel);
  const destaque = Boolean(regiaoSelecionada && alerta.areas.includes(regiaoSelecionada));

  return (
    <article
      className={`rounded-2xl border bg-surface p-5 shadow-sm transition-colors ${
        destaque
          ? "border-brand-strong bg-orange-50/60 ring-2 ring-brand-strong/20"
          : "border-orange-200 bg-orange-50/60"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${nivel.className}`}>
              {nivel.label}
            </span>
            {destaque && (
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong">
                Região do município selecionado
              </span>
            )}
          </div>
          <h3 className="text-display text-xl font-medium text-ink">{alerta.evento}</h3>
        </div>
        {alerta.link && (
          <a
            href={alerta.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-brand-strong transition-colors hover:bg-surface-soft"
          >
            Ver gráfico do Inmet
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        )}
      </div>

      <div className="mt-4 grid gap-3 text-sm text-ink-soft sm:grid-cols-2">
        <p>
          <span className="font-semibold text-ink">Vigência:</span>{" "}
          {formatarData(alerta.inicio)} até {formatarData(alerta.fim)}
        </p>
        <p>
          <span className="font-semibold text-ink">Região:</span> {alerta.areas.join(", ")}
        </p>
      </div>
      {alerta.descricao && (
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
          {alerta.descricao}
        </p>
      )}
    </article>
  );
}

function ListaAlertas({
  titulo,
  alertas,
  regiaoSelecionada,
}: {
  titulo: string;
  alertas: AlertaInmet[];
  regiaoSelecionada: string | null;
}) {
  return (
    <section className="mt-8" aria-labelledby={`titulo-${titulo.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="mb-4 flex items-center gap-3">
        <h2
          id={`titulo-${titulo.toLowerCase().replace(/\s/g, "-")}`}
          className="text-display text-2xl font-medium text-ink"
        >
          {titulo}
        </h2>
        <span className="rounded-full bg-surface-soft px-2.5 py-1 text-xs font-semibold text-ink-soft">
          {alertas.length}
        </span>
      </div>
      {alertas.length ? (
        <div className="space-y-4">
          {alertas.map((alerta) => (
            <AlertCard key={alerta.id} alerta={alerta} regiaoSelecionada={regiaoSelecionada} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-line bg-surface/70 p-5 text-sm text-ink-soft">
          Nenhum aviso {titulo === "Em vigor" ? "em vigor" : "previsto"} para as regiões do Rio Grande do Sul.
        </p>
      )}
    </section>
  );
}

function AlertasRsPage() {
  const [resposta, setResposta] = useState<RespostaAlertas | null>(null);
  const [municipio, setMunicipio] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const carregarAlertas = useCallback(async (signal?: AbortSignal) => {
    setAtualizando(true);
    try {
      const response = await fetch("/api/alertas-rs", { signal, cache: "no-store" });
      const data = (await response.json()) as RespostaAlertas;
      setResposta(data);
      if (!response.ok && !data.error) {
        throw new Error("Não foi possível carregar os avisos meteorológicos.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setResposta((anterior) => ({
        alerts: anterior?.alerts ?? [],
        updatedAt: anterior?.updatedAt ?? null,
        isStale: true,
        error: "Não foi possível consultar os avisos. Verifique sua conexão e tente novamente.",
      }));
    } finally {
      if (!signal?.aborted) {
        setCarregando(false);
        setAtualizando(false);
      }
    }
  }, []);

  useEffect(() => {
    const armazenado = window.localStorage.getItem(CHAVE_MUNICIPIO) ?? "";
    if (armazenado && mesorregiaoDoMunicipio(armazenado)) setMunicipio(armazenado);

    const controller = new AbortController();
    void carregarAlertas(controller.signal);
    return () => controller.abort();
  }, [carregarAlertas]);

  const regiaoSelecionada = useMemo(
    () => (municipio ? mesorregiaoDoMunicipio(municipio) : null),
    [municipio],
  );
  const agora = Date.now();
  const alertas = resposta?.alerts ?? [];
  const emVigor = alertas.filter(
    (alerta) => !alerta.inicio || new Date(alerta.inicio).getTime() <= agora,
  );
  const previstos = alertas.filter(
    (alerta) => alerta.inicio && new Date(alerta.inicio).getTime() > agora,
  );
  const canalDaRegiao = regiaoSelecionada
    ? CANAIS_TELEGRAM_RS[regiaoSelecionada as keyof typeof CANAIS_TELEGRAM_RS]
    : null;
  const topicoNtfy = regiaoSelecionada
  ? TOPICOS_NTFY_RS[regiaoSelecionada as keyof typeof TOPICOS_NTFY_RS]
  : null;

  function selecionarMunicipio(valor: string) {
    const municipioEncontrado = municipios.find(
      (item) => chaveArea(item.nome) === chaveArea(valor),
    );
    setMunicipio(municipioEncontrado?.nome ?? valor);
    setCopiado(false);
    if (municipioEncontrado) {
      window.localStorage.setItem(CHAVE_MUNICIPIO, municipioEncontrado.nome);
    } else {
      window.localStorage.removeItem(CHAVE_MUNICIPIO);
    }
  }

  async function copiarTopico(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 pb-20 pt-3 sm:px-6 sm:pt-12">
      <header className="border-b-2 border-ink pb-4 sm:pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-mono text-xs font-semibold uppercase tracking-[0.16em] text-brand-strong">
            Rio Grande do Sul · Inmet
          </p>
          <span className="rounded-full border border-orange-300 bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-orange-800">
            Serviço experimental
          </span>
        </div>
        <h1 className="text-display mt-1 text-3xl font-medium leading-tight text-ink sm:mt-2 sm:text-5xl">
          Alertas RS
        </h1>
        <p className="mt-1 text-sm font-semibold text-brand-strong sm:mt-2 sm:text-base">
          Uma contribuição da EcomindsX para a prevenção de riscos climáticos.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-5 text-ink-soft sm:mt-3 sm:text-base sm:leading-relaxed">
          Acompanhe avisos meteorológicos por região e confira se o seu município está em uma área
          abrangida.
        </p>
      </header>

      <aside
        role="note"
        aria-label="Aviso importante"
        className="mt-3 rounded-xl border-2 border-brand-strong bg-orange-50 px-3 py-2.5 text-xs leading-[1.4] text-ink sm:mt-5 sm:px-4 sm:py-3 sm:text-sm sm:leading-relaxed"
      >
        <strong>Serviço experimental e informativo:</strong> não substitui os avisos oficiais da
        Defesa Civil. Em caso de risco severo, abrigue-se em local seguro e{" "}
        <strong>não deixe animais acorrentados ou presos ao ar livre</strong> (solte-os e coloque-os
        em abrigo seguro). Emergência: 199 (Defesa Civil) e 193 (Bombeiros). Alertas oficiais por
        SMS: envie seu CEP para 40199.
      </aside>

      <section className="mt-4 grid gap-5 lg:mt-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex items-center gap-2 text-brand-strong">
            <Search aria-hidden="true" className="size-5" />
            <h2 className="text-display text-xl font-medium text-ink">Buscar por município</h2>
          </div>
          <label htmlFor="municipio-rs" className="mt-4 block text-sm font-semibold text-ink">
            Digite ou selecione seu município
          </label>
          <input
            id="municipio-rs"
            list="municipios-rs-list"
            type="text"
            value={municipio}
            onChange={(event) => selecionarMunicipio(event.target.value)}
            placeholder="Ex.: Porto Alegre"
            autoComplete="address-level2"
            className="mt-2 min-h-12 w-full rounded-xl border border-line bg-background px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          <datalist id="municipios-rs-list">
            {municipios.map((item) => (
              <option key={item.nome} value={item.nome} />
            ))}
          </datalist>
          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-ink-soft">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-strong" />
            O Inmet emite o aviso para a região inteira, não para um ponto exato.
          </p>
          {municipio && regiaoSelecionada && (
            <p className="mt-3 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand-strong">
              <strong>{municipio}</strong> pertence à região <strong>{regiaoSelecionada}</strong>.
              O município fica salvo apenas neste navegador.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex items-center gap-2 text-brand-strong">
            <Bell aria-hidden="true" className="size-5" />
            <h2 className="text-display text-xl font-medium text-ink">Receber alertas</h2>
          </div>

          {canalDaRegiao ? (
            <a
              href={canalDaRegiao}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-strong px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand"
            >
              Acompanhar canal da região no Telegram
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          ) : (
            <p className="mt-4 rounded-xl border border-line bg-surface-soft p-3 text-sm text-ink-soft">
              Selecione um município para ver o canal da sua região.
            </p>
          )}

          {/* Bloco ntfy - Alarme sonoro prioritário */}
          <div className="mt-5 border-t border-line pt-4">
            <div className="flex items-center gap-2 text-brand-strong">
              <Volume2 aria-hidden="true" className="size-4 shrink-0" />
              <h3 className="text-sm font-semibold text-ink">
                Alarme sonoro de tempestade (app ntfy · teste)
              </h3>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
              O Telegram não toca como alarme de madrugada. Para receber um toque alto quando houver
              vento forte se aproximando a oeste, use o app gratuito <strong>ntfy</strong>.
            </p>

            {topicoNtfy ? (
              <div className="mt-3 rounded-xl border border-line bg-surface-soft p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Código do tópico para {municipio}
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <code className="truncate rounded bg-background px-2 py-1 text-xs font-semibold text-ink">
                    {topicoNtfy}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copiarTopico(topicoNtfy)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-brand-strong transition-colors hover:bg-background"
                  >
                    {copiado ? (
                      <>
                        <Check aria-hidden="true" className="size-3.5" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy aria-hidden="true" className="size-3.5" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2.5 rounded-xl border border-dashed border-line bg-surface-soft/70 p-2.5 text-xs text-ink-soft">
                Alarme sonoro em fase de testes para <strong>Porto Alegre</strong> e{" "}
                <strong>Tupanciretã</strong>. Selecione uma dessas cidades para ver o código do
                tópico.
              </p>
            )}

            <details className="mt-3 rounded-xl border border-line bg-background/60 p-3 text-xs text-ink-soft">
              <summary className="cursor-pointer font-semibold text-brand-strong">
                Como baixar e configurar o ntfy em 3 passos
              </summary>
              <ol className="mt-2.5 list-decimal space-y-2 pl-4 leading-relaxed">
                <li>
                  <strong className="text-ink">Baixe o app gratuito ntfy</strong> no seu celular:{" "}
                  <a
                    href="https://play.google.com/store/apps/details?id=io.heckel.ntfy"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-brand-strong underline"
                  >
                    Android (Google Play)
                  </a>{" "}
                  ou{" "}
                  <a
                    href="https://apps.apple.com/app/ntfy/id1625396347"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-brand-strong underline"
                  >
                    iPhone (App Store)
                  </a>
                  .
                </li>
                <li>
                  <strong className="text-ink">Entre no canal da cidade:</strong> abra o app, toque
                  no botão <strong>+</strong> (Inscrever-se em tópico), cole o código acima e toque
                  em <strong>Inscrever-se</strong>.
                </li>
                <li>
                  <strong className="text-ink">Faça tocar alto de madrugada:</strong> dentro do ntfy,
                  vá em <em>Configurações</em> e ative{" "}
                  <em>&ldquo;Continuar alertando para prioridade máxima&rdquo;</em>. No{" "}
                  <strong>Android</strong>, libere <em>Ignorar Não Perturbe</em> nas notificações do
                  app; no <strong>iPhone</strong>, adicione o ntfy nas exceções do modo{" "}
                  <em>Não Perturbe</em> (Ajustes &gt; Foco).
                </li>
              </ol>
            </details>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            Não pedimos endereço, nome ou login. O município é opcional e fica somente no seu
            navegador.
          </p>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="titulo-regioes">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
          <div>
            <p className="text-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-strong">
              Monitoramento regional
            </p>
            <h2 id="titulo-regioes" className="text-display mt-1 text-2xl font-medium text-ink">
              Regiões em alerta
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void carregarAlertas()}
            disabled={atualizando}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-brand-strong transition-colors hover:bg-surface-soft disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw aria-hidden="true" className={`size-4 ${atualizando ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          Última atualização:{" "}
          <strong className="text-ink">
            {resposta?.updatedAt ? formatarData(resposta.updatedAt) : "aguardando consulta"}
          </strong>
        </p>
      </section>

      {resposta?.isStale && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-950"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p>
            Os dados salvos têm mais de 30 minutos ou ainda não há atualização disponível.
            {resposta.error && ` ${resposta.error}`}
          </p>
        </div>
      )}
      {!resposta?.isStale && resposta?.error && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-950"
        >
          {resposta.error}
        </p>
      )}

      {carregando ? (
        <p className="mt-8 rounded-2xl border border-line bg-surface p-6 text-sm text-ink-soft">
          Consultando os avisos do Inmet...
        </p>
      ) : (
        <>
          <ListaAlertas titulo="Em vigor" alertas={emVigor} regiaoSelecionada={regiaoSelecionada} />
          <ListaAlertas titulo="Previstos" alertas={previstos} regiaoSelecionada={regiaoSelecionada} />
        </>
      )}

      <section
        aria-labelledby="titulo-motivacao"
        className="mt-10 rounded-2xl border border-line bg-surface p-5 sm:p-6"
      >
        <p className="text-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-strong">
          Sobre a iniciativa
        </p>
        <h2 id="titulo-motivacao" className="text-display mt-1 text-xl font-medium text-ink sm:text-2xl">
          Por que criamos o Alertas RS
        </h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
          <p>
            Eventos extremos recentes no Rio Grande do Sul — como a tempestade severa na madrugada
            de 20 de novembro — mostraram que avisos amplos demais ou atrasados muitas vezes não dão
            tempo hábil para que as pessoas se protejam e coloquem seus animais em segurança.
          </p>
          <p>
            Esta ferramenta nasceu como uma contribuição independente da EcomindsX para encurtar a
            distância entre os dados meteorológicos e quem está na ponta, sem anúncios, sem cadastro
            e sem coletar dados pessoais.
          </p>
          <p className="text-xs text-ink-faint">
            O sistema está em fase experimental e em evolução contínua (incluindo testes de
            monitoramento de curto prazo a oeste das cidades). Use sempre como uma camada extra de
            atenção junto aos canais oficiais.
          </p>
        </div>
      </section>

      <p className="mt-8 text-xs text-ink-faint">
        Fonte: Inmet. A informação pode ter atraso ou ficar indisponível.
      </p>
    </main>
  );
}