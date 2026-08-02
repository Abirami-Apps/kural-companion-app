import { Clock3, Delete, Grid3X3, Keyboard, Lock, RotateCcw, Shuffle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TOTAL_KURALS } from "@/data/sample-kurals";
import { useKuralPlayer } from "@/hooks/useKuralPlayer";
import { formatTime } from "@/lib/player-utils";
import { Keypad } from "@/components/player/Keypad";
import { Transport } from "@/components/player/Transport";
import { VerseDisplay } from "@/components/player/VerseDisplay";
import { ShortcutsDialog } from "@/components/player/ShortcutsDialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

/**
 * The one and only player composition. Rendered by `/`, `/?k=123` and
 * `/kural/123` so behaviour can never diverge between entry points.
 */
export function KuralPlayer() {
  const p = useKuralPlayer();
  const [keypadOpen, setKeypadOpen] = useState(false);
  const display = p.entry || String(p.number);
  const seekDisabled = !p.duration || p.locked;

  useEffect(() => setKeypadOpen(false), [p.number]);

  if (p.invalidTarget) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center" lang="en">
        <h1 className="text-xl font-semibold text-foreground">That kural does not exist</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Kural numbers run from 1 to {TOTAL_KURALS}. Check the link and try again.
        </p>
        <Button asChild className="min-h-11 rounded-full">
          <Link to="/kural/1">Go to Kural 1</Link>
        </Button>
      </div>
    );
  }

  const status = p.locked ? (
    <span className="inline-flex items-center gap-1.5">
      <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Subscribers only
    </span>
  ) : p.audioState === "error" ? (
    <>
      <span>Audio unavailable</span>
      <button
        type="button"
        onClick={p.retry}
        className="inline-flex min-h-11 items-center gap-1 rounded-full border border-secondary-foreground/25 px-3 text-secondary-foreground hover:border-gold-light hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
      </button>
    </>
  ) : p.pending ? (
    <span>Loading kural…</span>
  ) : p.hourlyPlayback ? (
    <span className="inline-flex items-center gap-1.5">
      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Hourly Kural
    </span>
  ) : !p.hintSeen ? (
    <span>Enter a number from 1 to {TOTAL_KURALS}</span>
  ) : null;

  const progress = (
    <div className="flex w-full items-center gap-2.5 text-[0.7rem] text-secondary-foreground/80">
      <span className="w-9 tabular-nums">{formatTime(p.progress)}</span>
      <input
        type="range"
        min={0}
        max={p.duration || 0}
        step={0.1}
        value={p.progress}
        disabled={seekDisabled}
        onChange={(event) => p.seek(Number(event.target.value))}
        aria-label="Seek audio position"
        aria-valuetext={`${formatTime(p.progress)} of ${formatTime(p.duration)}`}
        className="h-11 min-w-0 flex-1 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
      />
      <span className="w-9 text-right tabular-nums">{formatTime(p.duration)}</span>
    </div>
  );

  const transport = (
    <Transport
      isPlaying={p.isPlaying}
      audioState={p.audioState}
      canPrev={p.canPrev}
      canNext={p.canNext}
      continuous={p.continuous}
      disabled={p.locked}
      onPrev={p.goPrev}
      onNext={p.goNext}
      onToggle={p.togglePlay}
      onToggleContinuous={() => p.setContinuous((continuous) => !continuous)}
    />
  );

  const submitFromSheet = () => {
    if (!p.entry) return;
    p.submitEntry();
    setKeypadOpen(false);
  };

  return (
    <div id="player" className="player-page min-h-full w-full">
      <div className="mx-auto grid w-full max-w-[1280px] gap-5 px-4 py-5 sm:px-6 sm:py-7 studio:grid-cols-[minmax(0,1.65fr)_minmax(360px,0.85fr)] studio:items-stretch studio:gap-6 studio:px-8 studio:py-8">
        <section
          aria-label="Kural verse"
          className="reading-panel min-w-0 rounded-[1.5rem] border border-border/80 bg-card px-4 py-5 shadow-[0_24px_70px_-50px_hsl(var(--navy)/0.65)] sm:px-7 sm:py-7 studio:px-10 studio:py-9"
        >
          <VerseDisplay
            kural={p.current}
            isFavourite={p.isFavourite}
            onToggleFavourite={p.toggleFavourite}
            canPrev={p.canPrev}
            canNext={p.canNext}
            onPrev={p.goPrev}
            onNext={p.goNext}
            locked={p.locked}
          />
        </section>

        <aside
          aria-label="Player controls"
          className="control-card hidden min-w-0 flex-col justify-center rounded-[1.5rem] bg-secondary px-7 py-8 text-secondary-foreground shadow-[0_28px_70px_-42px_hsl(var(--navy)/0.9)] studio:flex"
        >
          <div className="mx-auto flex w-full max-w-[390px] flex-col gap-4">
            <NumberReadout
              display={display}
              pending={p.pending}
              softDelay={p.softDelay}
              onBackspace={p.backspace}
              onKeyboard={() => p.setShortcutsOpen(true)}
            />

            <div className="flex min-h-[22px] items-center justify-center gap-2 text-center text-xs text-secondary-foreground/70" lang="en">
              {status}
            </div>

            {p.recents.length > 1 && (
              <nav aria-label="Recently played" className="flex items-center justify-center gap-2 overflow-x-auto pb-1">
                {p.recents.map((number) => (
                  <button
                    key={number}
                    type="button"
                    onClick={() => p.load(number, true)}
                    aria-current={number === p.number ? "true" : undefined}
                    aria-label={`Play kural ${number}`}
                    className={`min-h-11 min-w-11 shrink-0 rounded-full border px-3 text-xs tabular-nums transition ${
                      number === p.number
                        ? "border-gold-light/70 bg-gold-light/10 text-gold-light"
                        : "border-secondary-foreground/15 text-secondary-foreground/70 hover:border-secondary-foreground/35 hover:text-secondary-foreground"
                    }`}
                  >
                    {number}
                  </button>
                ))}
              </nav>
            )}

            {progress}

            <Keypad onDigit={p.pressDigit} onClear={p.clearEntry} onSubmit={p.submitEntry} />

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={p.shuffle}
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs text-secondary-foreground/70 transition hover:bg-secondary-foreground/[0.06] hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
              >
                <Shuffle className="h-4 w-4" aria-hidden="true" /> Surprise me
              </button>
            </div>

            <div className="border-t border-secondary-foreground/15 pt-3">{transport}</div>

            {p.locked && (
              <Link
                to="/subscribe"
                className="inline-flex min-h-11 items-center justify-center text-xs text-secondary-foreground/75 underline underline-offset-4 hover:text-gold-light"
              >
                See subscription options
              </Link>
            )}
          </div>
        </aside>

        <section aria-label="Compact player controls" className="studio:hidden">
          <div className="rounded-[1.5rem] bg-secondary px-4 py-4 text-secondary-foreground shadow-[0_24px_60px_-38px_hsl(var(--navy)/0.9)] sm:px-6 sm:py-5">
            <div className="mx-auto flex max-w-2xl flex-col gap-2">
              {progress}
              <div className="min-h-11">{transport}</div>
              {status && (
                <div className="flex min-h-6 items-center justify-center gap-2 text-center text-xs text-secondary-foreground/70" lang="en">
                  {status}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setKeypadOpen(true)}
            aria-label={`Choose a Kural number, currently ${p.number}`}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-primary/55 bg-card px-4 text-sm font-semibold text-primary transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Grid3X3 className="h-5 w-5" aria-hidden="true" />
            Go to Kural {display}
          </button>
        </section>
      </div>

      <Sheet open={keypadOpen} onOpenChange={setKeypadOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-[2rem] border-secondary-foreground/15 bg-secondary px-4 pb-[calc(1.25rem+var(--safe-bottom))] pt-4 text-secondary-foreground sm:px-8"
        >
          <SheetTitle className="sr-only">Go to a Kural</SheetTitle>
          <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-secondary-foreground/30" aria-hidden="true" />
          <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
            <NumberReadout
              display={display}
              pending={p.pending}
              softDelay={p.softDelay}
              onBackspace={p.backspace}
            />
            <Keypad onDigit={p.pressDigit} onClear={p.clearEntry} onSubmit={submitFromSheet} />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => p.setShortcutsOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs text-secondary-foreground/75 hover:bg-secondary-foreground/[0.07] hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
              >
                <Keyboard className="h-4 w-4" aria-hidden="true" /> Shortcuts
              </button>
              <button
                type="button"
                onClick={() => {
                  p.shuffle();
                  setKeypadOpen(false);
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs text-secondary-foreground/75 hover:bg-secondary-foreground/[0.07] hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
              >
                <Shuffle className="h-4 w-4" aria-hidden="true" /> Surprise me
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ShortcutsDialog open={p.shortcutsOpen} onOpenChange={p.setShortcutsOpen} />

      <span className="sr-only" role="status" aria-live="polite">
        {p.entry ? `Entering ${p.entry}` : `Kural ${p.number} of ${TOTAL_KURALS}`}
      </span>

      {!p.locked && <audio ref={p.audioRef} src={p.current.audioUrl} preload="metadata" {...p.audioHandlers} />}
      {!p.locked && p.neighbours.map((src) => <link key={src} rel="prefetch" as="audio" href={src} />)}
    </div>
  );
}

function NumberReadout({
  display,
  pending,
  softDelay,
  onBackspace,
  onKeyboard,
}: {
  display: string;
  pending: boolean;
  softDelay: number;
  onBackspace: () => void;
  onKeyboard?: () => void;
}) {
  return (
    <div className="flex w-full items-center justify-center gap-2">
      <div className="relative flex min-h-[66px] min-w-0 flex-1 items-center justify-center gap-4 overflow-hidden rounded-2xl border border-secondary-foreground/15 bg-secondary-foreground/[0.055] px-4">
        <span data-fit-probe="lcd" className="digital-display text-[clamp(1.65rem,4vw,2.2rem)] font-bold text-gold-light">
          {display}
        </span>
        <span className="shrink-0 text-xs font-medium tracking-wide text-secondary-foreground/75">
          / {TOTAL_KURALS}
        </span>
        {pending && (
          <span
            key={display}
            className="countdown-bar absolute bottom-0 left-0 h-[3px] bg-gold-light"
            style={{ animationDuration: `${softDelay}ms` }}
          />
        )}
      </div>
      <button
        type="button"
        onClick={onBackspace}
        aria-label="Delete last digit"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-secondary-foreground/15 bg-secondary-foreground/[0.055] transition hover:bg-secondary-foreground/[0.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
      >
        <Delete className="h-5 w-5" aria-hidden="true" />
      </button>
      {onKeyboard && (
        <button
          type="button"
          onClick={onKeyboard}
          aria-label="Show keyboard shortcuts"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-secondary-foreground/15 bg-secondary-foreground/[0.055] transition hover:bg-secondary-foreground/[0.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
        >
          <Keyboard className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default KuralPlayer;
