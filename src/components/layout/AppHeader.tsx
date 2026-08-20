import { useState } from "react";
import {
  BookOpen,
  Clock3,
  FileText,
  Heart,
  Home,
  LifeBuoy,
  LogIn,
  Menu,
  PackageCheck,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { NavLink, Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppearancePanel } from "@/components/theme/AppearancePanel";
import { checkoutEnabled } from "@/lib/features";
import { useHourlyKural } from "@/hooks/useHourlyKural";
import { useAuth } from "@/hooks/useAuth";
import { ConnectivityBadge, InstallAppButton } from "@/components/pwa/PwaControls";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/favourites", label: "Favourites", icon: Heart },
  { to: "/chapters", label: "Chapters", icon: BookOpen },
  { to: "/hourly", label: "Hourly", icon: Clock3 },
];

export function AppHeader() {
  const [open, setOpen] = useState(false);
  const { settings: hourlySettings } = useHourlyKural();
  const { user, subscribed } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-2 rounded-full px-3 min-h-11 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      isActive
        ? "bg-primary/12 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  return (
    <header className="z-40 shrink-0 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="flex min-h-[64px] w-full items-center gap-3 px-4 py-1.5 sm:px-6 nav:px-8">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Kural Companion home"
        >
          <img
            src={logo}
            alt="Kural Companion logo"
            className="h-10 w-10 rounded-xl object-contain sm:h-12 sm:w-12"
            loading="eager"
          />
          <span className="leading-tight text-left">
            <span className="block font-tamil text-sm font-bold text-foreground sm:text-base nav:text-lg">
              திருக்குறள்
            </span>
            <span className="hidden text-[10px] uppercase tracking-[0.22em] text-muted-foreground brand:block sm:text-[11px]">
              Kural Companion
            </span>
          </span>
        </Link>


        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 nav:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
              {item.to === "/hourly" && hourlySettings.enabled && (
                <span className="h-2 w-2 rounded-full bg-primary" aria-label="Hourly schedule active" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 nav:ml-2">
          <ConnectivityBadge className="hidden nav:inline-flex" />
          <InstallAppButton className="hidden nav:inline-flex" />
          {checkoutEnabled && (
            <Button asChild variant="default" className="hidden min-h-11 rounded-full nav:inline-flex">
              <Link to="/subscribe">
                {subscribed
                  ? <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                <span>{subscribed ? "Plan" : "Subscribe"}</span>
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" className="hidden min-h-11 gap-2 rounded-full px-3 nav:inline-flex">
            <Link to="/login" aria-label={user ? "Open your account" : "Log in to your account"}>
              {user ? <UserRound className="h-4 w-4" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
              <span>{user ? "Account" : "Log in"}</span>
            </Link>
          </Button>

          <span className="hidden nav:inline-flex">
            <AppearancePanel />
          </span>

          <Button asChild variant="ghost" size="icon" className="h-11 w-11 nav:hidden">
            <Link to="/favourites" aria-label="Open favourites">
              <Heart className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 nav:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(18rem,85vw)]">
              <SheetTitle className="text-left">Menu</SheetTitle>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ConnectivityBadge />
                <InstallAppButton />
              </div>
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
                    {item.to === "/hourly" && hourlySettings.enabled && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-primary" aria-label="Hourly schedule active" />
                    )}
                  </NavLink>
                ))}
                {checkoutEnabled && (
                  <NavLink
                    to="/subscribe"
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" /> Pricing
                  </NavLink>
                )}
                <NavLink
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 min-h-11 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {user ? <UserRound className="h-4 w-4" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
                  {user ? "Account" : "Log in"}
                </NavLink>
              </nav>
              <div className="mt-5 border-t border-border pt-4">
                <p className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Legal &amp; support
                </p>
                <nav aria-label="Legal and support" className="mt-2 flex flex-col gap-1">
                  <Link
                    to="/terms"
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" /> Terms
                  </Link>
                  <Link
                    to="/privacy"
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Privacy
                  </Link>
                  <Link
                    to="/refunds"
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <ReceiptText className="h-4 w-4" aria-hidden="true" /> Refunds &amp; cancellations
                  </Link>
                  <Link
                    to="/delivery"
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <PackageCheck className="h-4 w-4" aria-hidden="true" /> Digital delivery
                  </Link>
                  <Link
                    to="/contact"
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <LifeBuoy className="h-4 w-4" aria-hidden="true" /> Contact support
                  </Link>
                </nav>
              </div>
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
