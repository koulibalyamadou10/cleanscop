use std::sync::Mutex;

use crate::models::{LastScanSummary, ScanResult};

#[derive(Default)]
pub struct AppState {
    last_scan: Mutex<Option<LastScanSummary>>,
    last_result: Mutex<Option<ScanResult>>,
    cancel_scan: Mutex<Option<std::sync::Arc<std::sync::atomic::AtomicBool>>>,
}

impl AppState {
    pub fn last_scan(&self) -> Option<LastScanSummary> {
        self.last_scan.lock().ok().and_then(|g| g.clone())
    }

    pub fn set_last_scan(&self, summary: LastScanSummary) {
        if let Ok(mut g) = self.last_scan.lock() {
            *g = Some(summary);
        }
    }

    pub fn last_result(&self) -> Option<ScanResult> {
        self.last_result.lock().ok().and_then(|g| g.clone())
    }

    pub fn set_last_result(&self, result: ScanResult) {
        if let Ok(mut g) = self.last_result.lock() {
            *g = Some(result);
        }
    }

    pub fn set_cancel_flag(&self, flag: std::sync::Arc<std::sync::atomic::AtomicBool>) {
        if let Ok(mut g) = self.cancel_scan.lock() {
            *g = Some(flag);
        }
    }

    pub fn request_cancel(&self) {
        if let Ok(g) = self.cancel_scan.lock() {
            if let Some(flag) = g.as_ref() {
                flag.store(true, std::sync::atomic::Ordering::Relaxed);
            }
        }
    }
}
