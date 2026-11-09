// Un module en anglais : le lecteur parle anglais, exercices notés et entraînement distingués.
import { expect, test } from "@playwright/test";

test("module in English: practice activity, graded exercises, result", async ({ page }) => {
  await page.goto("http://localhost:5194/");
  await expect(page.getByRole("button", { name: "Next →" })).toBeVisible();
  await page.getByRole("button", { name: "Start" }).click();

  // Practice (not graded): labelled « Practice », but it must be done to continue.
  await expect(page.getByText("Practice", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Complete this page's activities to continue.")).toBeVisible();
  const sort = page.locator('[data-activity="practice-sort"]');
  await sort.locator('[data-item="p1"]').click();
  await sort.getByRole("button", { name: "Place here: Good habit" }).click();
  await sort.locator('[data-item="p2"]').click();
  await sort.getByRole("button", { name: "Place here: Bad habit" }).click();
  await sort.getByRole("button", { name: "Check" }).click();
  await expect(sort.getByText("Correct", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next →" }).click();

  // Graded exercises
  await expect(page.getByText("Graded exercise", { exact: true })).toHaveCount(2);
  await expect(page.getByText("Result pending")).toBeVisible();
  await page.locator('[data-question="quiz-q1"]').getByText("Report it").click();
  await page.locator('[data-question="quiz-q1"]').getByRole("button", { name: "Check" }).click();
  const blanks = page.locator('[data-activity="quiz-q2"] .lsp-blank');
  await blanks.nth(0).selectOption("long");
  await blanks.nth(1).fill("Unique");
  await page.locator('[data-activity="quiz-q2"]').getByRole("button", { name: "Check" }).click();

  const results = page.locator(".lsp-results");
  await expect(results.getByText("100%", { exact: true })).toBeVisible();
  await expect(results.getByText("Passed", { exact: true })).toBeVisible();
  // The practice activity does not count: 2 points out of 2.
  await expect(results.getByText("2 points out of 2 · pass mark: 70%")).toBeVisible();
});
