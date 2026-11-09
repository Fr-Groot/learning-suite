// Brique HTML : un jeu ou contenu HTML dans un cadre isolé.
// Le cadre ne peut ni lire le module, ni le LMS, ni les données de l'apprenant
// (sandbox sans « allow-same-origin »). Il ne peut qu'envoyer un message :
//   { type: "learning-suite", score: 0-100, completed: true }
import { roleOf } from "../activities.ts";
import type { HtmlBlock } from "../types.ts";
import { el, type RenderContext } from "./context.ts";

export function renderHtml(b: HtmlBlock, ctx: RenderContext): HTMLElement {
  const { doc } = ctx;
  const box = el(doc, "div", { class: "lsp-html" });
  const frame = el(doc, "iframe", {
    class: "lsp-html-frame",
    attrs: {
      src: ctx.resolve(b.src),
      title: b.title,
      sandbox: "allow-scripts allow-pointer-lock",
      allow: "fullscreen",
      loading: "eager",
      referrerpolicy: "no-referrer",
    },
  });
  if (ctx.mode === "vertical") frame.style.height = `${b.height ?? 600}px`;
  const status = el(doc, "p", { class: "lsp-html-status", attrs: { "aria-live": "polite" } });
  box.append(frame, status);

  const draw = () => {
    const st = ctx.questionState(b.id);
    status.hidden = roleOf(b) !== "exercise" || !st.done;
    status.textContent = st.done ? ctx.t("htmlDone", { pct: Math.round(st.score ?? 0) }) : "";
  };

  // On n'écoute que les messages venant de CE cadre, et au bon format.
  const view = doc.defaultView;
  const onMessage = (event: MessageEvent) => {
    if (event.source !== frame.contentWindow) return;
    const data = event.data as { type?: unknown; score?: unknown; completed?: unknown } | null;
    if (!data || data.type !== "learning-suite") return;
    ctx.reportHtml(b, {
      score: typeof data.score === "number" ? data.score : undefined,
      completed: data.completed === true,
    });
    draw();
  };
  view?.addEventListener("message", onMessage);
  ctx.onDispose(() => view?.removeEventListener("message", onMessage));

  draw();
  ctx.onUpdate(draw);
  return box;
}
