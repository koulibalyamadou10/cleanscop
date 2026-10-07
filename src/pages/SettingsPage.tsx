import { useEffect, useState } from "react";

import { getAllowlistedRoots } from "../api/tauri";
import type { ScanRoot, ThemeMode } from "../types";

interface SettingsPageProps {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export function SettingsPage({ theme, onThemeChange }: SettingsPageProps) {
  const [roots, setRoots] = useState<ScanRoot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "(not set)";

  useEffect(() => {
    void getAllowlistedRoots()
      .then(setRoots)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load allowlist"),
      );
  }, []);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Preference and security surface for the PoC.
        </p>
      </header>

      <section className="panel space-y-3 p-5">
        <div className="label">Appearance</div>
        <div className="flex gap-2">
          <button
            type="button"
            className={theme === "light" ? "btn-primary" : "btn-secondary"}
            onClick={() => onThemeChange("light")}
          >
            Light
          </button>
          <button
            type="button"
            className={theme === "dark" ? "btn-primary" : "btn-secondary"}
            onClick={() => onThemeChange("dark")}
          >
            Dark
          </button>
        </div>
      </section>

      <section className="panel space-y-2 p-5">
        <div className="label">API</div>
        <p className="text-sm text-ink-muted">
          Base URL from <code className="font-mono text-xs">VITE_API_BASE_URL</code> (env only, never
          hardcoded in source).
        </p>
        <code className="block rounded-lg bg-surface-muted px-3 py-2 font-mono text-xs">{apiBase}</code>
      </section>

      <section className="panel space-y-2 p-5">
        <div className="label">Allowlisted scan roots</div>
        <p className="text-sm text-ink-muted">
          All filesystem work is constrained to these roots after path canonicalization.
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
        <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-xs font-mono text-ink-muted">
          {roots.map((root) => (
            <li key={root.path} className="truncate" title={root.path}>
              [{root.category}] {root.label}: {root.path}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel space-y-2 p-5 text-sm text-ink-muted">
        <div className="label">Security notes</div>
        <ul className="list-disc space-y-1 pl-5">
          <li>No shell plugin; no broad filesystem plugin from the frontend.</li>
          <li>Clean uses the system trash — never permanent deletion.</li>
          <li>Default clean mode is dry-run and requires confirmation.</li>
          <li>API strings are rendered as text only (no HTML injection).</li>
        </ul>
      </section>
    </div>
  );
}
