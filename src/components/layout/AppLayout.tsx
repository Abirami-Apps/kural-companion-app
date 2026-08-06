import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";
import { DebugPanel } from "@/components/debug/DebugPanel";
import { useFitGuard } from "@/hooks/useFitGuard";
import { OfflineBanner } from "@/components/pwa/PwaControls";

/** Debug UI is never part of the production interface. */
const showDebug =
  import.meta.env.DEV ||
  (typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debug") === "1");

export function AppLayout() {
  // The redesigned main region scrolls naturally on compact/landscape screens.
  // Keep live overflow diagnostics without shrinking 44px touch targets.
  useFitGuard(true, false);

  return (
    <div id="app-root" className="app-surface flex h-[100dvh] flex-col overflow-hidden safe-pad">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <AppHeader />
      <OfflineBanner />
      <main id="main" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Outlet />
      </main>
      <AppFooter />
      {showDebug && <DebugPanel />}
    </div>
  );
}
