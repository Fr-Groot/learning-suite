# Format project.json — version 1

Validé le 2026-11-08. Lecteur : `player/`. Exemples : `examples/`.

Un module = un dossier contenant `project.json` + un sous-dossier `media/`
(images, sons, vidéos). Le fichier technique qui fait foi est
`schema/project.v1.schema.json` ; un exemple complet est dans
`schema/examples/mini.project.json`.

## Vue d'ensemble

```
project.json
├─ schemaVersion   "1.0"
├─ meta            titre, langue, auteur, version, durée estimée, identifiant unique
├─ mode            "slides" (16:9) ou "vertical" (blocs empilés, mobile)
├─ theme           couleurs, polices, arrondi des angles
├─ navigation      menu, barre de progression, retour arrière, parcours imposé
├─ scoring         seuil de réussite (en %)
└─ pages[]         les écrans, dans l'ordre
   ├─ id, title
   ├─ background    couleur ou image de fond
   ├─ voiceover     voix off : fichier audio + transcription
   ├─ unlockNext    quand « Suivant » se débloque
   └─ blocks[]      les briques de la page
```

## Les deux modes

| | `slides` (diapositives) | `vertical` (blocs) |
| --- | --- | --- |
| Usage | interactif, ordinateur | lecture mobile, défilement |
| Placement | chaque brique a un `frame` {x, y, w, h} sur une toile 1280 × 720 | pas de `frame` : les briques s'empilent dans l'ordre |
| Largeur | celle du `frame` | `width` : `full` (bord à bord) ou `content` (colonne de lecture) |

La toile fixe de 1280 × 720 est agrandie ou réduite par le lecteur pour remplir
l'écran : l'auteur raisonne toujours dans les mêmes coordonnées. Le schéma refuse
un `frame` en mode vertical et l'oubli d'un `frame` en mode diapositives.

## Les briques (`type`)

| Brique | Champs principaux |
| --- | --- |
| `text` | `content` (mini-Markdown), `variant` : title, subtitle, body, caption |
| `image` | `src`, `alt` (obligatoire, vide = décorative), `fit` : contain / cover |
| `shape` | `shape` : rectangle, ellipse, line ; `fill`, `stroke`, `strokeWidth` |
| `button` | `label`, `action` : next, prev, goto (une page), url (https seulement) |
| `video` | `src` (MP4), `poster`, `captions` (sous-titres .vtt), `autoplay`, `loop` |
| `audio` | `src` (MP3), `label`, `transcript`, `autoplay` |
| `question` | voir ci-dessous |
| `results` | affiche score, seuil, « Réussi » / « Échoué », bouton « Recommencer » |
| `html` | jeu ou contenu HTML isolé : `src`, `title`, `role`, `points`, `height` (v1.1) |
| `flipcards` | cartes à retourner (recto / verso, texte ou image) (v1.2) |
| `reveal` | onglets, accordéon ou frise chronologique (v1.2) |
| `fillblanks` | texte à trous, à saisir ou en liste (v1.2) |
| `dragdrop` | glisser-déposer : catégories, paires, ordre (v1.2) |
| `hotspot` | image avec zones à trouver ou à explorer (v1.2) |

Toutes les briques ont un `id` et peuvent avoir un `style` (couleur, fond, taille
de texte, gras, alignement, arrondi, opacité, marge intérieure) qui surcharge le thème.

**Ajout par rapport à ta liste :** la brique `results`, pour afficher le score
final à l'endroit voulu (en général la dernière page).

## Exercices et activités (v1.3)

- **Exercice** (`"role": "exercise"`) : noté, compte dans le score et dans le LMS. Étiquette « Exercice noté ».
- **Activité** (`"role": "activity"`) : jamais notée (entraînement, découverte). Étiquette « Entraînement ».
- Par défaut : question, texte à trous, glisser-déposer, zones « à trouver » = exercices ; jeu HTML = activité ;
  cartes, onglets, frise, accordéon, zones « à explorer » = toujours des activités.
- L'ancien réglage `graded` (avant 1.3) est encore compris ; Studio convertit le module à l'ouverture.

## Les questions

```json
{ "id": "q1", "type": "question", "kind": "single",
  "prompt": "Quel format sert à diffuser un module dans un LMS ?",
  "choices": [
    { "id": "a", "text": "SCORM", "correct": true },
    { "id": "b", "text": "PDF",   "correct": false }
  ],
  "feedback": { "correct": "Exact !", "incorrect": "Non : c'est SCORM." },
  "attempts": 2, "shuffle": true, "points": 1, "role": "exercise" }
```

- `kind` : `single` (exactement une bonne réponse, vérifié par le schéma),
  `multiple` (au moins une), `truefalse` (pas de `choices`, juste `"answer": true`).
- `attempts` : nombre d'essais (1 par défaut).
- `role: "activity"` : question d'entraînement, ne compte pas dans le score.
- Une réponse multiple est juste seulement si **toutes** les bonnes cases sont
  cochées et aucune mauvaise (pas de points partiels en v1).

**Score** = points obtenus ÷ points des questions notées × 100.
Réussi si score ≥ `scoring.passingScore`.

