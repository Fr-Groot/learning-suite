# Learning Suite

## Mission
Suite d'outils **gratuite et open source** pour concevoir, produire, relire et diffuser
des modules e-learning. Cibles : **formateurs indépendants et petits streamers**.
Gratuit, efficace, sans serveur à payer. Simplicité > exhaustivité.
Applis et modules en **français et anglais**.

Parcours de conception, chaque étape facultative :
Cadrage → Scénario → Storyboard → Production → Relecture → Diffusion.

Applis (un installateur par appli, même famille visuelle) :
1. **Player** (`player/`) : lecteur HTML5 commun (aperçu + exports). Fait.
2. **Studio** (`studio/`) : appli Windows auteur (Tauri 2), deux modes
   (diapositives 16:9 ou vertical en blocs), exercices et activités,
   export HTML5 et SCORM 1.2 (puis SCORM 2004, cmi5, xAPI). Pilotage IA via MCP local.
3. **Lanceur Learning Suite** (`launcher/`) : entrée de la suite (projets, étape du
   parcours, applis installées, outils externes dont Clicksy).
4. **Review** : relecture sans serveur. Paquet de relecture ouvert dans le navigateur
   (client, sans installation) + appli Review pour le producteur. Commentaires
   échangés par fichier, importés dans Studio.
5. **Clicksy** (projet séparé, github.com/Fr-Groot/clicksy, MIT) : effets de pointeur,
   enregistrement d'écran, montage, guides pas à pas. Joue le rôle de « Capture ».
   Intégration par fichiers et ligne de commande, pas de code partagé.

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
- Ne rien publier sur GitHub sans accord, et seulement après ses tests.
- Sous Windows, PowerShell bloque `npm` : donner `npm.cmd` ou des lanceurs `.cmd`.

## Stack
- Studio, Lanceur, Review : Tauri 2, cœur Rust, interface TypeScript + React.
- Player : TypeScript sans framework, le plus léger possible.
- Format projet : `project.json` + dossier `media/`, validé par un schéma JSON
  versionné (`schema/`). Le schéma est la source de vérité (lisible par humain et IA).
- Traductions : fichiers de textes FR/EN simples, sans grosse bibliothèque.

## Règles techniques
- Pas de serveur obligatoire : tout marche en local ; échanges par fichiers.
- Exercice = noté (compte dans le score et le SCORM). Activité = jamais notée.
- Le player parle à une interface Tracker unique ; un adaptateur par format.
- Données personnelles (relecteurs, apprenants) : minimum nécessaire,
  pensé RGPD ; aucune télémétrie.
- Sécurité : CSP stricte dans les applis Tauri (pas d'eval), accès disque limité
  à des commandes Rust précises, aucun secret dans le code.
- Tests : tests unitaires sur la logique, un test de bout en bout par
  parcours utilisateur principal.
- Licence : AGPLv3, dépôt public. Installateurs construits par GitHub Actions,
  signés gratuitement via SignPath Foundation (programme open source).

## Hors périmètre pour l'instant
Serveur, offre Cloud, connecteur Dendreo, modules payants, LTI, H5P,
paiement en ligne, multi-organisation.
Ne pas les anticiper dans le code au-delà du nécessaire.
