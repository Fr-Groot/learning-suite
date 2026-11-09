// « Vérifier » : liste des problèmes qui empêcheraient l'export.
import { useEffect, useState } from "react";
import { backendSync } from "../io/backend.ts";
import { useEditor } from "../model/store.ts";
import { checkProject } from "./checks.ts";
import { tr } from "../i18n/index.ts";

export function useIssues() {
  const { project, dir } = useEditor();
  const [issues, setIssues] = useState<string[] | null>(null);
  useEffect(() => {
    if (!project || !dir) return;
    let alive = true;
    void backendSync()
      .listMedia(dir)
      .then((media) => alive && setIssues(checkProject(project, media)));
    return () => {
      alive = false;
    };
  }, [project, dir]);
  return issues;
}

export function IssuesDialog({ onClose }: { onClose: () => void }) {
  const issues = useIssues();
  return (
    <div className="st-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="st-modal" role="dialog" aria-labelledby="issues-title">
        <h2 id="issues-title">{tr("checkModuleTitle")}</h2>
        {issues === null && <p>{tr("checking")}</p>}
        {issues?.length === 0 && <p className="st-ok">{tr("noIssues")}</p>}
        {!!issues?.length && <IssueList issues={issues} />}
        <div className="st-modal-actions">
          <button className="st-btn st-btn--primary" onClick={onClose}>{tr("close")}</button>
        </div>
      </div>
    </div>
  );
}

export function IssueList({ issues }: { issues: string[] }) {
  return (
    <>
      <p>{issues.length > 1 ? tr("issuesToFixMany", { n: issues.length }) : tr("issuesToFixOne")}</p>
      <ul className="st-issues">
        {issues.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </>
  );
}
