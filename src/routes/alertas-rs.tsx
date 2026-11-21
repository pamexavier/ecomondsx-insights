import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, ExternalLink, MapPin, RefreshCw, Search } from "lucide-react";
import {
  chaveArea,
  listarMunicipiosRs,
  mesorregiaoDoMunicipio,
  type AlertaInmet,
} from "@/lib/inmet-alertas";
import { CANAIS_TELEGRAM_RS } from "@/lib/alertas-rs-telegram";

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

  function selecionarMunicipio(valor: string) {
    const municipioEncontrado = municipios.find(
      (item) => chaveArea(item.nome) === chaveArea(valor),
    );
    setMunicipio(municipioEncontrado?.nome ?? valor);
    if (municipioEncontrado) {
      window.localStorage.setItem(CHAVE_MUNICIPIO, municipioEncontrado.nome);
    } else {
      window.localStorage.removeItem(CHAVE_MUNICIPIO);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 pb-20 pt-3 sm:px-6 sm:pt-12">
      <header className="border-b-2 border-ink pb-4 sm:pb-6">
        <p className="text-mono text-xs font-semibold uppercase tracking-[0.16em] text-brand-strong">
          Rio Grande do Sul · Inmet
        </p>
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
        Este serviço é informativo e não substitui os avisos oficiais da Defesa Civil. Em caso de
        risco, siga as orientações da Defesa Civil do seu município. Emergência: 199 (Defesa Civil) e
        193 (Bombeiros). Para receber alertas oficiais por SMS, envie seu CEP para 40199.
      </aside>

      <section className="mt-4 grid gap-5 lg:mt-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
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
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            O aviso no celular depende do Telegram. Este site não envia notificações push.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-faint">
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
        <p role="status" className="mt-4 rounded-xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-950">
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
      <p className="mt-8 text-xs text-ink-faint">
        Fonte: Inmet. A informação pode ter atraso ou ficar indisponível.
      </p>
    </main>
  );
}
