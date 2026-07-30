import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";

export function AppLayout() {
  return (
    <div className="app-surface flex h-[100dvh] flex-col overflow-hidden safe-pad">
      <a
        href="#player"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to player
      </a>
      <AppHeader />
      <main id="main" className="flex-1 min-h-0 flex flex-col overflow-y-auto">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
}
