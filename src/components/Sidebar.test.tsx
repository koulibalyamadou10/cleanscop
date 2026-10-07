import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  it("navigates when a nav item is clicked", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <Sidebar
        page="dashboard"
        onNavigate={onNavigate}
        theme="light"
        onToggleTheme={() => undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: /scan/i }));
    expect(onNavigate).toHaveBeenCalledWith("scan");
  });
});
