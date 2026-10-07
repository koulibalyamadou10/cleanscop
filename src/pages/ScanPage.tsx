import { useEffect, useMemo, useState } from "react";

import { cleanFiles, onScanProgress, startScan } from "../api/tauri";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ProgressBar } from "../components/ProgressBar";
import type { Category, CleanResult, ScanProgress, ScanResult, ScannedItem } from "../types";
import { formatBytes, formatDuration } from "../utils/format";

type SortKey = "size" | "count" | "name";

export function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("size");
  const [dryRun, setDryRun] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void onScanProgress((p) => setProgress(p)).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const categories = useMemo(() => {
    if (!result) return [];
    const list = [...result.categories];
    list.sort((a, b) => {
      if (sortKey === "size") return b.totalBytes - a.totalBytes;
      if (sortKey === "count") return b.fileCount - a.fileCount;
      return a.label.localeCompare(b.label);
    });
    return list;
  }, [result, sortKey]);

  const selectedBytes = useMemo(() => {
    if (!result) return 0;
    const map = new Map<string, ScannedItem>();
    for (const cat of result.categories) {
      for (const item of cat.items) map.set(item.path, item);
    }
    let total = 0;
    for (const path of selected) total += map.get(path)?.sizeBytes ?? 0;
    return total;
  }, [result, selected]);

  async function handleScan() {
    setScanning(true);
    setError(null);
    setCleanResult(null);
    setProgress({ filesScanned: 0, bytesFound: 0, currentFolder: "Starting…", percent: 0 });
    try {
      const scanResult = await startScan();
      setResult(scanResult);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  function togglePath(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function toggleCategory(items: ScannedItem[], checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const item of items) {
        if (checked) next.add(item.path);
        else next.delete(item.path);
      }
      return next;
    });
  }

  async function runClean() {
    setConfirmOpen(false);
    setCleaning(true);
    setError(null);
    try {
      const outcome = await cleanFiles({
        paths: Array.from(selected),
        dryRun,
      });
      setCleanResult(outcome);
      if (!dryRun && result) {
        // Remove successfully cleaned paths from the UI list.
        const removed = new Set(
          outcome.items.filter((i) => i.success && !i.skipped).map((i) => i.path),
        );
        setResult({
          ...result,
          categories: result.categories
            .map((cat) => {
              const items = cat.items.filter((i) => !removed.has(i.path));
              return {
                ...cat,
                items,
                fileCount: items.length,
                totalBytes: items.reduce((sum, i) => sum + i.sizeBytes, 0),
              };
            })
            .filter((c) => c.fileCount > 0),
          filesFound: result.filesFound - removed.size,
        });
        setSelected(new Set());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clean failed");
    } finally {
      setCleaning(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scan</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Allowlisted temp/cache/log folders only. Clean moves to trash — never permanent delete.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="accent-accent"
            />
            Dry-run (default)
          </label>
          <button type="button" className="btn-primary" disabled={scanning} onClick={() => void handleScan()}>
            {scanning ? "Scanning…" : "Start scan"}
          </button>
          <button
            type="button"
            className="btn-danger"
            disabled={selected.size === 0 || scanning || cleaning}
            onClick={() => setConfirmOpen(true)}
          >
            Clean selected
          </button>
        </div>
      </header>

      {(scanning || progress) && (
        <section className="panel space-y-3 p-5">
          <div className="flex flex-wrap gap-4 text-sm">
            <Stat label="Files scanned" value={(progress?.filesScanned ?? 0).toLocaleString()} />
            <Stat label="Bytes found" value={formatBytes(progress?.bytesFound ?? 0)} />
            <Stat label="Current folder" value={progress?.currentFolder ?? "—"} mono />
          </div>
          <ProgressBar value={progress?.percent ?? 0} label="Scan progress" />
        </section>
      )}

      {error && <div className="panel p-4 text-sm text-danger">{error}</div>}

      {cleanResult && (
        <section className="panel p-4 text-sm">
          <div className="font-semibold text-success">
            {cleanResult.dryRun ? "Dry-run complete" : "Clean complete"}
          </div>
          <p className="mt-1 text-ink-muted">
            Moved/would move {cleanResult.movedCount} · skipped {cleanResult.skippedCount} ·{" "}
            {formatBytes(cleanResult.bytesFreed)}
          </p>
          {cleanResult.items.some((i) => i.skipped) && (
            <ul className="mt-2 max-h-32 overflow-auto text-xs text-ink-subtle">
              {cleanResult.items
                .filter((i) => i.skipped)
                .map((i) => (
                  <li key={i.path} className="truncate">
                    {i.path}: {i.message}
                  </li>
                ))}
            </ul>
          )}
        </section>
      )}

      {result && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-ink-muted">
              Found {result.filesFound.toLocaleString()} files · {formatBytes(result.bytesFound)} ·{" "}
              {formatDuration(result.durationMs)} · selected {selected.size} (
              {formatBytes(selectedBytes)})
            </div>
            <label className="text-sm text-ink-muted">
              Sort{" "}
              <select
                className="ml-1 rounded-md border border-border bg-surface-elevated px-2 py-1"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="size">by size</option>
                <option value="count">by count</option>
                <option value="name">by name</option>
              </select>
            </label>
          </div>

          {categories.map((cat) => {
            const allSelected = cat.items.every((i) => selected.has(i.path));
            return (
              <div key={cat.category} className="panel overflow-hidden">
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <input
                    type="checkbox"
                    checked={cat.items.length > 0 && allSelected}
                    onChange={(e) => toggleCategory(cat.items, e.target.checked)}
                    aria-label={`Select all ${cat.label}`}
                  />
                  <div className="flex-1">
                    <div className="font-semibold">{categoryTitle(cat.category)}</div>
                    <div className="text-xs text-ink-subtle">
                      {cat.fileCount} files · {formatBytes(cat.totalBytes)}
                    </div>
                  </div>
                </div>
                <ul className="max-h-56 overflow-auto divide-y divide-border">
                  {cat.items.slice(0, 200).map((item) => (
                    <li key={item.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.has(item.path)}
                        onChange={() => togglePath(item.path)}
                        aria-label={`Select ${item.path}`}
                      />
                      <span className="min-w-0 flex-1 truncate font-mono text-xs" title={item.path}>
                        {item.path}
                      </span>
                      <span className="shrink-0 text-xs text-ink-muted">
                        {formatBytes(item.sizeBytes)}
                      </span>
                    </li>
                  ))}
                  {cat.items.length > 200 && (
                    <li className="px-4 py-2 text-xs text-ink-subtle">
                      Showing first 200 of {cat.items.length} items
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={dryRun ? "Confirm dry-run clean" : "Move files to trash?"}
        message={
          dryRun
            ? `Simulate cleaning ${selected.size} selected item(s) (${formatBytes(selectedBytes)}). No files will be moved.`
            : `Move ${selected.size} selected item(s) (${formatBytes(selectedBytes)}) to the system recycle bin / trash. Locked files will be skipped.`
        }
        confirmLabel={dryRun ? "Run dry-run" : "Move to trash"}
        danger={!dryRun}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void runClean()}
      />
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`mt-1 font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}

function categoryTitle(category: Category): string {
  switch (category) {
    case "temp":
      return "Temp files";
    case "cache":
      return "Cache";
    case "logs":
      return "Logs";
  }
}
