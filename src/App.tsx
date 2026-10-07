import { useState } from "react";

import { Sidebar } from "./components/Sidebar";
import { useTheme } from "./hooks/useTheme";
import { AlertsPage } from "./pages/AlertsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ScanPage } from "./pages/ScanPage";
import { SettingsPage } from "./pages/SettingsPage";
import type { PageId } from "./types";

export default function App() {
  const [page, setPage] = useState<PageId>("dashboard");
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <div className="flex h-full min-h-[600px] min-w-[900px] bg-surface text-ink">
      <Sidebar page={page} onNavigate={setPage} theme={theme} onToggleTheme={toggleTheme} />
      <main className="flex-1 overflow-auto p-6">
        {page === "dashboard" && <DashboardPage />}
        {page === "scan" && <ScanPage />}
        {page === "alerts" && <AlertsPage />}
        {page === "settings" && <SettingsPage theme={theme} onThemeChange={setTheme} />}
      </main>
    </div>
  );
}
