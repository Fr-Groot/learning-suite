// Parcours dans le lanceur, sur un PC simulé (src/io/memory.ts) : rien n'est lancé pour de vrai,
// chaque demande est notée dans window.__launcher.log et vérifiée ici.
import { expect, test, type Page } from "@playwright/test";

const LAUNCHER = "http://localhost:1450/";
const log = (page: Page) => page.evaluate(() => (window as unknown as { __launcher: { log: string[] } }).__launcher.log);
const card = (page: Page, title: string) => page.getByRole("listitem", { name: `Module « ${title} »` });

test("mes modules : miniatures, ouvrir dans Studio, dossier, recherche, récents", async ({ page }) => {
  await page.goto(LAUNCHER);
  await expect(page.locator(".ln-card")).toHaveCount(6);
  // Chaque miniature est dessinée par le lecteur.
  for (const thumb of await page.locator(".ln-thumb").all()) await expect(thumb.locator(".lsp-canvas")).toHaveCount(1);
  await expect(page.locator(".ln-badge", { hasText: "Récent" })).toHaveCount(2);

  const demo = card(page, "Découvrir Learning Suite");
  await expect(demo).toContainText("Diapositives · FR · 6 pages");
  await expect(demo.locator(".ln-journey li.is-current")).toHaveText("Production");
  await expect(demo.locator(".ln-journey li.is-soon")).toHaveCount(5);

  await demo.getByRole("button", { name: "Ouvrir dans Studio" }).click();
  await expect(page.getByRole("status")).toHaveText("Studio s'ouvre…");
  await demo.getByRole("button", { name: "Dossier" }).click();
  await page.getByRole("button", { name: "＋ Nouveau module" }).click();
  expect(await log(page)).toEqual(["studio --open examples/presentation-suite", "dossier examples/presentation-suite", "studio --new"]);

  await page.getByLabel("Rechercher un module").fill("vertical");
  await expect(page.locator(".ln-card-title h3")).toHaveText(["Démo du mode vertical"]);
  await page.getByLabel("Rechercher un module").fill("zzz");
  await expect(page.getByText("Aucun module ne correspond à « zzz ».")).toBeVisible();
  await page.getByLabel("Rechercher un module").fill("");

  await page.locator(".ln-card").first().getByRole("button", { name: "Retirer des récents" }).click();
  await expect(page.locator(".ln-badge", { hasText: "Récent" })).toHaveCount(1);
});

test("Clicksy absent : l'installer ou indiquer la version portable, puis ses actions", async ({ page }) => {
  await page.goto(LAUNCHER);
  const clicksy = page.getByRole("listitem", { name: "Clicksy" });
  await expect(clicksy).toContainText("Pas encore installé sur ce PC.");
  await clicksy.getByRole("button", { name: "Installer Clicksy" }).click();
  await clicksy.getByRole("button", { name: "J'ai Clicksy en version portable…" }).click();
  for (const name of ["Ouvrir", "Enregistrer une démo", "Guide pas à pas", "Nouvelle session", "Dossier des captures"]) await clicksy.getByRole("button", { name }).click();
  expect(await log(page)).toEqual(["page clicksy", "clicksy", "clicksy --action video", "clicksy --action guide", "clicksy --action session", "dossier C:\\Users\\vous\\Documents\\Clicksy"]);
});

test("Clicksy installé : repéré avec sa version", async ({ page }) => {
  await page.goto(`${LAUNCHER}?clicksy=1`);
  const clicksy = page.getByRole("listitem", { name: "Clicksy" });
  await expect(clicksy.getByRole("heading")).toHaveText("Clicksy 0.6.0");
  await expect(clicksy.getByRole("button", { name: "Enregistrer une démo" })).toBeVisible();
});

test("mes outils : ajouter, lancer, retirer", async ({ page }) => {
  await page.goto(LAUNCHER);
  await expect(page.getByText("Aucun outil ajouté.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "＋ Ajouter un outil" }).click();
  await expect(page.getByRole("status")).toHaveText("Krita ajouté à vos outils.");
  await page.getByRole("button", { name: "Krita", exact: true }).click();
  expect(await log(page)).toEqual(["outil Krita"]);
  await page.getByRole("button", { name: "Retirer Krita" }).click();
  await expect(page.getByText("Aucun outil ajouté.", { exact: false })).toBeVisible();
});

test("sans Studio ni module : on explique quoi faire", async ({ page }) => {
  await page.goto(`${LAUNCHER}?nostudio=1&empty=1`);
  await expect(page.getByText("Studio n'est pas installé", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "＋ Nouveau module" })).toBeDisabled();
  await expect(page.getByText("Aucun module pour l'instant.", { exact: false })).toBeVisible();
  await page.getByRole("listitem", { name: "Studio" }).getByRole("button", { name: "Télécharger Studio" }).click();
  expect(await log(page)).toEqual(["page suite"]);
});

test("Launcher in English", async ({ page }) => {
  await page.goto(LAUNCHER);
  await page.getByLabel("Langue").selectOption("en");
  await expect(page.getByRole("heading", { name: "My modules" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: "Open in Studio" }).first()).toBeVisible();
  await expect(page.getByRole("listitem", { name: "Clicksy" }).getByRole("button", { name: "Record a demo" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Install Clicksy" })).toBeVisible();
});
