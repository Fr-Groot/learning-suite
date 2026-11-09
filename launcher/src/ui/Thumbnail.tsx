// Miniature de la première page d'un module, dessinée avec le code du lecteur (même rendu que l'apprenant).
import { useLayoutEffect, useMemo, useRef } from "react";
import { newQuestionState } from "@player/activities.ts";
import { translator } from "@player/i18n.ts";
import { migrateProject } from "@player/migrate.ts";
import { applyTheme } from "@player/player.ts";
import { renderBlock } from "@player/render/blocks.ts";
import type { RenderContext } from "@player/render/context.ts";
import type { Project } from "@player/types.ts";
import { backendSync, type ModuleCard } from "../io/backend.ts";

const STATIC_SCORE = { raw: 0, max: 0, percent: 0, passed: false, complete: false };

function staticContext(project: Project, doc: Document, dir: string): RenderContext {
  const noop = () => {};
  return {
    project,
    mode: project.mode,
    doc,
    t: translator(project.meta?.language),
    seed: 1,
    resolve: (src: string) => backendSync().mediaUrl(dir, src),
    act: noop,
    canAct: () => true,
    questionState: () => newQuestionState(),
    submit: () => newQuestionState(),
    reportHtml: noop,
    openItem: noop,
    submitMulti: () => newQuestionState(),
    score: () => STATIC_SCORE,
    retry: noop,
    onUpdate: noop,
    onDispose: noop,
  };
}

export function Thumbnail({ card, width }: { card: ModuleCard; width: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const project = useMemo(() => {
    try {
      return migrateProject(structuredClone(card.preview));
    } catch {
      return null;
    }
  }, [card.preview]);
  const slides = project?.mode !== "vertical";
  const height = slides ? (width * 9) / 16 : width * 0.75;

  useLayoutEffect(() => {
    const host = ref.current;
    if (!host || !project) return;
    const page = project.pages[0];
    const stage = document.createElement("div");
    const scale = slides ? width / 1280 : width / 400;
    stage.className = `lsp-canvas ${slides ? "lsp--slides ln-thumb-stage" : "lsp--vertical ln-thumb-column"}`;
    stage.style.transform = `scale(${scale})`;
    applyTheme(stage, project);
    if (page?.background?.color) stage.style.backgroundColor = page.background.color;
    if (page?.background?.image) {
      stage.style.backgroundImage = `url("${backendSync().mediaUrl(card.dir, page.background.image)}")`;
      stage.style.backgroundSize = "cover";
    }
    for (const block of page?.blocks.slice(0, slides ? 40 : 5) ?? []) {
      try {
        const node = renderBlock(block, staticContext(project, document, card.dir));
        node.querySelectorAll("video, audio").forEach((m) => ((m as HTMLMediaElement).autoplay = false));
        node.querySelectorAll("iframe").forEach((f) => f.remove());
        const wrap = document.createElement("div");
        if (slides) {
          const f = block.frame;
          wrap.className = "ln-abs";
          Object.assign(wrap.style, { left: `${f?.x ?? 0}px`, top: `${f?.y ?? 0}px`, width: `${f?.w ?? 0}px`, height: `${f?.h ?? 0}px` });
          if (f?.rotation) wrap.style.transform = `rotate(${f.rotation}deg)`;
          node.style.width = "100%";
          node.style.height = "100%";
        } else {
          wrap.className = `ln-vblock ${block.width === "full" ? "is-full" : ""}`;
        }
        wrap.append(node);
        stage.append(wrap);
      } catch {
        // une brique illisible n'empêche pas la miniature
      }
    }
    host.replaceChildren(stage);
  }, [project, card.dir, width, slides]);

  return <div ref={ref} className="ln-thumb" style={{ width, height }} aria-hidden />;
}
