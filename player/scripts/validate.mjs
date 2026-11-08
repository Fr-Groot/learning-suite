// Vérifie un project.json : npm run validate -- ../examples/presentation-suite
import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const dir = path.resolve(process.argv[2] ?? "../examples/presentation-suite");
const schema = JSON.parse(fs.readFileSync(new URL("../../schema/project.v1.schema.json", import.meta.url), "utf8"));
const project = JSON.parse(fs.readFileSync(path.join(dir, "project.json"), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const ok = ajv.validate(schema, project);
const missing = [...JSON.stringify(project).matchAll(/"(media\/[^"]+)"/g)]
  .map((m) => m[1])
  .filter((p) => !fs.existsSync(path.join(dir, p)));
if (!ok) for (const e of ajv.errors) console.error(`✗ ${e.instancePath || "/"} : ${e.message}`);
for (const m of new Set(missing)) console.error(`✗ fichier manquant : ${m}`);
if (ok && missing.length === 0) console.log(`✓ ${dir}/project.json est valide`);
process.exit(ok && missing.length === 0 ? 0 : 1);
