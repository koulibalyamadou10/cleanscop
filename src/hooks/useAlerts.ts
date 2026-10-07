import { useCallback, useEffect, useRef, useState } from "react";
import { ZodError } from "zod";

import { fetchAlerts, type AlertsFetchState } from "../api/alerts";

const POLL_MS = 30_000;

export function useAlerts(enabled: boolean) {
  const [state, setState] = useState<AlertsFetchState>({ status: "loading" });
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => (prev.status === "ok" ? prev : { status: "loading" }));

    try {
      const data = await fetchAlerts(controller.signal);
      if (!controller.signal.aborted) {
        setState({ status: "ok", data });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Unknown error";
      const offline =
        err instanceof TypeError ||
        message.toLowerCase().includes("failed to fetch") ||
        message.toLowerCase().includes("network");
      if (err instanceof ZodError) {
        setState({ status: "error", error: "Invalid alerts payload from API (zod validation failed)." });
      } else if (offline) {
        setState({ status: "offline", error: message });
      } else {
        setState({ status: "error", error: message });
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => {
      window.clearInterval(id);
      abortRef.current?.abort();
    };
  }, [enabled, load]);

  return { state, refresh: load };
}
