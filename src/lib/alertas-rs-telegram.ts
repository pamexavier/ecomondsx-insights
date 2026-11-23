import { chaveArea, mesorregiaoDaArea } from "@/lib/inmet-alertas";
import type { AlertaInmet } from "@/lib/inmet-alertas";

export const CANAIS_TELEGRAM_RS = {
  "Noroeste Rio-grandense": "https://t.me/alertas_rs_noroeste",
  "Nordeste Rio-grandense": "https://t.me/alertasrs_nordeste",
  "Centro Ocidental Rio-grandense": "https://t.me/alertasrs_centroocidental",
  "Centro Oriental Rio-grandense": "https://t.me/alertasrs_centrooriental",
  "Metropolitana de Porto Alegre": "https://t.me/alertasrs_metropoa",
  "Sudoeste Rio-grandense": "https://t.me/alertasrs_sudoeste",
  "Sudeste Rio-grandense": "https://t.me/alertasrs_sudeste",
} as const;

export const TOPICOS_NTFY_RS: Record<keyof typeof CANAIS_TELEGRAM_RS, string> = {
  "Noroeste Rio-grandense": "alerta-rs-noroeste-ecomindsx",
  "Nordeste Rio-grandense": "alerta-rs-nordeste-ecomindsx",
  "Centro Ocidental Rio-grandense": "alerta-rs-centroocidental-ecomindsx",
  "Centro Oriental Rio-grandense": "alerta-rs-centrooriental-ecomindsx",
  "Metropolitana de Porto Alegre": "alerta-rs-metropoa-ecomindsx",
  "Sudoeste Rio-grandense": "alerta-rs-sudoeste-ecomindsx",
  "Sudeste Rio-grandense": "alerta-rs-sudeste-ecomindsx",
};

const CANAIS_POR_REGIAO = new Map(
  Object.entries(CANAIS_TELEGRAM_RS).map(([regiao, url]) => [
    chaveArea(regiao),
    { regiao, canal: `@${new URL(url).pathname.slice(1)}` },
  ]),
);

const ANTECEDENCIA_MAXIMA_MS = 24 * 60 * 60 * 1000;

export interface PublicacaoAlertaPendente {
  alerta: AlertaInmet;
  regiao: string;
  canal: string;
  chaveRegiao: string;
}

export interface ArmazenamentoPublicacoes {
  reservar(alertaId: string, regiao: string, canal: string): Promise<boolean>;
  marcarPublicado(alertaId: string, regiao: string): Promise<void>;
  liberarReserva(alertaId: string, regiao: string): Promise<void>;
}

export type EnviadorTelegram = (
  canal: string,
  texto: string,
  alertaId: string,
  regiao: string,
) => Promise<void>;

export function regioesDoAlerta(alerta: AlertaInmet): PublicacaoAlertaPendente[] {
  const encontradas = new Map<string, { regiao: string; canal: string }>();

  for (const area of alerta.areas) {
    const mesorregiao = CANAIS_POR_REGIAO.get(chaveArea(area));
    if (mesorregiao) encontradas.set(chaveArea(area), mesorregiao);
  }

  return [...encontradas.entries()].map(([chaveRegiao, destino]) => ({
    alerta,
    ...destino,
    chaveRegiao,
  }));
}

export function alertasElegiveisParaPublicacao(
  alertas: AlertaInmet[],
  agora: Date,
): PublicacaoAlertaPendente[] {
  const agoraMs = agora.getTime();
  const limiteMs = agoraMs + ANTECEDENCIA_MAXIMA_MS;

  return alertas
    .filter((alerta) => alerta.nivel >= 2 && alerta.nivel <= 3)
    .filter((alerta) => alerta.inicio !== null)
    .filter((alerta) => {
      const inicioMs = new Date(alerta.inicio!).getTime();
      return inicioMs <= limiteMs && (!alerta.fim || new Date(alerta.fim).getTime() >= agoraMs);
    })
    .flatMap(regioesDoAlerta);
}

export async function publicarAlertasElegiveis(
  alertas: AlertaInmet[],
  agora: Date,
  armazenamento: ArmazenamentoPublicacoes,
  enviar: EnviadorTelegram,
): Promise<{ publicados: number; falhas: number }> {
  let publicados = 0;
  let falhas = 0;

  for (const publicacao of alertasElegiveisParaPublicacao(alertas, agora)) {
    const reservado = await armazenamento.reservar(
      publicacao.alerta.id,
      publicacao.chaveRegiao,
      publicacao.canal,
    );
    if (!reservado) continue;

    try {
      await enviar(
        publicacao.canal,
        formatarMensagemAlerta(publicacao.alerta, publicacao.regiao, agora),
        publicacao.alerta.id,
        publicacao.chaveRegiao,
      );
    } catch (error) {
      await armazenamento.liberarReserva(publicacao.alerta.id, publicacao.chaveRegiao);
      console.error(
        `Não foi possível publicar o alerta ${publicacao.alerta.id} em ${publicacao.canal}.`,
        error,
      );
      falhas += 1;
      continue;
    }

    await armazenamento.marcarPublicado(publicacao.alerta.id, publicacao.chaveRegiao);
    publicados += 1;
  }

  return { publicados, falhas };
}

function dataMensagem(valor: string | null): string {
  if (!valor) return "não informado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(valor));
}

function textoSeguroTelegram(valor: string): string {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatarMensagemAlerta(
  alerta: AlertaInmet,
  regiao: string,
  agora: Date,
): string {
  const cor = alerta.nivel === 3 ? "VERMELHO" : "LARANJA";
  const estado =
    alerta.inicio && new Date(alerta.inicio).getTime() > agora.getTime()
      ? "PREVISTO"
      : "EM VIGOR";
  const link =
    alerta.link && /^https:\/\/avisos\.inmet\.gov\.br\//i.test(alerta.link)
      ? `\n<a href="${textoSeguroTelegram(alerta.link)}">Ver gráfico do Inmet</a>`
      : "";

  return [
    `⚠️ <b>ALERTA ${cor} (${textoSeguroTelegram(alerta.severidade)}) · ${estado}</b>`,
    `<b>${textoSeguroTelegram(alerta.evento)}</b>`,
    `Região: ${textoSeguroTelegram(regiao)}`,
    `Vigência: ${dataMensagem(alerta.inicio)} até ${dataMensagem(alerta.fim)}`,
    "",
    textoSeguroTelegram(alerta.descricao.slice(0, 1200)),
    "",
    "O Inmet emite o aviso para a região inteira, não para um ponto exato.",
    "Procure abrigo em construção sólida. Evite janelas, árvores, postes e áreas alagáveis.",
    "ANIMAIS: não deixe animais acorrentados ou presos ao ar livre — solte-os e coloque-os em abrigo seguro.",
    "Emergência: Defesa Civil 199 · Bombeiros 193.",
    "Serviço informativo e experimental: não substitui a Defesa Civil (SMS 40199).",
    link,
  ]
    .filter((linha) => linha !== "")
    .join("\n");
}

export async function enviarTelegram(
  token: string,
  canal: string,
  texto: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchImpl(
    `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: canal,
        text: texto,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  const resultado: unknown = await response.json();

  if (
    !response.ok ||
    typeof resultado !== "object" ||
    resultado === null ||
    !("ok" in resultado) ||
    resultado.ok !== true
  ) {
    throw new Error(`O Telegram recusou o envio para ${canal} (HTTP ${response.status}).`);
  }
}

export function areaEhMesorregiaoRs(area: string): boolean {
  return mesorregiaoDaArea(area);
}