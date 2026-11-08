# Format project.json — version 1 (proposition)

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

Toutes les briques ont un `id` et peuvent avoir un `style` (couleur, fond, taille
de texte, gras, alignement, arrondi, opacité, marge intérieure) qui surcharge le thème.

**Ajout par rapport à ta liste :** la brique `results`, pour afficher le score
final à l'endroit voulu (en général la dernière page).

## Les questions

```json
{ "id": "q1", "type": "question", "kind": "single",
  "prompt": "Quel format sert à diffuser un module dans un LMS ?",
  "choices": [
    { "id": "a", "text": "SCORM", "correct": true },
    { "id": "b", "text": "PDF",   "correct": false }
  ],
  "feedback": { "correct": "Exact !", "incorrect": "Non : c'est SCORM." },
  "attempts": 2, "shuffle": true, "points": 1, "graded": true }
```

- `kind` : `single` (exactement une bonne réponse, vérifié par le schéma),
  `multiple` (au moins une), `truefalse` (pas de `choices`, juste `"answer": true`).
- `attempts` : nombre d'essais (1 par défaut).
- `graded: false` : question d'entraînement, ne compte pas dans le score.
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

## Ce que le schéma ne peut pas vérifier seul

Le lecteur fera ces contrôles en plus, avec un message clair :
identifiants en double, bouton `goto` vers une page qui n'existe pas,
`questionsAnswered` sur une page sans question, fichier média absent.

## Hors v1 (volontairement)

Animations et transitions, déclencheurs/variables, glisser-déposer, questions
à trous ou d'association, points partiels, banque de questions tirées au sort,
multilingue dans un même fichier, polices embarquées. On les ajoutera en v1.x
sans casser les projets existants.
