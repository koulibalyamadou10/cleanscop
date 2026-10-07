import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("renders label and percentage", () => {
    render(<ProgressBar value={42} label="Scan progress" />);
    expect(screen.getByText("Scan progress")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
  });
});
