# Publier Learning Suite (dépôt public, installateurs, signature)

## 1. Rendre le dépôt public (une fois)
Fait par Claude avec ton accord, après tes tests :
1. envoi de l'historique (auteur « Fr-Groot », adresse masquée) sur GitHub ;
2. passage du dépôt `Fr-Groot/learning-suite` en **public**.

## 1 bis. Site de présentation (une fois, juste après le passage en public)
Le site est dans `site/` (français) et `site/en/` (anglais). Le workflow **Site (GitHub Pages)**
le publie à chaque modification. Il faut l'activer une fois : GitHub › dépôt › **Settings** ›
**Pages** › *Source* : **GitHub Actions** (Claude peut le faire avec ton accord).
Adresse : <https://fr-groot.github.io/learning-suite/>.
Pour refaire les captures d'écran du site : demander à Claude (elles viennent des exemples).

## 2. Double authentification GitHub (toi, une fois)
Exigée par SignPath. GitHub › photo de profil › **Settings** › **Password and authentication** ›
**Two-factor authentication** › activer (application d'authentification sur ton téléphone).

## 3. Candidature SignPath Foundation (toi, une fois)
Formulaire : <https://signpath.org/apply> (ou depuis <https://signpath.org>). Texte prêt à copier :

> **Project name:** Learning Suite
> **Repository:** https://github.com/Fr-Groot/learning-suite
> **License:** AGPL-3.0 (OSI approved)
> **Description:** Free and open-source e-learning authoring suite for independent trainers and
> small content creators: Learning Suite Studio (Windows desktop app built with Tauri 2) creates
> courses and exports them as SCORM 1.2 and HTML5. No telemetry, no account, works offline.
> **What will be signed:** the Windows installers (.exe NSIS and .msi) of Learning Suite Studio,
> built by the public GitHub Actions workflow `.github/workflows/release.yml` from tagged commits.
> **Code signing policy:** https://github.com/Fr-Groot/learning-suite/blob/main/docs/code-signing.md
> **Maintainer:** Fr-Groot (also maintainer of https://github.com/Fr-Groot/clicksy, MIT).

Les conditions évoluent : vérifie la page de candidature au moment d'envoyer.

## 4. Brancher la signature (toi, après acceptation)
Dans GitHub › dépôt › **Settings** › **Secrets and variables** › **Actions** :
- secret `SIGNPATH_API_TOKEN` : le jeton fourni par SignPath ;
- variable `SIGNPATH_ORGANIZATION_ID` : l'identifiant d'organisation SignPath.
Les noms de projet et de règle de signature attendus par le workflow sont `learning-suite` et
`release-signing` ; s'ils diffèrent chez SignPath, Claude adapte `release.yml`.
**Aucun secret ne va dans le code.**

## 5. Publier une version de Studio
1. Mettre le numéro de version dans `studio/package.json`, `studio/src-tauri/tauri.conf.json`
   et `studio/src-tauri/Cargo.toml` (Claude le fait).
2. Créer l'étiquette `studio-vX.Y.Z` et l'envoyer : GitHub lance **Release Studio**.
3. GitHub construit les installateurs, les signe (si SignPath est branché), calcule
   `SHA256SUMS.txt` et prépare une **release brouillon**.
4. Toi : vérifier la release brouillon (télécharger, installer, tester), puis **Publish release**.

## Tests automatiques
À chaque envoi sur GitHub, le workflow **Tests** relance tous les tests (lecteur, Studio, Rust)
sous Windows. Un rond vert sur le commit = tout passe.
