import { createFileRoute } from "@tanstack/react-router";
import { MOCK_PAYLOAD } from "@/lib/mock-trends";

// Public read-only endpoint. n8n can POST/GET trend payloads here later;
// for now we return mock data so the dashboard always has something to render.
export const Route = createFileRoute("/api/tendencias")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify(MOCK_PAYLOAD), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=30",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      },
    },
  },
});
