import { Link } from "react-router-dom";
import { FontStepper, ThemeSwatches } from "@/components/theme/AppearancePanel";

export function AppFooter() {
  return (
    <footer className="border-t border-border bg-background/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Thirukkural Player
          </p>
          <nav aria-label="Footer" className="flex items-center gap-3 text-xs">
            <Link to="/subscribe" className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
              Pricing
            </Link>
            <Link to="/login" className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
              Log in
            </Link>
            <Link to="/chapters" className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
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
