//! Safe clean: move selected allowlisted files to the system trash (never permanent delete).

use std::fs;
use std::path::PathBuf;

use crate::allowlist::resolve_allowlisted_roots;
use crate::models::{CleanItemResult, CleanRequest, CleanResult};
use crate::path_security::ensure_under_allowlist;

pub fn clean_items(request: CleanRequest) -> Result<CleanResult, String> {
    if request.paths.is_empty() {
        return Ok(CleanResult {
            dry_run: request.dry_run,
            moved_count: 0,
            skipped_count: 0,
            bytes_freed: 0,
            items: vec![],
        });
    }

    let roots: Vec<PathBuf> = resolve_allowlisted_roots()
        .into_iter()
        .map(|r| r.path)
        .collect();

    if roots.is_empty() {
        return Err("No allowlisted roots available for cleaning.".into());
    }

    let mut items = Vec::new();
    let mut moved_count = 0u64;
    let mut skipped_count = 0u64;
    let mut bytes_freed = 0u64;

    for raw in &request.paths {
        let path = PathBuf::from(raw);

        let safe = match ensure_under_allowlist(&path, &roots) {
            Ok(p) => p,
            Err(e) => {
                skipped_count += 1;
                items.push(CleanItemResult {
                    path: raw.clone(),
                    success: false,
                    skipped: true,
                    message: format!("Rejected by path security: {e}"),
                });
                continue;
            }
        };

        if !safe.is_file() {
            skipped_count += 1;
            items.push(CleanItemResult {
                path: safe.display().to_string(),
                success: false,
                skipped: true,
                message: "Not a regular file or already removed".into(),
            });
            continue;
        }

        let size = fs::metadata(&safe).map(|m| m.len()).unwrap_or(0);

        if request.dry_run {
            moved_count += 1;
            bytes_freed += size;
            items.push(CleanItemResult {
                path: safe.display().to_string(),
                success: true,
                skipped: false,
                message: format!("Dry-run: would move {size} bytes to trash"),
            });
            continue;
        }

        match trash::delete(&safe) {
            Ok(()) => {
                moved_count += 1;
                bytes_freed += size;
                items.push(CleanItemResult {
                    path: safe.display().to_string(),
                    success: true,
                    skipped: false,
                    message: "Moved to recycle bin / trash".into(),
                });
            }
            Err(err) => {
                skipped_count += 1;
                items.push(CleanItemResult {
                    path: safe.display().to_string(),
                    success: false,
                    skipped: true,
                    message: format!("Skipped (locked or in use): {err}"),
                });
            }
        }
    }

    Ok(CleanResult {
        dry_run: request.dry_run,
        moved_count,
        skipped_count,
        bytes_freed,
        items,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn dry_run_does_not_delete_file() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("sample.tmp");
        {
            let mut f = fs::File::create(&file).unwrap();
            writeln!(f, "junk").unwrap();
        }

        // Temporarily rely on path security rejecting outside allowlist —
        // this verifies dry-run path when rejected, and that real temp files survive.
        let result = clean_items(CleanRequest {
            paths: vec![file.display().to_string()],
            dry_run: true,
        })
        .unwrap();

        // File may be skipped (outside OS allowlist) or accepted if under temp dir.
        // In either case dry-run must not remove it.
        assert!(file.exists());
        assert!(result.dry_run);
    }

    #[test]
    fn rejects_path_outside_allowlist() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("not-allowed.bin");
        fs::write(&file, b"x").unwrap();

        // If the tempfile root happens to be under an allowlisted path (e.g. %TEMP%),
        // the clean may succeed as dry-run. Force a clearly external path when possible.
        let outsider = PathBuf::from("C:\\Windows\\System32\\drivers\\etc\\hosts");
        #[cfg(unix)]
        let outsider = PathBuf::from("/etc/hosts");

        if outsider.is_file() {
            let result = clean_items(CleanRequest {
                paths: vec![outsider.display().to_string()],
                dry_run: true,
            })
            .unwrap();
            assert_eq!(result.moved_count, 0);
            assert!(result.skipped_count >= 1);
            assert!(result.items[0].skipped);
        }
    }
}
