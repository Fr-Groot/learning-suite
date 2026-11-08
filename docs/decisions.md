# Journal des décisions

| Date | Décision | Raison |
| --- | --- | --- |
| 2026-10-31 | Quatre produits : Hub, Studio, Capture, Review | Vision suite façon Adobe CC |
| 2026-10-31 | Tauri 2 (Rust + interface web) pour les applis PC | Léger, rapide, sortie e-learning en HTML de toute façon |
| 2026-10-31 | Format de module JSON ouvert comme pivot | Contrat commun entre éditeur, player et IA |
| 2026-10-31 | IA via serveur MCP local | Chacun utilise son abonnement Claude, sans coût d'API |
| 2026-10-31 | Code ouvert en AGPLv3 + licence commerciale | Partage libre, protection contre la reprise fermée |
| 2026-11-08 | Studio : deux modes au choix (diapositives ou vertical) | Interactif d'un côté, lecture mobile de l'autre |
| 2026-11-08 | Exports : HTML5 + SCORM 1.2, puis SCORM 2004, cmi5, xAPI | SCORM reste le plus compatible en 2026 |
| 2026-11-08 | Un seul logiciel serveur (Review, diffusion, suivi, connecteurs) | Même code en Cloud ou auto-hébergé |
| 2026-11-08 | Modèle : création gratuite, diffusion et collaboration payantes | Le paiement tombe là où sont les coûts (serveurs, suivi, humain) |
| 2026-11-08 | Premier développement : Server, module Review | Utile tout de suite sur Rise Up et EdTake, premier revenu |
| 2026-11-08 | Connecteur Dendreo porté par le serveur | Seul le serveur voit inscriptions et résultats |
| 2026-11-08 | Ordre changé : Studio + schéma + lecteur avant Review | Choix du porteur : poser d'abord le format pivot et le lecteur |
| 2026-11-08 | Rust en version MSVC sous Windows | Configuration officielle de Tauri, moins de surprises à la construction |
| 2026-11-08 | Installateurs Studio : setup.exe (NSIS) et MSI | Le .exe pour les indépendants (sans droits admin), le MSI pour les DSI |
| 2026-11-08 | Schéma partagé dans `schema/` (JSON Schema 2020-12) | Une seule source de vérité pour Studio, lecteur et IA |
| 2026-11-08 | Mot « pages » + toile fixe 1280 × 720 en mode diapositives | Un vocabulaire pour les deux modes ; l'auteur garde les mêmes coordonnées quel que soit l'écran |
| 2026-11-08 | Texte en mini-Markdown, pas de HTML | Lisible par l'humain et l'IA, et pas d'injection de code |
| 2026-11-08 | Schéma v1 validé tel que proposé (pages, 8 briques dont `results`, quiz tout ou rien) | Validé par le porteur |
| 2026-11-08 | Lecteur : TypeScript + Vite, sortie `player.js` + `player.css` (~30 Ko, ~10 Ko compressés) | Léger, sans framework, réutilisable tel quel par les exports |
| 2026-11-08 | Le lecteur livré ne contient pas le validateur complet (Ajv) | Studio vérifie avant export ; l'aperçu et `npm run validate` vérifient tout |
| 2026-11-08 | Tests de bout en bout avec Playwright sur Edge déjà installé | Pas de navigateur à télécharger sur le poste |
| 2026-11-08 | Voix off d'exemple générées avec la voix Windows « Hortense » (WAV) | Gratuit et hors ligne ; MP3 recommandé pour les vrais modules |
