// Export : SCORM 1.2 (pour un LMS) ou HTML5 (site autonome). Refusé s'il reste des problèmes.
import { useState } from "react";
import { buildPackage, packageName, type ExportFormat } from "@player/export/package.ts";
import playerCss from "../../../player/dist/player.css?raw";
import playerJs from "../../../player/dist/player.js?raw";
import { saveProject, tell } from "../commands.ts";
import { backendSync } from "../io/backend.ts";
import { useEditor } from "../model/store.ts";
import { IssueList, useIssues } from "./IssuesDialog.tsx";
import { tr } from "../i18n/index.ts";

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const { project, dir } = useEditor();
  const issues = useIssues();
  const [format, setFormat] = useState<ExportFormat>("scorm12");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  if (!project || !dir) return null;

  const run = async () => {
    setBusy(true);
    try {
      await saveProject(true);
      const b = backendSync();
      const media = await b.listMedia(dir);
      // Le paquet est construit ici ; les médias sont ajoutés au zip directement depuis le disque.
      const files = buildPackage({ project, media: new Map(media.map((m) => [m, new Uint8Array()])), playerJs, playerCss, format });
      const dec = new TextDecoder();
      const texts: [string, string][] = [...files].filter(([name]) => !name.startsWith("media/")).map(([name, data]) => [name, dec.decode(data)]);
      const out = await b.exportZip(dir, packageName(project, format), texts, media);
      if (out) {
        setDone(out);
        tell(tr("exportFinished"));
      }
    } catch (e) {
      tell(tr("exportFailed", { msg: e instanceof Error ? e.message : String(e) }), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="st-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="st-modal" role="dialog" aria-labelledby="export-title">
        <h2 id="export-title">{tr("exportTitle")}</h2>
        {done ? (
          <>
            <p className="st-ok">{tr("exportDone")}</p>
            <code className="st-path">{done}</code>
            <p className="st-muted">{tr(format === "scorm12" ? "exportScormHint" : "exportHtmlHint")}</p>
          </>
        ) : (
          <>
            <fieldset className="st-field">
              <legend>{tr("format")}</legend>
              <div className="st-choices">
                <label className={`st-choice ${format === "scorm12" ? "is-on" : ""}`}>
                  <input type="radio" name="format" checked={format === "scorm12"} onChange={() => setFormat("scorm12")} />
                  <strong>SCORM 1.2</strong>
                  <span className="st-muted">{tr("scormDesc")}</span>
                </label>
                <label className={`st-choice ${format === "html5" ? "is-on" : ""}`}>
                  <input type="radio" name="format" checked={format === "html5"} onChange={() => setFormat("html5")} />
                  <strong>HTML5</strong>
                  <span className="st-muted">{tr("htmlDesc")}</span>
                </label>
              </div>
            </fieldset>
            {issues === null && <p>{tr("checkingModule")}</p>}
            {!!issues?.length && (
              <div className="st-warning">
                <strong>{tr("exportBlocked")}</strong>
                <IssueList issues={issues} />
              </div>
            )}
          </>
        )}
        <div className="st-modal-actions">
          <button className="st-btn" onClick={onClose}>{tr(done ? "close" : "cancel")}</button>
          {!done && (
            <button className="st-btn st-btn--primary" disabled={busy || issues === null || issues.length > 0} onClick={() => void run()}>
              {tr(busy ? "exporting" : "exportAction")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
