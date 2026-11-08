import "./App.css";

// Écran d'accueil provisoire : il prouve que la fenêtre s'ouvre.
// L'éditeur (deux modes, propriétés, aperçu) viendra en phase 4.
function App() {
  return (
    <main className="container">
      <h1>Learning Suite Studio</h1>
      <p>Version 0.1.0 : socle de l'application.</p>
      <p className="hint">
        L'éditeur de modules arrive bientôt. En attendant, le lecteur HTML5 se
        teste depuis le dossier <code>player/</code>.
      </p>
    </main>
  );
}

export default App;
