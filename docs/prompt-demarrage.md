# Prompts à coller dans Claude Code

## Session 1 : socle + plan de Review

```
Lis CLAUDE.md et tout le dossier docs/. On démarre la phase 1 de
docs/roadmap.md : Review en local.

1. Vérifie ce qui est installé sur mon PC (Git, Rust, Node) et explique-moi
   comment installer ce qui manque, une étape à la fois.
2. Initialise le dépôt Git et la structure des dossiers (server/, player/,
   studio/, docs/), avec un .gitignore adapté.
3. Propose-moi l'architecture de server/ pour la phase 1 : pages, données
   stockées, fonctionnement du faux LMS, capture d'écran des commentaires.
   Explique en français simple. Ne code rien avant ma validation.

Pose-moi tes questions avant de commencer.
```

## Sessions suivantes

```
Lis CLAUDE.md, docs/decisions.md et docs/roadmap.md. Où en est-on ?
Propose la prochaine étape de la phase en cours, attends ma validation,
puis réalise-la. Termine par comment je teste moi-même.
```

## Si tu préfères commencer par Studio

```
Lis CLAUDE.md et docs/. On démarre la phase 3 (player + export) avant
Review. Propose d'abord le schéma project.json v1 couvrant les deux modes
(diapositives 16:9 et vertical en blocs), les briques communes (texte,
image, forme, bouton, vidéo, audio), la navigation, les quiz (choix unique,
multiple, vrai/faux), la voix off par diapo et le seuil de réussite.
Montre-le-moi AVANT de coder le lecteur.
```
