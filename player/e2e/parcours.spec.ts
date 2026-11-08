import { expect, test, type Page } from "@playwright/test";

const SLIDES = "http://localhost:5190/";
const VERTICAL = "http://localhost:5191/";

// Accélère les voix off (x16, sans son) pour ne pas attendre 15 secondes par page.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      this.muted = true;
      this.playbackRate = 16;
      return play.call(this);
    };
  });
});

async function answer(page: Page, question: string, choices: string[]) {
  const form = page.locator(`[data-question="${question}"]`);
  for (const c of choices) await form.getByText(c, { exact: true }).click();
  await form.getByRole("button", { name: "Valider" }).click();
}

async function goToQuiz(page: Page) {
  await page.goto(SLIDES);
  await expect(page.getByRole("heading", { name: "Learning Suite", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Commencer" }).click();

  // Page 2 : « Suivant » reste bloqué jusqu'à la fin de la voix off.
  await expect(page.locator(".lsp-counter")).toHaveText("2 / 6");
  await expect(page.getByRole("button", { name: "Suivant →" })).toBeEnabled({ timeout: 10_000 });

  for (const n of [3, 4, 5]) {
    await page.getByRole("button", { name: "Suivant →" }).click();
    await expect(page.locator(".lsp-counter")).toHaveText(`${n} / 6`);
  }
  await page.getByRole("button", { name: "Passer au quiz" }).click();
  await expect(page.locator(".lsp-counter")).toHaveText("6 / 6");
}

test("parcours complet réussi : 6 pages, quiz, résultat et suivi", async ({ page }) => {
  await goToQuiz(page);
  await expect(page.getByText("Résultat en attente")).toBeVisible();

  await answer(page, "q-relecture", ["Review"]);
  // Choix multiple : premier essai incomplet, puis complété.
  await answer(page, "q-formats", ["HTML5", "SCORM"]);
  await expect(page.getByText("Il vous reste 1 essai.")).toBeVisible();
  await answer(page, "q-formats", ["cmi5"]);
  await answer(page, "q-modes", ["Vrai"]);

  const results = page.locator(".lsp-results");
  await expect(results.getByText("100 %", { exact: true })).toBeVisible();
  await expect(results.getByText("Réussi", { exact: true })).toBeVisible();

  // Le suivi local a bien enregistré la fin du module et le score.
  const record = await page.evaluate(() => JSON.parse(localStorage.getItem("learning-suite:01f0ff45-cc04-463c-9fed-b7db022d3346") ?? "null"));
  expect(record).toMatchObject({ status: "passed", progress: 1, score: { percent: 100, passed: true } });
});

test("échec, puis « Recommencer le quiz »", async ({ page }) => {
  await goToQuiz(page);
  await answer(page, "q-relecture", ["Studio"]);
  await answer(page, "q-formats", ["PowerPoint"]);
  await answer(page, "q-formats", ["HTML5"]);
  await answer(page, "q-modes", ["Faux"]);

  const results = page.locator(".lsp-results");
  await expect(results.getByText("0 %", { exact: true })).toBeVisible();
  await expect(results.getByText("Échoué", { exact: true })).toBeVisible();

  await results.getByRole("button", { name: "Recommencer le quiz" }).click();
  await expect(page.getByText("Résultat en attente")).toBeVisible();
  await answer(page, "q-relecture", ["Review"]);
  await answer(page, "q-formats", ["HTML5", "SCORM", "cmi5"]);
  await answer(page, "q-modes", ["Faux"]);
  // 3 points sur 4 = 75 %, au-dessus du seuil de 70 %.
  await expect(results.getByText("75 %", { exact: true })).toBeVisible();
  await expect(results.getByText("Réussi", { exact: true })).toBeVisible();
});

test("parcours imposé : le menu ne permet pas de sauter en avant", async ({ page }) => {
  await page.goto(SLIDES);
  await page.getByRole("button", { name: "☰ Menu" }).click();
  const menu = page.getByRole("navigation", { name: "Pages du module" });
  await expect(menu.getByRole("button", { name: "Quiz" })).toBeDisabled();
  await expect(menu.getByRole("button", { name: "Le constat" })).toBeEnabled();
});

test("mode vertical sur téléphone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(VERTICAL);
  await expect(page.getByRole("heading", { name: "Le mode vertical" })).toBeVisible();
  await page.getByRole("button", { name: "Une question pour finir" }).click();
  await answer(page, "v-q", ["Faux"]);
  await expect(page.locator(".lsp-results").getByText("Réussi", { exact: true })).toBeVisible();
});
