// Barre du haut : accueil, enregistrer, annuler/rétablir, vérifier, aperçu, exporter.
import { saveProject } from "../commands.ts";
import { tr } from "../i18n/index.ts";
import { store, useEditor } from "../model/store.ts";
import type { Dialog } from "./Editor.tsx";
import { useIssues } from "./IssuesDialog.tsx";

export function Toolbar({ onDialog }: { onDialog: (d: Dialog) => void }) {
  const { project, dirty, canUndo, canRedo } = useEditor();
  // Même vérification que l'export : schéma, cohérence et fichiers présents.
  const issues = useIssues()?.length ?? 0;
  if (!project) return null;

  const home = async () => {
    if (store.get().dirty && !(await saveProject(true))) return;
    store.close();
  };

  return (
    <header className="st-toolbar">
      <button className="st-btn st-btn--ghost" onClick={() => void home()} title={tr("homeTitle")}>{tr("home")}</button>
      <div className="st-toolbar-title">
        <strong>{project.meta.title}</strong>
        <span className="st-muted">{tr(project.mode === "slides" ? "modeSlides" : "modeVertical")} · {tr(dirty ? "unsaved" : "saved")}</span>
      </div>
      <div className="st-toolbar-group">
        <button className="st-btn" onClick={() => void saveProject()} disabled={!dirty} title={tr("saveTitle")}>{tr("save")}</button>
        <button className="st-btn st-btn--icon" onClick={() => store.undo()} disabled={!canUndo} title={tr("undoTitle")} aria-label={tr("undo")}>↶</button>
        <button className="st-btn st-btn--icon" onClick={() => store.redo()} disabled={!canRedo} title={tr("redoTitle")} aria-label={tr("redo")}>↷</button>
      </div>
      <div className="st-toolbar-group">
        <button className={`st-btn ${issues ? "st-btn--warn" : ""}`} onClick={() => onDialog("issues")} title={tr("checkTitle")}>
          {issues ? (issues > 1 ? tr("issuesMany", { n: issues }) : tr("issuesOne")) : tr("check")}
        </button>
        <button className="st-btn" onClick={() => onDialog("preview")} title={tr("previewTitle")}>{tr("preview")}</button>
        <button className="st-btn st-btn--primary" onClick={() => onDialog("export")}>{tr("export")}</button>
      </div>
    </header>
  );
}
