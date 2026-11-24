import { defineTask } from "nitro/task";

export default defineTask({
  meta: {
    name: "nowcast:trigger",
    description: "Dispara o workflow nowcast-rs.yml no GitHub Actions a cada 5 minutos.",
  },
  async run() {
    const token = (
      globalThis as typeof globalThis & {
        process?: { env?: { GITHUB_TOKEN?: string } };
      }
    ).process?.env?.GITHUB_TOKEN;

    if (!token) {
      throw new Error("Configure GITHUB_TOKEN como segredo do Worker.");
    }

    const resp = await fetch(
      "https://api.github.com/repos/pamexavier/ecomondsx-insights/actions/workflows/nowcast-rs.yml/dispatches",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "EcomindsX-AlertasRS/1.0",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({ ref: "main" }),
      },
    );

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Falha ao acionar nowcast-rs.yml: HTTP ${resp.status} - ${body}`);
    }

    console.info("Workflow nowcast-rs.yml acionado com sucesso.");
    return { result: "dispatched" };
  },
});
