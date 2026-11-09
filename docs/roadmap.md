# Feuille de route

## État au 2026-11-09
- Fait : lecteur HTML5, schéma 1.2, exercices et activités (lecteur), export SCORM 1.2 / HTML5
  validé dans SCORM Cloud, Studio 0.2.0 (éditeur de base).
- Réorientation : suite gratuite et open source, sans serveur, pour formateurs indépendants
  et petits streamers (voir decisions.md).

## 1. Refondation — faite le 2026-11-09 (sauf publication, en attente des tests du porteur)
- Langues FR/EN : lecteur (suit la langue du module) et Studio (réglage).
- Exercices (notés) / activités (jamais notées) : `role` dans le schéma (v1.3), conversion des anciens modules.
- Dépôt public (après vérification), construction des installateurs par GitHub Actions,
  candidature SignPath Foundation, page « politique de signature ».
- Documents à jour : CLAUDE.md, decisions.md, cette feuille de route.

## 2. Lanceur Learning Suite
- Projets récents avec leur étape du parcours, ouverture dans Studio.
- Applis de la suite installées (Studio, Review) et outils externes (« Mes outils »).
- **Clicksy** : détecté s'il est installé (sinon lien vers ses Releases), lancement,
  actions (« Enregistrer une démo », « Guide pas à pas ») via `clicksy.exe --action`.

## 3. Studio 4b : exercices et activités dans l'éditeur
- Réglages de toutes les briques existantes, dessin des zones à la souris.
- Nouveaux exercices : réponse courte, curseur numérique, mise en situation à embranchements,
  repérer les erreurs dans un texte, banque de questions.
- Nouvelles activités : vidéo interactive, avant/après, diaporama, auto-positionnement,
  réflexion libre, sondage, flashcards, checklist.
- Import depuis Clicksy : captures, vidéos et guides de la formation du même nom.

## 4. Parcours de conception
- Cadrage, scénario, storyboard (facultatifs) ; storyboard → pages ; export du storyboard
  (Word/PDF) pour validation client.

## 5. Relecture
- Paquet de relecture (navigateur, sans installation) + fichier de commentaires.
- Appli Review pour le producteur ; import des commentaires dans Studio.

## 6. Claude et connexions
- Serveur MCP local (Studio) + skill Claude.
- « Modifier avec… » (ArtCraft, Krita, GIMP…), dossier d'import surveillé.
- Voix off gratuite hors ligne (Piper), publication en lien gratuite (Netlify, GitHub Pages).
- Guide pas à pas Clicksy → simulation logicielle dans Studio (nécessite un export
  `guide.json` côté Clicksy).

## Plus tard
SCORM 2004, cmi5, xAPI, LTI, H5P, serveur facultatif.
