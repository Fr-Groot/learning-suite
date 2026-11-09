// Lanceur Learning Suite : la porte d'entrée de la suite.
// L'interface ne peut demander que les actions ci-dessous ; chacune vérifie ce qu'elle lance
// (Studio repéré, actions Clicksy autorisées, outils ajoutés par l'utilisateur, dossiers de modules).

use serde::Serialize;
use std::path::{Path, PathBuf};
use suite_core::detect::{self, Installed};
use suite_core::projects::{self, ModuleCard};
use suite_core::{launch, same_dir, AppEntry, Res, Suite, Tool};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

/// Pages web que le lanceur peut ouvrir (téléchargements).
const PAGES: &[(&str, &str)] = &[
    ("clicksy", "https://github.com/Fr-Groot/clicksy/releases"),
    ("suite", "https://github.com/Fr-Groot/learning-suite/releases"),
    ("site", "https://fr-groot.github.io/learning-suite/"),
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Overview {
    modules: Vec<ModuleCard>,
    projects_dir: Option<String>,
    studio: Option<Installed>,
    clicksy: Option<Installed>,
    tools: Vec<Tool>,
    version: String,
}

fn suite() -> Res<Suite> {
    Suite::default_location()
}

/// Studio : d'abord l'annuaire (Studio s'y inscrit à chaque démarrage), sinon l'installation repérée.
fn studio(s: &Suite) -> Option<Installed> {
    s.app("studio")
        .filter(|a| Path::new(&a.exe).is_file())
        .map(|a| Installed { exe: a.exe, version: Some(a.version) })
        .or_else(detect::studio)
}

fn clicksy(s: &Suite) -> Option<Installed> {
    detect::clicksy(s.settings().clicksy_path.as_deref())
}

fn is_module(dir: &Path) -> bool {
    dir.join("project.json").is_file()
}

#[tauri::command]
fn overview(app: tauri::AppHandle) -> Res<Overview> {
    let s = suite()?;
    let base = projects::default_projects_dir();
    let modules = projects::all_modules(&s, base.as_deref());
    // Les miniatures affichent les images des modules : seulement leurs dossiers media/.
    for m in &modules {
        let _ = app.asset_protocol_scope().allow_directory(Path::new(&m.dir).join("media"), true);
    }
    Ok(Overview {
        modules,
        projects_dir: base.map(|p| p.to_string_lossy().to_string()),
        studio: studio(&s),
        clicksy: clicksy(&s),
        tools: s.tools(),
        version: env!("CARGO_PKG_VERSION").into(),
    })
}

fn studio_exe() -> Res<PathBuf> {
    let s = suite()?;
    studio(&s).map(|i| PathBuf::from(i.exe)).ok_or_else(|| "Studio n'est pas installé".into())
}

#[tauri::command]
fn studio_open(dir: String) -> Res<()> {
    if !is_module(Path::new(&dir)) {
        return Err(format!("Ce dossier ne contient pas de module : {dir}"));
    }
    launch::spawn(&studio_exe()?, &["--open", &dir])
}

#[tauri::command]
fn studio_new() -> Res<()> {
    launch::spawn(&studio_exe()?, &["--new"])
}

#[tauri::command]
fn studio_start() -> Res<()> {
    launch::spawn(&studio_exe()?, &[])
}

/// Ouvre dans l'Explorateur : un dossier de module, le dossier des modules, ou celui des captures Clicksy.
#[tauri::command]
fn folder_open(dir: String) -> Res<()> {
    let path = Path::new(&dir);
    let projects_dir = projects::default_projects_dir();
    let sessions = detect::clicksy_sessions_dir();
    let known = |p: &Option<PathBuf>| p.as_ref().is_some_and(|p| same_dir(&p.to_string_lossy(), &dir));
    if known(&projects_dir) || known(&sessions) {
        std::fs::create_dir_all(path).map_err(|e| e.to_string())?;
    } else if !is_module(path) {
        return Err(format!("Dossier non autorisé : {dir}"));
    }
    launch::open_folder(path)
}

#[tauri::command]
fn module_forget(dir: String) -> Res<()> {
    suite()?.forget_recent(&dir)
}

/// Clicksy : l'ouvrir, ou lui demander une action connue (vidéo, guide, session…).
#[tauri::command]
fn clicksy_run(action: Option<String>) -> Res<()> {
    let s = suite()?;
    let exe = clicksy(&s).ok_or("Clicksy n'est pas installé")?;
    match action.as_deref() {
        None => launch::spawn(Path::new(&exe.exe), &[]),
        Some(a) if launch::clicksy_action_allowed(a) => launch::spawn(Path::new(&exe.exe), &["--action", a]),
        Some(a) => Err(format!("Action Clicksy inconnue : {a}")),
    }
}

/// Version portable de Clicksy : l'utilisateur indique où se trouve clicksy.exe.
#[tauri::command]
fn clicksy_locate(path: String) -> Res<Option<Installed>> {
    let name = Path::new(&path).file_name().and_then(|n| n.to_str()).unwrap_or("").to_lowercase();
    if !name.contains("clicksy") {
        return Err("Choisissez le programme clicksy.exe".into());
    }
    let s = suite()?;
    s.set_clicksy_path(Some(&path))?;
    Ok(clicksy(&s))
}

#[tauri::command]
fn clicksy_folder() -> Res<String> {
    detect::clicksy_sessions_dir().map(|p| p.to_string_lossy().to_string()).ok_or_else(|| "Dossier Documents introuvable".into())
}

#[tauri::command]
fn tool_add(name: String, exe: String) -> Res<Vec<Tool>> {
    let s = suite()?;
    s.add_tool(&name, &exe)?;
    Ok(s.tools())
}

#[tauri::command]
fn tool_remove(id: String) -> Res<Vec<Tool>> {
    let s = suite()?;
    s.remove_tool(&id)?;
    Ok(s.tools())
}

/// Lance un outil par son identifiant : seulement ceux que l'utilisateur a ajoutés.
#[tauri::command]
fn tool_run(id: String) -> Res<()> {
    let tool = suite()?.tools().into_iter().find(|t| t.id == id).ok_or("Outil inconnu")?;
    launch::spawn(Path::new(&tool.exe), &[])
}

#[tauri::command]
fn page_open(app: tauri::AppHandle, which: String) -> Res<()> {
    let url = PAGES.iter().find(|(k, _)| *k == which).map(|(_, u)| *u).ok_or("Page inconnue")?;
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

fn register() {
    let Ok(s) = suite() else { return };
    let exe = std::env::current_exe().map(|p| p.to_string_lossy().to_string()).unwrap_or_default();
    let _ = s.register(AppEntry {
        id: "launcher".into(),
        name: "Learning Suite".into(),
        exe,
        version: env!("CARGO_PKG_VERSION").into(),
        actions: vec![],
        seen: 0,
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    register();
    tauri::Builder::default()
        // Une seule fenêtre du lanceur : un second lancement ramène la première au premier plan.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.unminimize();
                let _ = win.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            overview,
            studio_open,
            studio_new,
            studio_start,
            folder_open,
            module_forget,
            clicksy_run,
            clicksy_locate,
            clicksy_folder,
            tool_add,
            tool_remove,
            tool_run,
            page_open
        ])
        .run(tauri::generate_context!())
        .expect("erreur au lancement du lanceur Learning Suite");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pages_connues_seulement() {
        assert!(PAGES.iter().all(|(_, u)| u.starts_with("https://")));
        assert!(PAGES.iter().any(|(k, _)| *k == "clicksy"));
    }

    #[test]
    fn dossier_quelconque_refuse() {
        let tmp = tempfile::tempdir().unwrap();
        assert!(folder_open(tmp.path().to_string_lossy().to_string()).is_err());
        assert!(studio_open(tmp.path().to_string_lossy().to_string()).is_err());
    }

    #[test]
    fn clicksy_mauvais_programme_refuse() {
        assert!(clicksy_locate("C:\\Windows\\notepad.exe".into()).is_err());
    }
}
