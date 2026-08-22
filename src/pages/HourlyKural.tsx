import {
  Bell,
  BellOff,
  CheckCircle2,
  Clock3,
  Crown,
  Info,
  PauseCircle,
  Play,
  Volume2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useHourlyKural } from "@/hooks/useHourlyKural";
import { useKuralLibrary } from "@/hooks/useKuralLibrary";
import {
  formatHour,
  hourlyNotificationContent,
  type HourlyLanguage,
  type HourlySelection,
} from "@/lib/hourly-kural";
import { usePremiumPrompt } from "@/contexts/PremiumPromptContext";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const selectionOptions: { id: HourlySelection; label: string; description: string }[] = [
  { id: "random", label: "Surprise me", description: "A different Kural each hour" },
  { id: "sequential", label: "In order", description: "Continue from the previous Kural" },
  { id: "favourites", label: "Favourites", description: "Rotate through saved Kurals" },
];

const languageOptions: { id: HourlyLanguage; label: string }[] = [
  { id: "ta", label: "தமிழ்" },
  { id: "en", label: "English" },
];

export default function HourlyKural() {
  const hourly = useHourlyKural();
  const { openPremiumPrompt } = usePremiumPrompt();
  const { getKural } = useKuralLibrary();

  if (!hourly.premiumAccess) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-xl items-center px-4 py-10 text-center">
        <section className="w-full rounded-[1.5rem] border border-border bg-card px-6 py-10 shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Crown className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-tamil text-2xl font-bold">மணிக்குறள்</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hourly Kural is included with Kural Companion Plus.
          </p>
          <Button type="button" className="mt-6 min-h-12 rounded-full px-6" onClick={openPremiumPrompt}>
            Start free trial
          </Button>
        </section>
      </div>
    );
  }

  const nextLabel = hourly.nextRun
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      }).format(hourly.nextRun)
    : "Enable the schedule to see the next Kural";

  const statusLabel = {
    idle: hourly.settings.enabled ? "Schedule active" : "Schedule paused",
    announcing: "Announcing the time…",
    loading: "Opening the main player…",
    playing: "Playing in the main Kural player…",
    error: "Playback needs attention",
  }[hourly.status];
  const previewNumber = hourly.lastKuralNumber ?? 1;
  const previewKural = getKural(previewNumber);
  const notificationPreview = hourlyNotificationContent({
    date: hourly.nextRun ?? new Date(),
    language: hourly.settings.language,
    number: previewNumber,
    chapter: previewKural?.chapter ?? "திருக்குறள்",
  });
  const permissionLabel = {
    granted: "On",
    default: "Not enabled",
    denied: "Blocked",
    unsupported: "Unavailable",
  }[hourly.notificationPermission];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8" lang="en">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-tamil text-2xl font-bold text-foreground sm:text-3xl">மணிக்குறள்</h1>
            <span className="inline-flex min-h-7 items-center gap-1 rounded-full bg-primary/10 px-3 text-xs font-semibold text-foreground">
              <Crown className="h-3.5 w-3.5" aria-hidden="true" />
              {hourly.premiumPreview ? "Premium preview" : "Kural Companion Plus"}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Let a Kural mark each hour with a spoken time announcement. Automatic playback works
            while Kural Companion is active; notifications remind you when it is in the background.
          </p>
        </div>
      </header>

      {hourly.premiumPreview && (
        <div className="mb-5 flex gap-3 rounded-2xl border border-primary/25 bg-primary/[0.06] p-4 text-sm text-foreground/80">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p>
            This premium feature is open for testing while subscriptions are not connected. Once
            paid access is enabled, the same screen will require an active entitlement.
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Clock3 className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold text-foreground">Hourly schedule</h2>
                <p className="mt-1 text-xs text-muted-foreground">{nextLabel}</p>
              </div>
            </div>
            <Switch
              checked={hourly.settings.enabled}
              onCheckedChange={hourly.setEnabled}
              aria-label="Enable Hourly Kural schedule"
            />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-foreground">
              Start hour
              <select
                value={hourly.settings.startHour}
                onChange={(event) => hourly.updateSettings({ startHour: Number(event.target.value) })}
                className="block min-h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>{formatHour(hour)}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-foreground">
              Quiet after
              <select
                value={hourly.settings.endHour}
                onChange={(event) => hourly.updateSettings({ endHour: Number(event.target.value) })}
                className="block min-h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>{formatHour(hour)}</option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold text-foreground">Time announcement</legend>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-muted/55 p-1.5">
              {languageOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={hourly.settings.language === option.id}
                  onClick={() => hourly.updateSettings({ language: option.id })}
                  className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    hourly.settings.language === option.id
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold text-foreground">Choose each Kural</legend>
            <div className="mt-3 grid gap-2">
              {selectionOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={hourly.settings.selection === option.id}
                  onClick={() => hourly.updateSettings({ selection: option.id })}
                  className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    hourly.settings.selection === option.id
                      ? "border-primary/55 bg-primary/[0.06]"
                      : "border-border hover:border-primary/35"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span>
                  </span>
                  {hourly.settings.selection === option.id && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Read the Tamil meaning</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Spoken after the Kural audio</p>
            </div>
            <Switch
              checked={hourly.settings.includeMeaning}
              onCheckedChange={(includeMeaning) => hourly.updateSettings({ includeMeaning })}
              aria-label="Read Tamil meaning after the Kural"
            />
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-[1.5rem] bg-secondary p-5 text-secondary-foreground shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <Volume2 className="h-6 w-6 text-gold-light" aria-hidden="true" />
              <div>
                <h2 className="font-semibold">Sound check</h2>
                <p className="mt-0.5 text-xs text-secondary-foreground/65">Tap once to allow scheduled sound</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-secondary-foreground/15 bg-secondary-foreground/[0.055] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-secondary-foreground/55">Status</p>
              <p className="mt-1 font-semibold" aria-live="polite">{statusLabel}</p>
              {hourly.errorMessage && (
                <p className="mt-2 text-xs leading-relaxed text-gold-light">{hourly.errorMessage}</p>
              )}
              {hourly.lastKuralNumber && (
                <Link
                  to={`/kural/${hourly.lastKuralNumber}`}
                  className="mt-3 inline-flex min-h-11 items-center text-xs text-gold-light underline underline-offset-4"
                >
                  Last Hourly Kural: {hourly.lastKuralNumber}
                </Link>
              )}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Button
                type="button"
                onClick={() => void hourly.testNow()}
                disabled={
                  hourly.status === "announcing" ||
                  hourly.status === "loading" ||
                  hourly.status === "playing"
                }
                className="min-h-12 rounded-xl"
              >
                <Play className="h-4 w-4" aria-hidden="true" /> Test now
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={hourly.stopPlayback}
                disabled={hourly.status === "idle"}
                className="min-h-12 rounded-xl border-secondary-foreground/25 bg-transparent text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
              >
                <PauseCircle className="h-4 w-4" aria-hidden="true" /> Stop
              </Button>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              {hourly.notificationPermission === "granted" ? (
                <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              ) : (
                <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-foreground">Background reminders</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Get a reminder when Kural Companion is in the background.
                </p>
              </div>
            </div>

            <div
              className="mt-4 flex gap-3 rounded-2xl border border-border/80 bg-muted/45 p-3.5 shadow-sm"
              aria-label="Hourly Kural notification preview"
            >
              <img
                src="/pwa-192.png"
                alt=""
                className="h-11 w-11 shrink-0 rounded-xl"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-[0.68rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  Kural Companion · Reminder preview
                </p>
                <p className="mt-1 text-sm font-semibold leading-snug text-foreground">
                  {notificationPreview.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {notificationPreview.body}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">Notification permission</span>
              <span className="font-semibold text-foreground">{permissionLabel}</span>
            </div>
            {hourly.notificationPermission === "default" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void hourly.requestNotificationPermission()}
                className="mt-4 min-h-11 w-full rounded-xl"
              >
                <Bell className="h-4 w-4" aria-hidden="true" /> Turn on reminders
              </Button>
            )}
            {hourly.notificationPermission === "granted" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void hourly.sendTestNotification()}
                className="mt-4 min-h-11 w-full rounded-xl"
              >
                <Bell className="h-4 w-4" aria-hidden="true" /> Send test reminder
              </Button>
            )}
            {hourly.notificationPermission === "denied" && (
              <p className="mt-4 rounded-xl bg-muted/55 p-3 text-xs text-muted-foreground">
                Notifications are blocked. Allow them in this site's browser settings.
              </p>
            )}
            {hourly.notificationPermission === "unsupported" && (
              <p className="mt-4 rounded-xl bg-muted/55 p-3 text-xs text-muted-foreground">
                Notifications are not available on this device yet. Hourly playback still works
                while the app is open.
              </p>
            )}
            {hourly.notificationMessage && (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground" role="status">
                {hourly.notificationMessage}
              </p>
            )}
          </section>
        </div>
      </div>

      <p className="mt-5 flex gap-2 rounded-2xl border border-border/70 bg-background/45 p-4 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Keep Kural Companion open for automatic playback. When it is in the background, reminder
        delivery depends on your device and browser settings.
      </p>
    </div>
  );
}
