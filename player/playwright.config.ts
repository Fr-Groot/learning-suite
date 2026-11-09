import { defineConfig } from "@playwright/test";

// Tests de bout en bout : un navigateur piloté joue les modules d'exemple comme un apprenant.
// On utilise Microsoft Edge déjà installé sur Windows (pas de navigateur à télécharger).
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  reporter: "list",
  use: { channel: "msedge", headless: true, viewport: { width: 1280, height: 800 } },
  webServer: [
    {
      command: "node scripts/open.mjs ../examples/presentation-suite --no-open",
      url: "http://localhost:5190/",
      env: { PORT: "5190" },
      reuseExistingServer: false,
    },
    {
      command: "node scripts/open.mjs ../examples/vertical-demo --no-open",
      url: "http://localhost:5191/",
      env: { PORT: "5191" },
      reuseExistingServer: false,
    },
    {
      command: "node scripts/open.mjs ../examples/activites --no-open",
      url: "http://localhost:5192/",
      env: { PORT: "5192" },
      reuseExistingServer: false,
    },
    {
      command: "node scripts/open.mjs ../examples/activites-mobile --no-open",
      url: "http://localhost:5193/",
      env: { PORT: "5193" },
      reuseExistingServer: false,
    },
    {
      command: "node scripts/open.mjs ../examples/discover-en --no-open",
      url: "http://localhost:5194/",
      env: { PORT: "5194" },
      reuseExistingServer: false,
    },
  ],
});
