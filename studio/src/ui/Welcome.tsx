// Écran d'accueil : nouveau module, ouvrir, projets récents, langue de Studio.
import { useEffect, useState } from "react";
import type { Mode } from "@player/types.ts";
import { createProject, openProject, recents, slugify, type Recent } from "../commands.ts";
import { getLang, setLang, tr, type StudioLang } from "../i18n/index.ts";
import { backend } from "../io/backend.ts";
import { THEMES } from "../model/themes.ts";

export function Welcome() {
  const [creating, setCreating] = useState(false);
  const [list, setList] = useState<Recent[]>(recents());
  return (
    <main className="st-welcome">
      <div className="st-welcome-top">
        <h1>Learning Suite Studio</h1>
        <label className="st-lang">
          <span>{tr("appLanguage")}</span>
          <select value={getLang()} onChange={(e) => setLang(e.target.value as StudioLang)}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>
      <p className="st-muted">{tr("welcomeLead")}</p>
      <div className="st-welcome-actions">
        <button className="st-btn st-btn--primary st-btn--big" onClick={() => setCreating(true)}>{tr("newModule")}</button>
        <button className="st-btn st-btn--big" onClick={() => void openProject().then(() => setList(recents()))}>{tr("openModule")}</button>
      </div>
      {list.length > 0 && (
        <section className="st-recents">
          <h2>{tr("recentModules")}</h2>
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
  const [language, setLanguage] = useState<string>(getLang());
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
    const ok = await createProject({ title, mode, themeId, dir, language });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div className="st-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="st-modal" onSubmit={(e) => (e.preventDefault(), void submit())} aria-labelledby="new-title">
        <h2 id="new-title">{tr("newModuleTitle")}</h2>
        <label className="st-field">
          <span>{tr("moduleTitle")}</span>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("moduleTitlePh")} />
        </label>

        <fieldset className="st-field">
          <legend>{tr("format")}</legend>
          <div className="st-choices">
            <label className={`st-choice ${mode === "slides" ? "is-on" : ""}`}>
              <input type="radio" name="mode" checked={mode === "slides"} onChange={() => setMode("slides")} />
              <span className="st-mode-icon st-mode-icon--slides" aria-hidden />
              <strong>{tr("modeSlides")}</strong>
              <span className="st-muted">{tr("modeSlidesDesc")}</span>
            </label>
            <label className={`st-choice ${mode === "vertical" ? "is-on" : ""}`}>
              <input type="radio" name="mode" checked={mode === "vertical"} onChange={() => setMode("vertical")} />
              <span className="st-mode-icon st-mode-icon--vertical" aria-hidden />
              <strong>{tr("modeVertical")}</strong>
              <span className="st-muted">{tr("modeVerticalDesc")}</span>
            </label>
          </div>
        </fieldset>

        <label className="st-field">
          <span>{tr("moduleLanguage")}</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="fr">{tr("langFr")}</option>
            <option value="en">{tr("langEn")}</option>
          </select>
        </label>

        <fieldset className="st-field">
          <legend>{tr("theme")}</legend>
          <div className="st-themes">
            {THEMES.map((t) => (
              <label key={t.id} className={`st-theme ${themeId === t.id ? "is-on" : ""}`}>
                <input type="radio" name="theme" checked={themeId === t.id} onChange={() => setThemeId(t.id)} />
                <span className="st-swatches" aria-hidden>
                  {[t.theme.colors.primary, t.theme.colors.secondary, t.theme.colors.accent, t.theme.colors.surface].map((c, i) => (
                    <span key={i} style={{ background: c }} />
                  ))}
                </span>
                {tr(t.labelKey)}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="st-field">
          <span>{tr("location")}</span>
          <div className="st-row">
            <code className="st-path">{dir}</code>
            <button type="button" className="st-btn" onClick={() => void backend().then((b) => b.pickFolder()).then((p) => p && setParent(p))}>{tr("change")}</button>
          </div>
        </div>

        <div className="st-modal-actions">
          <button type="button" className="st-btn" onClick={onClose}>{tr("cancel")}</button>
          <button type="submit" className="st-btn st-btn--primary" disabled={!title.trim() || busy}>{tr("createModule")}</button>
        </div>
      </form>
    </div>
  );
}
