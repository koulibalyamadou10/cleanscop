import type { PageId, ThemeMode } from "../types";

const NAV: { id: PageId; label: string; hint: string }[] = [
  { id: "dashboard", label: "Dashboard", hint: "System overview" },
  { id: "scan", label: "Scan", hint: "Find & clean junk" },
  { id: "alerts", label: "Alerts", hint: "Threat feed" },
  { id: "settings", label: "Settings", hint: "Preferences" },
];

interface SidebarProps {
  page: PageId;
  onNavigate: (page: PageId) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export function Sidebar({ page, onNavigate, theme, onToggleTheme }: SidebarProps) {
  return (
    <aside className="flex h-full w-sidebar shrink-0 flex-col border-r border-border bg-surface-elevated px-4 py-5">
      <div className="mb-8 px-2">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">CleanScope</div>
        <p className="mt-1 text-sm text-ink-muted">Endpoint hygiene PoC</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
        {NAV.map((item) => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`rounded-lg px-3 py-2.5 text-left transition ${
                active
                  ? "bg-accent-soft text-accent"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink"
              }`}
            >
              <div className="text-sm font-semibold">{item.label}</div>
              <div className="text-xs opacity-80">{item.hint}</div>
            </button>
          );
        })}
      </nav>

      <button type="button" className="btn-secondary mt-4 w-full" onClick={onToggleTheme}>
        Theme: {theme === "dark" ? "Dark" : "Light"}
      </button>
    </aside>
  );
}
