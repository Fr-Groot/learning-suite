//! Accès disque de Studio : un projet = un dossier avec project.json + media/.
//! L'interface ne peut faire que ces opérations-là, et jamais hors du dossier du projet.

use std::fs;
use std::io::Write;
use std::path::{Component, Path, PathBuf};

pub type Res<T> = Result<T, String>;

/// Extensions de médias acceptées à l'import.
const MEDIA_EXT: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "webp", "svg", "mp3", "wav", "m4a", "ogg", "mp4", "webm", "vtt", "html", "htm",
];
/// Fichiers déjà compressés : inutile de les recompresser dans le zip.
const STORED_EXT: &[&str] = &["png", "jpg", "jpeg", "gif", "webp", "mp3", "m4a", "ogg", "mp4", "webm"];

fn err(context: &str, e: impl std::fmt::Display) -> String {
    format!("{context} : {e}")
}

/// Chemin relatif sûr : « media/… », sans « .. » ni chemin absolu.
fn safe_media_path(rel: &str) -> Res<PathBuf> {
    let p = Path::new(rel);
    let ok = rel.starts_with("media/")
        && p.components().all(|c| matches!(c, Component::Normal(_)));
    if ok { Ok(p.to_path_buf()) } else { Err(format!("Chemin de média refusé : {rel}")) }
}

pub fn read(dir: &Path) -> Res<String> {
    fs::read_to_string(dir.join("project.json")).map_err(|e| err("Impossible de lire project.json", e))
}

/// Écrit project.json sans risque : fichier temporaire, puis remplacement.
/// Si le PC s'éteint pendant l'écriture, l'ancien fichier reste intact.
pub fn save(dir: &Path, json: &str) -> Res<()> {
    serde_json::from_str::<serde_json::Value>(json).map_err(|e| err("Projet illisible, enregistrement annulé", e))?;
    if !dir.is_dir() {
        return Err(format!("Dossier du projet introuvable : {}", dir.display()));
    }
    fs::create_dir_all(dir.join("media")).map_err(|e| err("Impossible de créer media/", e))?;
    let tmp = dir.join("project.json.tmp");
    {
        let mut f = fs::File::create(&tmp).map_err(|e| err("Écriture impossible", e))?;
        f.write_all(json.as_bytes()).map_err(|e| err("Écriture impossible", e))?;
        f.sync_all().map_err(|e| err("Écriture impossible", e))?;
    }
    fs::rename(&tmp, dir.join("project.json")).map_err(|e| err("Remplacement impossible", e))
}

/// Crée un nouveau projet. Le dossier doit être neuf ou vide (on n'écrase rien).
pub fn create(dir: &Path, json: &str) -> Res<()> {
    if dir.exists() && fs::read_dir(dir).map_err(|e| err("Dossier illisible", e))?.next().is_some() {
        return Err(format!("Le dossier n'est pas vide : {}", dir.display()));
    }
    fs::create_dir_all(dir).map_err(|e| err("Impossible de créer le dossier", e))?;
    save(dir, json)
}

/// Nom de fichier simple : « Photo équipe (1).JPG » → « photo-equipe-1.jpg ».
pub fn safe_file_name(name: &str) -> (String, String) {
    let path = Path::new(name);
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("fichier");
    let mut out = String::new();
    for c in stem.chars() {
        let c = match c {
            'à' | 'â' | 'ä' | 'À' | 'Â' | 'Ä' => 'a',
            'é' | 'è' | 'ê' | 'ë' | 'É' | 'È' | 'Ê' | 'Ë' => 'e',
            'î' | 'ï' | 'Î' | 'Ï' => 'i',
            'ô' | 'ö' | 'Ô' | 'Ö' => 'o',
            'ù' | 'û' | 'ü' | 'Ù' | 'Û' | 'Ü' => 'u',
            'ç' | 'Ç' => 'c',
            c => c,
        };
        if c.is_ascii_alphanumeric() {
            out.push(c.to_ascii_lowercase());
        } else if !out.ends_with('-') {
            out.push('-');
        }
    }
    let stem = out.trim_matches('-');
    let stem = if stem.is_empty() { "fichier" } else { stem };
    (stem.chars().take(60).collect(), ext)
}

/// Copie un fichier du PC dans media/ et renvoie son chemin dans le projet (« media/… »).
pub fn import_media(dir: &Path, source: &Path) -> Res<String> {
    if !source.is_file() {
        return Err(format!("Fichier introuvable : {}", source.display()));
    }
    let name = source.file_name().and_then(|n| n.to_str()).unwrap_or("fichier");
    let (stem, ext) = safe_file_name(name);
    if !MEDIA_EXT.contains(&ext.as_str()) {
        return Err(format!("Type de fichier non accepté : .{ext}"));
    }
    let media = dir.join("media");
    fs::create_dir_all(&media).map_err(|e| err("Impossible de créer media/", e))?;
    let mut candidate = format!("{stem}.{ext}");
    let mut n = 2;
    while media.join(&candidate).exists() {
        candidate = format!("{stem}-{n}.{ext}");
        n += 1;
    }
    fs::copy(source, media.join(&candidate)).map_err(|e| err("Copie impossible", e))?;
    Ok(format!("media/{candidate}"))
}

