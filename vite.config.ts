import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const nitro = {
  preset: "cloudflare-module",
  serverDir: "server",
  experimental: { tasks: true },
  scheduledTasks: {
    "* * * * *": ["inmet:sync"],
    "*/5 * * * *": ["nowcast:trigger"],
  },
};

export default defineConfig({
  nitro,
});
