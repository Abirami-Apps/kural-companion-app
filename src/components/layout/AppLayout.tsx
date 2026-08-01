import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";
import { DebugPanel } from "@/components/debug/DebugPanel";
import { useFitGuard } from "@/hooks/useFitGuard";

/** Debug UI is never part of the production interface. */
const showDebug =
  import.meta.env.DEV ||
  (typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debug") === "1");

export function AppLayout() {
  // Production layout hook: the no-scroll guard runs regardless of debug UI.
  useFitGuard(true);

  return (
    <div id="app-root" className="app-surface flex h-[100dvh] flex-col overflow-hidden safe-pad">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <AppHeader />
      <main id="main" className="flex-1 min-h-0 flex flex-col overflow-y-auto">
        <Outlet />
      </main>
      <AppFooter />
      {showDebug && <DebugPanel />}
    </div>
  );
}
