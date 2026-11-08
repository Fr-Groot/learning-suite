import { renderMarkdown } from "../markdown.ts";
import { attemptsLeft, shuffled, type Response } from "../activities.ts";
import type { Choice, QuestionBlock } from "../types.ts";
import { el, type RenderContext } from "./context.ts";

const KIND_HINT = {
  single: "Une seule réponse possible.",
  multiple: "Plusieurs réponses possibles.",
  truefalse: "Vrai ou faux ?",
};

export function renderQuestion(q: QuestionBlock, ctx: RenderContext): HTMLElement {
  const { doc } = ctx;
  const form = el(doc, "form", { class: "lsp-question", attrs: { "data-question": q.id, "data-kind": q.kind } });
  const fieldset = el(doc, "fieldset");
  const legend = el(doc, "legend", { class: "lsp-question-prompt" });
  legend.append(renderMarkdown(q.prompt, doc));
  fieldset.append(legend, el(doc, "p", { class: "lsp-question-hint", text: KIND_HINT[q.kind] }));

  // Les choix : pour vrai/faux on fabrique deux choix « Vrai » et « Faux ».
  const choices: Choice[] =
    q.kind === "truefalse"
      ? [
          { id: "true", text: "Vrai", correct: q.answer === true },
          { id: "false", text: "Faux", correct: q.answer === false },
        ]
      : q.shuffle
        ? shuffled(q.choices ?? [], hash(q.id) ^ ctx.seed)
        : (q.choices ?? []);

  const inputType = q.kind === "multiple" ? "checkbox" : "radio";
  const inputs: HTMLInputElement[] = [];
  const list = el(doc, "div", { class: "lsp-choices" });
  for (const c of choices) {
    const input = el(doc, "input", { attrs: { type: inputType, name: `q-${q.id}`, value: c.id } });
    inputs.push(input);
    const label = el(doc, "label", { class: "lsp-choice", attrs: { "data-choice": c.id } }, input, el(doc, "span", { text: c.text }));
    list.append(label);
  }
  fieldset.append(list);

  const submitBtn = el(doc, "button", { class: "lsp-button lsp-button--primary", text: "Valider", attrs: { type: "submit" } });
  const feedback = el(doc, "div", { class: "lsp-feedback", attrs: { "aria-live": "polite" } });
  form.append(fieldset, el(doc, "div", { class: "lsp-question-actions" }, submitBtn, feedback));

  const selection = (): string[] => inputs.filter((i) => i.checked).map((i) => i.value);
  const toResponse = (ids: string[]): Response => (q.kind === "truefalse" ? ids[0] === "true" : ids);
  const fromResponse = (r: Response | undefined): string[] =>
    r === undefined ? [] : typeof r === "boolean" ? [String(r)] : Array.isArray(r) ? r : [];

  const syncButton = () => {
    const done = ctx.questionState(q.id).done;
    submitBtn.hidden = done;
    submitBtn.disabled = done || selection().length === 0;
  };
  inputs.forEach((i) => i.addEventListener("change", () => {
    feedback.replaceChildren();
    syncButton();
  }));

  function show() {
    const st = ctx.questionState(q.id);
    const chosen = fromResponse(st.lastResponse);
    feedback.replaceChildren();
    form.classList.toggle("is-done", st.done);
    if (st.attemptsUsed === 0) return syncButton();

    if (st.done) {
      inputs.forEach((i) => {
        i.disabled = true;
        i.checked = chosen.includes(i.value);
      });
      // Une fois la question terminée, on montre la bonne réponse.
      list.querySelectorAll<HTMLElement>(".lsp-choice").forEach((label) => {
        const c = choices.find((x) => x.id === label.dataset.choice);
        label.classList.toggle("is-expected", !!c?.correct);
        label.classList.toggle("is-wrong", !c?.correct && chosen.includes(label.dataset.choice!));
      });
    }
    const status = el(doc, "p", { class: "lsp-feedback-status", text: st.correct ? "Bonne réponse" : "Mauvaise réponse" });
    feedback.className = `lsp-feedback ${st.correct ? "is-correct" : "is-incorrect"}`;
    feedback.append(status);
    const message = st.correct ? q.feedback?.correct : q.feedback?.incorrect;
    if (message && (st.done || st.correct)) feedback.append(renderMarkdown(message, doc));
    if (!st.done) {
      const left = attemptsLeft(q, st);
      feedback.append(el(doc, "p", { text: `Il vous reste ${left} essai${left > 1 ? "s" : ""}.` }));
    }
    syncButton();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (selection().length === 0) return;
    ctx.submit(q, toResponse(selection()));
    show();
  });

  // Réaffiche l'état si on revient sur la page, ou après « Recommencer ».
  const st = ctx.questionState(q.id);
  if (st.attemptsUsed > 0) fromResponse(st.lastResponse).forEach((id) => {
    const i = inputs.find((x) => x.value === id);
    if (i) i.checked = true;
  });
  show();
  return form;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