/// Liste des fichiers de media/ (chemins « media/… »), sous-dossiers compris.
pub fn list_media(dir: &Path) -> Res<Vec<String>> {
    fn walk(abs: &Path, rel: &str, out: &mut Vec<String>) -> Res<()> {
        for entry in fs::read_dir(abs).map_err(|e| err("Dossier illisible", e))? {
            let entry = entry.map_err(|e| err("Dossier illisible", e))?;
            let name = entry.file_name().to_string_lossy().to_string();
            if matches!(name.as_str(), "Thumbs.db" | "desktop.ini" | ".DS_Store") {
                continue;
            }
            let r = format!("{rel}/{name}");
            if entry.path().is_dir() { walk(&entry.path(), &r, out)?; } else { out.push(r); }
        }
        Ok(())
    }
    let mut out = Vec::new();
    let media = dir.join("media");
    if media.is_dir() {
        walk(&media, "media", &mut out)?;
    }
    out.sort();
    Ok(out)
}

/// Écrit le paquet zip : fichiers texte fournis par l'interface + médias lus sur le disque.
pub fn export_zip(dir: &Path, out: &Path, texts: &[(String, String)], media: &[String]) -> Res<u64> {
    if out.extension().and_then(|e| e.to_str()).map(|e| e.eq_ignore_ascii_case("zip")) != Some(true) {
        return Err("L'export doit être un fichier .zip".into());
    }
    let file = fs::File::create(out).map_err(|e| err("Impossible de créer le fichier", e))?;
    let mut zip = zip::ZipWriter::new(file);
    let deflate = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    let stored = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);
    for (name, content) in texts {
        if name.contains("..") || name.starts_with('/') || name.contains('\\') {
            return Err(format!("Nom refusé : {name}"));
        }
        zip.start_file(name.as_str(), deflate).map_err(|e| err("Zip", e))?;
        zip.write_all(content.as_bytes()).map_err(|e| err("Zip", e))?;
    }
    for rel in media {
        let path = safe_media_path(rel)?;
        let bytes = fs::read(dir.join(&path)).map_err(|e| err(&format!("Média illisible ({rel})"), e))?;
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
        let opts = if STORED_EXT.contains(&ext.as_str()) { stored } else { deflate };
        zip.start_file(rel.as_str(), opts).map_err(|e| err("Zip", e))?;
        zip.write_all(&bytes).map_err(|e| err("Zip", e))?;
    }
    zip.finish().map_err(|e| err("Zip", e))?;
    Ok(fs::metadata(out).map(|m| m.len()).unwrap_or(0))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creation_puis_enregistrement_sur() {
        let tmp = tempfile::tempdir().unwrap();
        let dir = tmp.path().join("module");
        create(&dir, r#"{"a":1}"#).unwrap();
        assert!(dir.join("media").is_dir());
        save(&dir, r#"{"a":2}"#).unwrap();
        assert_eq!(read(&dir).unwrap(), r#"{"a":2}"#);
        assert!(!dir.join("project.json.tmp").exists());
        // JSON abîmé : refusé, l'ancien fichier reste intact
        assert!(save(&dir, "{pas du json").is_err());
        assert_eq!(read(&dir).unwrap(), r#"{"a":2}"#);
        // On n'écrase jamais un dossier qui contient déjà quelque chose
        assert!(create(&dir, "{}").is_err());
    }

    #[test]
    fn import_de_media_avec_nom_sur_et_unique() {
        let tmp = tempfile::tempdir().unwrap();
        let src = tmp.path().join("Photo équipe (1).JPG");
        fs::write(&src, b"x").unwrap();
        let dir = tmp.path().join("p");
        fs::create_dir_all(&dir).unwrap();
        assert_eq!(import_media(&dir, &src).unwrap(), "media/photo-equipe-1.jpg");
        assert_eq!(import_media(&dir, &src).unwrap(), "media/photo-equipe-1-2.jpg");
        let exe = tmp.path().join("virus.exe");
        fs::write(&exe, b"x").unwrap();
        assert!(import_media(&dir, &exe).is_err());
        assert_eq!(list_media(&dir).unwrap(), vec!["media/photo-equipe-1-2.jpg", "media/photo-equipe-1.jpg"]);
    }

    #[test]
    fn export_refuse_les_chemins_hors_du_projet() {
        let tmp = tempfile::tempdir().unwrap();
        let out = tmp.path().join("paquet.zip");
        let texts = vec![("index.html".to_string(), "<p>ok</p>".to_string())];
        assert!(export_zip(tmp.path(), &out, &texts, &["media/../../secret.txt".to_string()]).is_err());
        assert!(export_zip(tmp.path(), &out, &[("../x".into(), "".into())], &[]).is_err());
        assert!(export_zip(tmp.path(), &tmp.path().join("paquet.exe"), &texts, &[]).is_err());
        assert!(export_zip(tmp.path(), &out, &texts, &[]).unwrap() > 0);
    }
}
