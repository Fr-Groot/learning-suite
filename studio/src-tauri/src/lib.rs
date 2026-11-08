// Point d'entrée de Learning Suite Studio.
// Les commandes Rust (ouvrir/enregistrer un projet, exporter) viendront ici.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("erreur au lancement de Learning Suite Studio");
}
