// Panneau Propriétés (à droite) : réglages de la brique sélectionnée, de la page, ou du module.
import { useEffect, useState } from "react";
import { isInteraction, roleOf } from "@player/activities.ts";
import type { Block, ButtonAction, Frame, Page, Project, Style } from "@player/types.ts";
import { reorderBlock, updateBlock, updatePage, updateProject } from "../model/actions.ts";
import { store, useEditor } from "../model/store.ts";
import { FONTS, THEMES } from "../model/themes.ts";
import { Check, ColorInput, Field, MarkdownInput, MediaInput, NumberInput, Section, Select, TextArea, TextInput } from "./fields.tsx";

type Tab = "block" | "page" | "module";

const BLOCK_NAMES: Record<Block["type"], string> = {
  text: "Texte", image: "Image", shape: "Forme", button: "Bouton", video: "Vidéo", audio: "Son",
  question: "Question", results: "Résultat", html: "Jeu HTML", flipcards: "Cartes à retourner",
  reveal: "Onglets / frise / accordéon", fillblanks: "Texte à trous", dragdrop: "Glisser-déposer", hotspot: "Zones cliquables",
};

export function Properties() {
  const { project, pageId, selection } = useEditor();
  const [tab, setTab] = useState<Tab>("page");
  // Quand on sélectionne une brique, on montre ses réglages ; sinon ceux de la page.
  useEffect(() => setTab(selection.length ? "block" : (t) => (t === "block" ? "page" : t)), [selection.join(",")]);
  const page = project?.pages.find((p) => p.id === pageId);
  if (!project || !page) return null;
  const block = selection.length === 1 ? page.blocks.find((b) => b.id === selection[0]) : undefined;

  return (
    <aside className="st-props" aria-label="Propriétés">
      <div className="st-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "block"} disabled={!selection.length} onClick={() => setTab("block")}>Brique</button>
        <button role="tab" aria-selected={tab === "page"} onClick={() => setTab("page")}>Page</button>
        <button role="tab" aria-selected={tab === "module"} onClick={() => setTab("module")}>Module</button>
      </div>
      <div className="st-props-body">
        {tab === "block" && (block ? <BlockProps project={project} page={page} block={block} /> : <p className="st-muted">{selection.length} briques sélectionnées : déplacez-les ensemble, ou sélectionnez-en une seule pour la régler.</p>)}
        {tab === "page" && <PageProps project={project} page={page} />}
        {tab === "module" && <ModuleProps project={project} />}
      </div>
    </aside>
  );
}

// ---------- Brique ----------

function BlockProps({ project, page, block }: { project: Project; page: Page; block: Block }) {
  const set = (patch: Partial<Block>) => store.edit((p) => updateBlock(p, page.id, block.id, patch));
  const setStyle = (patch: Partial<Style>) => {
    const style = { ...block.style, ...patch };
    for (const k of Object.keys(style) as (keyof Style)[]) if (style[k] === undefined) delete style[k];
    set({ style: Object.keys(style).length ? style : undefined });
  };
  const setFrame = (patch: Partial<Frame>) => block.frame && set({ frame: { ...block.frame, ...patch } });

  return (
    <>
      <h2 className="st-props-title">{BLOCK_NAMES[block.type]}</h2>
      <BlockContent block={block} set={set} project={project} />

      {(block.type === "text" || block.type === "button") && (
        <Section title="Apparence du texte">
          <ColorInput label="Couleur du texte" fallback={project.theme.colors.text} value={block.style?.color} onChange={(color) => setStyle({ color })} />
          <NumberInput label="Taille" unit="px" value={block.style?.fontSize} min={8} max={200} onChange={(fontSize) => setStyle({ fontSize })} />
          <div className="st-row">
            <Select label="Alignement" value={block.style?.align ?? "left"} options={[["left", "Gauche"], ["center", "Centré"], ["right", "Droite"]]} onChange={(align) => setStyle({ align: align === "left" ? undefined : align })} />
            {project.mode === "slides" && <Select label="Vertical" value={block.style?.verticalAlign ?? "top"} options={[["top", "Haut"], ["middle", "Milieu"], ["bottom", "Bas"]]} onChange={(v) => setStyle({ verticalAlign: v === "top" ? undefined : v })} />}
          </div>
        </Section>
      )}

      <Section title="Fond et bordure">
        <ColorInput label="Couleur de fond" value={block.style?.background} onChange={(background) => setStyle({ background })} />
        <div className="st-row">
          <NumberInput label="Marge intérieure" unit="px" value={block.style?.padding} min={0} max={200} onChange={(padding) => setStyle({ padding })} />
          <NumberInput label="Arrondi" unit="px" value={block.style?.radius} min={0} max={999} onChange={(radius) => setStyle({ radius })} />
        </div>
        <NumberInput label="Opacité" unit="0 à 1" value={block.style?.opacity} min={0} max={1} step={0.05} onChange={(opacity) => setStyle({ opacity })} />
      </Section>

      {block.frame ? (
        <Section title="Position et taille">
          <div className="st-row">
            <NumberInput label="X" value={block.frame.x} onChange={(x) => x !== undefined && setFrame({ x })} />
            <NumberInput label="Y" value={block.frame.y} onChange={(y) => y !== undefined && setFrame({ y })} />
          </div>
          <div className="st-row">
            <NumberInput label="Largeur" value={block.frame.w} min={1} onChange={(w) => w && setFrame({ w })} />
            <NumberInput label="Hauteur" value={block.frame.h} min={1} onChange={(h) => h && setFrame({ h })} />
          </div>
          <NumberInput label="Rotation" unit="°" value={block.frame.rotation} min={-360} max={360} onChange={(rotation) => setFrame({ rotation: rotation || undefined })} />
          <div className="st-row st-row--tight">
            <button className="st-btn" onClick={() => store.edit((p) => reorderBlock(p, page.id, block.id, "front"))}>Mettre devant</button>
            <button className="st-btn" onClick={() => store.edit((p) => reorderBlock(p, page.id, block.id, "back"))}>Mettre derrière</button>
          </div>
        </Section>
      ) : (
        <Section title="Disposition">
          <Select label="Largeur" value={block.width ?? "content"} options={[["content", "Colonne de lecture"], ["full", "Pleine largeur"]]} onChange={(width) => set({ width: width === "content" ? undefined : width })} />
        </Section>
      )}
    </>
  );
}

