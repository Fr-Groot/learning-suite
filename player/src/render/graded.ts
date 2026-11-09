// Partie commune des activités notées à plusieurs éléments :
// bouton « Valider », message de retour (juste, partiel, faux), essais restants, correction.
import { attemptsLeft, type MultiActivity, type QuestionState, type Response } from "../activities.ts";
import { renderMarkdown } from "../markdown.ts";
import { el, type RenderContext } from "./context.ts";

export interface GradedHooks {
  /** Toutes les réponses sont-elles données ? (sinon « Valider » reste grisé) */
  isReady(): boolean;
  response(): Response;
  /** Remet les réponses d'une session précédente. */
  restore(r: Response): void;
  /** Bloque les réponses et montre la correction (activité terminée). */
  showCorrection(): void;
}

export function gradedControls(b: MultiActivity, ctx: RenderContext, hooks: GradedHooks) {
  const { doc } = ctx;
  const submitBtn = el(doc, "button", { class: "lsp-button lsp-button--primary", text: ctx.t("validate"), attrs: { type: "button" } });
  const feedback = el(doc, "div", { class: "lsp-feedback", attrs: { "aria-live": "polite" } });
  const root = el(doc, "div", { class: "lsp-question-actions" }, submitBtn, feedback);

  const sync = () => {
    const st = ctx.questionState(b.id);
    submitBtn.hidden = st.done;
    submitBtn.disabled = st.done || !hooks.isReady();
  };

  const show = (st: QuestionState) => {
    feedback.replaceChildren();
    if (st.attemptsUsed === 0) return sync();
    const pct = Math.round(st.score ?? 0);
    const level = st.correct ? "correct" : pct > 0 ? "partial" : "incorrect";
    feedback.className = `lsp-feedback ${st.correct ? "is-correct" : "is-incorrect"}`;
    const label = level === "partial" ? ctx.t("partial", { pct }) : ctx.t(level);
    feedback.append(el(doc, "p", { class: "lsp-feedback-status", text: label }));
    const message = b.feedback?.[level];
    if (message && (st.done || st.correct)) feedback.append(renderMarkdown(message, doc));
    if (!st.done) {
      const left = attemptsLeft(b, st);
      feedback.append(el(doc, "p", { text: `${ctx.t("fixAndRetry")} ${left > 1 ? ctx.t("attemptsLeftMany", { n: left }) : ctx.t("attemptsLeftOne")}` }));
    }
    if (st.done) hooks.showCorrection();
    sync();
  };

  submitBtn.addEventListener("click", () => {
    if (!hooks.isReady()) return;
    show(ctx.submitMulti(b, hooks.response()));
  });

  /** À appeler une fois l'activité construite : remet l'état d'une session précédente. */
  const init = () => {
    const st = ctx.questionState(b.id);
    if (st.attemptsUsed > 0 && st.lastResponse !== undefined) hooks.restore(st.lastResponse);
    show(st);
  };

  /** À appeler quand l'apprenant change une réponse. */
  const changed = () => {
    if (!ctx.questionState(b.id).done) feedback.replaceChildren();
    sync();
  };

  return { root, init, changed };
}
