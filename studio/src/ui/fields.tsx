// Champs du panneau Propriétés. Une saisie (du clic dans le champ à la sortie) = une seule
// étape d'annulation, même si on tape beaucoup de lettres.
import { useId, useRef, type ReactNode } from "react";
import { importMedia, mediaUrl } from "../commands.ts";
import type { MediaKind } from "../io/backend.ts";
import { store } from "../model/store.ts";

const session = { onFocus: () => store.beginGesture(), onBlur: () => store.endGesture() };

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="st-field">
      <span>{label}</span>
      {children}
      {hint && <small className="st-muted">{hint}</small>}
    </label>
  );
}

export function TextInput({ label, value, onChange, placeholder, id }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; id?: string }) {
  return (
    <Field label={label}>
      <input id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} {...session} />
    </Field>
  );
}

export function TextArea({ label, value, onChange, rows = 4, hint }: { label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} {...session} />
    </Field>
  );
}

export function NumberInput({ label, value, onChange, min, max, step = 1, unit }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; min?: number; max?: number; step?: number; unit?: string }) {
  return (
    <Field label={unit ? `${label} (${unit})` : label}>
      <input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Math.min(max ?? Infinity, Math.max(min ?? -Infinity, Number(e.target.value))))}
        {...session}
      />
    </Field>
  );
}

export function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </Field>
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="st-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** Couleur : nuancier + code. Vide = couleur du thème. */
export function ColorInput({ label, value, onChange, allowEmpty = true, fallback }: { label: string; value: string | undefined; onChange: (v: string | undefined) => void; allowEmpty?: boolean; fallback?: string }) {
  const hex = (value ?? fallback ?? "#FFFFFF").slice(0, 7);
  return (
    <Field label={label}>
      <div className="st-row st-row--tight">
        <input type="color" value={hex} onChange={(e) => onChange(e.target.value.toUpperCase())} {...session} />
        <input className="st-color-code" value={value ?? ""} placeholder={allowEmpty ? "thème" : ""} onChange={(e) => {
          const v = e.target.value.trim();
          if (v === "" && allowEmpty) onChange(undefined);
          else if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(v)) onChange(v.toUpperCase());
        }} {...session} />
        {allowEmpty && value && <button type="button" className="st-btn st-btn--icon" title="Revenir à la couleur du thème" aria-label="Effacer la couleur" onClick={() => onChange(undefined)}>✕</button>}
      </div>
    </Field>
  );
}

/** Fichier du projet (image, son…) : aperçu, remplacer, retirer. */
export function MediaInput({ label, value, kind, onChange, optional }: { label: string; value: string | undefined; kind: MediaKind; onChange: (v: string | undefined) => void; optional?: boolean }) {
  // Pas d'étiquette <label> ici : elle donnerait son texte au premier bouton (mauvais pour les lecteurs d'écran).
  return (
    <div className="st-field" role="group" aria-label={label}>
      <span>{label}</span>
      <div className="st-media">
        {value && kind === "image" && <img src={mediaUrl(value)} alt="" />}
        <code className="st-path">{value ?? "aucun fichier"}</code>
        <div className="st-row st-row--tight">
          <button type="button" className="st-btn" onClick={() => void importMedia(kind).then((src) => src && onChange(src))}>{value ? "Remplacer…" : "Choisir un fichier…"}</button>
          {optional && value && <button type="button" className="st-btn" onClick={() => onChange(undefined)}>Retirer</button>}
        </div>
      </div>
    </div>
  );
}

/** Texte en mini-Markdown, avec une barre gras / italique / liste / lien. */
export function MarkdownInput({ label, value, onChange, rows = 6, id }: { label: string; value: string; onChange: (v: string) => void; rows?: number; id?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fallbackId = useId();
  const wrap = (before: string, after = before, placeholder = "texte") => {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const chosen = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + chosen + after + value.slice(e);
    store.beginGesture();
    onChange(next);
    store.endGesture();
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + chosen.length);
    });
  };
  const list = () => {
    const ta = ref.current;
    if (!ta) return;
    const start = value.lastIndexOf("\n", ta.selectionStart - 1) + 1;
    store.beginGesture();
    onChange(value.slice(0, start) + "- " + value.slice(start));
    store.endGesture();
  };
  return (
    <div className="st-field">
      <label htmlFor={id ?? fallbackId}>{label}</label>
      <div className="st-md-bar" role="toolbar" aria-label="Mise en forme">
        <button type="button" className="st-btn st-btn--icon" title="Gras" aria-label="Gras" onClick={() => wrap("**")}><b>G</b></button>
        <button type="button" className="st-btn st-btn--icon" title="Italique" aria-label="Italique" onClick={() => wrap("*")}><i>I</i></button>
        <button type="button" className="st-btn st-btn--icon" title="Liste à puces" aria-label="Liste à puces" onClick={list}>•</button>
        <button type="button" className="st-btn st-btn--icon" title="Lien" aria-label="Lien" onClick={() => wrap("[", "](https://)", "texte du lien")}>🔗</button>
      </div>
      <textarea id={id ?? fallbackId} ref={ref} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} {...session} />
      <small className="st-muted">**gras**, *italique*, « - » en début de ligne pour une liste.</small>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="st-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
