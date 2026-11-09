// Le lecteur : assemble l'interface (titre, menu, progression, navigation, voix off)
// et affiche la page courante dans le bon mode.
import { translator, type Translate } from "./i18n.ts";
import { Navigator } from "./navigation.ts";
import { computeScore, hasExercises, isExercise, waitsForActivities, newQuestionState, openItem, submitMulti, pageActivities, reportHtml, submit, type QuestionState } from "./activities.ts";
import { el, type RenderContext } from "./render/context.ts";
import { renderSlidesPage } from "./render/layout-slides.ts";
import { renderVerticalPage } from "./render/layout-vertical.ts";
import { LocalTracker } from "./tracker/local.ts";
import type { LessonStatus, SavedState, Tracker } from "./tracker/tracker.ts";
import type { ButtonAction, Project } from "./types.ts";
import { startVoiceover, type VoiceoverControls } from "./voiceover.ts";

export interface PlayerOptions {
  /** Adresse du dossier du projet (là où se trouve media/). Par défaut : dossier courant. */
  baseUrl?: string;
  /** Adresse d'un média, si elle ne se calcule pas simplement à partir de baseUrl (ex. Studio). */
  resolveMedia?: (src: string) => string;
  tracker?: Tracker;
  /** Page de départ (aperçu dans Studio). */
  startPage?: number;
}

/** Couleurs, polices et arrondis du thème, posés en variables CSS sur un élément. */
export function themeVars(project: Project): Record<string, string> {
  const c = project.theme.colors;
  return {
    "--lsp-primary": c.primary,
    "--lsp-secondary": c.secondary ?? c.text,
    "--lsp-accent": c.accent ?? c.primary,
    "--lsp-background": c.background,
    "--lsp-surface": c.surface ?? c.background,
    "--lsp-text": c.text,
    "--lsp-success": c.success ?? "#1E9E5A",
    "--lsp-error": c.error ?? "#D64545",
    "--lsp-font-heading": `"${project.theme.fonts.heading}", system-ui, sans-serif`,
    "--lsp-font-body": `"${project.theme.fonts.body}", system-ui, sans-serif`,
    "--lsp-radius": `${project.theme.radius ?? 8}px`,
  };
}

export function applyTheme(el: HTMLElement, project: Project) {
  for (const [k, v] of Object.entries(themeVars(project))) el.style.setProperty(k, v);
}

export class Player {
  readonly nav: Navigator;
  private readonly project: Project;
  private readonly tracker: Tracker;
  private readonly baseUrl: string;
  private readonly resolveMedia?: (src: string) => string;
  private readonly states = new Map<string, QuestionState>();
  private readonly seed = Math.floor(Math.random() * 2 ** 31);
  private readonly doc: Document;
  private readonly t: Translate;
  private updaters: (() => void)[] = [];
  private disposers: (() => void)[] = [];
  private disposePage: () => void = () => {};
  private voiceover: VoiceoverControls = { stop() {} };
  private readonly ui;

