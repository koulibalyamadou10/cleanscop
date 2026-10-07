//! Resolve per-OS allowlisted scan roots (temp / cache / logs) via the `dirs` crate.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Category {
    Temp,
    Cache,
    Logs,
}

impl Category {
    pub fn as_str(self) -> &'static str {
        match self {
            Category::Temp => "Temp files",
            Category::Cache => "Cache",
            Category::Logs => "Logs",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanRoot {
    pub path: PathBuf,
    pub category: Category,
    pub label: String,
}

/// Build the allowlist of folders that may be scanned or cleaned.
/// Only existing directories are returned.
pub fn resolve_allowlisted_roots() -> Vec<ScanRoot> {
    let mut roots = Vec::new();

    // User-scoped process temp directory (resolved by the OS / runtime).
    push_if_dir(
        &mut roots,
        std::env::temp_dir(),
        Category::Temp,
        "User temporary directory",
    );

    if let Some(cache) = dirs::cache_dir() {
        push_if_dir(&mut roots, cache, Category::Cache, "User cache directory");
    }

    // Browser / app cache candidates (exist only if installed / previously used).
    for (path, label) in browser_and_app_cache_candidates() {
        push_if_dir(&mut roots, path, Category::Cache, label);
    }

    for (path, label) in log_candidates() {
        push_if_dir(&mut roots, path, Category::Logs, label);
    }

    dedupe_roots(roots)
}

fn push_if_dir(roots: &mut Vec<ScanRoot>, path: PathBuf, category: Category, label: &str) {
    if path.is_dir() {
        roots.push(ScanRoot {
            path,
            category,
            label: label.to_string(),
        });
    }
}

fn browser_and_app_cache_candidates() -> Vec<(PathBuf, &'static str)> {
    let mut out = Vec::new();

    #[cfg(target_os = "windows")]
    {
        if let Some(local) = dirs::data_local_dir() {
            out.push((
                local
                    .join("Google")
                    .join("Chrome")
                    .join("User Data")
                    .join("Default")
                    .join("Cache"),
                "Chrome cache",
            ));
            out.push((
                local
                    .join("Microsoft")
                    .join("Edge")
                    .join("User Data")
                    .join("Default")
                    .join("Cache"),
                "Edge cache",
            ));
            out.push((
                local.join("Mozilla").join("Firefox").join("Profiles"),
                "Firefox profiles",
            ));
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Some(cache) = dirs::cache_dir() {
            out.push((cache.join("Google").join("Chrome"), "Chrome cache"));
            out.push((cache.join("Microsoft Edge"), "Edge cache"));
            out.push((cache.join("Firefox"), "Firefox cache"));
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Some(home) = dirs::home_dir() {
            out.push((home.join(".cache").join("google-chrome"), "Chrome cache"));
            out.push((home.join(".cache").join("microsoft-edge"), "Edge cache"));
            out.push((
                home.join(".cache").join("mozilla").join("firefox"),
                "Firefox cache",
            ));
        }
    }

    out
}

fn log_candidates() -> Vec<(PathBuf, &'static str)> {
    let mut out = Vec::new();

    #[cfg(target_os = "windows")]
    {
        if let Some(local) = dirs::data_local_dir() {
            out.push((local.join("Temp"), "LocalAppData Temp (logs/temp mix)"));
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Some(home) = dirs::home_dir() {
            out.push((home.join("Library").join("Logs"), "User logs"));
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Some(home) = dirs::home_dir() {
            out.push((home.join(".local").join("share").join("xorg"), "Xorg logs"));
        }
        out.push((PathBuf::from("/var/tmp"), "System var/tmp"));
    }

    out
}

fn dedupe_roots(roots: Vec<ScanRoot>) -> Vec<ScanRoot> {
    let mut seen = std::collections::HashSet::new();
    let mut unique = Vec::new();
    for root in roots {
        let key = root.path.to_string_lossy().to_lowercase();
        if seen.insert(key) {
            unique.push(root);
        }
    }
    unique
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allowlist_contains_temp_dir() {
        let roots = resolve_allowlisted_roots();
        let temp = std::env::temp_dir();
        assert!(
            roots
                .iter()
                .any(|r| r.path == temp || temp.starts_with(&r.path) || r.path.starts_with(&temp)),
            "expected temp dir in allowlist, got {:?}",
            roots.iter().map(|r| r.path.clone()).collect::<Vec<_>>()
        );
    }

    #[test]
    fn categories_are_serializable() {
        let json = serde_json::to_string(&Category::Cache).unwrap();
        assert_eq!(json, "\"cache\"");
    }
}
