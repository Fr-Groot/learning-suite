// Écran d'accueil : nouveau module, ouvrir, projets récents.
import { useEffect, useState } from "react";
import type { Mode } from "@player/types.ts";
import { createProject, openProject, recents, slugify, type Recent } from "../commands.ts";
import { backend } from "../io/backend.ts";
import { THEMES } from "../model/themes.ts";

export function Welcome() {
  const [creating, setCreating] = useState(false);
  const [list, setList] = useState<Recent[]>(recents());
  return (
    <main className="st-welcome">
      <h1>Learning Suite Studio</h1>
      <p className="st-muted">Créez des modules e-learning, puis exportez-les en SCORM ou HTML5.</p>
      <div className="st-welcome-actions">
        <button className="st-btn st-btn--primary st-btn--big" onClick={() => setCreating(true)}>＋ Nouveau module</button>
        <button className="st-btn st-btn--big" onClick={() => void openProject().then(() => setList(recents()))}>📂 Ouvrir un module…</button>
      </div>
      {list.length > 0 && (
        <section className="st-recents">
          <h2>Modules récents</h2>
          <ul>
            {list.map((r) => (
              <li key={r.dir}>
                <button className="st-recent" onClick={() => void openProject(r.dir).then(() => setList(recents()))}>
                  <strong>{r.title}</strong>
                  <span className="st-muted">{r.dir}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {creating && <NewProjectDialog onClose={() => setCreating(false)} />}
    </main>
  );
}

function NewProjectDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("slides");
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [parent, setParent] = useState<string | null>(null);
  const [dir, setDir] = useState("");
  const [busy, setBusy] = useState(false);

  // Dossier proposé : Documents\Learning Suite\<titre>, ou dans le dossier choisi.
  useEffect(() => {
    const slug = slugify(title || "nouveau-module");
    void backend().then(async (b) => setDir(parent ? `${parent}${b.kind === "tauri" ? "\\" : "/"}${slug}` : await b.defaultProjectDir(slug)));
  }, [title, parent]);

  const submit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    const ok = await createProject({ title, mode, themeId, dir });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div className="st-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="st-modal" onSubmit={(e) => (e.preventDefault(), void submit())} aria-labelledby="new-title">
        <h2 id="new-title">Nouveau module</h2>
        <label className="st-field">
          <span>Titre du module</span>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. : Accueil des nouveaux arrivants" />
        </label>

        <fieldset className="st-field">
          <legend>Format</legend>
          <div className="st-choices">
            <label className={`st-choice ${mode === "slides" ? "is-on" : ""}`}>
              <input type="radio" name="mode" checked={mode === "slides"} onChange={() => setMode("slides")} />
              <span className="st-mode-icon st-mode-icon--slides" aria-hidden />
              <strong>Diapositives</strong>
              <span className="st-muted">16:9, sur ordinateur, briques placées librement</span>
            </label>
            <label className={`st-choice ${mode === "vertical" ? "is-on" : ""}`}>
              <input type="radio" name="mode" checked={mode === "vertical"} onChange={() => setMode("vertical")} />
              <span className="st-mode-icon st-mode-icon--vertical" aria-hidden />
              <strong>Vertical</strong>
              <span className="st-muted">Défilement, idéal sur téléphone</span>
            </label>
          </div>
        </fieldset>

        <fieldset className="st-field">
          <legend>Thème</legend>
          <div className="st-themes">
            {THEMES.map((t) => (
              <label key={t.id} className={`st-theme ${themeId === t.id ? "is-on" : ""}`}>
                <input type="radio" name="theme" checked={themeId === t.id} onChange={() => setThemeId(t.id)} />
                <span className="st-swatches" aria-hidden>
                  {[t.theme.colors.primary, t.theme.colors.secondary, t.theme.colors.accent, t.theme.colors.surface].map((c, i) => (
                    <span key={i} style={{ background: c }} />
                  ))}
                </span>
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="st-field">
          <span>Emplacement</span>
          <div className="st-row">
            <code className="st-path">{dir}</code>
            <button type="button" className="st-btn" onClick={() => void backend().then((b) => b.pickFolder()).then((p) => p && setParent(p))}>Changer…</button>
          </div>
        </div>

        <div className="st-modal-actions">
          <button type="button" className="st-btn" onClick={onClose}>Annuler</button>
          <button type="submit" className="st-btn st-btn--primary" disabled={!title.trim() || busy}>Créer le module</button>
        </div>
      </form>
    </div>
  );
}