## Navigation et voix off

- `navigation.linear` : le menu ne permet pas de sauter vers une page pas encore vue.
- `navigation.allowBack`, `showMenu`, `showProgress` : affichage des contrôles.
- `page.unlockNext` : `always`, `voiceoverEnded` (après la voix off) ou
  `questionsAnswered` (après réponse à toutes les questions de la page).
- `page.voiceover` : un fichier audio par page + transcription, affichable
  par l'apprenant (accessibilité, environnement sans son).

## Texte : mini-Markdown

`**gras**`, `*italique*`, listes (`- ` ou `1. `), liens `[texte](https://…)`,
retours à la ligne. Pas de HTML : c'est lisible par un humain et par l'IA,
et ça empêche d'injecter du code dans un module.

## Brique `html` : jeux et contenus HTML (v1.1)

```json
{ "id": "jeu", "type": "html", "src": "media/jeux/paires.html", "title": "Jeu des paires",
  "role": "exercise", "points": 2, "frame": { "x": 40, "y": 30, "w": 800, "h": 660 } }
```

- Le fichier HTML est dans `media/` (un seul fichier conseillé ; un dossier est possible).
- Il s'affiche dans un **cadre isolé** : il ne peut lire ni le module, ni le LMS,
  ni les données de l'apprenant.
- Pour remonter un score, le jeu appelle `LearningSuite.score(0 à 100)` (voir
  `docs/jeux-html.md`). Seuls les messages venant de ce cadre sont acceptés.
- `role: "exercise"` (activité par défaut) : le jeu compte dans le score final. Il rapporte une part
  de ses `points` : 80 % sur un jeu à 2 points = 1,6 point. On garde le meilleur score.
- `unlockNext: "questionsAnswered"` attend aussi la fin des jeux notés de la page.
- `height` : hauteur en mode vertical (en mode diapositives, c'est le `frame`).

## Activités (v1.2)

Exemple complet : `examples/activites/` (diapositives) et `examples/activites-mobile/` (téléphone).

**Réglages communs des activités notées** (`fillblanks`, `dragdrop`, `hotspot` « find ») :
`role` (exercice par défaut), `points`, `attempts`, `feedback` (`correct`, `partial`, `incorrect`) et
`scoring` : `partial` (défaut, au prorata : 3 sur 4 = 75 % des points) ou `all-or-nothing`.

**Activités de découverte** (`flipcards`, `reveal`, `hotspot` « explore ») : jamais notées ;
avec `requireAll: true`, il faut tout ouvrir pour terminer.

`unlockNext: "activitiesDone"` : « Suivant » attend que toutes les activités de la page soient
terminées (l'ancien nom `questionsAnswered` reste accepté).

| Brique | Exemple |
| --- | --- |
| Cartes | `{ "type": "flipcards", "cards": [{ "id": "c1", "front": "Question", "back": "Réponse" }] }` |
| Onglets / frise / accordéon | `{ "type": "reveal", "layout": "tabs", "items": [{ "id": "t1", "title": "Onglet", "content": "Texte" }] }` |
| Texte à trous | `{ "type": "fillblanks", "text": "Le chat [[mange\|dévore]] la [[*souris\|chaise]]." }` |
| Catégories | `{ "type": "dragdrop", "kind": "categorize", "categories": [...], "items": [{ "id": "a", "text": "…", "category": "bon" }] }` |
| Paires | `{ "type": "dragdrop", "kind": "match", "pairs": [{ "id": "p1", "prompt": "Terme", "answer": "Définition" }] }` |
| Ordre | `{ "type": "dragdrop", "kind": "order", "items": [ …dans le bon ordre, ils seront mélangés… ] }` |
| Zones | `{ "type": "hotspot", "kind": "find", "src": "media/x.svg", "alt": "…", "zones": [{ "id": "z", "x": 10, "y": 20, "w": 15, "h": 10, "label": "…", "correct": true }] }` |

- **Texte à trous** : `[[a|b]]` = à saisir (a ou b accepté) ; `[[*a|b|c]]` = liste, l'étoile marque la
  bonne réponse. Majuscules et accents tolérés sauf `caseSensitive` / `accentSensitive`.
- **Zones** : position et taille en **% de l'image**. En « find », chaque mauvaise zone cochée annule
  une bonne (sinon il suffirait de tout cocher).
- **Glisser-déposer** : jouable en touchant l'élément puis sa place (doigt, souris, clavier),
  ou en le faisant vraiment glisser.

## Modèles de page

`schema/templates/slides/` et `schema/templates/vertical/` : titre + texte + image, image pleine
page, deux colonnes, citation, question, résultat. Ce sont des pages prêtes à copier dans `pages`.

## Ce que le schéma ne peut pas vérifier seul

Le lecteur fera ces contrôles en plus, avec un message clair :
identifiants en double, bouton `goto` vers une page qui n'existe pas,
`questionsAnswered` sur une page sans question, fichier média absent.

## Hors v1 (volontairement)

Animations et transitions, déclencheurs/variables, banque de questions tirées au sort,
multilingue dans un même fichier, polices embarquées. On les ajoutera en v1.x
sans casser les projets existants.
