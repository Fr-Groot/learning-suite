// Paquets exportés joués dans un « faux LMS » : une page qui fournit l'objet API SCORM 1.2
// et charge le paquet dans un cadre, comme le ferait Moodle, SCORM Cloud ou Rise Up.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test, type FrameLocator, type Page } from "@playwright/test";
import { unzipSync } from "fflate";

const LMS = "http://lms.test";
const packages = new Map<string, Record<string, Uint8Array>>();

test.beforeAll(() => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "ls-export-"));
  for (const [name, dir] of [["suite", "../examples/presentation-suite"], ["jeu", "../examples/jeu-html"], ["activites", "../examples/activites"]]) {
    execFileSync(process.execPath, ["scripts/export.mjs", dir, "--format", "scorm12", "--out", out], { stdio: "pipe" });
    const zip = fs.readdirSync(out).find((f) => f.endsWith("-scorm12.zip") && !packages.has(f))!;
    packages.set(name, unzipSync(new Uint8Array(fs.readFileSync(path.join(out, zip)))));
    fs.renameSync(path.join(out, zip), path.join(out, `${name}.done`));
  }
});

const TYPES: Record<string, string> = {
  html: "text/html", js: "text/javascript", css: "text/css", svg: "image/svg+xml", wav: "audio/wav", xml: "application/xml",
};

const lmsPage = (pkg: string) => `<!doctype html><meta charset="utf-8"><title>Faux LMS</title>
<script>
  const KEY = "lms:${pkg}";
  const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
  const data = Object.assign({ "cmi.core.lesson_status": "not attempted" }, saved);
  data["cmi.core.entry"] = saved["cmi.core.exit"] === "suspend" ? "resume" : "ab-initio";
  const persist = () => localStorage.setItem(KEY, JSON.stringify(data));
  window.lmsData = data;
  window.lmsLog = [];
  window.API = {
    LMSInitialize: () => (lmsLog.push("init"), "true"),
    LMSFinish: () => (lmsLog.push("finish"), persist(), "true"),
    LMSGetValue: (k) => data[k] ?? "",
    LMSSetValue: (k, v) => ((data[k] = String(v)), "true"),
    LMSCommit: () => (persist(), "true"),
    LMSGetLastError: () => "0",
  };
</script>
<iframe id="sco" src="/pkg/${pkg}/index.html" style="width:1280px;height:840px;border:0"></iframe>`;

test.use({ viewport: { width: 1280, height: 900 } });

test.beforeEach(async ({ page }) => {
  // Voix off accélérées (x16, muettes), dans tous les cadres.
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      this.muted = true;
      this.playbackRate = 16;
      return play.call(this);
    };
  });
  await page.route(`${LMS}/**`, async (route) => {
    const url = new URL(route.request().url());
    const lms = /^\/lms\/(\w+)$/.exec(url.pathname);
    if (lms) return route.fulfill({ contentType: "text/html", body: lmsPage(lms[1]) });
    const m = /^\/pkg\/(\w+)\/(.+)$/.exec(url.pathname);
    const file = m && packages.get(m[1])?.[decodeURIComponent(m[2])];
    if (!file) return route.fulfill({ status: 404, body: "introuvable" });
    const ext = m[2].split(".").pop()!;
    return route.fulfill({ contentType: TYPES[ext] ?? "application/octet-stream", body: Buffer.from(file) });
  });
});

const lmsValue = (page: Page, key: string) => page.evaluate((k) => (window as any).lmsData[k], key);

async function answer(root: FrameLocator, question: string, choices: string[]) {
  const form = root.locator(`[data-question="${question}"]`);
  for (const c of choices) await form.getByText(c, { exact: true }).click();
  await form.getByRole("button", { name: "Valider" }).click();
}

async function nextUntil(sco: FrameLocator, n: number) {
  const next = sco.getByRole("button", { name: "Suivant →" });
  await expect(next).toBeEnabled({ timeout: 10_000 });
  await next.click();
  await expect(sco.locator(".lsp-counter")).toHaveText(`${n} / 6`);
}

test("SCORM 1.2 : parcours complet, score et statut envoyés au LMS", async ({ page }) => {
  await page.goto(`${LMS}/lms/suite`);
  const sco = page.frameLocator("#sco");
  await sco.getByRole("button", { name: "Commencer" }).click();
  for (const n of [3, 4, 5, 6]) await nextUntil(sco, n);

  expect(await lmsValue(page, "cmi.core.lesson_status")).toBe("incomplete");
  await answer(sco, "q-relecture", ["Review"]);
  await answer(sco, "q-formats", ["HTML5", "SCORM", "cmi5"]);
  await answer(sco, "q-modes", ["Vrai"]);
  await expect(sco.locator(".lsp-results").getByText("Réussi", { exact: true })).toBeVisible();

  expect(await lmsValue(page, "cmi.core.lesson_status")).toBe("passed");
  expect(await lmsValue(page, "cmi.core.score.raw")).toBe("100");
  expect(await lmsValue(page, "cmi.core.lesson_location")).toBe("quiz");
});

