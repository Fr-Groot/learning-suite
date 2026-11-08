// Pont Learning Suite pour les jeux et contenus HTML (brique « html »).
// À coller dans le jeu, dans une balise <script>. Ensuite :
//   LearningSuite.score(80);   // envoie un score de 0 à 100 (et marque l'activité terminée)
//   LearningSuite.complete();  // marque l'activité terminée, sans score
window.LearningSuite = {
  score: function (value) {
    var n = Math.max(0, Math.min(100, Number(value) || 0));
    window.parent.postMessage({ type: "learning-suite", score: n, completed: true }, "*");
  },
  complete: function () {
    window.parent.postMessage({ type: "learning-suite", completed: true }, "*");
  },
};
