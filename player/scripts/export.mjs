// Exporte un projet : npm run export -- ../examples/presentation-suite [--format html5|scorm12|all] [--out dossier]
// 1) vérifie le projet, 2) construit le lecteur, 3) produit les zip dans exports/.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { buildPackage, packageName, zipPackage } from "../src/export/package.ts";
import { validateProject } from "../src/validate.ts";

const playerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const dir = path.resolve(args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--")) ?? "../examples/presentation-suite");
const formatArg = option("format", "all");
const formats = formatArg === "all" ? ["scorm12", "html5"] : [formatArg];
const outDir = path.resolve(option("out", path.join(playerDir, "..", "exports")));

function fail(title, errors) {
  console.error(`\n✗ ${title}`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

// 1) Vérification complète
const file = path.join(dir, "project.json");
if (!fs.existsSync(file)) fail("Projet introuvable", [`aucun project.json dans ${dir}`]);
if (formats.some((f) => !["html5", "scorm12"].includes(f))) fail("Format inconnu", [`« ${formatArg} » : utilisez html5, scorm12 ou all`]);
const project = JSON.parse(fs.readFileSync(file, "utf8"));
const { errors } = validateProject(project);
const referenced = new Set([...JSON.stringify(project).matchAll(/"(media\/[^"]+)"/g)].map((m) => m[1]));
for (const m of referenced) if (!fs.existsSync(path.join(dir, m))) errors.push(`fichier manquant : ${m}`);
if (errors.length) fail("Export impossible : le projet contient des erreurs", errors);

// 2) Lecteur à jour
await build({ root: playerDir, configFile: path.join(playerDir, "vite.config.ts"), logLevel: "warn" });
const playerJs = fs.readFileSync(path.join(playerDir, "dist", "player.js"), "utf8");
const playerCss = fs.readFileSync(path.join(playerDir, "dist", "player.css"), "utf8");

// 3) Médias : tout le dossier media/ (un jeu HTML peut avoir ses propres fichiers)
const media = new Map();
const IGNORE = new Set(["Thumbs.db", "desktop.ini", ".DS_Store"]);
function collect(abs, rel) {
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    const a = path.join(abs, entry.name);
    const r = `${rel}/${entry.name}`;
    if (entry.isDirectory()) collect(a, r);
    else media.set(r, new Uint8Array(fs.readFileSync(a)));
  }
}
if (fs.existsSync(path.join(dir, "media"))) collect(path.join(dir, "media"), "media");

fs.mkdirSync(outDir, { recursive: true });
for (const format of formats) {
  const files = buildPackage({ project, media, playerJs, playerCss, format });
  const zip = zipPackage(files);
  const target = path.join(outDir, packageName(project, format));
  fs.writeFileSync(target, zip);
  const label = format === "scorm12" ? "SCORM 1.2" : "HTML5";
  console.log(`✓ ${label} : ${target} (${files.size} fichiers, ${(zip.length / 1024).toFixed(0)} Ko)`);
}
