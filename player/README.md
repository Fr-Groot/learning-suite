# Lecteur HTML5 (player)

Affiche un module `project.json` dans un navigateur : deux modes (diapositives 16:9
et vertical), briques, quiz, voix off, menu, progression, suivi.

## Commandes (dans ce dossier)

| Commande | Effet |
| --- | --- |
| `npm install` | Installe les outils (une seule fois) |
| `npm run open` | Ouvre l'exemple « Découvrir Learning Suite » dans le navigateur |
| `npm run open -- ../examples/vertical-demo` | Ouvre un autre projet |
| `npm run validate -- ../examples/vertical-demo` | Vérifie un projet (schéma, cohérence, fichiers) |
| `npm test` | Tests unitaires |
| `npm run test:e2e` | Tests de bout en bout (Edge) |
| `npm run build` | Produit `dist/player.js` et `dist/player.css` |
| `npm run export -- ../examples/jeu-html` | Produit les zip SCORM 1.2 et HTML5 dans `exports/` |

## Organisation

- `src/validate.ts`, `src/validate-rules.ts` : vérification d'un projet.
- `src/navigation.ts`, `src/quiz.ts` : logique pure (testée dans `tests/`).
- `src/render/` : une fonction d'affichage par brique, plus les deux mises en page.
- `src/voiceover.ts` : voix off par page.
- `src/tracker/` : interface `Tracker`, `LocalTracker` (aperçu, HTML5) et `Scorm12Tracker`.
- `src/export/` : construction des paquets (manifeste SCORM, index.html, zip).
- `src/render/html.ts` : brique HTML (jeux isolés qui renvoient un score).
- `src/player.ts` : assemble le tout.
