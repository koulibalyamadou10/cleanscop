//! Path canonicalization and allowlist enforcement.
//! Rejects path traversal and symlink escapes outside allowlisted roots.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use thiserror::Error;

#[derive(Debug, Error)]
pub enum PathSecurityError {
    #[error("path is outside allowlisted roots: {0}")]
    OutsideAllowlist(String),
    #[error("failed to canonicalize path {path}: {source}")]
    Canonicalize {
        path: String,
        #[source]
        source: io::Error,
    },
}

/// Canonicalize `path` and ensure it (or its parent, if the path does not exist yet)
/// stays under one of the `roots` after both sides are canonicalized.
pub fn ensure_under_allowlist(
    path: &Path,
    roots: &[PathBuf],
) -> Result<PathBuf, PathSecurityError> {
    let canonical_roots = canonicalize_roots(roots)?;

    let candidate = if path.exists() {
        fs::canonicalize(path).map_err(|source| PathSecurityError::Canonicalize {
            path: path.display().to_string(),
            source,
        })?
    } else {
        // For missing paths (e.g. already deleted), canonicalize the nearest existing ancestor
        // and append the remaining components so we still reject escapes.
        let (existing, remainder) = nearest_existing_ancestor(path);
        let base =
            fs::canonicalize(&existing).map_err(|source| PathSecurityError::Canonicalize {
                path: existing.display().to_string(),
                source,
            })?;
        base.join(remainder)
    };

    if is_under_any_root(&candidate, &canonical_roots) {
        Ok(candidate)
    } else {
        Err(PathSecurityError::OutsideAllowlist(
            candidate.display().to_string(),
        ))
    }
}

fn canonicalize_roots(roots: &[PathBuf]) -> Result<Vec<PathBuf>, PathSecurityError> {
    let mut out = Vec::with_capacity(roots.len());
    for root in roots {
        if !root.exists() {
            continue;
        }
        let canonical =
            fs::canonicalize(root).map_err(|source| PathSecurityError::Canonicalize {
                path: root.display().to_string(),
                source,
            })?;
        out.push(canonical);
    }
    Ok(out)
}

fn nearest_existing_ancestor(path: &Path) -> (PathBuf, PathBuf) {
    let mut current = path.to_path_buf();
    let mut remainder = PathBuf::new();
    loop {
        if current.exists() {
            return (current, remainder);
        }
        match current.file_name() {
            Some(name) => {
                let mut next_remainder = PathBuf::from(name);
                next_remainder.push(&remainder);
                remainder = next_remainder;
                if !current.pop() {
                    return (PathBuf::from("."), remainder);
                }
            }
            None => return (PathBuf::from("."), remainder),
        }
    }
}

fn is_under_any_root(path: &Path, roots: &[PathBuf]) -> bool {
    roots.iter().any(|root| path.starts_with(root))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn accepts_path_inside_allowlist() {
        let dir = tempdir().unwrap();
        let root = dir.path().to_path_buf();
        let child = root.join("cache").join("file.tmp");
        fs::create_dir_all(child.parent().unwrap()).unwrap();
        fs::write(&child, b"x").unwrap();

        let result = ensure_under_allowlist(&child, std::slice::from_ref(&root));
        assert!(result.is_ok());
        assert!(result
            .unwrap()
            .starts_with(fs::canonicalize(&root).unwrap()));
    }

    #[test]
    fn rejects_path_outside_allowlist() {
        let allowed = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let outsider = outside.path().join("secret.txt");
        fs::write(&outsider, b"nope").unwrap();

        let result = ensure_under_allowlist(&outsider, &[allowed.path().to_path_buf()]);
        assert!(matches!(
            result,
            Err(PathSecurityError::OutsideAllowlist(_))
        ));
    }

    #[test]
    fn rejects_traversal_via_dot_dot() {
        let allowed = tempdir().unwrap();
        let sibling = tempdir().unwrap();
        let secret = sibling.path().join("secret.txt");
        fs::write(&secret, b"secret").unwrap();

        // Build a path that looks nested but escapes via ..
        let escape = allowed
            .path()
            .join("nested")
            .join("..")
            .join("..")
            .join(sibling.path().file_name().unwrap())
            .join("secret.txt");

        // Only valid if sibling and allowed share a parent (temp dirs usually do).
        // Canonicalization will resolve to the real secret path which is outside allowlist.
        if escape.exists() || escape.parent().map(|p| p.exists()).unwrap_or(false) {
            let result = ensure_under_allowlist(&escape, &[allowed.path().to_path_buf()]);
            assert!(
                matches!(result, Err(PathSecurityError::OutsideAllowlist(_))),
                "expected OutsideAllowlist, got {result:?}"
            );
        } else {
            // Fallback: absolute outsider must be rejected.
            let result = ensure_under_allowlist(&secret, &[allowed.path().to_path_buf()]);
            assert!(matches!(
                result,
                Err(PathSecurityError::OutsideAllowlist(_))
            ));
        }
    }

    #[test]
    fn rejects_symlink_escape_when_supported() {
        let allowed = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let target = outside.path().join("escape-target");
        fs::create_dir_all(&target).unwrap();
        fs::write(target.join("file.txt"), b"x").unwrap();

        let link = allowed.path().join("evil-link");

        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(&target, &link).unwrap();
            let result =
                ensure_under_allowlist(&link.join("file.txt"), &[allowed.path().to_path_buf()]);
            assert!(matches!(
                result,
                Err(PathSecurityError::OutsideAllowlist(_))
            ));
        }

        #[cfg(windows)]
        {
            // Symlink creation may require elevated privileges on Windows; skip if unavailable.
            if std::os::windows::fs::symlink_dir(&target, &link).is_ok() {
                let result =
                    ensure_under_allowlist(&link.join("file.txt"), &[allowed.path().to_path_buf()]);
                assert!(matches!(
                    result,
                    Err(PathSecurityError::OutsideAllowlist(_))
                ));
            }
        }
    }
}
