import { createClient } from "@supabase/supabase-js";
import { defineTask } from "nitro/task";
import { parsearFeedInmet, type AlertaInmet } from "@/lib/inmet-alertas";
import {
  enviarTelegram,
  publicarAlertasElegiveis,
  type ArmazenamentoPublicacoes,
} from "@/lib/alertas-rs-telegram";

const FEED_URL = "https://apiprevmet3.inmet.gov.br/avisos/rss";
const LOCK_TTL_SECONDS = 15 * 60;

interface WorkerSecrets {
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

function criarClienteSupabase(serviceRoleKey: string) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) throw new Error("VITE_SUPABASE_URL não está configurada.");

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default defineTask({
  meta: {
    name: "inmet:sync",
    description: "Atualiza alertas do Inmet e publica novos avisos nos canais regionais.",
  },
  async run() {
    const env = secrets();
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Configure SUPABASE_SERVICE_ROLE_KEY como segredo do Worker.");
    }
    if (!env.TELEGRAM_BOT_TOKEN) {
      throw new Error("Configure TELEGRAM_BOT_TOKEN como segredo do Worker.");
    }
    const botToken = env.TELEGRAM_BOT_TOKEN;

    const response = await fetch(FEED_URL, {
      headers: { "User-Agent": "EcomindsX-AlertasRS/1.0" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      throw new Error(`O feed do Inmet respondeu com HTTP ${response.status}.`);
    }

    const agora = new Date();
    const xml = await response.text();
    const alertas = parsearFeedInmet(xml, agora);
    const database = criarClienteSupabase(env.SUPABASE_SERVICE_ROLE_KEY);
    const { error: syncError } = await database.rpc("sincronizar_alertas_inmet", {
      p_alertas: alertas,
    });
    if (syncError) throw new Error(`Falha ao salvar alertas no Supabase: ${syncError.message}`);

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
      alertas as AlertaInmet[],
      agora,
      armazenamento,
      (canal, mensagem) => enviarTelegram(botToken, canal, mensagem),
    );

    if (resultado.falhas > 0) {
      console.error(`${resultado.falhas} alerta(s) não foram publicados e serão tentados novamente.`);
    }

    console.info(
      `Coleta do Inmet concluída: ${alertas.length} alerta(s) regional(is), ${resultado.publicados} publicação(ões).`,
    );
    return { result: resultado };
  },
});
