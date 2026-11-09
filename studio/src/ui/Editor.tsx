// L'éditeur : barre du haut, pages à gauche, diapo au centre, propriétés à droite.
import { useEffect, useState } from "react";
import { saveProject } from "../commands.ts";
import { deleteBlocks, duplicateBlocks, setFrames } from "../model/actions.ts";
import { store, useEditor } from "../model/store.ts";
import { Canvas } from "./Canvas.tsx";
import { ExportDialog } from "./ExportDialog.tsx";
import { InsertBar } from "./InsertBar.tsx";
import { IssuesDialog } from "./IssuesDialog.tsx";
import { PagesPanel } from "./PagesPanel.tsx";
import { Preview } from "./Preview.tsx";
import { Properties } from "./Properties.tsx";
import { Toolbar } from "./Toolbar.tsx";
import { VerticalEditor } from "./VerticalEditor.tsx";

export type Dialog = "preview" | "export" | "issues" | null;

/** Vrai si l'utilisateur est en train de taper dans un champ (les raccourcis ne doivent pas gêner). */
const typing = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
};

export function Editor() {
  const { project } = useEditor();
  const [dialog, setDialog] = useState<Dialog>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (ctrl && key === "s") {
        e.preventDefault();
        void saveProject();
        return;
      }
      if (dialog || typing(e)) return;
      const { pageId, selection, project: p } = store.get();
      if (ctrl && key === "z" && !e.shiftKey) (e.preventDefault(), store.undo());
      else if (ctrl && (key === "y" || (key === "z" && e.shiftKey))) (e.preventDefault(), store.redo());
      else if (!pageId || selection.length === 0) return;
      else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        store.edit((proj) => deleteBlocks(proj, pageId, selection));
      } else if (ctrl && key === "d") {
        e.preventDefault();
        let created: string[] = [];
        store.edit((proj) => {
          const r = duplicateBlocks(proj, pageId, selection);
          created = r.blockIds;
          return r.project;
        });
        store.select(created);
      } else if (e.key === "Escape") store.select([]);
      else if (p?.mode === "slides" && e.key.startsWith("Arrow")) {
        // Flèches : 1 px, avec Maj : 10 px.
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        const page = p.pages.find((x) => x.id === pageId)!;
        const frames = Object.fromEntries(
          page.blocks.filter((b) => selection.includes(b.id) && b.frame).map((b) => [b.id, { ...b.frame!, x: b.frame!.x + dx, y: b.frame!.y + dy }]),
        );
        store.edit((proj) => setFrames(proj, pageId, frames));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog]);

  if (!project) return null;
  return (
    <div className="st-editor">
      <Toolbar onDialog={setDialog} />
      <PagesPanel />
      <main className="st-center">
        <InsertBar />
        {project.mode === "slides" ? <Canvas /> : <VerticalEditor />}
      </main>
      <Properties />
      {dialog === "preview" && <Preview onClose={() => setDialog(null)} />}
      {dialog === "export" && <ExportDialog onClose={() => setDialog(null)} />}
      {dialog === "issues" && <IssuesDialog onClose={() => setDialog(null)} />}
    </div>
  );
}
