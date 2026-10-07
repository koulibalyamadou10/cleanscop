import { describe, expect, it } from "vitest";

import { formatBytes, formatDuration, percentUsed } from "./format";

describe("formatBytes", () => {
  it("formats zero and common units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1048576)).toBe("1.0 MB");
  });
});

describe("formatDuration", () => {
  it("uses ms under one second", () => {
    expect(formatDuration(250)).toBe("250 ms");
  });

  it("uses seconds otherwise", () => {
    expect(formatDuration(1500)).toBe("1.5 s");
  });
});

describe("percentUsed", () => {
  it("clamps and handles empty totals", () => {
    expect(percentUsed(50, 100)).toBe(50);
    expect(percentUsed(10, 0)).toBe(0);
  });
});
