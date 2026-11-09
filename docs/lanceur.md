# Lanceur Learning Suite

La porte d'entrée de la suite : vos modules, les applis de la suite et vos outils, au même endroit.
C'est une appli Windows normale (menu Démarrer), installée séparément de Studio.

## Ce qu'il montre
- **Mes modules** : les modules ouverts récemment (dans Studio ou le lanceur) puis tous ceux rangés
  dans `Documents\Learning Suite`. Pour chacun : miniature de la première page (dessinée par le
  lecteur), format, langue, nombre de pages, date de modification et étape du parcours.
  Boutons : *Ouvrir dans Studio*, *Dossier*, et ✕ pour retirer un module des récents (rien n'est supprimé).
- **Parcours de conception** : Cadrage · Scénario · Storyboard · **Production** · Relecture · Diffusion.
  Aujourd'hui seule la production existe ; les autres étapes sont grisées « bientôt ».
- **Applis de la suite** : Studio (ouvrir, ou lien de téléchargement s'il manque), Review (bientôt),
  Clicksy.
- **Clicksy** : projet indépendant. S'il est installé, le lanceur le repère tout seul et propose
  *Ouvrir*, *Enregistrer une démo*, *Guide pas à pas*, *Nouvelle session*, *Dossier des captures*.
  Sinon : *Installer Clicksy* (page des téléchargements) ou *J'ai Clicksy en version portable…*.
- **Mes outils** : ajoutez n'importe quel programme (OBS, Krita, Audacity, ArtCraft…) ; un clic l'ouvre.

## Comment les applis se parlent (sans serveur)
Un dossier commun : `%APPDATA%\Learning Suite\` (ouvrez-le en collant ce chemin dans l'Explorateur).

| Fichier | Rôle |
|---|---|
| `apps.json` | L'annuaire : chaque appli de la suite s'y inscrit à son démarrage (chemin, version, actions). |
| `recents.json` | Les 20 modules ouverts récemment, partagés entre Studio et le lanceur. |
| `tools.json` | « Mes outils ». |
| `settings.json` | Réglages communs (ex. emplacement de Clicksy en version portable). |

Ces fichiers sont lisibles (JSON) et peuvent être supprimés sans danger : ils se reconstruisent.

Le lanceur demande à Studio d'ouvrir un module par la ligne de commande :
`studio.exe --open "<dossier du module>"` ou `studio.exe --new`. Si Studio est déjà ouvert,
la demande arrive dans sa fenêtre (le module en cours est d'abord enregistré).

Clicksy reçoit `clicksy.exe --action video | guide | session`. Rien n'a été modifié dans Clicksy.

## Sécurité
Le lanceur ne peut lancer que : Studio (repéré dans l'annuaire ou dans Windows), Clicksy avec une
action de la liste ci-dessus, et les programmes que vous avez ajoutés vous-même. Il n'ouvre dans
l'Explorateur que des dossiers de modules, le dossier des modules et celui des captures Clicksy.
Aucune donnée ne quitte le PC.

## Pour les développeurs
- Code commun Rust : `crates/suite-core/` (annuaire, récents, recherche des modules, détection, lancement).
- Appli : `launcher/` (Tauri 2 + React). Aperçu navigateur avec un PC simulé : `npm.cmd run dev`
  dans `launcher/` puis http://localhost:1440 (`?clicksy=1`, `?nostudio=1`, `?empty=1`).
- Tests : `cargo test` dans `crates/suite-core` et `launcher/src-tauri`, `npm.cmd run test:e2e` dans `launcher/`.
- Publication : étiquette `launcher-vX.Y.Z` → GitHub construit `.exe` et `.msi` (release brouillon).
