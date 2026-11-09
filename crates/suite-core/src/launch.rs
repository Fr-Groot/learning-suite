//! Lancer une autre appli, avec des garde-fous : seulement un .exe existant, et pour Clicksy
//! seulement des actions connues. L'appli lancée vit sa vie (elle ne se ferme pas avec le lanceur).

use std::path::Path;
use std::process::Command;

/// Actions de Clicksy que la suite a le droit de demander (`clicksy.exe --action <nom>`).
pub const CLICKSY_ACTIONS: &[&str] = &["video", "guide", "session", "capture", "editeur"];

pub fn check_exe(path: &Path) -> crate::Res<()> {
    if !path.is_file() {
        return Err(format!("Programme introuvable : {}", path.display()));
    }
    if !path.extension().is_some_and(|e| e.eq_ignore_ascii_case("exe")) {
        return Err(format!("Ce n'est pas un programme (.exe) : {}", path.display()));
    }
    Ok(())
}

/// Démarre un programme, détaché du lanceur.
pub fn spawn(exe: &Path, args: &[&str]) -> crate::Res<()> {
    check_exe(exe)?;
    let mut cmd = Command::new(exe);
    cmd.args(args);
    if let Some(dir) = exe.parent() {
        cmd.current_dir(dir);
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x0000_0008;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x0000_0200;
        cmd.creation_flags(DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP);
    }
    cmd.spawn().map(|_| ()).map_err(|e| format!("Lancement impossible : {e}"))
}

/// Action Clicksy autorisée ?
pub fn clicksy_action_allowed(action: &str) -> bool {
    CLICKSY_ACTIONS.contains(&action)
}

/// Ouvre un dossier dans l'Explorateur Windows (le dossier doit exister).
pub fn open_folder(dir: &Path) -> crate::Res<()> {
    if !dir.is_dir() {
        return Err(format!("Dossier introuvable : {}", dir.display()));
    }
    #[cfg(windows)]
    {
        Command::new("explorer.exe").arg(dir).spawn().map(|_| ()).map_err(|e| e.to_string())
    }
    #[cfg(not(windows))]
    {
        Err("Ouverture de dossier prévue sous Windows".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn actions_clicksy_limitees() {
        assert!(clicksy_action_allowed("video"));
        assert!(clicksy_action_allowed("guide"));
        assert!(!clicksy_action_allowed("tout; del C:\\"));
        assert!(!clicksy_action_allowed(""));
    }

    #[test]
    fn seuls_les_exe_existants_se_lancent() {
        let tmp = tempfile::tempdir().unwrap();
        let txt = tmp.path().join("note.txt");
        std::fs::write(&txt, b"x").unwrap();
        assert!(spawn(&txt, &[]).is_err());
        assert!(spawn(&tmp.path().join("absent.exe"), &[]).is_err());
        assert!(open_folder(&tmp.path().join("absent")).is_err());
    }
}
