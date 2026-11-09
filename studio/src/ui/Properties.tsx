// Panneau Propriétés (à droite) : réglages de la brique sélectionnée, de la page, ou du module.
import { useEffect, useState } from "react";
import { isInteraction, roleOf } from "@player/activities.ts";
import type { Block, ButtonAction, Frame, Page, Project, Style } from "@player/types.ts";
import { tr, type StudioKey } from "../i18n/index.ts";
import { reorderBlock, updateBlock, updatePage, updateProject } from "../model/actions.ts";
import { store, useEditor } from "../model/store.ts";
import { FONTS, THEMES } from "../model/themes.ts";
import { Check, ColorInput, Field, MarkdownInput, MediaInput, NumberInput, Section, Select, TextArea, TextInput } from "./fields.tsx";

type Tab = "block" | "page" | "module";

export function Properties() {
  const { project, pageId, selection } = useEditor();
  const [tab, setTab] = useState<Tab>("page");
  // Quand on sélectionne une brique, on montre ses réglages ; sinon ceux de la page.
  useEffect(() => setTab(selection.length ? "block" : (t) => (t === "block" ? "page" : t)), [selection.join(",")]);
  const page = project?.pages.find((p) => p.id === pageId);
  if (!project || !page) return null;
  const block = selection.length === 1 ? page.blocks.find((b) => b.id === selection[0]) : undefined;

  return (
    <aside className="st-props" aria-label={tr("properties")}>
      <div className="st-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "block"} disabled={!selection.length} onClick={() => setTab("block")}>{tr("tabBlock")}</button>
        <button role="tab" aria-selected={tab === "page"} onClick={() => setTab("page")}>{tr("tabPage")}</button>
        <button role="tab" aria-selected={tab === "module"} onClick={() => setTab("module")}>{tr("tabModule")}</button>
      </div>
      <div className="st-props-body">
        {tab === "block" && (block ? <BlockProps project={project} page={page} block={block} /> : <p className="st-muted">{tr("multiSelection", { n: selection.length })}</p>)}
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
      <h2 className="st-props-title">{tr(`bt_${block.type}` as StudioKey)}</h2>
      <BlockContent block={block} set={set} project={project} />

      {(block.type === "text" || block.type === "button") && (
        <Section title={tr("textLook")}>
          <ColorInput label={tr("textColor")} fallback={project.theme.colors.text} value={block.style?.color} onChange={(color) => setStyle({ color })} />
          <NumberInput label={tr("size")} unit="px" value={block.style?.fontSize} min={8} max={200} onChange={(fontSize) => setStyle({ fontSize })} />
          <div className="st-row">
            <Select label={tr("align")} value={block.style?.align ?? "left"} options={[["left", tr("alignLeft")], ["center", tr("alignCenter")], ["right", tr("alignRight")]]} onChange={(align) => setStyle({ align: align === "left" ? undefined : align })} />
            {project.mode === "slides" && <Select label={tr("vertical")} value={block.style?.verticalAlign ?? "top"} options={[["top", tr("vTop")], ["middle", tr("vMiddle")], ["bottom", tr("vBottom")]]} onChange={(v) => setStyle({ verticalAlign: v === "top" ? undefined : v })} />}
          </div>
        </Section>
      )}

      <Section title={tr("bgBorder")}>
        <ColorInput label={tr("bgColor")} value={block.style?.background} onChange={(background) => setStyle({ background })} />
        <div className="st-row">
          <NumberInput label={tr("padding")} unit="px" value={block.style?.padding} min={0} max={200} onChange={(padding) => setStyle({ padding })} />
          <NumberInput label={tr("radius")} unit="px" value={block.style?.radius} min={0} max={999} onChange={(radius) => setStyle({ radius })} />
        </div>
        <NumberInput label={tr("opacity")} unit={tr("opacityUnit")} value={block.style?.opacity} min={0} max={1} step={0.05} onChange={(opacity) => setStyle({ opacity })} />
      </Section>

      {block.frame ? (
        <Section title={tr("positionSize")}>
          <div className="st-row">
            <NumberInput label="X" value={block.frame.x} onChange={(x) => x !== undefined && setFrame({ x })} />
            <NumberInput label="Y" value={block.frame.y} onChange={(y) => y !== undefined && setFrame({ y })} />
          </div>
          <div className="st-row">
            <NumberInput label={tr("width")} value={block.frame.w} min={1} onChange={(w) => w && setFrame({ w })} />
            <NumberInput label={tr("height")} value={block.frame.h} min={1} onChange={(h) => h && setFrame({ h })} />
          </div>
          <NumberInput label={tr("rotation")} unit="°" value={block.frame.rotation} min={-360} max={360} onChange={(rotation) => setFrame({ rotation: rotation || undefined })} />
          <div className="st-row st-row--tight">
            <button className="st-btn" onClick={() => store.edit((p) => reorderBlock(p, page.id, block.id, "front"))}>{tr("bringFront")}</button>
            <button className="st-btn" onClick={() => store.edit((p) => reorderBlock(p, page.id, block.id, "back"))}>{tr("sendBack")}</button>
          </div>
        </Section>
      ) : (
        <Section title={tr("layout")}>
          <Select label={tr("width")} value={block.width ?? "content"} options={[["content", tr("widthContent")], ["full", tr("widthFull")]]} onChange={(width) => set({ width: width === "content" ? undefined : width })} />
        </Section>
      )}
    </>
  );
}