test("SCORM 1.2 : reprise là où l'apprenant s'était arrêté", async ({ page }) => {
  await page.goto(`${LMS}/lms/suite`);
  let sco = page.frameLocator("#sco");
  await sco.getByRole("button", { name: "Commencer" }).click();
  await nextUntil(sco, 3);
  await nextUntil(sco, 4);

  // L'apprenant ferme le module, puis revient.
  await page.reload();
  expect(await page.evaluate(() => (window as any).lmsData["cmi.core.entry"])).toBe("resume");
  sco = page.frameLocator("#sco");
  await expect(sco.locator(".lsp-counter")).toHaveText("4 / 6");
  await expect(sco.getByRole("heading", { name: "Review : relire" })).toBeVisible();
});

test("jeu HTML dans un paquet SCORM : son score arrive au LMS", async ({ page }) => {
  await page.goto(`${LMS}/lms/jeu`);
  const sco = page.frameLocator("#sco");
  await sco.getByRole("button", { name: "Jouer" }).click();

  const game = sco.frameLocator("iframe.lsp-html-frame");
  const cards = game.locator("button.card");
  await expect(cards).toHaveCount(8);
  const texts = await cards.allTextContents();
  const pairs = { Studio: "Créer", Review: "Relire", Lecteur: "Afficher", Serveur: "Diffuser" };
  for (const [a, b] of Object.entries(pairs)) {
    await cards.nth(texts.indexOf(a)).click();
    await cards.nth(texts.indexOf(b)).click();
  }

  await expect(sco.locator(".lsp-results").getByText("100 %", { exact: true })).toBeVisible();
  expect(await lmsValue(page, "cmi.core.score.raw")).toBe("100");
  expect(await lmsValue(page, "cmi.core.lesson_status")).toBe("passed");
});

test("un message de score qui ne vient pas du jeu est ignoré", async ({ page }) => {
  await page.goto(`${LMS}/lms/jeu`);
  const sco = page.frameLocator("#sco");
  await sco.getByRole("button", { name: "Jouer" }).click();
  await expect(sco.getByText("Résultat en attente")).toBeVisible();

  // Le module lui-même, puis la page du LMS, tentent d'envoyer un faux score.
  const scoFrame = page.frames().find((f) => f.url().includes("/pkg/jeu/"))!;
  await scoFrame.evaluate(() => window.postMessage({ type: "learning-suite", score: 100, completed: true }, "*"));
  await page.evaluate(() => (document.getElementById("sco") as HTMLIFrameElement).contentWindow!.postMessage({ type: "learning-suite", score: 100, completed: true }, "*"));
  await page.waitForTimeout(300);

  await expect(sco.getByText("Résultat en attente")).toBeVisible();
  expect(await lmsValue(page, "cmi.core.score.raw")).not.toBe("100");
});

test("activités dans un paquet SCORM : score partiel au LMS, réponses retrouvées à la reprise", async ({ page }) => {
  await page.goto(`${LMS}/lms/activites`);
  let sco = page.frameLocator("#sco");
  const openPage = async (title: string) => {
    await sco.getByRole("button", { name: "☰ Menu" }).click();
    await sco.getByRole("navigation", { name: "Pages du module" }).getByRole("button", { name: title, exact: true }).click();
  };

  // Texte à trous : 3 bons sur 4, puis le dernier essai est épuisé avec la même réponse.
  await openPage("Un bon mot de passe");
  const trous = sco.locator('[data-activity="trous-activite"]');
  const blanks = trous.locator(".lsp-blank");
  await blanks.nth(0).selectOption("long");
  await blanks.nth(1).selectOption("identique");
  await blanks.nth(2).fill("phrase");
  await blanks.nth(3).selectOption("gestionnaire");
  const valider = trous.locator(".lsp-question-actions").getByRole("button", { name: "Valider" });
  await valider.click();
  await valider.click();
  await expect(trous.getByText("Partiellement juste : 75 %")).toBeVisible();

  // 0,75 point sur 5 activités notées d'un point = 15 % ; le module n'est pas fini.
  expect(await lmsValue(page, "cmi.core.score.raw")).toBe("15");
  expect(await lmsValue(page, "cmi.core.lesson_status")).toBe("incomplete");

  // L'apprenant ferme et revient : la page et les réponses (corrigées) sont là.
  await page.reload();
  sco = page.frameLocator("#sco");
  await expect(sco.locator(".lsp-main")).toHaveAttribute("aria-label", "Un bon mot de passe");
  const back = sco.locator('[data-activity="trous-activite"] .lsp-blank');
  await expect(back.nth(1)).toHaveValue("identique");
  await expect(back.nth(1)).toHaveClass(/is-wrong/);
  await expect(back.nth(2)).toBeDisabled();
});
