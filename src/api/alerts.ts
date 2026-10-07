import { z } from "zod";

const AlertSchema = z.object({
  id: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
  title: z.string(),
  message: z.string(),
  createdAt: z.string(),
  source: z.string().optional(),
});

const AlertsResponseSchema = z.object({
  alerts: z.array(AlertSchema),
  generatedAt: z.string(),
});

export type Alert = z.infer<typeof AlertSchema>;
export type AlertsResponse = z.infer<typeof AlertsResponseSchema>;

export type AlertsFetchState =
  | { status: "loading" }
  | { status: "ok"; data: AlertsResponse }
  | { status: "error"; error: string }
  | { status: "offline"; error: string };

function apiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base || typeof base !== "string" || base.trim() === "") {
    throw new Error(
      "VITE_API_BASE_URL is not set. Copy .env.example to .env and configure the API base URL.",
    );
  }
  return base.replace(/\/$/, "");
}

export async function fetchAlerts(signal?: AbortSignal): Promise<AlertsResponse> {
  const url = `${apiBaseUrl()}/api/alerts`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Alerts API returned HTTP ${response.status}`);
  }

  const json: unknown = await response.json();
  return AlertsResponseSchema.parse(json);
}

export async function postScanReport(payload: {
  filesFound: number;
  bytesFound: number;
  durationMs: number;
  osName: string;
}): Promise<void> {
  const url = `${apiBaseUrl()}/api/scan-reports`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Scan report API returned HTTP ${response.status}`);
  }
}

export { AlertSchema, AlertsResponseSchema };
