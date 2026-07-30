import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";

export function AppLayout() {
  return (
    <div className="app-surface flex min-h-[100dvh] flex-col safe-pad">
      <a
        href="#player"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to player
      </a>
      <AppHeader />
      <main id="main" className="flex-1 min-h-0 flex flex-col">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
}
