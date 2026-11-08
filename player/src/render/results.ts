import { renderMarkdown } from "../markdown.ts";
import type { ResultsBlock } from "../types.ts";
import { el, type RenderContext } from "./context.ts";

export function renderResults(b: ResultsBlock, ctx: RenderContext): HTMLElement {
  const { doc } = ctx;
  const box = el(doc, "section", { class: "lsp-results", attrs: { "aria-live": "polite", "aria-label": "Résultat" } });

  function draw() {
    const s = ctx.score();
    const threshold = ctx.project.scoring.passingScore;
    box.replaceChildren();
    box.classList.remove("is-passed", "is-failed");
    if (!s.complete) {
      box.append(
        el(doc, "p", { class: "lsp-results-status", text: "Résultat en attente" }),
        el(doc, "p", { text: "Répondez à toutes les questions pour voir votre résultat." }),
      );
      return;
    }
    box.classList.add(s.passed ? "is-passed" : "is-failed");
    box.append(
      el(doc, "p", { class: "lsp-results-score", text: `${s.percent} %` }),
      el(doc, "p", { class: "lsp-results-status", text: s.passed ? "Réussi" : "Échoué" }),
      el(doc, "p", { class: "lsp-results-detail", text: `${s.raw} point${s.raw > 1 ? "s" : ""} sur ${s.max} · seuil de réussite : ${threshold} %` }),
    );
    const message = s.passed ? b.passedMessage : b.failedMessage;
    if (message) {
      const m = el(doc, "div", { class: "lsp-results-message" });
      m.append(renderMarkdown(message, doc));
      box.append(m);
    }
    if (!s.passed && b.allowRetry !== false) {
      const retry = el(doc, "button", { class: "lsp-button lsp-button--primary", text: "Recommencer le quiz", attrs: { type: "button" } });
      retry.addEventListener("click", () => ctx.retry());
      box.append(retry);
    }
  }

  draw();
  ctx.onUpdate(draw);
  return box;
}
