import { defineConfig } from "@playwright/test";

// L'interface de Studio, pilotée dans Edge. Hors de l'appli Windows, Studio utilise
// son « disque en mémoire » (src/io/memory.ts) : rien n'est écrit sur le PC.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  reporter: "list",
  use: { channel: "msedge", headless: true, viewport: { width: 1440, height: 900 }, acceptDownloads: true },
  webServer: {
    command: "npm run dev -- --port 1430 --strictPort",
    url: "http://localhost:1430/",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