function BlockContent({ block, set, project }: { block: Block; set: (patch: Partial<Block>) => void; project: Project }) {
  switch (block.type) {
    case "text":
      return (
        <Section title="Contenu">
          <Select label="Style" value={block.variant ?? "body"} options={[["title", "Titre"], ["subtitle", "Sous-titre"], ["body", "Texte courant"], ["caption", "Légende"]]} onChange={(variant) => set({ variant: variant === "body" ? undefined : variant } as Partial<Block>)} />
          <MarkdownInput id="st-main-field" label="Texte" value={block.content} onChange={(content) => set({ content } as Partial<Block>)} />
        </Section>
      );
    case "image":
      return (
        <Section title="Image">
          <MediaInput label="Fichier" kind="image" value={block.src} onChange={(src) => src && set({ src } as Partial<Block>)} />
          <TextInput id="st-main-field" label="Description (pour les lecteurs d'écran)" value={block.alt} placeholder="Vide si l'image est décorative" onChange={(alt) => set({ alt } as Partial<Block>)} />
          <Select label="Cadrage" value={block.fit ?? "contain"} options={[["contain", "Image entière"], ["cover", "Remplir le cadre (rogner)"]]} onChange={(fit) => set({ fit } as Partial<Block>)} />
        </Section>
      );
    case "shape":
      return (
        <Section title="Forme">
          <Select label="Type" value={block.shape} options={[["rectangle", "Rectangle"], ["ellipse", "Ellipse / cercle"], ["line", "Ligne"]]} onChange={(shape) => set({ shape } as Partial<Block>)} />
          {block.shape !== "line" && <ColorInput label="Remplissage" value={block.fill} onChange={(fill) => set({ fill } as Partial<Block>)} />}
          <ColorInput label={block.shape === "line" ? "Couleur du trait" : "Bordure"} value={block.stroke} onChange={(stroke) => set({ stroke } as Partial<Block>)} />
          <NumberInput label="Épaisseur du trait" unit="px" value={block.strokeWidth} min={0} max={50} onChange={(strokeWidth) => set({ strokeWidth } as Partial<Block>)} />
        </Section>
      );
    case "button":
      return (
        <Section title="Bouton">
          <TextInput id="st-main-field" label="Texte du bouton" value={block.label} onChange={(label) => set({ label } as Partial<Block>)} />
          <Select label="Style" value={block.variant ?? "primary"} options={[["primary", "Plein"], ["secondary", "Contour"]]} onChange={(variant) => set({ variant } as Partial<Block>)} />
          <ActionField action={block.action} project={project} onChange={(action) => set({ action } as Partial<Block>)} />
        </Section>
      );
    case "video":
      return (
        <Section title="Vidéo">
          <MediaInput label="Fichier vidéo (MP4)" kind="video" value={block.src} onChange={(src) => src && set({ src } as Partial<Block>)} />
          <MediaInput label="Image d'attente" kind="image" optional value={block.poster} onChange={(poster) => set({ poster } as Partial<Block>)} />
          <MediaInput label="Sous-titres (.vtt)" kind="captions" optional value={block.captions} onChange={(captions) => set({ captions } as Partial<Block>)} />
          <Check label="Lecture automatique (sans le son)" checked={!!block.autoplay} onChange={(autoplay) => set({ autoplay: autoplay || undefined } as Partial<Block>)} />
          <Check label="En boucle" checked={!!block.loop} onChange={(loop) => set({ loop: loop || undefined } as Partial<Block>)} />
        </Section>
      );
    case "audio":
      return (
        <Section title="Son">
          <MediaInput label="Fichier son (MP3)" kind="audio" value={block.src} onChange={(src) => src && set({ src } as Partial<Block>)} />
          <TextInput id="st-main-field" label="Titre affiché" value={block.label ?? ""} onChange={(label) => set({ label: label || undefined } as Partial<Block>)} />
          <TextArea label="Transcription" value={block.transcript ?? ""} onChange={(transcript) => set({ transcript: transcript || undefined } as Partial<Block>)} />
          <Check label="Lecture automatique" checked={!!block.autoplay} onChange={(autoplay) => set({ autoplay: autoplay || undefined } as Partial<Block>)} />
        </Section>
      );
    default:
      return (
        <Section title="Contenu">
          {isInteraction(block) && (
            <Select
              label="Type"
              value={roleOf(block)}
              options={[["exercise", "Exercice noté (compte dans le score)"], ["activity", "Activité d'entraînement (non notée)"]]}
              onChange={(role) => set({ role, graded: undefined } as Partial<Block>)}
            />
          )}
          <p className="st-note">Cette activité s'affiche et se déplace déjà. Ses réglages détaillés (questions, réponses, zones…) arrivent à la prochaine étape de Studio.</p>
        </Section>
      );
  }
}

