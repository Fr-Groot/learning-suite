import { defineConfig } from "@playwright/test";

// L'interface du lanceur, pilotée dans Edge. Hors de l'appli Windows, le lanceur utilise
// un « PC simulé » (src/io/memory.ts) : rien n'est lancé ni écrit sur le PC.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  reporter: "list",
  use: { channel: "msedge", headless: true, locale: "fr-FR", viewport: { width: 1280, height: 860 } },
  webServer: {
    command: "npm run dev -- --port 1450 --strictPort",
    url: "http://localhost:1450/",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
