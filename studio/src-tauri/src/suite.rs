// Raccordement de Studio au reste de la suite : annuaire, récents partagés,
// et demandes venues d'ailleurs (le lanceur demande « ouvre ce module » ou « nouveau module »).

use serde::Serialize;
use suite_core::{AppEntry, Recent, Res, Suite};

/// Ce que l'on demande à Studio par la ligne de commande.
#[derive(Debug, Default, Serialize, Clone, PartialEq)]
pub struct Request {
    /// Dossier du module à ouvrir.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub open: Option<String>,
    /// Ouvrir la fenêtre « Nouveau module ».
    pub new: bool,
}

/// Lit `--open <dossier>` et `--new` (le premier élément est le programme lui-même).
pub fn parse_request<S: AsRef<str>>(args: &[S]) -> Request {
    let mut req = Request::default();
    let mut it = args.iter().skip(1).map(|s| s.as_ref());
    while let Some(a) = it.next() {
        match a {
            "--open" => req.open = it.next().map(str::to_string).filter(|d| !d.is_empty()),
            "--new" => req.new = true,
            _ => {}
        }
    }
    req
}

pub fn suite() -> Res<Suite> {
    Suite::default_location()
}

/// Studio s'inscrit dans l'annuaire à chaque démarrage (chemin et version à jour).
pub fn register() {
    let Ok(s) = suite() else { return };
    let exe = std::env::current_exe().map(|p| p.to_string_lossy().to_string()).unwrap_or_default();
    let _ = s.register(AppEntry {
        id: "studio".into(),
        name: "Learning Suite Studio".into(),
        exe,
        version: env!("CARGO_PKG_VERSION").into(),
        actions: vec!["open".into(), "new".into()],
        seen: 0,
    });
}

#[tauri::command]
pub fn suite_recents() -> Vec<Recent> {
    suite().map(|s| s.recents()).unwrap_or_default()
}

#[tauri::command]
pub fn suite_remember(dir: String, title: String) -> Res<()> {
    suite()?.push_recent(&dir, &title)
}

#[tauri::command]
pub fn suite_forget(dir: String) -> Res<()> {
    suite()?.forget_recent(&dir)
}

/// La demande reçue au démarrage (une seule fois).
#[tauri::command]
pub fn startup_request(state: tauri::State<'_, std::sync::Mutex<Option<Request>>>) -> Option<Request> {
    state.lock().ok().and_then(|mut r| r.take())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lecture_des_demandes() {
        assert_eq!(parse_request(&["studio.exe"]), Request::default());
        assert_eq!(parse_request(&["studio.exe", "--open", "C:\\M\\a b"]).open.as_deref(), Some("C:\\M\\a b"));
        assert!(parse_request(&["studio.exe", "--new"]).new);
        assert_eq!(parse_request(&["studio.exe", "--open"]).open, None);
        assert_eq!(parse_request(&["studio.exe", "--inconnu", "x"]), Request::default());
    }
}
