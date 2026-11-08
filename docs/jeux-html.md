# Jeux et contenus HTML dans un module

La brique `html` affiche une page HTML (jeu, simulation, exercice sur mesure) dans le module.
Le jeu peut **renvoyer un score** : il compte dans le résultat et part au LMS (SCORM).

## En 4 étapes

1. Faites créer le jeu par une IA avec la consigne ci-dessous (ou écrivez-le vous-même).
2. Enregistrez-le dans le dossier `media/` du projet, par ex. `media/jeux/mon-jeu.html`.
3. Ajoutez la brique dans `project.json` :
   ```json
   { "id": "mon-jeu", "type": "html", "src": "media/jeux/mon-jeu.html",
     "title": "Jeu : les bons gestes", "graded": true, "points": 2,
     "frame": { "x": 40, "y": 30, "w": 800, "h": 660 } }
   ```
   En mode vertical, remplacez `frame` par `"height": 600`.
4. Vérifiez et exportez (double-clic sur « Exporter les exemples.cmd », ou
   `npm.cmd run export -- chemin/du/projet` dans le dossier `player`).

## Le pont : 2 fonctions

Collez ce script dans le jeu (copie de `schema/learning-suite-bridge.js`) :

```html
<script>
window.LearningSuite = {
  score: function (value) {
    var n = Math.max(0, Math.min(100, Number(value) || 0));
    window.parent.postMessage({ type: "learning-suite", score: n, completed: true }, "*");
  },
  complete: function () {
    window.parent.postMessage({ type: "learning-suite", completed: true }, "*");
  },
};
</script>
```

- `LearningSuite.score(80)` : score de 0 à 100, l'activité est terminée. Le module garde le
  **meilleur** score si le jeu est rejoué.
- `LearningSuite.complete()` : terminé, sans score (pour un contenu non noté).

## Règles de sécurité (automatiques)

- Le jeu tourne dans un cadre **isolé** : il ne peut lire ni le module, ni le LMS,
  ni les cookies ou données de l'apprenant.
- Le module n'accepte que les messages venant de **ce** cadre.
- Pas d'accès à Internet garanti chez le client : préférez un jeu **autonome**
  (tout dans un seul fichier, sans bibliothèque en ligne).

## Consigne prête à donner à l'IA

> Crée un jeu pédagogique en **un seul fichier HTML** autonome (HTML, CSS et JavaScript
> dans le même fichier, aucune ressource externe, aucune bibliothèque en ligne).
> Sujet : [VOTRE SUJET]. Public : [VOTRE PUBLIC]. Durée : 2 à 5 minutes. Langue : français.
> Le jeu doit s'adapter à la taille de la fenêtre (de 360 px à 1280 px de large),
> être jouable à la souris, au doigt et au clavier, et avoir des contrastes lisibles.
> Ajoute exactement ce script au début du `<body>` :
> `window.LearningSuite = { score: function (v) { var n = Math.max(0, Math.min(100, Number(v) || 0)); window.parent.postMessage({ type: "learning-suite", score: n, completed: true }, "*"); }, complete: function () { window.parent.postMessage({ type: "learning-suite", completed: true }, "*"); } };`
> À la fin de la partie, calcule un score de 0 à 100 et appelle `LearningSuite.score(score)`
> **une fois**, puis affiche le score au joueur avec un bouton « Rejouer ».
> N'utilise pas localStorage, les cookies, ni de fenêtre surgissante (alert, confirm).

## Exemple

`examples/jeu-html/` : un jeu de paires (`media/jeux/paires.html`) noté sur 2 points.
