//! Noyau commun des applis Learning Suite (Studio, lanceur, plus tard Review).
//!
//! Tout passe par des fichiers JSON lisibles dans `%APPDATA%\Learning Suite\` :
//! - `apps.json`    : l'annuaire — chaque appli de la suite s'y inscrit au démarrage ;
//! - `recents.json` : les modules ouverts récemment, partagés entre les applis ;
//! - `tools.json`   : les outils externes ajoutés par l'utilisateur (« Mes outils ») ;
//! - `settings.json`: réglages communs (ex. emplacement de Clicksy en version portable).
//! Pas de serveur, pas de réseau.

pub mod detect;
pub mod launch;
pub mod projects;
mod store;

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

pub type Res<T> = Result<T, String>;

/// Dossier commun de la suite, injectable pour les tests.
#[derive(Clone, Debug)]
pub struct Suite {
    pub dir: PathBuf,
}

/// Une appli de la suite, telle qu'elle s'inscrit dans l'annuaire.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct AppEntry {
    pub id: String,
    pub name: String,
    pub exe: String,
    pub version: String,
    /// Actions qu'une autre appli peut demander (ex. « open », « new »).
    #[serde(default)]
    pub actions: Vec<String>,
    /// Dernière inscription (millisecondes depuis 1970).
    #[serde(default)]
    pub seen: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Recent {
    pub dir: String,
    pub title: String,
    pub at: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Tool {
    pub id: String,
    pub name: String,
    pub exe: String,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq)]
pub struct Settings {
    /// Chemin de clicksy.exe choisi à la main (version portable).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub clicksy_path: Option<String>,
}

pub const MAX_RECENTS: usize = 20;

pub fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Deux chemins Windows désignent-ils le même dossier ? (majuscules et barres ignorées)
pub fn same_dir(a: &str, b: &str) -> bool {
    let norm = |s: &str| s.replace('/', "\\").trim_end_matches('\\').to_lowercase();
    norm(a) == norm(b)
}

impl Suite {
    /// Emplacement normal : `%APPDATA%\Learning Suite`.
    pub fn default_location() -> Res<Self> {
        let base = dirs::config_dir().ok_or("Dossier %APPDATA% introuvable")?;
        Ok(Suite { dir: base.join("Learning Suite") })
    }

    pub fn at(dir: impl Into<PathBuf>) -> Self {
        Suite { dir: dir.into() }
    }

    fn file(&self, name: &str) -> PathBuf {
        self.dir.join(name)
    }

    // ---------- Annuaire ----------

    pub fn apps(&self) -> Vec<AppEntry> {
        store::read(&self.file("apps.json"))
    }

    /// Inscrit (ou met à jour) une appli dans l'annuaire.
    pub fn register(&self, mut entry: AppEntry) -> Res<()> {
        entry.seen = now_ms();
        store::update(&self.file("apps.json"), |list: &mut Vec<AppEntry>| {
            list.retain(|a| a.id != entry.id);
            list.push(entry.clone());
            list.sort_by(|a, b| a.id.cmp(&b.id));
        })
    }

    pub fn app(&self, id: &str) -> Option<AppEntry> {
        self.apps().into_iter().find(|a| a.id == id)
    }

    // ---------- Récents partagés ----------

    /// Modules récents, du plus récent au plus ancien, sans ceux dont le dossier a disparu.
    pub fn recents(&self) -> Vec<Recent> {
        let list: Vec<Recent> = store::read(&self.file("recents.json"));
        list.into_iter().filter(|r| Path::new(&r.dir).join("project.json").is_file()).collect()
    }

    pub fn push_recent(&self, dir: &str, title: &str) -> Res<()> {
        let entry = Recent { dir: dir.to_string(), title: title.to_string(), at: now_ms() };
        store::update(&self.file("recents.json"), |list: &mut Vec<Recent>| {
            list.retain(|r| !same_dir(&r.dir, dir));
            list.insert(0, entry.clone());
            list.sort_by(|a, b| b.at.cmp(&a.at));
            list.truncate(MAX_RECENTS);
        })
    }

    pub fn forget_recent(&self, dir: &str) -> Res<()> {
        store::update(&self.file("recents.json"), |list: &mut Vec<Recent>| list.retain(|r| !same_dir(&r.dir, dir)))
    }

    // ---------- Mes outils ----------

    pub fn tools(&self) -> Vec<Tool> {
        store::read(&self.file("tools.json"))
    }