function ActionField({ action, project, onChange }: { action: ButtonAction; project: Project; onChange: (a: ButtonAction) => void }) {
  return (
    <>
      <Select
        label="Quand on clique"
        value={action.type}
        options={[["next", "Page suivante"], ["prev", "Page précédente"], ["goto", "Aller à une page…"], ["url", "Ouvrir un site web"]]}
        onChange={(type) => onChange(type === "goto" ? { type, page: project.pages[0].id } : type === "url" ? { type, href: "https://" } : { type })}
      />
      {action.type === "goto" && (
        <Select label="Page" value={action.page} options={project.pages.map((p, i) => [p.id, `${i + 1}. ${p.title}`])} onChange={(page) => onChange({ type: "goto", page })} />
      )}
      {action.type === "url" && <TextInput label="Adresse (https://…)" value={action.href} onChange={(href) => onChange({ type: "url", href })} />}
    </>
  );
}

// ---------- Page ----------

function PageProps({ project, page }: { project: Project; page: Page }) {
  const set = (patch: Partial<Page>) => store.edit((p) => updatePage(p, page.id, patch));
  const vo = page.voiceover;
  return (
    <>
      <h2 className="st-props-title">Page {project.pages.indexOf(page) + 1}</h2>
      <Section title="Général">
        <TextInput label="Titre (affiché dans le menu)" value={page.title} onChange={(title) => set({ title })} />
        <Select
          label="Le bouton « Suivant » se débloque"
          value={page.unlockNext === "questionsAnswered" ? "activitiesDone" : page.unlockNext ?? "always"}
          options={[["always", "Tout de suite"], ["voiceoverEnded", "À la fin de la voix off"], ["activitiesDone", "Quand les activités sont terminées"]]}
          onChange={(v) => set({ unlockNext: v === "always" ? undefined : v })}
        />
      </Section>
      <Section title="Fond">
        <ColorInput label="Couleur" fallback={project.theme.colors.background} value={page.background?.color} onChange={(color) => set({ background: clean({ ...page.background, color }) })} />
        <MediaInput label="Image de fond" kind="image" optional value={page.background?.image} onChange={(image) => set({ background: clean({ ...page.background, image }) })} />
      </Section>
      <Section title="Voix off">
        <MediaInput label="Fichier son (MP3, WAV…)" kind="audio" optional value={vo?.src} onChange={(src) => set({ voiceover: src ? { ...vo, src } : undefined })} />
        {vo && (
          <>
            <TextArea label="Transcription (affichable par l'apprenant)" rows={5} value={vo.transcript ?? ""} onChange={(transcript) => set({ voiceover: { ...vo, transcript: transcript || undefined } })} />
            <Check label="Démarrer automatiquement" checked={vo.autoplay !== false} onChange={(a) => set({ voiceover: { ...vo, autoplay: a ? undefined : false } })} />
          </>
        )}
      </Section>
    </>
  );
}

