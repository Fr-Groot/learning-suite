import { renderMarkdown } from "../markdown.ts";
import type { ResultsBlock } from "../types.ts";
import { el, type RenderContext } from "./context.ts";

export function renderResults(b: ResultsBlock, ctx: RenderContext): HTMLElement {
  const { doc, t } = ctx;
  const fmt = (n: number) => n.toLocaleString(t.locale, { maximumFractionDigits: 2 });
  const box = el(doc, "section", { class: "lsp-results", attrs: { "aria-live": "polite", "aria-label": t("resultsAria") } });

  function draw() {
    const s = ctx.score();
    const threshold = ctx.project.scoring.passingScore;
    box.replaceChildren();
    box.classList.remove("is-passed", "is-failed");
    if (!s.complete) {
      box.append(
        el(doc, "p", { class: "lsp-results-status", text: t("resultsPending") }),
        el(doc, "p", { text: t("resultsPendingText") }),
      );
      return;
    }
    box.classList.add(s.passed ? "is-passed" : "is-failed");
    box.append(
      el(doc, "p", { class: "lsp-results-score", text: t.lang === "fr" ? `${s.percent} %` : `${s.percent}%` }),
      el(doc, "p", { class: "lsp-results-status", text: t(s.passed ? "passed" : "failed") }),
      el(doc, "p", { class: "lsp-results-detail", text: t(s.raw > 1 ? "pointsMany" : "pointsOne", { raw: fmt(s.raw), max: fmt(s.max), threshold }) }),
    );
    const message = s.passed ? b.passedMessage : b.failedMessage;
    if (message) {
      const m = el(doc, "div", { class: "lsp-results-message" });
      m.append(renderMarkdown(message, doc));
      box.append(m);
    }
    if (!s.passed && b.allowRetry !== false) {
      const retry = el(doc, "button", { class: "lsp-button lsp-button--primary", text: t("retryQuiz"), attrs: { type: "button" } });
      retry.addEventListener("click", () => ctx.retry());
      box.append(retry);
    }
  }

  draw();
  ctx.onUpdate(draw);
  return box;
}
