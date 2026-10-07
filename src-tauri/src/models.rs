use serde::{Deserialize, Serialize};

use crate::allowlist::Category;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub os_name: String,
    pub os_version: String,
    pub disk_total_bytes: u64,
    pub disk_used_bytes: u64,
    pub disk_free_bytes: u64,
    pub last_scan: Option<LastScanSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LastScanSummary {
    pub scanned_at: String,
    pub files_found: u64,
    pub bytes_found: u64,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    pub files_scanned: u64,
    pub bytes_found: u64,
    pub current_folder: String,
    pub percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScannedItem {
    pub id: String,
    pub path: String,
    pub category: Category,
    pub size_bytes: u64,
    pub modified_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategorySummary {
    pub category: Category,
    pub label: String,
    pub file_count: u64,
    pub total_bytes: u64,
    pub items: Vec<ScannedItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub scanned_at: String,
    pub duration_ms: u64,
    pub files_found: u64,
    pub bytes_found: u64,
    pub categories: Vec<CategorySummary>,
    pub roots: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanRequest {
    pub paths: Vec<String>,
    /// When true, validate only and report what would be cleaned.
    pub dry_run: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanItemResult {
    pub path: String,
    pub success: bool,
    pub skipped: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanResult {
    pub dry_run: bool,
    pub moved_count: u64,
    pub skipped_count: u64,
    pub bytes_freed: u64,
    pub items: Vec<CleanItemResult>,
}
