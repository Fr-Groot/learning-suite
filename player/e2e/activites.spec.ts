// Les activités jouées comme un apprenant : à la souris, au clavier et au doigt (téléphone).
import { expect, test, type Locator, type Page } from "@playwright/test";

const SLIDES = "http://localhost:5192/";
const MOBILE = "http://localhost:5193/";

/** Va à une page par le menu (le module d'exemple n'impose pas l'ordre). */
async function openPage(page: Page, title: string) {
  await page.getByRole("button", { name: "☰ Menu" }).click();
  await page.getByRole("navigation", { name: "Pages du module" }).getByRole("button", { name: title, exact: true }).click();
  await expect(page.locator(".lsp-main")).toHaveAttribute("aria-label", title);
}

const next = (page: Page) => page.locator(".lsp-pager").getByRole("button", { name: "Suivant →" });
const activity = (page: Page, id: string) => page.locator(`[data-activity="${id}"]`);
const validate = (a: Locator) => a.locator(".lsp-question-actions").getByRole("button", { name: "Valider" });

/** Glisser un élément à la souris, en plusieurs mouvements comme une vraie main. */
async function drag(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

test("à la souris : toutes les activités notées, puis bilan à 100 %", async ({ page }) => {
  await page.goto(SLIDES);

  // Cartes : « Suivant » bloqué tant que les 4 cartes ne sont pas retournées.
  await openPage(page, "Idées reçues");
  await expect(next(page)).toBeDisabled();
  for (const id of ["c1", "c2", "c3", "c4"]) await page.locator(`[data-card="${id}"]`).click();
  await expect(next(page)).toBeEnabled();

  // Texte à trous : listes + saisie (majuscule et espaces tolérés).
  await openPage(page, "Un bon mot de passe");
  const trous = activity(page, "trous-activite");
  const blanks = trous.locator(".lsp-blank");
  await blanks.nth(0).selectOption("long");
  await blanks.nth(1).selectOption("unique");
  await blanks.nth(2).fill("  Phrase ");
  await blanks.nth(3).selectOption("gestionnaire");
  await validate(trous).click();
  await expect(trous.getByText("Bonne réponse")).toBeVisible();

  // Catégories : un vrai glisser, puis « toucher l'élément, toucher la catégorie ».
  await openPage(page, "Bon ou mauvais réflexe ?");
  const ranger = activity(page, "ranger-activite");
  const bon = ranger.locator('[data-target="bon"]');
  const mauvais = ranger.locator('[data-target="mauvais"]');
  await drag(page, ranger.locator('[data-item="r1"]'), bon);
  await expect(bon.locator('[data-item="r1"]')).toBeVisible();
  for (const [item, target] of [["r3", bon], ["r5", bon], ["r2", mauvais], ["r4", mauvais], ["r6", mauvais]] as const) {
    await ranger.locator(`[data-item="${item}"]`).click();
    await target.locator(".lsp-dd-drop").click();
  }
  await validate(ranger).click();
  await expect(ranger.getByText("Bonne réponse")).toBeVisible();

  // Paires
  await openPage(page, "Le bon mot");
  const relier = activity(page, "relier-activite");
  for (const id of ["m1", "m2", "m3", "m4"]) {
    await relier.locator(`[data-item="${id}"]`).click();
    await relier.locator(`[data-target="slot-${id}"] .lsp-dd-drop`).click();
  }
  await validate(relier).click();
  await expect(relier.getByText("Bonne réponse")).toBeVisible();

  // Ordre
  await openPage(page, "Dans l’ordre");
  const ordre = activity(page, "ordre-activite");
  for (const [i, id] of ["o1", "o2", "o3", "o4"].entries()) {
    await ordre.locator(`[data-item="${id}"]`).click();
    await ordre.getByRole("button", { name: `Placer ici : ${i + 1}` }).click();
  }
  await validate(ordre).click();
  await expect(ordre.getByText("Bonne réponse")).toBeVisible();

  // Zones à trouver
  await openPage(page, "Trouvez les erreurs");
  const zones = activity(page, "zones-activite");
  for (const label of ["Écran avec la session ouverte", "Post-it avec le mot de passe", "Clé USB inconnue", "Badge oublié sur le bureau"]) {
    await zones.getByRole("button", { name: label }).click();
  }
  await validate(zones).click();
  await expect(zones.getByText("Bonne réponse")).toBeVisible();

  await openPage(page, "Bilan");
  await expect(page.locator(".lsp-results").getByText("100 %", { exact: true })).toBeVisible();
  await expect(page.locator(".lsp-results").getByText("Réussi", { exact: true })).toBeVisible();
});

test("au prorata : 3 risques sur 4 = 75 %, correction affichée", async ({ page }) => {
  await page.goto(SLIDES);
  await openPage(page, "Trouvez les erreurs");
  const zones = activity(page, "zones-activite");
  for (const label of ["Écran avec la session ouverte", "Post-it avec le mot de passe", "Clé USB inconnue"]) {
    await zones.getByRole("button", { name: label }).click();
  }
  await validate(zones).click();
  await expect(zones.getByText("Partiellement juste : 75 %")).toBeVisible();
  await expect(zones.getByText("Il vous reste 1 essai.", { exact: false })).toBeVisible();
  await validate(zones).click();
  await expect(zones.getByRole("button", { name: "Badge oublié sur le bureau" })).toHaveClass(/is-missed/);
});

test("au clavier seulement : onglets, carte, glisser-déposer", async ({ page }) => {
  await page.goto(SLIDES);

  await openPage(page, "Les arnaques courantes");
  await page.getByRole("tab", { name: "Hameçonnage" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Faux support" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Ne rappelez jamais");

  await openPage(page, "Idées reçues");
  const card = page.locator('[data-card="c1"]');
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(card).toHaveAttribute("aria-pressed", "true");

  await openPage(page, "Le bon mot");
  const relier = activity(page, "relier-activite");
  for (const id of ["m1", "m2", "m3", "m4"]) {
    await relier.locator(`[data-item="${id}"]`).focus();
    await page.keyboard.press("Enter");
    await relier.locator(`[data-target="slot-${id}"] .lsp-dd-drop`).focus();
    await page.keyboard.press("Enter");
  }
  await validate(relier).focus();
  await page.keyboard.press("Enter");
  await expect(relier.getByText("Bonne réponse")).toBeVisible();
});

test.describe("au doigt, sur téléphone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("remettre dans l'ordre et explorer le bureau", async ({ page }) => {
    await page.goto(MOBILE);

    await openPage(page, "Dans l’ordre");
    const ordre = activity(page, "ordre-activite");
    for (const [i, id] of ["o1", "o2", "o3", "o4"].entries()) {
      await ordre.locator(`[data-item="${id}"]`).tap();
      await ordre.getByRole("button", { name: `Placer ici : ${i + 1}` }).tap();
    }
    await validate(ordre).tap();
    await expect(ordre.getByText("Bonne réponse")).toBeVisible();

    await openPage(page, "Explorer le bureau");
    await expect(next(page)).toBeDisabled();
    const explore = activity(page, "zones-explore");
    for (const label of ["Écran", "Post-it", "Clé USB", "Badge"]) {
      await explore.getByRole("button", { name: label, exact: true }).tap();
      await expect(explore.locator(".lsp-hotspot-info-title")).toHaveText(label);
    }
    await expect(next(page)).toBeEnabled();

    // Rien ne dépasse de l'écran du téléphone, sur aucune page (titre de module long compris).
    for (let i = 0; i < 11; i++) {
      const wide = await page.evaluate((n) => {
        (window as any).player.nav.goTo(n, true);
        (window as any).player.show();
        const W = document.documentElement.clientWidth;
        return [...document.querySelectorAll(".lsp *")].filter((e) => e.getBoundingClientRect().right > W + 1).map((e) => e.className).slice(0, 3);
      }, i);
      expect(wide, `page ${i + 1}`).toEqual([]);
    }
  });
});
