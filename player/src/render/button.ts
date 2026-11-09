import type { ButtonBlock } from "../types.ts";
import { el, type RenderContext } from "./context.ts";

export function renderButton(b: ButtonBlock, ctx: RenderContext): HTMLElement {
  const btn = el(ctx.doc, "button", {
    class: `lsp-button lsp-button--${b.variant ?? "primary"}`,
    text: b.label,
    attrs: { type: "button" },
  });
  if (b.action.type === "url") btn.setAttribute("aria-description", ctx.t("opensNewTab"));
  btn.addEventListener("click", () => ctx.act(b.action));
  const refresh = () => (btn.disabled = !ctx.canAct(b.action));
  refresh();
  ctx.onUpdate(refresh);
  return btn;
}
