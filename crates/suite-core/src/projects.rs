//! Les modules connus : récents + ceux rangés dans `Documents\Learning Suite\`.
//! Pour chacun : de quoi afficher une carte (titre, format, langue, pages, date, miniature).

use crate::{same_dir, Suite};
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Clone)]
pub struct ModuleCard {
    pub dir: String,
    pub title: String,
    pub mode: String,
    pub language: String,
    pub pages: usize,
    /// Dernière modification de project.json (ms depuis 1970).
    pub modified: u64,
    /// Ouvert récemment (dans Studio ou le lanceur).
    pub recent: bool,
    /// Ce qu'il faut pour dessiner la miniature : thème, mode, première page.
    pub preview: Value,
}

/// Dossier proposé par défaut pour ranger les modules.
pub fn default_projects_dir() -> Option<PathBuf> {
    dirs::document_dir().map(|d| d.join("Learning Suite"))
}

/// Lit la carte d'un module ; None si ce n'est pas un module lisible.
pub fn card(dir: &Path, recent: bool) -> Option<ModuleCard> {
    let file = dir.join("project.json");
    let text = fs::read_to_string(&file).ok()?;
    let p: Value = serde_json::from_str(&text).ok()?;
    let pages = p.get("pages")?.as_array()?;
    let s = |v: &Value| v.as_str().unwrap_or("").to_string();
    let modified = fs::metadata(&file)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    let preview = serde_json::json!({
        "schemaVersion": p.get("schemaVersion").cloned().unwrap_or(Value::Null),
        "meta": p.get("meta").cloned().unwrap_or(Value::Null),
        "mode": p.get("mode").cloned().unwrap_or(Value::Null),
        "theme": p.get("theme").cloned().unwrap_or(Value::Null),
        "navigation": p.get("navigation").cloned().unwrap_or(Value::Null),
        "scoring": p.get("scoring").cloned().unwrap_or(Value::Null),
        "pages": pages.first().map(|f| vec![f.clone()]).unwrap_or_default(),
    });
    Some(ModuleCard {
        dir: dir.to_string_lossy().to_string(),
        title: s(&p["meta"]["title"]),
        mode: s(&p["mode"]),
        language: s(&p["meta"]["language"]),
        pages: pages.len(),
        modified,
        recent,
        preview,
    })
}

/// Modules dans un dossier (un niveau : chaque sous-dossier contenant un project.json).
pub fn scan(base: &Path) -> Vec<ModuleCard> {
    let Ok(entries) = fs::read_dir(base) else { return vec![] };
    entries
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .filter_map(|e| card(&e.path(), false))
        .collect()
}

/// Récents d'abord (dans leur ordre), puis les autres modules du dossier, du plus récent au plus ancien.
pub fn all_modules(suite: &Suite, base: Option<&Path>) -> Vec<ModuleCard> {
    let mut out: Vec<ModuleCard> = suite.recents().iter().filter_map(|r| card(Path::new(&r.dir), true)).collect();
    if let Some(base) = base {
        let mut others: Vec<ModuleCard> = scan(base).into_iter().filter(|c| !out.iter().any(|r| same_dir(&r.dir, &c.dir))).collect();
        others.sort_by(|a, b| b.modified.cmp(&a.modified));
        out.extend(others);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write_module(base: &Path, name: &str, title: &str) -> PathBuf {
        let d = base.join(name);
        fs::create_dir_all(&d).unwrap();
        let p = serde_json::json!({ "schemaVersion": "1.3", "meta": { "title": title, "language": "fr" }, "mode": "slides",
          "theme": {}, "pages": [{ "id": "p1", "title": "Accueil", "blocks": [] }, { "id": "p2", "title": "B", "blocks": [] }] });
        fs::write(d.join("project.json"), p.to_string()).unwrap();
        d
    }

    #[test]
    fn carte_et_dossiers_ignores() {
        let tmp = tempfile::tempdir().unwrap();
        write_module(tmp.path(), "un", "Module un");
        fs::create_dir_all(tmp.path().join("vide")).unwrap();
        fs::create_dir_all(tmp.path().join("abime")).unwrap();
        fs::write(tmp.path().join("abime").join("project.json"), "{oups").unwrap();
        let cards = scan(tmp.path());
        assert_eq!(cards.len(), 1);
        assert_eq!(cards[0].title, "Module un");
        assert_eq!(cards[0].pages, 2);
        assert_eq!(cards[0].preview["pages"].as_array().unwrap().len(), 1, "seulement la 1re page pour la miniature");
    }

    #[test]
    fn recents_puis_dossier_sans_doublon() {
        let tmp = tempfile::tempdir().unwrap();
        let suite = Suite::at(tmp.path().join("suite"));
        let base = tmp.path().join("Learning Suite");
        let a = write_module(&base, "a", "A");
        write_module(&base, "b", "B");
        let ailleurs = write_module(tmp.path(), "ailleurs", "Ailleurs");
        suite.push_recent(ailleurs.to_str().unwrap(), "Ailleurs").unwrap();
        suite.push_recent(a.to_str().unwrap(), "A").unwrap();
        let titles: Vec<String> = all_modules(&suite, Some(&base)).into_iter().map(|c| format!("{}{}", c.title, if c.recent { "*" } else { "" })).collect();
        assert_eq!(titles, vec!["A*", "Ailleurs*", "B"]);
    }
}
