# Roadmap

## État au 2026-11-09
Ordre changé (voir decisions.md) : on a commencé par le socle Studio et la phase 3.
- Fait : appli Studio vide (fenêtre + installateurs .exe et MSI).
- Fait : schéma project.json v1.1, lecteur HTML5, trois projets d'exemple, tests.
- Fait : export HTML5 et SCORM 1.2 (reprise, score, statut), brique HTML pour les jeux avec score.
- Reste en phase 3 : test réel dans SCORM Cloud et Rise Up, skill Claude.
- Ensuite : phase 3b (activités), puis phase 4 (Studio).

## Phase 1 : Review en local (sur ton PC)
Livrable : le serveur tourne sur ton PC, s'ouvre dans le navigateur.
- Créer un projet de relecture, déposer un zip SCORM ou HTML.
- Lire le module avec un faux LMS (SCORM 1.2 et 2004).
- Cliquer sur l'écran pour commenter : capture automatique + épingle.
- Statuts : à corriger, corrigé, validé.
- Versions : déposer la V2, les commentaires de la V1 restent visibles.
- Export du rapport (PDF ou Excel).
Critère de fin : tu relis un vrai export Rise Up et un vrai export EdTake,
et tu sors un rapport utilisable avec un client.

## Phase 2 : Review partageable
- Lien de relecture pour le client, connexion par lien magique email.
- Plusieurs relecteurs, notifications email.
- Déploiement sur un hébergeur européen (offre Cloud en bêta payante).
Critère de fin : un vrai client relit un module sans rien installer.

## Phase 3 : Player + export (sans éditeur)
- Schéma project.json v1 (deux modes, briques communes, quiz).
- Lecteur HTML5, export HTML5 et SCORM 1.2.
- Ton skill Claude génère des project.json.
Critère de fin : un module généré passe dans SCORM Cloud et Rise Up.

## Phase 3b : Activités (avant Studio, schéma v1.2)
- Modèles de page prêts à l'emploi : titre + texte + image, image plein écran, deux colonnes…
- Cartes à retourner.
- Glisser-déposer, association, remise en ordre.
- Texte à trous (saisie ou liste).
- Zones cliquables sur image (hotspot).
- Contenus interactifs : onglets, accordéon, frise chronologique.
Critère de fin : chaque activité marche dans les deux modes, au clavier, et remonte son score en SCORM.

## Phase 4 : Studio (éditeur)
- Appli Tauri, éditeur deux modes, panneau Propriétés, thème, quiz,
  voix off, aperçu, assistant d'export.
- Serveur MCP local pour le pilotage par Claude.
- Jalon « Signature Windows » avant la 1re version publique de Studio
  (supprime l'alerte de Windows à l'installation, qui s'efface avec le temps) :
  - société (SAS, SARL…) → Microsoft Artifact Signing, environ 10 $ par mois ;
  - micro-entreprise ou particulier → Certum : « Open Source » dès 69 € par an si le code
    est public, sinon certificat classique (plus cher).
  - Lancer les démarches environ un mois avant : vérification d'identité.

## Phase 5 : Diffusion et Business
- Diffusion par lien et suivi apprenants dans le serveur.
- SCORM 2004, cmi5, xAPI.
- Connecteur Dendreo, licence Business auto-hébergée.

## Plus tard
Hub, Capture, LTI 1.3, H5P, QTI.
