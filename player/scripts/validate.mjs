// Vérifie un projet : npm run validate -- ../examples/presentation-suite
// Schéma + règles de cohérence (src/validate.ts) + présence des fichiers media/.
import fs from "node:fs";
import path from "node:path";
import { validateProject } from "../src/validate.ts";

const dir = path.resolve(process.argv[2] ?? "../examples/presentation-suite");
const file = path.join(dir, "project.json");
if (!fs.existsSync(file)) {
  console.error(`Aucun project.json dans : ${dir}`);
  process.exit(1);
}
const project = JSON.parse(fs.readFileSync(file, "utf8"));
const { errors } = validateProject(project);
const media = new Set([...JSON.stringify(project).matchAll(/"(media\/[^"]+)"/g)].map((m) => m[1]));
for (const m of media) if (!fs.existsSync(path.join(dir, m))) errors.push(`fichier manquant : ${m}`);

if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}
console.log(`✓ ${path.relative(process.cwd(), file) || file} est valide (${project.pages.length} pages, ${media.size} média${media.size > 1 ? "s" : ""})`);
