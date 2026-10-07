/**
 * Typed IPC layer — the only frontend module that calls Tauri `invoke`.
 */
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type {
  CleanRequest,
  CleanResult,
  ScanProgress,
  ScanResult,
  ScanRoot,
  SystemInfo,
} from "../types";

export async function getSystemInfo(): Promise<SystemInfo> {
  return invoke<SystemInfo>("get_system_info");
}

export async function getAllowlistedRoots(): Promise<ScanRoot[]> {
  return invoke<ScanRoot[]>("get_allowlisted_roots");
}

export async function startScan(): Promise<ScanResult> {
  return invoke<ScanResult>("start_scan");
}

export async function cancelScan(): Promise<void> {
  return invoke("cancel_scan");
}

export async function getLastScanResult(): Promise<ScanResult | null> {
  return invoke<ScanResult | null>("get_last_scan_result");
}

export async function cleanFiles(request: CleanRequest): Promise<CleanResult> {
  return invoke<CleanResult>("clean_files", { request });
}

export function onScanProgress(
  handler: (progress: ScanProgress) => void,
): Promise<UnlistenFn> {
  return listen<ScanProgress>("scan-progress", (event) => {
    handler(event.payload);
  });
}
