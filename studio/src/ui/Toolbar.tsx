// Barre du haut : accueil, enregistrer, annuler/rétablir, vérifier, aperçu, exporter.
import { useMemo } from "react";
import { validateProject } from "@player/validate.ts";
import { saveProject } from "../commands.ts";
import { store, useEditor } from "../model/store.ts";
import type { Dialog } from "./Editor.tsx";

export function Toolbar({ onDialog }: { onDialog: (d: Dialog) => void }) {
  const { project, dirty, canUndo, canRedo } = useEditor();
  const issues = useMemo(() => (project ? validateProject(project).errors.length : 0), [project]);
  if (!project) return null;

  const home = async () => {
    if (store.get().dirty && !(await saveProject(true))) return;
    store.close();
  };

  return (
    <header className="st-toolbar">
      <button className="st-btn st-btn--ghost" onClick={() => void home()} title="Revenir à l'accueil (le module est enregistré)">⌂ Accueil</button>
      <div className="st-toolbar-title">
        <strong>{project.meta.title}</strong>
        <span className="st-muted">{project.mode === "slides" ? "Diapositives" : "Vertical"} · {dirty ? "modifications non enregistrées" : "enregistré"}</span>
      </div>
      <div className="st-toolbar-group">
        <button className="st-btn" onClick={() => void saveProject()} disabled={!dirty} title="Enregistrer (Ctrl+S)">💾 Enregistrer</button>
        <button className="st-btn st-btn--icon" onClick={() => store.undo()} disabled={!canUndo} title="Annuler (Ctrl+Z)" aria-label="Annuler">↶</button>
        <button className="st-btn st-btn--icon" onClick={() => store.redo()} disabled={!canRedo} title="Rétablir (Ctrl+Y)" aria-label="Rétablir">↷</button>
      </div>
      <div className="st-toolbar-group">
        <button className={`st-btn ${issues ? "st-btn--warn" : ""}`} onClick={() => onDialog("issues")} title="Vérifier le module">
          {issues ? `⚠ ${issues} problème${issues > 1 ? "s" : ""}` : "✓ Vérifier"}
        </button>
        <button className="st-btn" onClick={() => onDialog("preview")} title="Voir le module comme un apprenant">▶ Aperçu</button>
        <button className="st-btn st-btn--primary" onClick={() => onDialog("export")}>⇪ Exporter</button>
      </div>
    </header>
  );
}
