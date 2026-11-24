import { createClient } from "@supabase/supabase-js";
import { defineTask } from "nitro/task";
import {
  parsearAlertasDefesaCivilRs,
  parsearFeedInmet,
  type AlertaInmet,
} from "@/lib/inmet-alertas";
import {
  enviarTelegram,
  publicarAlertasElegiveis,
  type ArmazenamentoPublicacoes,
} from "@/lib/alertas-rs-telegram";

const FEED_URL = "https://apiprevmet3.inmet.gov.br/avisos/rss";
const DEFESA_CIVIL_RS_URL = "https://www.defesacivil.rs.gov.br/alertas";
const SUPABASE_URL_FALLBACK = "https://grcayroeyqsmoahaagbh.supabase.co";
const LOCK_TTL_SECONDS = 15 * 60;

interface WorkerSecrets {
  VITE_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
}

function secrets(): WorkerSecrets {
  return (
    globalThis as typeof globalThis & {
      process?: { env?: WorkerSecrets };
    }
  ).process?.env ?? {};
}

function criarClienteSupabase(env: WorkerSecrets) {
  const url = import.meta.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK;
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Configure SUPABASE_SERVICE_ROLE_KEY como segredo do Worker.");
  }

  return createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default defineTask({
  meta: {
    name: "inmet:sync",
    description: "Atualiza alertas do Inmet e Defesa Civil RS e publica nos canais regionais.",
  },
  async run() {
    const env = secrets();
    const database = criarClienteSupabase(env);
    const agora = new Date();

    const [inmetRes, dcRes] = await Promise.allSettled([
      fetch(FEED_URL, {
        headers: { "User-Agent": "EcomindsX-AlertasRS/1.0" },
        signal: AbortSignal.timeout(20_000),
      }),
      fetch(DEFESA_CIVIL_RS_URL, {
        headers: { "User-Agent": "EcomindsX-AlertasRS/1.0" },
        signal: AbortSignal.timeout(20_000),
      }),
    ]);

    let alertasInmet: AlertaInmet[] = [];
    if (inmetRes.status === "fulfilled" && inmetRes.value.ok) {
      try {
        const xml = await inmetRes.value.text();
        alertasInmet = parsearFeedInmet(xml, agora);
      } catch (err) {
        console.error("Aviso: falha ao interpretar XML do Inmet:", err);
      }
    } else {
      console.error("Aviso: falha ao consultar feed do Inmet nesta rodada.");
    }

    let alertasDefesaCivil: AlertaInmet[] = [];
    if (dcRes.status === "fulfilled" && dcRes.value.ok) {
      try {
        const html = await dcRes.value.text();
        alertasDefesaCivil = parsearAlertasDefesaCivilRs(html, agora);
      } catch (err) {
        console.error("Aviso: falha ao interpretar HTML da Defesa Civil RS:", err);
      }
    } else {
      console.error("Aviso: falha ao consultar portal da Defesa Civil RS nesta rodada.");
    }

    const alertas = [...alertasInmet, ...alertasDefesaCivil];
    const { error: syncError } = await database.rpc("sincronizar_alertas_inmet", {
      p_alertas: alertas,
    });
    if (syncError) throw new Error(`Falha ao salvar alertas no Supabase: ${syncError.message}`);

    const botToken = env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.warn("TELEGRAM_BOT_TOKEN não configurado; alertas salvos no banco sem envio ao Telegram.");
      return { result: { publicados: 0, falhas: 0, total: alertas.length } };
    }

    const armazenamento: ArmazenamentoPublicacoes = {
      async reservar(alertaId, regiao, canal) {
        const { data, error } = await database.rpc("reservar_publicacao_alerta_inmet", {
          p_alerta_id: alertaId,
          p_regiao: regiao,
          p_canal: canal,
          p_lease_seconds: LOCK_TTL_SECONDS,
        });
        if (error) throw new Error(`Falha ao reservar a publicação do alerta: ${error.message}`);
        return data === true;
      },
      async marcarPublicado(alertaId, regiao) {
        const { error } = await database.rpc("marcar_publicacao_alerta_inmet", {
          p_alerta_id: alertaId,
          p_regiao: regiao,
        });
        if (error) throw new Error(`Falha ao registrar publicação no Supabase: ${error.message}`);
      },
      async liberarReserva(alertaId, regiao) {
        const { error } = await database.rpc("liberar_reserva_publicacao_alerta_inmet", {
          p_alerta_id: alertaId,
          p_regiao: regiao,
        });
        if (error) throw new Error(`Falha ao liberar a reserva de publicação: ${error.message}`);
      },
    };

    const resultado = await publicarAlertasElegiveis(
      alertas,
      agora,
      armazenamento,
      (canal, mensagem) => enviarTelegram(botToken, canal, mensagem),
    );

    if (resultado.falhas > 0) {
      console.error(`${resultado.falhas} alerta(s) não foram publicados e serão tentados novamente.`);
    }

    console.info(
      `Coleta concluída: ${alertasInmet.length} INMET + ${alertasDefesaCivil.length} Defesa Civil RS, ${resultado.publicados} publicação(ões).`,
    );
    return { result: resultado };
  },
});
