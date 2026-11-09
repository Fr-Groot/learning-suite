// Panneau de gauche : la liste des pages, et l'ajout d'une page depuis un modèle.
import { useState } from "react";
import { addPage, deletePage, duplicatePage, movePage } from "../model/actions.ts";
import { store, useEditor } from "../model/store.ts";
import { templatesFor } from "../model/templates.ts";
import { PageThumbnail } from "./StageView.tsx";

export function PagesPanel() {
  const { project, pageId } = useEditor();
  const [picking, setPicking] = useState(false);
  if (!project) return null;
  const index = project.pages.findIndex((p) => p.id === pageId);

  const add = (templateId: string | null) => {
    let created = "";
    store.edit((p) => {
      const r = addPage(p, templateId, pageId);
      created = r.pageId;
      return r.project;
    });
    store.selectPage(created);
    setPicking(false);
  };

  const remove = async () => {
    if (!pageId || project.pages.length <= 1) return;
    store.edit((p) => deletePage(p, pageId));
  };

  return (
    <nav className="st-pages" aria-label="Pages du module">
      <ol className="st-pages-list">
        {project.pages.map((page, i) => (
          <li key={page.id}>
            <button
              className={`st-page ${page.id === pageId ? "is-current" : ""}`}
              onClick={() => store.selectPage(page.id)}
              aria-current={page.id === pageId ? "page" : undefined}
            >
              <span className="st-page-num">{i + 1}</span>
              <PageThumbnail page={page} project={project} width={150} />
              <span className="st-page-title">{page.title}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="st-pages-actions">
        <button className="st-btn st-btn--primary st-btn--block" onClick={() => setPicking((v) => !v)} aria-expanded={picking}>＋ Ajouter une page</button>
        {pageId && (
          <div className="st-row st-row--tight">
            <button className="st-btn st-btn--icon" title="Monter" aria-label="Monter la page" disabled={index <= 0} onClick={() => store.edit((p) => movePage(p, pageId, index - 1))}>↑</button>
            <button className="st-btn st-btn--icon" title="Descendre" aria-label="Descendre la page" disabled={index >= project.pages.length - 1} onClick={() => store.edit((p) => movePage(p, pageId, index + 1))}>↓</button>
            <button
              className="st-btn st-btn--icon"
              title="Dupliquer"
              aria-label="Dupliquer la page"
              onClick={() => {
                let created = "";
                store.edit((p) => {
                  const r = duplicatePage(p, pageId);
                  created = r.pageId;
                  return r.project;
                });
                store.selectPage(created);
              }}
            >⧉</button>
            <button className="st-btn st-btn--icon st-btn--danger" title="Supprimer" aria-label="Supprimer la page" disabled={project.pages.length <= 1} onClick={() => void remove()}>🗑</button>
          </div>
        )}
      </div>

      {picking && (
        <div className="st-popover" role="dialog" aria-label="Choisir un modèle de page">
          <h3>Nouvelle page</h3>
          <div className="st-templates">
            <button className="st-template" onClick={() => add(null)}>
              <span className="st-template-blank" />
              Page blanche
            </button>
            {templatesFor(project.mode).map((t) => (
              <button key={t.id} className="st-template" onClick={() => add(t.id)}>
                <PageThumbnail page={t.page} project={project} width={130} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
