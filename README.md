# Learning Suite

Suite **gratuite et open source** pour concevoir, produire, relire et diffuser des modules
e-learning, pensée pour les formateurs indépendants et les petits créateurs.
*Free and open-source e-learning authoring suite for independent trainers and small creators (French / English).*

**Site du projet / Website : https://fr-groot.github.io/learning-suite/**

| Dossier | Contenu |
| --- | --- |
| `studio/` | Learning Suite Studio : appli Windows auteur (Tauri 2, React) — guide : `docs/studio.md` |
| `launcher/` | Lanceur Learning Suite : modules, applis de la suite, Clicksy, outils — guide : `docs/lanceur.md` |
| `crates/suite-core/` | Code Rust commun (annuaire, récents partagés, lancement sûr) |
| `player/` | Lecteur HTML5 commun (TypeScript sans framework), export SCORM 1.2 / HTML5 |
| `schema/` | Format `project.json` versionné : la source de vérité — doc : `docs/schema.md` |
| `examples/` | Modules d'exemple (français et anglais) |
| `docs/` | Décisions, feuille de route, publication, signature |

**Outil associé :** [Clicksy](https://github.com/Fr-Groot/clicksy) — effets de pointeur,
enregistrement d'écran, montage et guides pas à pas pour formateurs.

## Installer
Les installateurs du lanceur et de Studio (`.exe` et `.msi`) sont dans les [Releases](../../releases).
Aucune donnée collectée, aucun compte, fonctionne hors ligne.

## Signature du code
Voir [docs/code-signing.md](docs/code-signing.md). *Free code signing provided by SignPath.io,
certificate by SignPath Foundation* (candidature en cours ; d'ici là, installateurs non signés).

## Licence
AGPLv3 (voir `LICENSE`).
