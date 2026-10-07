import { useEffect, useState } from "react";

import { getSystemInfo } from "../api/tauri";
import { ProgressBar } from "../components/ProgressBar";
import type { SystemInfo } from "../types";
import { formatBytes, formatDuration, formatTimestamp, percentUsed } from "../utils/format";

export function DashboardPage() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getSystemInfo();
        if (!cancelled) setInfo(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load system info");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="panel p-6 text-sm text-danger">
        Could not load dashboard: {error}
      </div>
    );
  }

  if (!info) {
    return <div className="panel p-6 text-sm text-ink-muted">Loading system overview…</div>;
  }

  const usedPct = percentUsed(info.diskUsedBytes, info.diskTotalBytes);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Host health snapshot for endpoint hygiene demos.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="panel p-5">
          <div className="label">Operating system</div>
          <div className="mt-2 text-lg font-semibold">{info.osName}</div>
          <div className="text-sm text-ink-muted">Version {info.osVersion}</div>
        </section>

        <section className="panel p-5">
          <div className="label">Disk usage</div>
          <div className="mt-2 text-lg font-semibold">
            {formatBytes(info.diskUsedBytes)} / {formatBytes(info.diskTotalBytes)}
          </div>
          <div className="mt-3">
            <ProgressBar value={usedPct} label={`Free ${formatBytes(info.diskFreeBytes)}`} />
          </div>
        </section>
      </div>

      <section className="panel p-5">
        <div className="label">Last scan summary</div>
        {info.lastScan ? (
          <dl className="mt-3 grid gap-3 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-subtle">When</dt>
              <dd className="text-sm font-medium">{formatTimestamp(info.lastScan.scannedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-subtle">Files</dt>
              <dd className="text-sm font-medium">{info.lastScan.filesFound.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-subtle">Size</dt>
              <dd className="text-sm font-medium">{formatBytes(info.lastScan.bytesFound)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-subtle">Duration</dt>
              <dd className="text-sm font-medium">{formatDuration(info.lastScan.durationMs)}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">No scan yet. Run a scan from the Scan page.</p>
        )}
      </section>
    </div>
  );
}
