// Lanceur Learning Suite : mes modules, les applis de la suite (Studio, Review, Clicksy), mes outils.
import { useCallback, useEffect, useState } from "react";
import "@player/player.css";
import "./App.css";
import { getLang, setLang, tr, useT, type LauncherKey, type LauncherLang } from "./i18n/index.ts";
import { backend, backendSync, type ClicksyAction, type ModuleCard, type Overview } from "./io/backend.ts";
import { tell, useNotice } from "./notices.ts";
import { Thumbnail } from "./ui/Thumbnail.tsx";

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Lance une action ; « {name} s'ouvre… » si c'est bon, le message d'erreur sinon. */
async function run(name: string | null, action: () => Promise<unknown>) {
  try {
    await action();
    if (name) tell(tr("launching", { name }));
  } catch (e) {
    tell(tr("failed", { msg: message(e) }), "error");
  }
}

export default function App() {
  useT();
  const lang = getLang();
  const notice = useNotice();
  const [data, setData] = useState<Overview | null>(null);

  const refresh = useCallback(() => {
    void backend()
      .then((b) => b.overview())
      .then(setData)
      .catch((e) => tell(tr("failed", { msg: message(e) }), "error"));
  }, []);

  useEffect(() => void (document.documentElement.lang = lang), [lang]);
  useEffect(() => {
    refresh();
    // De retour dans le lanceur (après Studio, Clicksy…) : la liste se met à jour.
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  if (!data) return null;
  return (
    <>
      <div key={lang} className="ln-root">
        <header className="ln-header">
          <div className="ln-brand">
            <img className="ln-logo" src="/logo.svg" alt="" width={44} height={44} />
            <div>
              <h1>Learning Suite</h1>
              <p className="ln-muted">{tr("tagline")}</p>
            </div>
          </div>
          <div className="ln-header-tools">
            <button className="ln-btn ln-btn--ghost" onClick={refresh}>↻ {tr("refresh")}</button>
            <label className="ln-lang">
              <span>{tr("appLanguage")}</span>
              <select value={lang} onChange={(e) => setLang(e.target.value as LauncherLang)}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
        </header>
        <main className="ln-main">
          <Modules data={data} onChange={refresh} />
          <Apps data={data} onChange={refresh} />
          <Tools data={data} onChange={(tools) => setData({ ...data, tools })} />
        </main>
        <footer className="ln-footer ln-muted">
          <span>{tr("version", { v: data.version })} · AGPLv3</span>
          <button className="ln-link" onClick={() => void run(null, () => backendSync().pageOpen("site"))}>{tr("siteLink")}</button>
        </footer>
      </div>
      {notice && (
        <div className={`ln-notice ln-notice--${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
          {notice.text}
        </div>
      )}
    </>
  );
}

// ---------- Mes modules ----------

function Modules({ data, onChange }: { data: Overview; onChange: () => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const list = q ? data.modules.filter((m) => m.title.toLowerCase().includes(q)) : data.modules;
  const studio = data.studio;
  return (
    <section className="ln-section" aria-labelledby="modules-title">
      <div className="ln-section-head">
        <h2 id="modules-title">{tr("myModules")}</h2>
        <div className="ln-section-tools">
          {data.modules.length > 0 && (
            <input className="ln-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("search")} aria-label={tr("search")} />
          )}
          {data.projectsDir && (
            <button className="ln-btn" onClick={() => void run(null, () => backendSync().folderOpen(data.projectsDir!))}>{tr("modulesFolder")}</button>
          )}
          <button className="ln-btn ln-btn--primary" disabled={!studio} onClick={() => void run("Studio", () => backendSync().studioNew())}>{tr("newModule")}</button>
        </div>
      </div>
      {!studio && (
        <p className="ln-warn">
          {tr("studioMissing")}{" "}
          <button className="ln-link" onClick={() => void run(null, () => backendSync().pageOpen("suite"))}>{tr("installStudio")}</button>
        </p>
      )}
      {data.modules.length === 0 ? (
        <p className="ln-empty">{tr("noModules")}</p>
      ) : list.length === 0 ? (
        <p className="ln-empty">{tr("noMatch", { q: query })}</p>
      ) : (
        <ul className="ln-cards">
          {list.map((m) => (
            <ModuleItem key={m.dir} card={m} canOpen={!!studio} onChange={onChange} />
          ))}
        </ul>
      )}
    </section>
  );
}

const STAGES: LauncherKey[] = ["stageFraming", "stageScript", "stageStoryboard", "stageProduction", "stageReview", "stageDelivery"];
/** Aujourd'hui, seule la production existe dans la suite ; les autres étapes arrivent (feuille de route). */
const CURRENT = "stageProduction";

function ModuleItem({ card, canOpen, onChange }: { card: ModuleCard; canOpen: boolean; onChange: () => void }) {
  const title = card.title || tr("untitled");
  const date = card.modified ? new Date(card.modified).toLocaleDateString(getLang() === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  const open = () => void run("Studio", () => backendSync().studioOpen(card.dir));
  return (
    <li className="ln-card" aria-label={tr("moduleOf", { title })}>
      <button className="ln-card-thumb" onClick={open} disabled={!canOpen} tabIndex={-1} aria-hidden>
        <Thumbnail card={card} width={264} />
      </button>
      <div className="ln-card-body">
        <div className="ln-card-title">
          <h3>{title}</h3>
          {card.recent && <span className="ln-badge">{tr("recentTag")}</span>}
        </div>
        <p className="ln-muted ln-card-meta">
          {tr(card.mode === "vertical" ? "modeVertical" : "modeSlides")} · {card.language.toUpperCase()} · {tr(card.pages > 1 ? "pagesCount" : "pageCount", { n: card.pages })}
          {date && <><br />{tr("modifiedOn", { date })}</>}
        </p>
        <ol className="ln-journey" aria-label={tr("journey")}>
          {STAGES.map((s) => {
            const current = s === CURRENT;
            return (
              <li key={s} className={current ? "is-current" : "is-soon"} title={tr(current ? "stageCurrent" : "stageSoon", { stage: tr(s) })}>
                {tr(s)}
              </li>
            );
          })}
        </ol>
        <div className="ln-card-actions">
          <button className="ln-btn ln-btn--primary" disabled={!canOpen} onClick={open}>{tr("openInStudio")}</button>
          <button className="ln-btn" onClick={() => void run(null, () => backendSync().folderOpen(card.dir))}>{tr("folder")}</button>
          {card.recent && (
            <button className="ln-btn ln-btn--ghost ln-btn--icon" title={tr("forget")} aria-label={tr("forget")} onClick={() => void run(null, () => backendSync().moduleForget(card.dir)).then(onChange)}>✕</button>
          )}
        </div>
      </div>
    </li>
  );
}

// ---------- Applis de la suite ----------

const CLICKSY_ACTIONS: [ClicksyAction, LauncherKey][] = [
  ["video", "clicksyVideo"],
  ["guide", "clicksyGuide"],
  ["session", "clicksySession"],
];

function Apps({ data, onChange }: { data: Overview; onChange: () => void }) {
  const b = backendSync();
  const ver = (v: string | null | undefined) => (v ? ` ${v}` : "");
  return (
    <section className="ln-section" aria-labelledby="apps-title">
      <h2 id="apps-title">{tr("suiteApps")}</h2>
      <ul className="ln-apps">
        <li className="ln-app" aria-label="Studio">
          <span className="ln-app-icon ln-app-icon--studio" aria-hidden>S</span>
          <div className="ln-app-body">
            <h3>Studio<span className="ln-muted">{ver(data.studio?.version)}</span></h3>
            <p className="ln-muted">{tr("studioDesc")}</p>
            {data.studio ? (
              <div className="ln-app-actions">
                <button className="ln-btn ln-btn--primary" onClick={() => void run("Studio", () => b.studioStart())}>{tr("open")}</button>
              </div>
            ) : (
              <div className="ln-app-actions">
                <span className="ln-muted">{tr("notInstalled")}</span>
                <button className="ln-btn" onClick={() => void run(null, () => b.pageOpen("suite"))}>{tr("installStudio")}</button>
              </div>
            )}
          </div>
        </li>

        <li className="ln-app is-soon" aria-label="Review">
          <span className="ln-app-icon ln-app-icon--review" aria-hidden>R</span>
          <div className="ln-app-body">
            <h3>Review <span className="ln-badge ln-badge--soon">{tr("soon")}</span></h3>
            <p className="ln-muted">{tr("reviewDesc")}</p>
          </div>
        </li>

        <li className="ln-app ln-app--wide" aria-label="Clicksy">
          <span className="ln-app-icon ln-app-icon--clicksy" aria-hidden>C</span>
          <div className="ln-app-body">
            <h3>Clicksy<span className="ln-muted">{ver(data.clicksy?.version)}</span></h3>
            <p className="ln-muted">{tr("clicksyDesc")} {tr("clicksyNote")}</p>
            {data.clicksy ? (
              <div className="ln-app-actions">
                <button className="ln-btn ln-btn--primary" onClick={() => void run("Clicksy", () => b.clicksyRun())}>{tr("open")}</button>
                {CLICKSY_ACTIONS.map(([action, key]) => (
                  <button key={action} className="ln-btn" onClick={() => void run("Clicksy", () => b.clicksyRun(action))}>{tr(key)}</button>
                ))}
                <button className="ln-btn" onClick={() => void run(null, async () => b.folderOpen(await b.clicksyFolder()))}>{tr("clicksyFolder")}</button>
              </div>
            ) : (
              <div className="ln-app-actions">
                <span className="ln-muted">{tr("notInstalled")}</span>
                <button className="ln-btn ln-btn--primary" onClick={() => void run(null, () => b.pageOpen("clicksy"))}>{tr("clicksyInstall")}</button>
                <button className="ln-btn ln-btn--ghost" onClick={() => void run(null, () => b.clicksyLocate()).then(onChange)}>{tr("clicksyLocate")}</button>
              </div>
            )}
          </div>
        </li>
      </ul>
    </section>
  );
}

// ---------- Mes outils ----------

function Tools({ data, onChange }: { data: Overview; onChange: (tools: Overview["tools"]) => void }) {
  const b = backendSync();
  const add = async () => {
    try {
      const before = new Set(data.tools.map((t) => t.id));
      const tools = await b.toolAdd();
      if (!tools) return;
      onChange(tools);
      const added = tools.find((t) => !before.has(t.id));
      if (added) tell(tr("toolAdded", { name: added.name }));
    } catch (e) {
      tell(tr("failed", { msg: message(e) }), "error");
    }
  };
  return (
    <section className="ln-section" aria-labelledby="tools-title">
      <div className="ln-section-head">
        <div>
          <h2 id="tools-title">{tr("myTools")}</h2>
          <p className="ln-muted">{tr("toolsLead")}</p>
        </div>
        <button className="ln-btn" onClick={() => void add()}>{tr("addTool")}</button>
      </div>
      {data.tools.length === 0 ? (
        <p className="ln-empty">{tr("noTools")}</p>
      ) : (
        <ul className="ln-tools">
          {data.tools.map((t) => (
            <li key={t.id} className="ln-tool">
              <button className="ln-tool-open" title={t.exe} onClick={() => void run(t.name, () => b.toolRun(t.id))}>
                <span className="ln-tool-icon" aria-hidden>{t.name.slice(0, 1).toUpperCase()}</span>
                {t.name}
              </button>
              <button className="ln-btn ln-btn--ghost ln-btn--icon" aria-label={tr("removeTool", { name: t.name })} title={tr("removeTool", { name: t.name })} onClick={() => void b.toolRemove(t.id).then(onChange)}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