/** Retire les champs vides ; renvoie undefined si plus rien. */
function clean<T extends object>(o: T): T | undefined {
  const out = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "")) as T;
  return Object.keys(out).length ? out : undefined;
}

// ---------- Module ----------

function ModuleProps({ project }: { project: Project }) {
  const edit = (change: (d: Project) => void) => store.edit((p) => updateProject(p, change));
  const c = project.theme.colors;
  const color = (key: keyof typeof c, label: string, required = false) => (
    <ColorInput label={label} allowEmpty={!required} value={c[key]} onChange={(v) => edit((d) => {
      if (v) d.theme.colors[key] = v;
      else if (!required) delete d.theme.colors[key];
    })} />
  );
  return (
    <>
      <h2 className="st-props-title">Module</h2>
      <Section title="Informations">
        <TextInput label="Titre" value={project.meta.title} onChange={(v) => edit((d) => void (d.meta.title = v))} />
        <TextArea label="Description" rows={3} value={project.meta.description ?? ""} onChange={(v) => edit((d) => void (v ? (d.meta.description = v) : delete d.meta.description))} />
        <TextInput label="Auteur" value={project.meta.author ?? ""} onChange={(v) => edit((d) => void (v ? (d.meta.author = v) : delete d.meta.author))} />
        <div className="st-row">
          <Select label="Langue" value={project.meta.language} options={[["fr", "Français"], ["en", "Anglais"], ["es", "Espagnol"], ["de", "Allemand"], ["it", "Italien"]]} onChange={(v) => edit((d) => void (d.meta.language = v))} />
          <NumberInput label="Durée" unit="min" value={project.meta.estimatedMinutes} min={1} max={600} onChange={(v) => edit((d) => void (v ? (d.meta.estimatedMinutes = v) : delete d.meta.estimatedMinutes))} />
        </div>
      </Section>
      <Section title="Navigation et réussite">
        <Check label="Parcours imposé (pas de saut en avant dans le menu)" checked={!!project.navigation.linear} onChange={(v) => edit((d) => void (d.navigation.linear = v))} />
        <Check label="Bouton « Précédent »" checked={project.navigation.allowBack !== false} onChange={(v) => edit((d) => void (d.navigation.allowBack = v))} />
        <Check label="Menu des pages" checked={project.navigation.showMenu !== false} onChange={(v) => edit((d) => void (d.navigation.showMenu = v))} />
        <Check label="Barre de progression" checked={project.navigation.showProgress !== false} onChange={(v) => edit((d) => void (d.navigation.showProgress = v))} />
        <NumberInput label="Seuil de réussite" unit="%" value={project.scoring.passingScore} min={0} max={100} onChange={(v) => edit((d) => void (d.scoring.passingScore = v ?? 0))} />
      </Section>
      <Section title="Thème">
        <Field label="Thèmes prêts à l'emploi">
          <div className="st-themes st-themes--small">
            {THEMES.map((t) => (
              <button key={t.id} type="button" className="st-theme" onClick={() => edit((d) => void (d.theme = structuredClone(t.theme)))} title={t.label}>
                <span className="st-swatches" aria-hidden>
                  {[t.theme.colors.primary, t.theme.colors.secondary, t.theme.colors.accent].map((x, i) => <span key={i} style={{ background: x }} />)}
                </span>
                {t.label}
              </button>
            ))}
          </div>
        </Field>
        {color("primary", "Couleur principale", true)}
        {color("secondary", "Titres")}
        {color("accent", "Mise en avant")}
        {color("text", "Texte", true)}
        {color("background", "Fond des pages", true)}
        {color("surface", "Fond des cartes et questions")}
        {color("success", "Réussite")}
        {color("error", "Erreur")}
        <div className="st-row">
          <Select label="Police des titres" value={project.theme.fonts.heading} options={fontOptions(project.theme.fonts.heading)} onChange={(v) => edit((d) => void (d.theme.fonts.heading = v))} />
          <Select label="Police du texte" value={project.theme.fonts.body} options={fontOptions(project.theme.fonts.body)} onChange={(v) => edit((d) => void (d.theme.fonts.body = v))} />
        </div>
        <NumberInput label="Arrondi des angles" unit="px" value={project.theme.radius} min={0} max={64} onChange={(v) => edit((d) => void (d.theme.radius = v ?? 0))} />
      </Section>
    </>
  );
}

const fontOptions = (current: string): [string, string][] => [...new Set([current, ...FONTS])].map((f) => [f, f]);
