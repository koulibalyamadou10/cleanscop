import { useAlerts } from "../hooks/useAlerts";
import { formatTimestamp } from "../utils/format";

const severityClass: Record<string, string> = {
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  critical: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export function AlertsPage() {
  const { state, refresh } = useAlerts(true);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Polled every 30s from the REST API (zod-validated).
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => void refresh()}>
          Refresh now
        </button>
      </header>

      {state.status === "loading" && (
        <div className="panel p-5 text-sm text-ink-muted">Loading alerts…</div>
      )}

      {state.status === "offline" && (
        <div className="panel border-amber-400/40 p-5 text-sm text-amber-700 dark:text-amber-300">
          Offline or API unreachable. Start the mock backend (`mock-backend`) or check{" "}
          <code className="font-mono text-xs">VITE_API_BASE_URL</code>.
          <div className="mt-1 text-xs opacity-80">{state.error}</div>
        </div>
      )}

      {state.status === "error" && (
        <div className="panel p-5 text-sm text-danger">
          Failed to load alerts: {state.error}
        </div>
      )}

      {state.status === "ok" && (
        <>
          <div className="text-xs text-ink-subtle">
            Generated at {formatTimestamp(state.data.generatedAt)} · {state.data.alerts.length} alert(s)
          </div>
          <ul className="space-y-3">
            {state.data.alerts.map((alert) => (
              <li key={alert.id} className="panel p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${severityClass[alert.severity] ?? ""}`}
                  >
                    {alert.severity}
                  </span>
                  <span className="text-sm font-semibold">{alert.title}</span>
                  <span className="ml-auto text-xs text-ink-subtle">
                    {formatTimestamp(alert.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-muted">{alert.message}</p>
                {alert.source ? (
                  <p className="mt-1 text-xs text-ink-subtle">Source: {alert.source}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