function BlockContent({ block, set, project }: { block: Block; set: (patch: Partial<Block>) => void; project: Project }) {
  switch (block.type) {
    case "text":
      return (
        <Section title={tr("content")}>
          <Select label={tr("style")} value={block.variant ?? "body"} options={[["title", tr("vTitle")], ["subtitle", tr("vSubtitle")], ["body", tr("vBody")], ["caption", tr("vCaption")]]} onChange={(variant) => set({ variant: variant === "body" ? undefined : variant } as Partial<Block>)} />
          <MarkdownInput id="st-main-field" label={tr("text")} value={block.content} onChange={(content) => set({ content } as Partial<Block>)} />
        </Section>
      );
    case "image":
      return (
        <Section title={tr("bt_image")}>
          <MediaInput label={tr("file")} kind="image" value={block.src} onChange={(src) => src && set({ src } as Partial<Block>)} />
          <TextInput id="st-main-field" label={tr("altText")} value={block.alt} placeholder={tr("altPh")} onChange={(alt) => set({ alt } as Partial<Block>)} />
          <Select label={tr("fit")} value={block.fit ?? "contain"} options={[["contain", tr("fitContain")], ["cover", tr("fitCover")]]} onChange={(fit) => set({ fit } as Partial<Block>)} />
        </Section>
      );
    case "shape":
      return (
        <Section title={tr("shape")}>
          <Select label={tr("type")} value={block.shape} options={[["rectangle", tr("shRect")], ["ellipse", tr("shEllipse")], ["line", tr("shLine")]]} onChange={(shape) => set({ shape } as Partial<Block>)} />
          {block.shape !== "line" && <ColorInput label={tr("fill")} value={block.fill} onChange={(fill) => set({ fill } as Partial<Block>)} />}
          <ColorInput label={tr(block.shape === "line" ? "strokeColor" : "border")} value={block.stroke} onChange={(stroke) => set({ stroke } as Partial<Block>)} />
          <NumberInput label={tr("strokeWidth")} unit="px" value={block.strokeWidth} min={0} max={50} onChange={(strokeWidth) => set({ strokeWidth } as Partial<Block>)} />
        </Section>
      );
    case "button":
      return (
        <Section title={tr("button")}>
          <TextInput id="st-main-field" label={tr("buttonText")} value={block.label} onChange={(label) => set({ label } as Partial<Block>)} />
          <Select label={tr("style")} value={block.variant ?? "primary"} options={[["primary", tr("btnFilled")], ["secondary", tr("btnOutline")]]} onChange={(variant) => set({ variant } as Partial<Block>)} />
          <ActionField action={block.action} project={project} onChange={(action) => set({ action } as Partial<Block>)} />
        </Section>
      );
    case "video":
      return (
        <Section title={tr("video")}>
          <MediaInput label={tr("videoFile")} kind="video" value={block.src} onChange={(src) => src && set({ src } as Partial<Block>)} />
          <MediaInput label={tr("poster")} kind="image" optional value={block.poster} onChange={(poster) => set({ poster } as Partial<Block>)} />
          <MediaInput label={tr("captions")} kind="captions" optional value={block.captions} onChange={(captions) => set({ captions } as Partial<Block>)} />
          <Check label={tr("autoplayMuted")} checked={!!block.autoplay} onChange={(autoplay) => set({ autoplay: autoplay || undefined } as Partial<Block>)} />
          <Check label={tr("loop")} checked={!!block.loop} onChange={(loop) => set({ loop: loop || undefined } as Partial<Block>)} />
        </Section>
      );
    case "audio":
      return (
        <Section title={tr("audio")}>
          <MediaInput label={tr("audioFile")} kind="audio" value={block.src} onChange={(src) => src && set({ src } as Partial<Block>)} />
          <TextInput id="st-main-field" label={tr("shownTitle")} value={block.label ?? ""} onChange={(label) => set({ label: label || undefined } as Partial<Block>)} />
          <TextArea label={tr("transcript")} value={block.transcript ?? ""} onChange={(transcript) => set({ transcript: transcript || undefined } as Partial<Block>)} />
          <Check label={tr("autoplay")} checked={!!block.autoplay} onChange={(autoplay) => set({ autoplay: autoplay || undefined } as Partial<Block>)} />
        </Section>
      );
    default:
      return (
        <Section title={tr("content")}>
          {isInteraction(block) && (
            <Select
              label={tr("type")}
              value={roleOf(block)}
              options={[["exercise", tr("roleExercise")], ["activity", tr("roleActivity")]]}
              onChange={(role) => set({ role, graded: undefined } as Partial<Block>)}
            />
          )}
          <p className="st-note">{tr("activityNote")}</p>
        </Section>
      );
  }
}

