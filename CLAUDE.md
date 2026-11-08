# Learning Suite

## Mission
Suite d'outils pour créer, relire et diffuser des modules e-learning.
Cibles : fournisseurs produits, formateurs indépendants, organismes de formation.
Simplicité > exhaustivité. Tout en français d'abord (prévoir l'anglais).

Produits (dans cet ordre de développement) :
1. **Server** (`server/`) : un seul logiciel serveur. Module 1 = Review (relecture
   de paquets SCORM/HTML venant de n'importe quel outil : Rise Up, EdTake,
   Storyline, Studio). Plus tard : diffusion par lien, suivi apprenants, LRS,
   connecteur Dendreo, LTI 1.3.
   Déployé de deux façons : hébergé par le porteur (offre Cloud) ou installé
   chez le client (auto-hébergé). Même code.
2. **Player** (`player/`) : lecteur HTML5 commun (aperçu + exports).
3. **Studio** (`studio/`) : appli Windows auteur (Tauri 2), deux modes
   (diapositives 16:9 ou vertical en blocs), export HTML5 et SCORM 1.2,
   puis SCORM 2004, cmi5, xAPI. Pilotage IA via serveur MCP local.
4. Plus tard : Hub (lanceur de la suite), Capture (simulations logiciel).

La documentation complète est dans `docs/`. Lis `docs/decisions.md` avant
toute proposition d'architecture.

## Qui pilote
Le porteur du projet n'est pas développeur.
- Explique chaque choix technique en 2 phrases, en français simple.
- Consigne chaque décision dans `docs/decisions.md` (date, choix, raison).
- Avant chaque phase : propose un plan, attends validation.
- Termine chaque tâche par : ce qui marche, comment le tester soi-même
  pas à pas, ce qui reste à faire.
- Petits commits Git, un par étape fonctionnelle, messages en français.
- Si un outil manque sur la machine (Rust, Node, Git), explique comment
  l'installer avant de continuer.
- Ne jamais supprimer de fichiers ni réécrire l'historique Git sans accord.

## Stack
- Server : Rust (axum), SQLite par défaut (PostgreSQL en option plus tard),
  interface web en TypeScript. Livré en un exécutable Windows/Linux + Docker.
- Studio : Tauri 2, cœur Rust, interface TypeScript + React.
- Player : TypeScript sans framework, le plus léger possible.
- Format projet : `project.json` + dossier `media/`, validé par un schéma JSON
  versionné. Le schéma est la source de vérité (lisible par humain et IA).

## Règles techniques
- Server : les paquets SCORM sont servis depuis le même domaine que
  l'interface (indispensable pour la capture d'écran des commentaires).
- Review lance les SCORM avec un faux LMS (API SCORM 1.2 et 2004 simulée).
- Le player parle à une interface Tracker unique ; un adaptateur par format.
- Données personnelles (relecteurs, apprenants) : minimum nécessaire,
  pensé RGPD (export et suppression possibles).
- Sécurité : liens de relecture non devinables, aucun secret dans le code.
- Tests : tests unitaires sur la logique, un test de bout en bout par
  parcours utilisateur principal.
- Licence du code ouvert : AGPLv3. Les modules Business (Dendreo, SSO,
  marque blanche) seront dans un dossier séparé, hors AGPL.

## Hors périmètre pour l'instant
Hub, Capture, LTI, H5P, paiement en ligne, multi-organisation.
Ne pas les anticiper dans le code au-delà du nécessaire.
