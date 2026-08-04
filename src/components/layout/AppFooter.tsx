import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function AppFooter() {
  const { user } = useAuth();

  return (
    <footer className="hidden shrink-0 border-t border-border/70 bg-background/80 nav:block">
      <div className="mx-auto flex min-h-12 w-full max-w-[1280px] items-center justify-between gap-4 px-8">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Kural Companion</p>
        <nav aria-label="Footer" className="flex items-center gap-4 text-xs">
          <Link to="/hourly" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-primary">
            Hourly Kural
          </Link>
          <Link to="/chapters" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-primary">
            Chapters
          </Link>
          <Link to="/terms" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-primary">
            Terms
          </Link>
          <Link to="/privacy" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-primary">
            Privacy
          </Link>
          <Link to="/refunds" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-primary">
            Refunds
          </Link>
          <Link to="/contact" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-primary">
            Contact
          </Link>
          <Link to="/login" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-primary">
            {user ? "Account" : "Log in"}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
