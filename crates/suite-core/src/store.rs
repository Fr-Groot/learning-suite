//! Lecture et écriture sûres des fichiers JSON de la suite.
//! Écriture dans un fichier temporaire puis remplacement : jamais de fichier à moitié écrit,
//! même si Studio et le lanceur écrivent en même temps. Un fichier abîmé est traité comme vide.

use serde::{de::DeserializeOwned, Serialize};
use std::fs;
use std::io::Write;
use std::path::Path;

pub fn read<T: DeserializeOwned + Default>(path: &Path) -> T {
    fs::read_to_string(path).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}

pub fn write<T: Serialize>(path: &Path, value: &T) -> crate::Res<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Dossier de la suite impossible à créer : {e}"))?;
    }
    let json = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
    // Nom temporaire propre à ce processus : deux applis n'écrivent jamais le même fichier temporaire.
    let tmp = path.with_extension(format!("tmp{}", std::process::id()));
    {
        let mut f = fs::File::create(&tmp).map_err(|e| format!("Écriture impossible : {e}"))?;
        f.write_all(json.as_bytes()).map_err(|e| format!("Écriture impossible : {e}"))?;
        f.sync_all().ok();
    }
    // Sous Windows, un autre programme peut lire le fichier au même instant : on réessaie un peu.
    let mut last = String::new();
    for _ in 0..10 {
        match fs::rename(&tmp, path) {
            Ok(()) => return Ok(()),
            Err(e) => {
                last = e.to_string();
                std::thread::sleep(std::time::Duration::from_millis(20));
            }
        }
    }
    let _ = fs::remove_file(&tmp);
    Err(format!("Remplacement impossible : {last}"))
}

/// Lit, modifie, réécrit.
pub fn update<T: Serialize + DeserializeOwned + Default>(path: &Path, change: impl FnOnce(&mut T)) -> crate::Res<()> {
    let mut value: T = read(path);
    change(&mut value);
    write(path, &value)
}
