// Éditeur du mode vertical : les briques empilées, comme sur un téléphone ; on les réordonne.
import { deleteBlocks, duplicateBlocks, reorderBlock } from "../model/actions.ts";
import { store, useEditor } from "../model/store.ts";
import { BlockPreview, pageBackground, useTheme } from "./StageView.tsx";
import { tr } from "../i18n/index.ts";

export function VerticalEditor() {
  const { project, pageId, selection } = useEditor();
  const theme = useTheme(project!);
  const page = project?.pages.find((p) => p.id === pageId);
  if (!project || !page) return null;

  return (
    <div className="st-vertical-wrap" onPointerDown={() => store.select([])}>
      <div ref={theme} className="lsp-canvas lsp--vertical st-phone" style={pageBackground(page)}>
        {page.blocks.length === 0 && <p className="st-empty">{tr("emptyPage")}</p>}
        {page.blocks.map((b, i) => {
          const on = selection.includes(b.id);
          return (
            <div
              key={b.id}
              data-block={b.id}
              className={`st-vblock st-item ${b.width === "full" ? "is-full" : ""} ${on ? "is-selected" : ""}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                store.select([b.id]);
              }}
              onDoubleClick={() => document.getElementById("st-main-field")?.focus()}
            >
              <BlockPreview block={b} project={project} />
              {on && (
                <div className="st-vtools" onPointerDown={(e) => e.stopPropagation()}>
                  <button className="st-btn st-btn--icon" aria-label={tr("moveUp")} title={tr("moveUp")} disabled={i === 0} onClick={() => store.edit((p) => reorderBlock(p, page.id, b.id, "up"))}>↑</button>
                  <button className="st-btn st-btn--icon" aria-label={tr("moveDown")} title={tr("moveDown")} disabled={i === page.blocks.length - 1} onClick={() => store.edit((p) => reorderBlock(p, page.id, b.id, "down"))}>↓</button>
                  <button
                    className="st-btn st-btn--icon"
                    aria-label={tr("duplicate")}
                    title={tr("duplicate")}
                    onClick={() => {
                      let ids: string[] = [];
                      store.edit((p) => {
                        const r = duplicateBlocks(p, page.id, [b.id]);
                        ids = r.blockIds;
                        return r.project;
                      });
                      store.select(ids);
                    }}
                  >⧉</button>
                  <button className="st-btn st-btn--icon st-btn--danger" aria-label={tr("delete")} title={tr("delete")} onClick={() => store.edit((p) => deleteBlocks(p, page.id, [b.id]))}>🗑</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
