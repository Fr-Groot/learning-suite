// Génère le code du validateur à partir du schéma (src/generated/schema-validator.js).
// Pourquoi : Ajv fabrique normalement ce code au démarrage (avec « new Function »), ce que la
// sécurité de Studio (CSP) interdit. On le produit donc d'avance, une fois pour toutes.
// À relancer après chaque modification de schema/project.v1.schema.json (fait par npm test et npm run build).
import fs from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import standaloneCode from "ajv/dist/standalone/index.js";

const schemaUrl = new URL("../../schema/project.v1.schema.json", import.meta.url);
const outUrl = new URL("../src/generated/schema-validator.js", import.meta.url);

const schema = JSON.parse(fs.readFileSync(schemaUrl, "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false, code: { source: true, esm: true } });
const validate = ajv.compile(schema);
// Ajv charge un petit utilitaire avec « require » : on le remplace par sa copie, pour que
// le fichier soit un module autonome (navigateur, Node, Studio).
const UCS2 = `function ucs2length(str) {
  let length = 0, pos = 0;
  while (pos < str.length) {
    length++;
    const value = str.charCodeAt(pos++);
    if (value >= 0xd800 && value <= 0xdbff && pos < str.length && (str.charCodeAt(pos) & 0xfc00) === 0xdc00) pos++;
  }
  return length;
}`;
let body = standaloneCode(ajv, validate).replaceAll('require("ajv/dist/runtime/ucs2length").default', "ucs2length");
if (body.includes("require(")) throw new Error("Le validateur généré contient encore un require() : à traiter dans build-validator.mjs");
const code = `// FICHIER GÉNÉRÉ par scripts/build-validator.mjs à partir de schema/project.v1.schema.json.
// Ne pas modifier à la main.
${UCS2}
${body}`;

fs.mkdirSync(new URL(".", outUrl), { recursive: true });
const previous = fs.existsSync(outUrl) ? fs.readFileSync(outUrl, "utf8") : "";
if (previous !== code) {
  fs.writeFileSync(outUrl, code);
  console.log("✓ validateur régénéré");
}
