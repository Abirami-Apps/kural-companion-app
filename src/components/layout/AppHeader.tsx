import { useState } from "react";
import { BookOpen, Heart, Home, LogIn, Menu, Settings2, Sparkles } from "lucide-react";
import { NavLink, Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppearancePanel } from "@/components/theme/AppearancePanel";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/favourites", label: "Favourites", icon: Heart },
  { to: "/chapters", label: "Chapters", icon: BookOpen },
];

export function AppHeader() {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-2 rounded-full px-3 min-h-11 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      isActive
        ? "bg-primary/12 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  return (
    <header className="shrink-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2 short:py-1 sm:px-6">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Kural Companion home"
        >
          <img
            src={logo}
            alt="Kural Companion logo"
            className="h-10 w-10 short:h-8 short:w-8 sm:h-12 sm:w-12 lg:h-14 lg:w-14 rounded-xl object-contain"
            loading="eager"
          />
          <span className="leading-tight text-left">
            <span className="block font-tamil text-sm sm:text-base lg:text-lg font-bold text-foreground">
              திருக்குறள்
            </span>
            <span className="block text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground short:hidden">
              Kural Companion
            </span>
          </span>
        </Link>


        <nav aria-label="Main" className="ml-auto hidden xl:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto xl:ml-2 flex items-center gap-1.5">
          <Button asChild variant="default" className="hidden sm:inline-flex min-h-11 rounded-full">
            <Link to="/subscribe">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>Subscribe</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="h-11 w-11 hidden sm:inline-flex">
            <Link to="/login" aria-label="Log in to your account">
              <LogIn className="h-5 w-5" />
            </Link>
          </Button>

          <AppearancePanel />

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 xl:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(18rem,85vw)]">
              <SheetTitle className="text-left">Menu</SheetTitle>
              <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 min-h-11 text-sm font-medium ${
                        isActive ? "bg-primary/12 text-primary" : "text-foreground hover:bg-muted"
                      }`
                    }
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                ))}
                <NavLink
                  to="/subscribe"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 min-h-11 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> Pricing
                </NavLink>
                <NavLink
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 min-h-11 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" /> Log in
                </NavLink>
              </nav>
              <div className="mt-6 border-t border-border pt-4">
                <AppearancePanel
                  trigger={
                    <Button variant="outline" className="w-full min-h-11 justify-start gap-3">
                      <Settings2 className="h-4 w-4" aria-hidden="true" /> Appearance
                    </Button>
                  }
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
