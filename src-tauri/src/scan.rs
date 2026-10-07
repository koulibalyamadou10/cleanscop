//! Allowlisted junk-file scanner with real-time progress events.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Emitter};
use walkdir::WalkDir;

use crate::allowlist::{resolve_allowlisted_roots, Category, ScanRoot};
use crate::models::{CategorySummary, LastScanSummary, ScanProgress, ScanResult, ScannedItem};
use crate::path_security::ensure_under_allowlist;
use crate::state::AppState;

const PROGRESS_EVENT: &str = "scan-progress";
const MAX_FILE_SIZE_HINT: u64 = 512 * 1024 * 1024; // skip reporting huge single files (>512 MiB)

pub fn run_scan(
    app: &AppHandle,
    state: &AppState,
    cancel: Arc<AtomicBool>,
) -> Result<ScanResult, String> {
    let roots = resolve_allowlisted_roots();
    if roots.is_empty() {
        return Err("No allowlisted scan roots were found on this system.".into());
    }

    let allowlist_paths: Vec<PathBuf> = roots.iter().map(|r| r.path.clone()).collect();
    let started = now_ms();
    let mut files_scanned: u64 = 0;
    let mut bytes_found: u64 = 0;
    let mut items: Vec<ScannedItem> = Vec::new();

    let estimated_dirs = estimate_dir_count(&roots).max(1);

    for (idx, root) in roots.iter().enumerate() {
        if cancel.load(Ordering::Relaxed) {
            break;
        }

        // Enforce allowlist on the root itself before walking.
        let canonical_root = match ensure_under_allowlist(&root.path, &allowlist_paths) {
            Ok(p) => p,
            Err(e) => {
                eprintln!("Skipping root {}: {e}", root.path.display());
                continue;
            }
        };

        let walker = WalkDir::new(&canonical_root)
            .follow_links(false)
            .max_depth(8)
            .into_iter()
            .filter_entry(|e| {
                // Never descend into reparse points / symlinks.
                !e.path_is_symlink()
            });

        for entry in walker {
            if cancel.load(Ordering::Relaxed) {
                break;
            }

            let entry = match entry {
                Ok(e) => e,
                Err(_) => continue,
            };

            let path = entry.path();
            if !entry.file_type().is_file() {
                continue;
            }

            // Path security: every discovered file must stay under allowlisted roots.
            let safe_path = match ensure_under_allowlist(path, &allowlist_paths) {
                Ok(p) => p,
                Err(_) => continue,
            };

            let meta = match fs::metadata(&safe_path) {
                Ok(m) => m,
                Err(_) => continue,
            };

            let size = meta.len();
            if size == 0 || size > MAX_FILE_SIZE_HINT {
                files_scanned += 1;
                continue;
            }

            if !is_junk_candidate(&safe_path, root.category) {
                files_scanned += 1;
                continue;
            }

            files_scanned += 1;
            bytes_found += size;

            let modified_ms = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as u64);

            items.push(ScannedItem {
                id: format!("{}:{}", root.category.as_str(), safe_path.display()),
                path: safe_path.display().to_string(),
                category: root.category,
                size_bytes: size,
                modified_ms,
            });

            if files_scanned.is_multiple_of(25) {
                let percent = ((idx as f64 + 1.0) / roots.len() as f64 * 100.0).clamp(0.0, 99.0)
                    * (files_scanned as f64 / (estimated_dirs as f64 * 10.0).max(1.0)).min(1.0);
                let _ = app.emit(
                    PROGRESS_EVENT,
                    ScanProgress {
                        files_scanned,
                        bytes_found,
                        current_folder: parent_display(&safe_path),
                        percent: percent.clamp(0.0, 99.0),
                    },
                );
            }
        }

        let _ = app.emit(
            PROGRESS_EVENT,
            ScanProgress {
                files_scanned,
                bytes_found,
                current_folder: root.path.display().to_string(),
                percent: ((idx as f64 + 1.0) / roots.len() as f64 * 100.0).min(99.0),
            },
        );
    }

    let duration_ms = now_ms().saturating_sub(started);
    let categories = group_by_category(items);
    let files_found: u64 = categories.iter().map(|c| c.file_count).sum();
    let bytes_total: u64 = categories.iter().map(|c| c.total_bytes).sum();

    let result = ScanResult {
        scanned_at: iso_now(),
        duration_ms,
        files_found,
        bytes_found: bytes_total,
        categories,
        roots: roots.iter().map(|r| r.path.display().to_string()).collect(),
    };

    let _ = app.emit(
        PROGRESS_EVENT,
        ScanProgress {
            files_scanned,
            bytes_found: bytes_total,
            current_folder: "Done".into(),
            percent: 100.0,
        },
    );

    state.set_last_scan(LastScanSummary {
        scanned_at: result.scanned_at.clone(),
        files_found: result.files_found,
        bytes_found: result.bytes_found,
        duration_ms: result.duration_ms,
    });
    state.set_last_result(result.clone());

    Ok(result)
}

fn estimate_dir_count(roots: &[ScanRoot]) -> u64 {
    roots.len() as u64 * 50
}

fn parent_display(path: &Path) -> String {
    path.parent()
        .map(|p| p.display().to_string())
        .unwrap_or_else(|| path.display().to_string())
}

fn is_junk_candidate(path: &Path, category: Category) -> bool {
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_lowercase();

    match category {
        Category::Temp => {
            name.ends_with(".tmp")
                || name.ends_with(".temp")
                || name.ends_with(".bak")
                || name.ends_with(".old")
                || name.starts_with("~")
                || name.contains("tmp")
        }
        Category::Cache => {
            name.ends_with(".cache")
                || name.ends_with(".db")
                || name.ends_with(".log")
                || name.contains("cache")
                || path.components().any(|c| {
                    c.as_os_str()
                        .to_string_lossy()
                        .eq_ignore_ascii_case("cache")
                })
        }
        Category::Logs => {
            name.ends_with(".log")
                || name.ends_with(".log.txt")
                || name.ends_with(".out")
                || name.contains("log")
        }
    }
}

fn group_by_category(items: Vec<ScannedItem>) -> Vec<CategorySummary> {
    let mut map: HashMap<Category, Vec<ScannedItem>> = HashMap::new();
    for item in items {
        map.entry(item.category).or_default().push(item);
    }

    let order = [Category::Temp, Category::Cache, Category::Logs];
    order
        .into_iter()
        .filter_map(|category| {
            let items = map.remove(&category)?;
            let file_count = items.len() as u64;
            let total_bytes = items.iter().map(|i| i.size_bytes).sum();
            Some(CategorySummary {
                category,
                label: category.as_str().to_string(),
                file_count,
                total_bytes,
                items,
            })
        })
        .collect()
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn iso_now() -> String {
    // Keep dependency-free: emit epoch millis as string; UI formats it.
    format!("{}", now_ms())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn junk_candidate_detects_temp_extension() {
        assert!(is_junk_candidate(
            Path::new("C:/tmp/foo.tmp"),
            Category::Temp
        ));
        assert!(!is_junk_candidate(
            Path::new("C:/tmp/readme.md"),
            Category::Temp
        ));
    }

    #[test]
    fn junk_candidate_detects_log() {
        assert!(is_junk_candidate(
            Path::new("/var/log/app.log"),
            Category::Logs
        ));
    }
}
