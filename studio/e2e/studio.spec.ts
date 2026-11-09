// Parcours d'un auteur dans Studio : créer, construire, annuler, prévisualiser, exporter,
// puis vérifier que le paquet exporté fonctionne dans un faux LMS.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { unzipSync } from "fflate";

const STUDIO = "http://localhost:1430/";
const IMAGE = fileURLToPath(new URL("../../examples/activites/media/bureau.svg", import.meta.url));

async function newModule(page: Page, title: string, mode: "Diapositives" | "Vertical") {
  await page.goto(STUDIO);
  await page.getByRole("button", { name: "＋ Nouveau module" }).click();
  await page.getByLabel("Titre du module").fill(title);
  await page.getByText(mode, { exact: true }).click();
  await page.getByRole("button", { name: "Créer le module" }).click();
  await expect(page.locator(".st-toolbar-title strong")).toHaveText(title);
}

const item = (page: Page, id: string) => page.locator(`.st-item[data-block="${id}"]`);

test("diapositives : construire, annuler, aperçu, export SCORM qui marche dans un LMS", async ({ page }) => {
  await newModule(page, "Sécurité au bureau", "Diapositives");

  // Page depuis un modèle
  await page.getByRole("button", { name: "＋ Ajouter une page" }).click();
  await page.getByRole("dialog", { name: "Choisir un modèle de page" }).getByRole("button", { name: "Titre, texte et image" }).click();
  await expect(page.locator(".st-page")).toHaveCount(2);

  // Importer une image : le fichier est copié dans media/
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "🖼 Image" }).click();
  await (await chooser).setFiles(IMAGE);
  await expect(page.getByText("Fichier ajouté : media/bureau.svg")).toBeVisible();
  await page.getByLabel("Description (pour les lecteurs d'écran)").fill("Un bureau");

  // Une forme, déplacée à la souris ; puis annuler / rétablir
  await page.getByRole("button", { name: "◼ Forme" }).click();
  const shapeId = await page.locator(".st-item.is-selected").getAttribute("data-block");
  const shape = item(page, shapeId!);
  const before = await shape.boundingBox();
  await page.mouse.move(before!.x + 40, before!.y + 40);
  await page.mouse.down();
  await page.mouse.move(before!.x + 140, before!.y + 90, { steps: 8 });
  await page.mouse.up();
  const moved = await shape.boundingBox();
  expect(moved!.x).toBeGreaterThan(before!.x + 50);
  await page.keyboard.press("Control+z");
  await expect.poll(async () => Math.round((await shape.boundingBox())!.x)).toBe(Math.round(before!.x));
  await page.keyboard.press("Control+y");
  await expect.poll(async () => Math.round((await shape.boundingBox())!.x)).toBe(Math.round(moved!.x));

  // Modifier le titre de la page via le panneau Propriétés
  await item(page, "titre-texte-et-image-titre").click();
  const field = page.locator("#st-main-field");
  await field.fill("Les **bons** réflexes");
  await expect(item(page, "titre-texte-et-image-titre")).toContainText("Les bons réflexes");

  // Le modèle référence media/image.png, absent : la vérification le signale et l'export est bloqué
  await page.getByRole("button", { name: /problème/ }).click();
  await expect(page.getByText("Fichier manquant : media/image.png", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Fermer" }).click();
  // On vise le coin bas-droit de l'image du modèle : le reste est recouvert par l'image et la forme ajoutées.
  const img = item(page, "titre-texte-et-image-image");
  const box = (await img.boundingBox())!;
  await img.click({ position: { x: box.width - 8, y: box.height - 8 } });
  await expect(page.locator(".st-props-title")).toHaveText("Image");
  const chooser2 = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Remplacer…" }).click();
  await (await chooser2).setFiles(IMAGE);
  await expect(page.getByRole("button", { name: "✓ Vérifier" })).toBeVisible();

  // Aperçu avec le vrai lecteur, à partir de la page en cours
  await page.getByRole("button", { name: "▶ Aperçu" }).click();
  await expect(page.locator(".st-preview .lsp-counter")).toHaveText("2 / 2");
  await expect(page.locator(".st-preview").getByText("Les bons réflexes")).toBeVisible();
  await page.getByRole("button", { name: "✕ Fermer l'aperçu" }).click();

  // Export SCORM 1.2
  await page.getByRole("button", { name: "⇪ Exporter" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter…" }).click();
  const zipPath = await (await download).path();
  const files = unzipSync(new Uint8Array(fs.readFileSync(zipPath!)));
  expect(Object.keys(files).sort()).toEqual(
    ["imsmanifest.xml", "index.html", "media/bureau-2.svg", "media/bureau.svg", "player.css", "player.js", "project.js"].sort(),
  );
  const manifest = new TextDecoder().decode(files["imsmanifest.xml"]);
  expect(manifest).toContain("<title>Sécurité au bureau</title>");

  // Le paquet joué dans un faux LMS : l'API SCORM est appelée et la page s'affiche.
  await page.route("http://lms.test/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/lms") {
      return route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><meta charset="utf-8"><script>
          window.calls = []; const data = { "cmi.core.lesson_status": "not attempted" };
          window.API = { LMSInitialize: () => (calls.push("init"), "true"), LMSFinish: () => "true", LMSGetValue: (k) => data[k] ?? "",
            LMSSetValue: (k, v) => ((data[k] = String(v)), calls.push(k), "true"), LMSCommit: () => "true", LMSGetLastError: () => "0" };
          window.data = data;</script><iframe id="sco" src="/pkg/index.html" style="width:1280px;height:840px;border:0"></iframe>`,
      });
    }
    const file = files[decodeURIComponent(path.replace(/^\/pkg\//, ""))];
    const types: Record<string, string> = { html: "text/html", js: "text/javascript", css: "text/css", svg: "image/svg+xml" };
    return file ? route.fulfill({ body: Buffer.from(file), contentType: types[path.split(".").pop()!] ?? "application/octet-stream" }) : route.fulfill({ status: 404 });
  });
  await page.goto("http://lms.test/lms");
  const sco = page.frameLocator("#sco");
  await expect(sco.getByRole("heading", { name: "Sécurité au bureau", level: 2 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).data["cmi.core.lesson_status"])).toBe("incomplete");
});

test("vertical : insérer et réordonner les briques", async ({ page }) => {
  await newModule(page, "Fiche mobile", "Vertical");
  await page.getByRole("button", { name: "¶ Texte" }).click();
  await page.locator("#st-main-field").fill("Dernier paragraphe");
  const blocks = page.locator(".st-phone .st-vblock");
  await expect(blocks).toHaveCount(4);
  await expect(blocks.last()).toContainText("Dernier paragraphe");

  // Le monter de deux crans
  await blocks.last().click();
  await page.getByRole("button", { name: "Monter", exact: true }).click();
  await page.getByRole("button", { name: "Monter", exact: true }).click();
  await expect(blocks.nth(1)).toContainText("Dernier paragraphe");

  // Annuler deux fois le remet en bas
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+z");
  await expect(blocks.last()).toContainText("Dernier paragraphe");
});

test("enregistrer puis rouvrir depuis l'accueil (projets récents)", async ({ page }) => {
  await newModule(page, "Module à rouvrir", "Diapositives");
  await page.getByRole("button", { name: "¶ Texte" }).click();
  await expect(page.locator(".st-toolbar-title")).toContainText("modifications non enregistrées");
  await page.keyboard.press("Control+s");
  await expect(page.locator(".st-toolbar-title")).toContainText("enregistré");
  await page.getByRole("button", { name: "⌂ Accueil" }).click();
  await page.getByRole("button", { name: /Module à rouvrir/ }).click();
  await expect(page.locator(".st-item")).toHaveCount(4);
});