    /// Ajoute un outil externe (un .exe choisi par l'utilisateur). Renvoie son identifiant.
    pub fn add_tool(&self, name: &str, exe: &str) -> Res<String> {
        launch::check_exe(Path::new(exe))?;
        let name = name.trim();
        let name = if name.is_empty() {
            Path::new(exe).file_stem().and_then(|s| s.to_str()).unwrap_or("Outil").to_string()
        } else {
            name.to_string()
        };
        let id = format!("t{}", now_ms());
        let tool = Tool { id: id.clone(), name, exe: exe.to_string() };
        store::update(&self.file("tools.json"), |list: &mut Vec<Tool>| {
            list.retain(|t| !same_dir(&t.exe, exe));
            list.push(tool.clone());
        })?;
        Ok(id)
    }

    pub fn remove_tool(&self, id: &str) -> Res<()> {
        store::update(&self.file("tools.json"), |list: &mut Vec<Tool>| list.retain(|t| t.id != id))
    }

    // ---------- Réglages ----------

    pub fn settings(&self) -> Settings {
        store::read(&self.file("settings.json"))
    }

    pub fn set_clicksy_path(&self, path: Option<&str>) -> Res<()> {
        if let Some(p) = path {
            launch::check_exe(Path::new(p))?;
        }
        store::update(&self.file("settings.json"), |s: &mut Settings| s.clicksy_path = path.map(str::to_string))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn suite() -> (tempfile::TempDir, Suite) {
        let tmp = tempfile::tempdir().unwrap();
        let s = Suite::at(tmp.path().join("Learning Suite"));
        (tmp, s)
    }

    fn module(base: &Path, name: &str) -> String {
        let d = base.join(name);
        fs::create_dir_all(&d).unwrap();
        fs::write(d.join("project.json"), "{}").unwrap();
        d.to_string_lossy().to_string()
    }

    #[test]
    fn annuaire_inscription_et_mise_a_jour() {
        let (_t, s) = suite();
        let studio = AppEntry { id: "studio".into(), name: "Studio".into(), exe: "C:\\a\\studio.exe".into(), version: "0.3.0".into(), actions: vec!["open".into()], seen: 0 };
        s.register(studio.clone()).unwrap();
        s.register(AppEntry { version: "0.4.0".into(), ..studio }).unwrap();
        let apps = s.apps();
        assert_eq!(apps.len(), 1);
        assert_eq!(apps[0].version, "0.4.0");
        assert!(apps[0].seen > 0);
    }

    #[test]
    fn recents_sans_doublon_ni_dossier_disparu() {
        let (t, s) = suite();
        let a = module(t.path(), "a");
        let b = module(t.path(), "b");
        s.push_recent(&a, "A").unwrap();
        s.push_recent(&b, "B").unwrap();
        s.push_recent(&a.to_uppercase(), "A bis").unwrap(); // même dossier, autre écriture
        let r = s.recents();
        assert_eq!(r.iter().map(|x| x.title.as_str()).collect::<Vec<_>>(), vec!["A bis", "B"]);
        fs::remove_file(Path::new(&b).join("project.json")).unwrap();
        assert_eq!(s.recents().len(), 1);
    }

    #[test]
    fn recents_limites_a_20() {
        let (t, s) = suite();
        for i in 0..25 {
            let d = module(t.path(), &format!("m{i}"));
            s.push_recent(&d, &format!("M{i}")).unwrap();
        }
        assert_eq!(s.recents().len(), MAX_RECENTS);
    }

    #[test]
    fn fichier_abime_ne_bloque_rien() {
        let (_t, s) = suite();
        fs::create_dir_all(&s.dir).unwrap();
        fs::write(s.dir.join("recents.json"), "{pas du json").unwrap();
        assert!(s.recents().is_empty());
        let (t2, _) = suite();
        let d = module(t2.path(), "x");
        s.push_recent(&d, "X").unwrap(); // réécrit proprement
        assert_eq!(s.recents().len(), 1);
    }

    #[test]
    fn outils_ajout_et_retrait_avec_controle() {
        let (t, s) = suite();
        let exe = t.path().join("Krita.exe");
        fs::write(&exe, b"MZ").unwrap();
        let id = s.add_tool("", exe.to_str().unwrap()).unwrap();
        assert_eq!(s.tools()[0].name, "Krita");
        assert!(s.add_tool("Faux", t.path().join("nexiste.exe").to_str().unwrap()).is_err());
        let txt = t.path().join("note.txt");
        fs::write(&txt, b"x").unwrap();
        assert!(s.add_tool("Texte", txt.to_str().unwrap()).is_err());
        s.remove_tool(&id).unwrap();
        assert!(s.tools().is_empty());
    }
}
