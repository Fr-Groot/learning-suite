import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { scorm12Manifest } from "../src/export/manifest.ts";
import { buildPackage, indexHtml, packageName, slugify, zipPackage } from "../src/export/package.ts";
import { miniProject } from "./fixture.ts";

const media = new Map([
  ["media/accueil.mp3", new Uint8Array([1, 2, 3])],
  ["media/accueil.svg", new TextEncoder().encode("<svg/>")],
]);
const input = (format: "html5" | "scorm12") => ({ project: miniProject(), media, playerJs: "/*js*/", playerCss: "/*css*/", format });

describe("export", () => {
  it("paquet SCORM 1.2 : lecteur, projet embarqué, médias et manifeste", () => {
    const files = buildPackage(input("scorm12"));
    expect([...files.keys()]).toEqual([
      "index.html", "player.js", "player.css", "project.js", "media/accueil.mp3", "media/accueil.svg", "imsmanifest.xml",
    ]);
    const projectJs = new TextDecoder().decode(files.get("project.js"));
    expect(projectJs).toMatch(/^window\.__LS_PROJECT__ = \{/);
  });

  it("paquet HTML5 : pas de manifeste, suivi local", () => {
    const files = buildPackage(input("html5"));
    expect(files.has("imsmanifest.xml")).toBe(false);
    expect(new TextDecoder().decode(files.get("index.html"))).toContain(`tracker: "local"`);
  });

  it("le manifeste liste tous les fichiers et le seuil de réussite", () => {
    const xml = scorm12Manifest(miniProject(), ["index.html", "media/accueil.svg"]);
    expect(xml).toContain(`<file href="index.html"/>`);
    expect(xml).toContain(`<file href="media/accueil.svg"/>`);
    expect(xml).toContain(`<adlcp:masteryscore>70</adlcp:masteryscore>`);
    expect(xml).toContain(`adlcp:scormtype="sco" href="index.html"`);
  });

  it("pas de seuil dans le manifeste si rien n'est noté", () => {
    const p = miniProject();
    p.pages = [p.pages[0]];
    expect(scorm12Manifest(p, ["index.html"])).not.toContain("masteryscore");
  });

  it("échappe les caractères spéciaux du titre", () => {
    const p = miniProject();
    p.meta.title = `Sécurité & "accès" <admin>`;
    expect(scorm12Manifest(p, [])).toContain("Sécurité &amp; &quot;accès&quot; &lt;admin&gt;");
    expect(indexHtml(p, "scorm12")).toContain("<title>Sécurité &amp; &quot;accès&quot; &lt;admin&gt;</title>");
  });

  it("refuse un média hors du dossier media/", () => {
    const bad = new Map([["../secret.txt", new Uint8Array()]]);
    expect(() => buildPackage({ ...input("html5"), media: bad })).toThrow(/refusé/);
  });

  it("le zip se relit à l'identique", () => {
    const files = buildPackage(input("scorm12"));
    const back = unzipSync(zipPackage(files));
    expect(Object.keys(back).sort()).toEqual([...files.keys()].sort());
    expect(back["media/accueil.mp3"]).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("nom de fichier lisible", () => {
    expect(slugify("Découvrir Learning Suite !")).toBe("decouvrir-learning-suite");
    expect(packageName(miniProject(), "scorm12")).toBe("mini-module-de-demonstration-scorm12.zip");
  });
});
