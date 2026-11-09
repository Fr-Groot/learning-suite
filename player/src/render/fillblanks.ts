// Texte à trous : champs à saisir ou listes déroulantes, au milieu du texte.
import { shuffled } from "../activities.ts";
import { isBlankCorrect, parseBlanks, type Blank } from "../grading/fillblanks.ts";
import { renderMarkdown } from "../markdown.ts";
import type { FillBlanksBlock } from "../types.ts";
import { el, type RenderContext } from "./context.ts";
import { gradedControls } from "./graded.ts";

// Caractère de remplacement : on retire les trous avant la mise en forme du texte,
// puis on remet un champ à leur place.
const MARK = "\u0001";

export function renderFillBlanks(b: FillBlanksBlock, ctx: RenderContext): HTMLElement {
  const { doc } = ctx;
  const { parts, blanks } = parseBlanks(b.text);
  const root = el(doc, "div", { class: "lsp-question lsp-fillblanks", attrs: { "data-activity": b.id } });
  if (b.prompt) {
    const p = el(doc, "div", { class: "lsp-question-prompt" });
    p.append(renderMarkdown(b.prompt, doc));
    root.append(p);
  }

  const fields: (HTMLInputElement | HTMLSelectElement)[] = blanks.map((bl) => field(bl, ctx));
  const source = parts.map((p) => (typeof p === "string" ? p : `${MARK}${p.index}${MARK}`)).join("");
  const text = el(doc, "div", { class: "lsp-fillblanks-text" });
  text.append(
    renderMarkdown(source, doc, (chunk) =>
      chunk.split(new RegExp(`${MARK}(\\d+)${MARK}`)).map((piece, i) => (i % 2 ? fields[Number(piece)] : doc.createTextNode(piece))),
    ),
  );
  root.append(text);

  const controls = gradedControls(b, ctx, {
    isReady: () => fields.every((f) => f.value.trim() !== ""),
    response: () => Object.fromEntries(fields.map((f, i) => [String(i), f.value])),
    restore: (r) => {
      if (typeof r !== "object" || Array.isArray(r)) return;
      fields.forEach((f, i) => (f.value = r[String(i)] ?? ""));
    },
    showCorrection: () => {
      blanks.forEach((bl, i) => {
        const f = fields[i];
        f.disabled = true;
        const ok = isBlankCorrect(bl, f.value, b);
        f.classList.add(ok ? "is-right" : "is-wrong");
        f.setAttribute("aria-invalid", String(!ok));
        if (!ok && !f.nextElementSibling?.classList.contains("lsp-blank-answer")) {
          f.after(el(doc, "span", { class: "lsp-blank-answer", text: ` (${bl.correct[0]})` }));
        }
      });
    },
  });
  fields.forEach((f) => f.addEventListener(f instanceof HTMLSelectElement ? "change" : "input", controls.changed));
  root.append(controls.root);
  controls.init();
  return root;
}

function field(bl: Blank, ctx: RenderContext): HTMLInputElement | HTMLSelectElement {
  const { doc } = ctx;
  const label = ctx.t("blank", { n: bl.index + 1 });
  if (bl.select) {
    const select = el(doc, "select", { class: "lsp-blank", attrs: { "aria-label": label } });
    select.append(el(doc, "option", { text: "…", attrs: { value: "" } }));
    for (const o of shuffled(bl.options, ctx.seed + bl.index)) select.append(el(doc, "option", { text: o, attrs: { value: o } }));
    return select;
  }
  const longest = Math.max(...bl.correct.map((c) => c.length), 4);
  const input = el(doc, "input", {
    class: "lsp-blank",
    attrs: { type: "text", "aria-label": label, autocomplete: "off", autocapitalize: "off", spellcheck: "false" },
  });
  input.style.width = `${longest + 3}ch`;
  return input;
}
