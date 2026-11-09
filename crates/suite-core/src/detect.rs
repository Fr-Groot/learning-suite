//! Repérer les applis installées (Studio, Clicksy…) même si elles ne se sont pas encore
//! inscrites dans l'annuaire : liste « Applications installées » de Windows, puis emplacements habituels.

use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Clone, PartialEq)]
pub struct Installed {
    pub exe: String,
    pub version: Option<String>,
}

/// Cherche une appli par le début de son nom dans « Applications installées »
/// (comptes utilisateur et machine), et renvoie son exécutable s'il existe.
#[cfg(windows)]
pub fn from_registry(name_prefix: &str, exe_name: &str) -> Option<Installed> {
    use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ};
    use winreg::RegKey;
    const PATHS: &[&str] = &[
        r"Software\Microsoft\Windows\CurrentVersion\Uninstall",
        r"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
    ];
    for hive in [HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE] {
        let root = RegKey::predef(hive);
        for path in PATHS {
            let Ok(list) = root.open_subkey_with_flags(path, KEY_READ) else { continue };
            for name in list.enum_keys().flatten() {
                let Ok(app) = list.open_subkey_with_flags(&name, KEY_READ) else { continue };
                let display: String = app.get_value("DisplayName").unwrap_or_default();
                if !display.to_lowercase().starts_with(&name_prefix.to_lowercase()) {
                    continue;
                }
                let version: Option<String> = app.get_value("DisplayVersion").ok();
                let mut candidates: Vec<PathBuf> = vec![];
                if let Ok(loc) = app.get_value::<String, _>("InstallLocation") {
                    candidates.push(Path::new(loc.trim_matches('"')).join(exe_name));
                }
                if let Ok(icon) = app.get_value::<String, _>("DisplayIcon") {
                    let icon = icon.split(',').next().unwrap_or("").trim_matches('"').to_string();
                    candidates.push(PathBuf::from(&icon));
                    if let Some(dir) = Path::new(&icon).parent() {
                        candidates.push(dir.join(exe_name));
                    }
                }
                if let Some(exe) = candidates.into_iter().find(|p| p.is_file() && p.extension().is_some_and(|e| e.eq_ignore_ascii_case("exe"))) {
                    return Some(Installed { exe: exe.to_string_lossy().to_string(), version });
                }
            }
        }
    }
    None
}

#[cfg(not(windows))]
pub fn from_registry(_name_prefix: &str, _exe_name: &str) -> Option<Installed> {
    None
}

/// Emplacements habituels, si le registre ne dit rien.
fn usual_places(folder: &str, exe_name: &str) -> Vec<PathBuf> {
    let mut out = vec![];
    for var in ["ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA"] {
        if let Ok(base) = std::env::var(var) {
            out.push(Path::new(&base).join(folder).join(exe_name));
            out.push(Path::new(&base).join("Programs").join(folder).join(exe_name));
        }
    }
    out
}

/// Clicksy : emplacement choisi à la main (portable), sinon installation repérée.
pub fn clicksy(manual: Option<&str>) -> Option<Installed> {
    if let Some(p) = manual {
        if Path::new(p).is_file() {
            return Some(Installed { exe: p.to_string(), version: None });
        }
    }
    from_registry("Clicksy", "clicksy.exe").or_else(|| {
        usual_places("Clicksy", "clicksy.exe").into_iter().find(|p| p.is_file()).map(|p| Installed { exe: p.to_string_lossy().to_string(), version: None })
    })
}

/// Studio : installation repérée (s'il ne s'est pas encore inscrit dans l'annuaire).
/// L'exécutable de Studio s'appelle « studio.exe ».
pub fn studio() -> Option<Installed> {
    from_registry("Learning Suite Studio", "studio.exe").or_else(|| {
        usual_places("Learning Suite Studio", "studio.exe").into_iter().find(|p| p.is_file()).map(|p| Installed { exe: p.to_string_lossy().to_string(), version: None })
    })
}

/// Dossier où Clicksy range ses sessions (`Documents\Clicksy`).
pub fn clicksy_sessions_dir() -> Option<PathBuf> {
    dirs::document_dir().map(|d| d.join("Clicksy"))
}
