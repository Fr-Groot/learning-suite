// Affichage des briques dans l'éditeur, avec le code du lecteur (même rendu que pour l'apprenant).
// Ici les briques ne réagissent pas : on les sélectionne, on ne les « joue » pas.
import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { newQuestionState } from "@player/activities.ts";
import { applyTheme } from "@player/player.ts";
import { translator } from "@player/i18n.ts";
import { renderBlock } from "@player/render/blocks.ts";
import type { RenderContext } from "@player/render/context.ts";
import type { Block, Page, Project } from "@player/types.ts";
import { mediaUrl } from "../commands.ts";

const STATIC_SCORE = { raw: 0, max: 0, percent: 0, passed: false, complete: false };

function staticContext(project: Project, doc: Document): RenderContext {
  const noop = () => {};
  return {
    project,
    mode: project.mode,
    doc,
    t: translator(project.meta.language),
    seed: 1,
    resolve: mediaUrl,
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

/** Une brique dessinée par le lecteur, qui remplit son conteneur. */
export function BlockPreview({ block, project }: { block: Block; project: Project }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    const node = renderBlock(block, staticContext(project, host.ownerDocument));
    if (project.mode === "slides") {
      node.style.width = "100%";
      node.style.height = "100%";
    }
    // Les vidéos et sons ne doivent pas démarrer dans l'éditeur.
    node.querySelectorAll("video, audio").forEach((m) => ((m as HTMLMediaElement).autoplay = false));
    host.replaceChildren(node);
  }, [block, project.theme, project.mode, project.pages.length, project.meta.language]);
  return <div ref={ref} className="st-block-preview" />;
}

/** Variables de couleur et police du thème, pour un conteneur. */
export function useTheme(project: Project) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current) applyTheme(ref.current, project);
  }, [project.theme]);
  return ref;
}

/** Fond de la page (couleur ou image). */
export function pageBackground(page: Page): CSSProperties {
  const bg = page.background;
  return {
    backgroundColor: bg?.color ?? "var(--lsp-background)",
    ...(bg?.image ? { backgroundImage: `url("${mediaUrl(bg.image)}")`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
  };
}

/** Miniature d'une page (panneau de gauche). */
export function PageThumbnail({ page, project, width }: { page: Page; project: Project; width: number }) {
  const theme = useTheme(project);
  if (project.mode === "slides") {
    const scale = width / 1280;
    return (
      <div className="st-thumb" style={{ width, height: 720 * scale }}>
        <div ref={theme} className="lsp-canvas lsp--slides st-thumb-stage" style={{ transform: `scale(${scale})`, ...pageBackground(page) }}>
          {page.blocks.map((b) => (
            <div key={b.id} className="st-abs" style={{ left: b.frame?.x, top: b.frame?.y, width: b.frame?.w, height: b.frame?.h, transform: b.frame?.rotation ? `rotate(${b.frame.rotation}deg)` : undefined }}>
              <BlockPreview block={b} project={project} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  const scale = width / 400;
  return (
    <div className="st-thumb" style={{ width, height: width * 1.3 }}>
      <div ref={theme} className="lsp-canvas lsp--vertical st-thumb-column" style={{ transform: `scale(${scale})`, ...pageBackground(page) }}>
        {page.blocks.slice(0, 6).map((b) => (
          <div key={b.id} className={`st-vblock ${b.width === "full" ? "is-full" : ""}`}>
            <BlockPreview block={b} project={project} />
          </div>
        ))}
      </div>
    </div>
  );
}
