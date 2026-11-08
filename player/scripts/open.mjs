// Ouvre un projet dans le navigateur : npm run open -- ../examples/presentation-suite
import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const dir = path.resolve(process.argv[2] ?? "../examples/presentation-suite");
if (!fs.existsSync(path.join(dir, "project.json"))) {
  console.error(`Aucun project.json dans : ${dir}`);
  process.exit(1);
}
process.env.LS_PROJECT_DIR = dir;
const noOpen = process.argv.includes("--no-open");
const port = Number(process.env.PORT ?? 5180);
const server = await createServer({ server: { port, strictPort: true, open: !noOpen } });
await server.listen();
console.log(`\nProjet : ${dir}\nAdresse : http://localhost:${port}/\n(Ctrl+C pour arrêter)`);
