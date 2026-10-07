mod allowlist;
mod clean;
mod models;
mod path_security;
mod scan;
mod state;
mod system_info;

use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use tauri::State;

use crate::models::{CleanRequest, CleanResult, ScanResult, SystemInfo};
use crate::state::AppState;

#[tauri::command]
fn get_system_info(state: State<'_, AppState>) -> SystemInfo {
    system_info::collect_system_info(&state)
}

#[tauri::command]
fn get_allowlisted_roots() -> Vec<allowlist::ScanRoot> {
    allowlist::resolve_allowlisted_roots()
}

#[tauri::command]
fn start_scan(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<ScanResult, String> {
    let cancel = Arc::new(AtomicBool::new(false));
    state.set_cancel_flag(cancel.clone());
    scan::run_scan(&app, &state, cancel)
}

#[tauri::command]
fn cancel_scan(state: State<'_, AppState>) {
    state.request_cancel();
}

#[tauri::command]
fn get_last_scan_result(state: State<'_, AppState>) -> Option<ScanResult> {
    state.last_result()
}

#[tauri::command]
fn clean_files(request: CleanRequest) -> Result<CleanResult, String> {
    clean::clean_items(request)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            get_allowlisted_roots,
            start_scan,
            cancel_scan,
            get_last_scan_result,
            clean_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running CleanScope");
}
