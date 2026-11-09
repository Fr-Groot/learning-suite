// Point d'entrée de Learning Suite Studio.
// Les commandes ci-dessous sont les seules opérations disque permises à l'interface.

mod project;
mod suite;

use std::path::PathBuf;
use tauri::{Emitter, Manager};

/// Autorise l'affichage des médias du projet dans l'interface (images, sons, vidéos).
fn allow_assets(app: &tauri::AppHandle, dir: &PathBuf) -> project::Res<()> {
    app.asset_protocol_scope().allow_directory(dir, true).map_err(|e| e.to_string())
}

#[tauri::command]
fn project_read(app: tauri::AppHandle, dir: String) -> project::Res<String> {
    let dir = PathBuf::from(dir);
    allow_assets(&app, &dir)?;
    project::read(&dir)
}

#[tauri::command]
fn project_create(app: tauri::AppHandle, dir: String, json: String) -> project::Res<()> {
    let dir = PathBuf::from(dir);
    project::create(&dir, &json)?;
    allow_assets(&app, &dir)
}

#[tauri::command]
fn project_save(dir: String, json: String) -> project::Res<()> {
    project::save(&PathBuf::from(dir), &json)
}

#[tauri::command]
fn media_import(dir: String, source: String) -> project::Res<String> {
    project::import_media(&PathBuf::from(dir), &PathBuf::from(source))
}

#[tauri::command]
fn media_list(dir: String) -> project::Res<Vec<String>> {
    project::list_media(&PathBuf::from(dir))
}

#[tauri::command]
fn export_zip(dir: String, out: String, texts: Vec<(String, String)>, media: Vec<String>) -> project::Res<u64> {
    project::export_zip(&PathBuf::from(dir), &PathBuf::from(out), &texts, &media)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args: Vec<String> = std::env::args().collect();
    let first = suite::parse_request(&args);
    suite::register();
    tauri::Builder::default()
        // Studio déjà ouvert : la demande (ouvrir un module, nouveau module) va à la fenêtre existante.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let req = suite::parse_request(&argv);
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.unminimize();
                let _ = win.set_focus();
            }
            let _ = app.emit("suite-request", req);
        }))
        .manage(std::sync::Mutex::new(Some(first)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            project_read,
            project_create,
            project_save,
            media_import,
            media_list,
            export_zip,
            suite::suite_recents,
            suite::suite_remember,
            suite::suite_forget,
            suite::startup_request
        ])
        .run(tauri::generate_context!())
        .expect("erreur au lancement de Learning Suite Studio");
}
