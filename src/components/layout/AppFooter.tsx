import { Link } from "react-router-dom";
import { FontStepper, ThemeSwatches } from "@/components/theme/AppearancePanel";

export function AppFooter() {
  return (
    <footer className="hidden shrink-0 border-t border-border bg-background/80 short:hidden xl:block">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-6 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Kural Companion
          </p>
          <nav aria-label="Footer" className="flex items-center gap-3 text-xs">
            <Link to="/subscribe" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
              Pricing
            </Link>
            <Link to="/login" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
              Log in
            </Link>
            <Link to="/chapters" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
              Chapters
            </Link>
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <ThemeSwatches compact />
          <FontStepper compact />
        </div>
      </div>
    </footer>
  );
}
