import { describe, expect, it } from "vitest";

import { AlertsResponseSchema } from "./alerts";

describe("AlertsResponseSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = AlertsResponseSchema.parse({
      alerts: [
        {
          id: "a1",
          severity: "warning",
          title: "Cache spike",
          message: "Browser cache grew quickly.",
          createdAt: "2026-10-07T12:00:00Z",
          source: "mock",
        },
      ],
      generatedAt: "2026-10-07T12:00:00Z",
    });
    expect(parsed.alerts).toHaveLength(1);
  });

  it("rejects invalid severity", () => {
    expect(() =>
      AlertsResponseSchema.parse({
        alerts: [
          {
            id: "a1",
            severity: "lol",
            title: "x",
            message: "y",
            createdAt: "2026-10-07T12:00:00Z",
          },
        ],
        generatedAt: "2026-10-07T12:00:00Z",
      }),
    ).toThrow();
  });
});
