import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import type { AlertaInmet } from "@/lib/inmet-alertas";

const TEMPO_LIMITE_DADOS_MINUTOS = 30;

interface RuntimeEnv {
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

interface Snapshot {
  alerts: AlertaInmet[];
  updatedAt: string | null;
  isStale: boolean;
}

function runtimeEnv(): RuntimeEnv {
  return (
    globalThis as typeof globalThis & {
      process?: { env?: RuntimeEnv };
    }
  ).process?.env ?? {};
}

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function criarClienteSupabase(serviceRoleKey: string) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) throw new Error("VITE_SUPABASE_URL não está configurada.");

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function lerSnapshot(database: ReturnType<typeof criarClienteSupabase>): Promise<Snapshot> {
  const [alertasResult, statusResult] = await Promise.all([
    database.from("alertas_inmet").select("*").order("inicio", { ascending: true }),
    database
      .from("inmet_sync_status")
      .select("atualizado_em")
      .eq("id", "rs")
      .maybeSingle(),
  ]);

  if (alertasResult.error) throw new Error(alertasResult.error.message);
  if (statusResult.error) throw new Error(statusResult.error.message);

  const updatedAt: string | null = statusResult.data?.atualizado_em ?? null;
  const agora = Date.now();
  const alerts = (alertasResult.data ?? []).filter(
    (alerta) => !alerta.fim || new Date(alerta.fim).getTime() >= agora,
  ) as AlertaInmet[];
  const atualizadoEmMs = updatedAt ? new Date(updatedAt).getTime() : Number.NaN;
  const minutosDesdeAtualizacao = Number.isFinite(atualizadoEmMs)
    ? (agora - atualizadoEmMs) / 60_000
    : Number.POSITIVE_INFINITY;

  return {
    alerts,
    updatedAt,
    isStale: minutosDesdeAtualizacao > TEMPO_LIMITE_DADOS_MINUTOS,
  };
}

export const Route = createFileRoute("/api/alertas-rs")({
  server: {
    handlers: {
      GET: async () => {
        const env = runtimeEnv();
        const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

        if (!serviceRoleKey) {
          return jsonResponse(
            {
              alerts: [],
              updatedAt: null,
              isStale: true,
              error:
                "O serviço de alertas ainda não foi configurado. Configure a chave de acesso do Supabase.",
            },
            503,
          );
        }

        try {
          const database = criarClienteSupabase(serviceRoleKey);
          const snapshot = await lerSnapshot(database);
          return jsonResponse({
            ...snapshot,
            error: null,
          });
        } catch (error) {
          console.error("Falha ao consultar os alertas meteorológicos do RS.", error);

          return jsonResponse(
            {
              alerts: [],
              updatedAt: null,
              isStale: true,
              error:
                "Não foi possível consultar os avisos salvos. Tente novamente mais tarde.",
            },
            502,
          );
        }
      },
    },
  },
});
