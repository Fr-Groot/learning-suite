// Textes du lecteur vus par l'apprenant, en français et en anglais.
// La langue suit celle du module (meta.language) : « fr… » → français, sinon anglais.
// {nom} est remplacé par une valeur (ex. « Il vous reste {n} essais. »).

const fr = {
  menu: "☰ Menu",
  progress: "Progression",
  pagesNav: "Pages du module",
  transcript: "Transcription",
  prev: "← Précédent",
  next: "Suivant →",
  hintVoiceover: "Écoutez la voix off jusqu'au bout pour continuer.",
  hintActivities: "Terminez les activités de la page pour continuer.",
  voPause: "❚❚ Pause",
  voReplay: "↻ Réécouter",
  voListen: "▶ Écouter",
  voPauseAria: "Mettre la voix off en pause",
  voListenAria: "Écouter la voix off",
  roleExercise: "Exercice noté",
  roleActivity: "Entraînement",
  opensNewTab: "s'ouvre dans un nouvel onglet",
  validate: "Valider",
  correct: "Bonne réponse",
  partial: "Partiellement juste : {pct} %",
  incorrect: "Mauvaise réponse",
  fixAndRetry: "Corrigez puis validez à nouveau.",
  attemptsLeftOne: "Il vous reste 1 essai.",
  attemptsLeftMany: "Il vous reste {n} essais.",
  qSingle: "Une seule réponse possible.",
  qMultiple: "Plusieurs réponses possibles.",
  qTrueFalse: "Vrai ou faux ?",
  true: "Vrai",
  false: "Faux",
  ddCategorize: "Rangez chaque élément dans la bonne catégorie.",
  ddMatch: "Associez chaque élément à la bonne case.",
  ddOrder: "Remettez les éléments dans le bon ordre.",
  ddHow: "Touchez un élément, puis sa place (ou faites-le glisser).",
  ddPool: "Éléments à placer",
  ddBack: "Remettre ici",
  ddPlaceHere: "Placer ici : {label}",
  ddReserve: "la réserve",
  ddPlaced: "« {item} » placé dans « {target} ».",
  blank: "Trou {n}",
  card: "Carte : {text}. Retourner",
  hotspotFind: "Touchez les zones concernées, puis validez.",
  hotspotExplore: "Touchez les zones pour en savoir plus.",
  hotspotNone: "Aucune zone ouverte pour l'instant.",
  htmlDone: "Activité terminée · score enregistré : {pct} %",
  captions: "Sous-titres",
  resultsAria: "Résultat",
  resultsPending: "Résultat en attente",
  resultsPendingText: "Terminez les exercices notés pour voir votre résultat.",
  passed: "Réussi",
  failed: "Échoué",
  pointsOne: "{raw} point sur {max} · seuil de réussite : {threshold} %",
  pointsMany: "{raw} points sur {max} · seuil de réussite : {threshold} %",
  retryQuiz: "Recommencer le quiz",
} as const;

export type TextKey = keyof typeof fr;

const en: Record<TextKey, string> = {
  menu: "☰ Menu",
  progress: "Progress",
  pagesNav: "Module pages",
  transcript: "Transcript",
  prev: "← Previous",
  next: "Next →",
  hintVoiceover: "Listen to the voice-over to the end to continue.",
  hintActivities: "Complete this page's activities to continue.",
  voPause: "❚❚ Pause",
  voReplay: "↻ Replay",
  voListen: "▶ Listen",
  voPauseAria: "Pause the voice-over",
  voListenAria: "Play the voice-over",
  roleExercise: "Graded exercise",
  roleActivity: "Practice",
  opensNewTab: "opens in a new tab",
  validate: "Check",
  correct: "Correct",
  partial: "Partly correct: {pct}%",
  incorrect: "Incorrect",
  fixAndRetry: "Fix your answer and check again.",
  attemptsLeftOne: "You have 1 attempt left.",
  attemptsLeftMany: "You have {n} attempts left.",
  qSingle: "Only one answer.",
  qMultiple: "Several answers possible.",
  qTrueFalse: "True or false?",
  true: "True",
  false: "False",
  ddCategorize: "Sort each item into the right category.",
  ddMatch: "Match each item with the right box.",
  ddOrder: "Put the items in the right order.",
  ddHow: "Tap an item, then its place (or drag it).",
  ddPool: "Items to place",
  ddBack: "Put back here",
  ddPlaceHere: "Place here: {label}",
  ddReserve: "the item area",
  ddPlaced: "“{item}” placed in “{target}”.",
  blank: "Blank {n}",
  card: "Card: {text}. Flip",
  hotspotFind: "Tap the relevant areas, then check.",
  hotspotExplore: "Tap the areas to learn more.",
  hotspotNone: "No area opened yet.",
  htmlDone: "Activity completed · score saved: {pct}%",
  captions: "Captions",
  resultsAria: "Result",
  resultsPending: "Result pending",
  resultsPendingText: "Complete the graded exercises to see your result.",
  passed: "Passed",
  failed: "Failed",
  pointsOne: "{raw} point out of {max} · pass mark: {threshold}%",
  pointsMany: "{raw} points out of {max} · pass mark: {threshold}%",
  retryQuiz: "Retry the quiz",
};

export const DICTIONARIES = { fr, en } as const;
export type Lang = keyof typeof DICTIONARIES;

export const langOf = (code: string | undefined): Lang => (code ?? "").toLowerCase().startsWith("fr") ? "fr" : "en";

export type Translate = ((key: TextKey, vars?: Record<string, string | number>) => string) & { lang: Lang; locale: string };

/** Fonction de traduction pour une langue de module (ex. « fr », « en-GB »). */
export function translator(code: string | undefined): Translate {
  const lang = langOf(code);
  const dict: Record<TextKey, string> = DICTIONARIES[lang];
  const t = ((key: TextKey, vars: Record<string, string | number> = {}) =>
    dict[key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""))) as Translate;
  t.lang = lang;
  t.locale = lang === "fr" ? "fr-FR" : "en-GB";
  return t;
}
