export type Category = "temp" | "cache" | "logs";

export interface LastScanSummary {
  scannedAt: string;
  filesFound: number;
  bytesFound: number;
  durationMs: number;
}

export interface SystemInfo {
  osName: string;
  osVersion: string;
  diskTotalBytes: number;
  diskUsedBytes: number;
  diskFreeBytes: number;
  lastScan: LastScanSummary | null;
}

export interface ScanProgress {
  filesScanned: number;
  bytesFound: number;
  currentFolder: string;
  percent: number;
}

export interface ScannedItem {
  id: string;
  path: string;
  category: Category;
  sizeBytes: number;
  modifiedMs: number | null;
}

export interface CategorySummary {
  category: Category;
  label: string;
  fileCount: number;
  totalBytes: number;
  items: ScannedItem[];
}

export interface ScanResult {
  scannedAt: string;
  durationMs: number;
  filesFound: number;
  bytesFound: number;
  categories: CategorySummary[];
  roots: string[];
}

export interface CleanRequest {
  paths: string[];
  dryRun: boolean;
}

export interface CleanItemResult {
  path: string;
  success: boolean;
  skipped: boolean;
  message: string;
}

export interface CleanResult {
  dryRun: boolean;
  movedCount: number;
  skippedCount: number;
  bytesFreed: number;
  items: CleanItemResult[];
}

export interface ScanRoot {
  path: string;
  category: Category;
  label: string;
}

export type PageId = "dashboard" | "scan" | "alerts" | "settings";

export type ThemeMode = "light" | "dark";