  constructor(container: HTMLElement, project: Project, options: PlayerOptions = {}) {
    this.project = project;
    this.doc = container.ownerDocument;
    this.t = translator(project.meta.language);
    this.baseUrl = options.baseUrl ?? "";
    this.resolveMedia = options.resolveMedia;
    this.tracker = options.tracker ?? new LocalTracker();
    this.nav = new Navigator(project);
    this.ui = this.buildShell(container);
    const saved = this.tracker.start(project.meta);
    if (saved) this.restore(saved);
    else if (options.startPage) this.nav.goTo(options.startPage, true);
    // Fin de session : on prévient le LMS une seule fois, quel que soit l'événement.
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      this.tracker.finish();
    };
    this.doc.defaultView?.addEventListener("pagehide", finish);
    this.doc.defaultView?.addEventListener("beforeunload", finish);
    this.show(false);
  }

  // ---------- Interface fixe ----------

  private buildShell(container: HTMLElement) {
    const { doc, project } = this;
    const nav = project.navigation;
    const root = el(doc, "div", { class: `lsp lsp--${project.mode}`, attrs: { lang: project.meta.language } });
    applyTheme(root, project);

    const menuBtn = el(doc, "button", { class: "lsp-icon-btn", text: this.t("menu"), attrs: { type: "button", "aria-expanded": "false", "aria-controls": "lsp-menu" } });
    const counter = el(doc, "span", { class: "lsp-counter" });
    const header = el(doc, "header", { class: "lsp-top" }, menuBtn, el(doc, "h1", { class: "lsp-title", text: project.meta.title }), counter);
    menuBtn.hidden = nav.showMenu === false;

    const bar = el(doc, "div", { class: "lsp-progress-bar" });
    const progress = el(doc, "div", { class: "lsp-progress", attrs: { role: "progressbar", "aria-label": this.t("progress"), "aria-valuemin": "0", "aria-valuemax": "100" } }, bar);
    progress.hidden = nav.showProgress === false;

    const menuList = el(doc, "ol");
    const menu = el(doc, "nav", { class: "lsp-menu", attrs: { id: "lsp-menu", "aria-label": this.t("pagesNav") } }, menuList);
    menu.hidden = true;
    menuBtn.addEventListener("click", () => {
      menu.hidden = !menu.hidden;
      menuBtn.setAttribute("aria-expanded", String(!menu.hidden));
      if (!menu.hidden) this.drawMenu();
    });

    const main = el(doc, "main", { class: "lsp-main", attrs: { tabindex: "-1" } });

    const voBtn = el(doc, "button", { class: "lsp-icon-btn", attrs: { type: "button" } });
    const trBtn = el(doc, "button", { class: "lsp-icon-btn", text: this.t("transcript"), attrs: { type: "button", "aria-expanded": "false", "aria-controls": "lsp-transcript" } });
    const transcript = el(doc, "div", { class: "lsp-transcript", attrs: { id: "lsp-transcript" } });
    const hint = el(doc, "span", { class: "lsp-hint", attrs: { "aria-live": "polite" } });
    const prev = el(doc, "button", { class: "lsp-button lsp-button--secondary", text: this.t("prev"), attrs: { type: "button" } });
    const next = el(doc, "button", { class: "lsp-button lsp-button--primary", text: this.t("next"), attrs: { type: "button" } });
    prev.addEventListener("click", () => this.act({ type: "prev" }));
    next.addEventListener("click", () => this.act({ type: "next" }));
    const footer = el(doc, "footer", { class: "lsp-bottom" },
      el(doc, "div", { class: "lsp-vo" }, voBtn, trBtn), hint, el(doc, "div", { class: "lsp-pager" }, prev, next));

    root.append(header, progress, menu, main, transcript, footer);
    container.replaceChildren(root);
    return { root, main, menu, menuList, menuBtn, counter, progress, bar, prev, next, hint, voBtn, trBtn, transcript };
  }

  private drawMenu() {
    const { doc, nav, ui } = this;
    ui.menuList.replaceChildren(
      ...this.project.pages.map((p, i) => {
        const b = el(doc, "button", { text: p.title, attrs: { type: "button" } });
        if (i === nav.current) b.setAttribute("aria-current", "page");
        b.disabled = i !== nav.current && !nav.canJumpTo(i);
        if (nav.isVisited(i)) b.classList.add("is-visited");
        b.addEventListener("click", () => {
          ui.menu.hidden = true;
          ui.menuBtn.setAttribute("aria-expanded", "false");
          if (nav.goTo(i)) this.show();
        });
        return el(doc, "li", {}, b);
      }),
    );
  }

  /** Met à jour tout ce qui dépend de l'état : boutons, compteur, progression, briques abonnées. */
  private refresh() {
    const { nav, ui } = this;
    ui.counter.textContent = `${nav.current + 1} / ${nav.count}`;
    const pct = Math.round(nav.progress * 100);
    ui.bar.style.width = `${pct}%`;
    ui.progress.setAttribute("aria-valuenow", String(pct));
    ui.prev.hidden = this.project.navigation.allowBack === false;
    ui.prev.disabled = !nav.canPrev();
    ui.next.disabled = !nav.canNext();
    ui.next.hidden = nav.current === nav.count - 1;
    const rule = nav.page.unlockNext ?? "always";
    ui.hint.textContent =
      nav.isUnlocked() || nav.current === nav.count - 1
        ? ""
        : rule === "voiceoverEnded"
          ? this.t("hintVoiceover")
          : this.t("hintActivities");
    if (!ui.menu.hidden) this.drawMenu();
    this.updaters.forEach((fn) => fn());
  }

  // ---------- Page courante ----------

  private show(moveFocus = true) {
    this.disposePage();
    this.disposers.forEach((fn) => fn());
    this.disposers = [];
    this.voiceover.stop();
    this.updaters = [];
    const page = this.nav.page;
    const ctx = this.context();
    const view = this.project.mode === "slides" ? renderSlidesPage(page, ctx) : renderVerticalPage(page, ctx);
    this.disposePage = view.dispose;
    this.ui.main.replaceChildren(view.root);
    this.ui.main.scrollTop = 0;
    this.ui.main.setAttribute("aria-label", page.title);
    this.doc.title = `${page.title} · ${this.project.meta.title}`;
    if (moveFocus) this.ui.main.focus({ preventScroll: true });

    // Une page « questionsAnswered » déjà toute répondue reste débloquée.
    if (waitsForActivities(page) && this.pageQuestionsDone()) this.nav.unlockCurrent();

    this.voiceover = startVoiceover(page, (s) => this.resolve(s), { button: this.ui.voBtn, transcriptToggle: this.ui.trBtn, transcript: this.ui.transcript, t: this.t }, () => {
      if (page.unlockNext === "voiceoverEnded" && this.nav.page === page) {
        this.nav.unlockCurrent();
        this.refresh();
        this.report();
      }
    });

    this.refresh();
    this.report();
  }

  // ---------- Suivi et reprise ----------

  /** Statut de l'apprenant : réussi/échoué s'il y a des activités notées, sinon terminé quand tout est vu. */
  status(): LessonStatus {
    if (hasExercises(this.project)) {
      const s = this.score();
      return s.complete ? (s.passed ? "passed" : "failed") : "incomplete";
    }
    return this.nav.allVisited ? "completed" : "incomplete";
  }

  snapshot(): SavedState {
    return { v: 1, ...this.nav.snapshot(), activities: Object.fromEntries(this.states) };
  }

  private restore(saved: SavedState) {
    this.nav.restore(saved);
    const ids = new Set(this.project.pages.flatMap((p) => p.blocks.map((b) => b.id)));
    for (const [id, st] of Object.entries(saved.activities)) if (ids.has(id)) this.states.set(id, st);
  }

  private report() {
    this.tracker.update({
      pageId: this.nav.page.id,
      progress: this.nav.progress,
      status: this.status(),
      score: hasExercises(this.project) ? this.score() : null,
      state: this.snapshot(),
    });
  }

  private pageQuestionsDone() {
    return pageActivities(this.nav.page).every((a) => this.states.get(a.id)?.done);
  }

  private resolve(src: string) {
    if (this.resolveMedia) return this.resolveMedia(src);
    if (!this.baseUrl) return src;
    return this.baseUrl.endsWith("/") ? this.baseUrl + src : `${this.baseUrl}/${src}`;
  }

  private act(action: ButtonAction) {
    const nav = this.nav;
    let moved = false;
    if (action.type === "next") moved = nav.next();
    else if (action.type === "prev") moved = nav.prev();
    else if (action.type === "goto") moved = nav.goTo(nav.indexOf(action.page));
    else if (action.type === "url") this.doc.defaultView?.open(action.href, "_blank", "noopener");
    if (moved) this.show();
  }

  private canAct(action: ButtonAction) {
    if (action.type === "next") return this.nav.canNext();
    if (action.type === "prev") return this.nav.canPrev();
    if (action.type === "goto") return this.nav.canJumpTo(this.nav.indexOf(action.page));
    return true;
  }

  /** « Recommencer le quiz » : on efface les réponses notées et on retourne à la première question. */
  retry() {
    const pages = this.project.pages;
    let first = -1;
    pages.forEach((p, i) => {
      const graded = p.blocks.filter(isExercise);
      if (graded.length === 0) return;
      if (first < 0) first = i;
      graded.forEach((q) => this.states.delete(q.id));
      if (waitsForActivities(p)) this.nav.lock(i);
    });
    if (first >= 0) {
      this.nav.goTo(first, true);
      this.show();
    } else {
      this.refresh();
      this.report();
    }
  }

  /** Après une réponse ou un score de jeu : score, déblocage, affichage. */
  private afterActivity() {
    if (waitsForActivities(this.nav.page) && this.pageQuestionsDone()) this.nav.unlockCurrent();
    this.refresh();
    this.report();
  }

  score() {
    return computeScore(this.project, this.states);
  }

  private context(): RenderContext {
    return {
      project: this.project,
      mode: this.project.mode,
      doc: this.doc,
      t: this.t,
      seed: this.seed,
      resolve: (s) => this.resolve(s),
      act: (a) => this.act(a),
      canAct: (a) => this.canAct(a),
      questionState: (id) => this.states.get(id) ?? newQuestionState(),
      submit: (q, response) => {
        const st = submit(q, this.states.get(q.id) ?? newQuestionState(), response);
        this.states.set(q.id, st);
        this.afterActivity();
        return st;
      },
      reportHtml: (b, msg) => {
        this.states.set(b.id, reportHtml(this.states.get(b.id) ?? newQuestionState(), msg));
        this.afterActivity();
      },
      openItem: (blockId, itemId, allIds, requireAll) => {
        const before = this.states.get(blockId) ?? newQuestionState();
        const after = openItem(before, itemId, allIds, requireAll);
        this.states.set(blockId, after);
        // On ne prévient le LMS que si quelque chose a changé.
        if (after.opened!.length !== (before.opened ?? []).length || after.done !== before.done) this.afterActivity();
      },
      submitMulti: (b, response) => {
        const st = submitMulti(b, this.states.get(b.id) ?? newQuestionState(), response);
        this.states.set(b.id, st);
        this.afterActivity();
        return st;
      },
      score: () => this.score(),
      retry: () => this.retry(),
      onUpdate: (fn) => this.updaters.push(fn),
      onDispose: (fn) => this.disposers.push(fn),
    };
  }
}
