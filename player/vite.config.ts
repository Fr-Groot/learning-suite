/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { projectServer } from "./scripts/project-server.mjs";

// Deux usages :
// - `npm run open` : serveur de développement qui affiche un projet du disque ;
// - `npm run build` : produit dist/player.js + dist/player.css, réutilisés par les exports.
export default defineConfig({
  plugins: [projectServer(process.env.LS_PROJECT_DIR)],
  server: { fs: { allow: [".."] } },
  build: {
    lib: { entry: "src/index.ts", name: "LearningPlayer", formats: ["iife"], fileName: () => "player.js" },
    cssCodeSplit: false,
    rollupOptions: { output: { assetFileNames: "player[extname]" } },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
