# Learning Suite Studio — guide de l'auteur (version 0.2)

## Installer
Double-cliquez sur `Learning Suite Studio_0.2.0_x64-setup.exe`
(dans `studio/src-tauri/target/release/bundle/nsis/`). Si Windows affiche
« Windows a protégé votre ordinateur » : « Informations complémentaires » → « Exécuter quand même »
(l'appli n'est pas encore signée). L'installation remplace la version précédente.

## Créer un module
1. **＋ Nouveau module** → titre, format (**Diapositives** 16:9 ou **Vertical** pour téléphone), thème.
2. Emplacement proposé : `Documents\Learning Suite\<titre>` (**Changer…** pour un autre dossier).
3. Un module = un dossier : `project.json` + `media/` (vos images, sons, vidéos y sont **copiés**).
   Pour l'envoyer à quelqu'un, envoyez le dossier entier (zippé).

## L'écran
| Zone | Rôle |
| --- | --- |
| Gauche | Les pages. **＋ Ajouter une page** : page blanche ou modèle. ↑ ↓ ⧉ 🗑 : monter, descendre, dupliquer, supprimer |
| Haut du centre | **Insérer** : titre, texte, image, forme, bouton, vidéo, son |
| Centre | La page. Cliquez une brique pour la sélectionner, glissez-la, tirez ses poignées |
| Droite | **Propriétés** : onglet *Brique* (contenu, apparence, position), *Page* (titre, fond, voix off, déblocage), *Module* (infos, navigation, seuil, thème) |
| Barre du haut | Enregistrer, annuler / rétablir, **Vérifier**, **Aperçu**, **Exporter** |

## Raccourcis
| Touche | Effet |
| --- | --- |
| Ctrl+S | Enregistrer (aussi automatique toutes les 30 s et à la fermeture) |
| Ctrl+Z / Ctrl+Y | Annuler / rétablir |
| Flèches (Maj : ×10) | Déplacer la brique sélectionnée |
| Ctrl+D | Dupliquer |
| Suppr | Supprimer |
| Maj+clic | Sélectionner plusieurs briques |
| Alt pendant un glisser | Désactiver l'aimantation |
| Double-clic sur une brique | Aller directement à son texte |
| Échap | Désélectionner / fermer l'aperçu |

## Texte
Barre **G** (gras), **I** (italique), **•** (liste), **🔗** (lien). Dans le texte : `**gras**`,
`*italique*`, `- ` en début de ligne pour une liste.

## Voix off
Onglet **Page** → *Voix off* → choisir un MP3 ou WAV, coller la transcription. Pour obliger
l'apprenant à l'écouter : *Le bouton « Suivant » se débloque* → « À la fin de la voix off ».

## Vérifier, prévisualiser, exporter
- **Vérifier** liste ce qui empêche l'export (fichier manquant, texte trop long…).
- **Aperçu** : le module tel que le verra l'apprenant, à partir de la page en cours.
- **Exporter** : **SCORM 1.2** (pour un LMS : Moodle, SCORM Cloud, Rise Up…) ou **HTML5** (site
  autonome). Le module est enregistré avant l'export.

## Limites de cette version (étape 4a)
Les activités (quiz, texte à trous, glisser-déposer, cartes, zones…) d'un module existant
s'affichent et se déplacent, mais leurs réglages détaillés arrivent à l'étape 4b. Le pilotage par
Claude arrive à l'étape 4c.