function ActionField({ action, project, onChange }: { action: ButtonAction; project: Project; onChange: (a: ButtonAction) => void }) {
  return (
    <>
      <Select
        label={tr("onClick")}
        value={action.type}
        options={[["next", tr("actNext")], ["prev", tr("actPrev")], ["goto", tr("actGoto")], ["url", tr("actUrl")]]}
        onChange={(type) => onChange(type === "goto" ? { type, page: project.pages[0].id } : type === "url" ? { type, href: "https://" } : { type })}
      />
      {action.type === "goto" && (
        <Select label={tr("page")} value={action.page} options={project.pages.map((p, i) => [p.id, `${i + 1}. ${p.title}`])} onChange={(page) => onChange({ type: "goto", page })} />
      )}
      {action.type === "url" && <TextInput label={tr("urlLabel")} value={action.href} onChange={(href) => onChange({ type: "url", href })} />}
    </>
  );
}

// ---------- Page ----------

function PageProps({ project, page }: { project: Project; page: Page }) {
  const set = (patch: Partial<Page>) => store.edit((p) => updatePage(p, page.id, patch));
  const vo = page.voiceover;
  return (
    <>
      <h2 className="st-props-title">{tr("pageN", { n: project.pages.indexOf(page) + 1 })}</h2>
      <Section title={tr("general")}>
        <TextInput label={tr("pageTitle")} value={page.title} onChange={(title) => set({ title })} />
        <Select
          label={tr("unlock")}
          value={page.unlockNext === "questionsAnswered" ? "activitiesDone" : page.unlockNext ?? "always"}
          options={[["always", tr("unlockAlways")], ["voiceoverEnded", tr("unlockVoiceover")], ["activitiesDone", tr("unlockActivities")]]}
          onChange={(v) => set({ unlockNext: v === "always" ? undefined : v })}
        />
      </Section>
      <Section title={tr("background")}>
        <ColorInput label={tr("color")} fallback={project.theme.colors.background} value={page.background?.color} onChange={(color) => set({ background: clean({ ...page.background, color }) })} />
        <MediaInput label={tr("bgImage")} kind="image" optional value={page.background?.image} onChange={(image) => set({ background: clean({ ...page.background, image }) })} />
      </Section>
      <Section title={tr("voiceover")}>
        <MediaInput label={tr("voFile")} kind="audio" optional value={vo?.src} onChange={(src) => set({ voiceover: src ? { ...vo, src } : undefined })} />
        {vo && (
          <>
            <TextArea label={tr("voTranscript")} rows={5} value={vo.transcript ?? ""} onChange={(transcript) => set({ voiceover: { ...vo, transcript: transcript || undefined } })} />
            <Check label={tr("voAutoplay")} checked={vo.autoplay !== false} onChange={(a) => set({ voiceover: { ...vo, autoplay: a ? undefined : false } })} />
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
  const color = (key: keyof typeof c, label: StudioKey, required = false) => (
    <ColorInput label={tr(label)} allowEmpty={!required} value={c[key]} onChange={(v) => edit((d) => {
      if (v) d.theme.colors[key] = v;
      else if (!required) delete d.theme.colors[key];
    })} />
  );
  return (
    <>
      <h2 className="st-props-title">{tr("module")}</h2>
      <Section title={tr("info")}>
        <TextInput label={tr("title")} value={project.meta.title} onChange={(v) => edit((d) => void (d.meta.title = v))} />
        <TextArea label={tr("description")} rows={3} value={project.meta.description ?? ""} onChange={(v) => edit((d) => void (v ? (d.meta.description = v) : delete d.meta.description))} />
        <TextInput label={tr("author")} value={project.meta.author ?? ""} onChange={(v) => edit((d) => void (v ? (d.meta.author = v) : delete d.meta.author))} />
        <div className="st-row">
          <Select label={tr("language")} value={project.meta.language} options={[["fr", tr("langFr")], ["en", tr("langEn")], ["es", tr("langEs")], ["de", tr("langDe")], ["it", tr("langIt")]]} onChange={(v) => edit((d) => void (d.meta.language = v))} />
          <NumberInput label={tr("duration")} unit="min" value={project.meta.estimatedMinutes} min={1} max={600} onChange={(v) => edit((d) => void (v ? (d.meta.estimatedMinutes = v) : delete d.meta.estimatedMinutes))} />
        </div>
      </Section>
      <Section title={tr("navigation")}>
        <Check label={tr("linear")} checked={!!project.navigation.linear} onChange={(v) => edit((d) => void (d.navigation.linear = v))} />
        <Check label={tr("allowBack")} checked={project.navigation.allowBack !== false} onChange={(v) => edit((d) => void (d.navigation.allowBack = v))} />
        <Check label={tr("showMenu")} checked={project.navigation.showMenu !== false} onChange={(v) => edit((d) => void (d.navigation.showMenu = v))} />
        <Check label={tr("showProgress")} checked={project.navigation.showProgress !== false} onChange={(v) => edit((d) => void (d.navigation.showProgress = v))} />
        <NumberInput label={tr("passingScore")} unit="%" value={project.scoring.passingScore} min={0} max={100} onChange={(v) => edit((d) => void (d.scoring.passingScore = v ?? 0))} />
      </Section>
      <Section title={tr("theme")}>
        <Field label={tr("readyThemes")}>
          <div className="st-themes st-themes--small">
            {THEMES.map((t) => (
              <button key={t.id} type="button" className="st-theme" onClick={() => edit((d) => void (d.theme = structuredClone(t.theme)))} title={tr(t.labelKey)}>
                <span className="st-swatches" aria-hidden>
                  {[t.theme.colors.primary, t.theme.colors.secondary, t.theme.colors.accent].map((x, i) => <span key={i} style={{ background: x }} />)}
                </span>
                {tr(t.labelKey)}
              </button>
            ))}
          </div>
        </Field>
        {color("primary", "cPrimary", true)}
        {color("secondary", "cSecondary")}
        {color("accent", "cAccent")}
        {color("text", "cText", true)}
        {color("background", "cBackground", true)}
        {color("surface", "cSurface")}
        {color("success", "cSuccess")}
        {color("error", "cError")}
        <div className="st-row">
          <Select label={tr("headingFont")} value={project.theme.fonts.heading} options={fontOptions(project.theme.fonts.heading)} onChange={(v) => edit((d) => void (d.theme.fonts.heading = v))} />
          <Select label={tr("bodyFont")} value={project.theme.fonts.body} options={fontOptions(project.theme.fonts.body)} onChange={(v) => edit((d) => void (d.theme.fonts.body = v))} />
        </div>
        <NumberInput label={tr("cornerRadius")} unit="px" value={project.theme.radius} min={0} max={64} onChange={(v) => edit((d) => void (d.theme.radius = v ?? 0))} />
      </Section>
    </>
  );
}

const fontOptions = (current: string): [string, string][] => [...new Set([current, ...FONTS])].map((f) => [f, f]);
