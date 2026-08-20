import { Clock3, Delete, Keyboard, Lock, RotateCcw, Shuffle } from "lucide-react";
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
import { usePremiumPrompt } from "@/contexts/PremiumPromptContext";

/**
 * The one and only player composition. Rendered by `/`, `/?k=123` and
 * `/kural/123` so behaviour can never diverge between entry points.
 */
export function KuralPlayer() {
  const p = useKuralPlayer();
  const { openPremiumPrompt } = usePremiumPrompt();
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
  ) : null;

  const progress = (
    <div className="tablet-portrait-progress flex w-full items-center gap-2.5 text-[0.7rem] text-secondary-foreground/80">
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
      loopOne={p.loopOne}
      disabled={p.locked}
      onPrev={p.goPrev}
      onNext={p.goNext}
      onToggle={p.togglePlay}
      onToggleLoopOne={() => p.setLoopOne((loopOne) => !loopOne)}
      onLocked={openPremiumPrompt}
    />
  );

  const submitFromSheet = () => {
    if (!p.entry) return;
    p.submitEntry();
    setKeypadOpen(false);
  };

  return (
    <div id="player" className="player-page h-full min-h-0 w-full overflow-hidden">
      <div className="player-grid mx-auto grid h-full min-h-0 w-full grid-rows-[minmax(0,1fr)_auto] gap-2 px-2 py-2 sm:gap-3 sm:px-4 sm:py-3 short:gap-2 short:px-2 short:py-2 wide:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.75fr)] wide:grid-rows-1 wide:items-stretch split:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)] split:grid-rows-1 split:items-stretch studio:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] studio:grid-rows-1 studio:items-stretch studio:gap-4 studio:px-5 studio:py-5">
        <aside
          aria-label="Tiruvalluvar portrait"
          className="valluvar-panel relative hidden min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-[1.5rem] border border-border/80 shadow-[0_24px_70px_-46px_hsl(var(--navy)/0.9)] studio:col-start-1 studio:flex"
        >
          <div className="pointer-events-none absolute inset-x-0 top-5 z-10 text-center text-secondary-foreground/75 studio:top-7">
            <p className="font-tamil text-sm tracking-wide studio:text-base">திருவள்ளுவர்</p>
            <span className="mx-auto mt-2 block h-px w-16 bg-gold-light/60" aria-hidden="true" />
          </div>
          <img
            src="/valluvar.png"
            alt="திருவள்ளுவர்"
            className="h-[74%] w-auto max-w-none object-contain object-center drop-shadow-[0_20px_26px_hsl(var(--navy)/0.55)]"
            loading="eager"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 text-center text-[0.68rem] uppercase tracking-[0.24em] text-secondary-foreground/60 studio:bottom-7 studio:text-xs">
            அறம்&nbsp; · &nbsp;பொருள்&nbsp; · &nbsp;இன்பம்
          </div>
        </aside>

        <section
          aria-label="Kural verse"
          className="reading-panel mobile-landscape-reading-panel h-full min-h-0 min-w-0 overflow-hidden rounded-[1.35rem] border border-border/80 px-3 py-3 shadow-[0_24px_70px_-50px_hsl(var(--navy)/0.65)] sm:rounded-[1.5rem] sm:px-5 sm:py-4 short:px-3 short:py-2 studio:col-start-2 studio:px-8 studio:py-6"
        >
          <VerseDisplay
            kural={p.current}
            isFavourite={p.isFavourite}
            onToggleFavourite={p.toggleFavourite}
            canPrev={p.canPrev}
            canNext={p.canNext}
            onPrev={p.goPrev}
            onNext={p.goNext}
            onChooseNumber={() => setKeypadOpen(true)}
            locked={p.locked}
            onRequestPremium={openPremiumPrompt}
          />
        </section>

        <aside
          aria-label="Player controls"
          className="control-card tablet-portrait-control-card mobile-landscape-control-card hidden min-w-0 flex-col justify-center rounded-[1.5rem] bg-secondary px-5 py-5 text-secondary-foreground shadow-[0_28px_70px_-42px_hsl(var(--navy)/0.9)] wide:flex studio:col-start-3 studio:flex studio:px-5 studio:py-6"
        >
          <div className="tablet-portrait-control-layout mx-auto flex w-full max-w-[390px] flex-col gap-4">
            <div className="tablet-portrait-readout">
              <NumberReadout
                display={display}
                pending={p.pending}
                softDelay={p.softDelay}
                onBackspace={p.backspace}
                onKeyboard={() => p.setShortcutsOpen(true)}
              />
            </div>

            <div className="tablet-portrait-status flex min-h-[22px] items-center justify-center gap-2 text-center text-xs text-secondary-foreground/70" lang="en">
              {status}
            </div>

            {p.recents.length > 1 && (
              <nav aria-label="Recently played" className="tablet-portrait-recents flex items-center justify-center gap-2 overflow-x-auto pb-1">
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

            <div className="tablet-portrait-keypad">
              <Keypad onDigit={p.pressDigit} onClear={p.clearEntry} onSubmit={p.submitEntry} />
            </div>

            <div className="tablet-portrait-shuffle flex items-center justify-center">
              <button
                type="button"
                onClick={p.shuffle}
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs text-secondary-foreground/70 transition hover:bg-secondary-foreground/[0.06] hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
              >
                <Shuffle className="h-4 w-4" aria-hidden="true" /> Surprise me
              </button>
            </div>

            <div className="tablet-portrait-transport border-t border-secondary-foreground/15 pt-3">{transport}</div>

            {p.locked && (
              <button
                type="button"
                onClick={openPremiumPrompt}
                className="tablet-portrait-locked inline-flex min-h-11 items-center justify-center text-xs text-secondary-foreground/75 underline underline-offset-4 hover:text-gold-light"
              >
                Start free trial
              </button>
            )}
          </div>
        </aside>

        <section aria-label="Compact player controls" className="tablet-portrait-compact min-h-0 wide:hidden studio:hidden">
          <div className="h-full rounded-[1.35rem] bg-secondary px-3 py-2 text-secondary-foreground shadow-[0_24px_60px_-38px_hsl(var(--navy)/0.9)] sm:rounded-[1.5rem] sm:px-4 sm:py-3 short:px-3 short:py-2">
            <div className="mx-auto flex h-full max-w-2xl flex-col justify-center gap-0.5 sm:gap-1">
              {progress}
              <div className="mobile-portrait-keypad">
                <p className="mb-1 text-center text-[0.62rem] uppercase tracking-[0.18em] text-secondary-foreground/55">
                  Kural number
                </p>
                <Keypad onDigit={p.pressDigit} onClear={p.clearEntry} onSubmit={p.submitEntry} />
              </div>
              <div className="flex min-h-11 items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setKeypadOpen(true)}
                  aria-label="Enter a Kural number"
                  className="mobile-number-entry-button hidden min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-secondary-foreground/20 px-3 text-[0.68rem] font-medium text-secondary-foreground/80 transition hover:border-gold-light/60 hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
                >
                  <Keyboard className="h-4 w-4" aria-hidden="true" />
                  <span className="mobile-number-entry-label">Enter number</span>
                </button>
                <div className="min-w-0 flex-1">{transport}</div>
              </div>
              {status && (
                <div className="flex min-h-5 items-center justify-center gap-2 text-center text-[0.68rem] text-secondary-foreground/70" lang="en">
                  {status}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <Sheet open={keypadOpen} onOpenChange={setKeypadOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-[2rem] border-secondary-foreground/15 bg-secondary pl-[calc(1rem+var(--safe-left))] pr-[calc(1rem+var(--safe-right))] pb-[calc(1.25rem+var(--safe-bottom))] pt-4 text-secondary-foreground sm:px-8 wide:max-h-[calc(100dvh-var(--safe-top))] wide:rounded-t-3xl wide:pb-[calc(0.75rem+var(--safe-bottom))] wide:pt-3"
        >
          <SheetTitle className="sr-only">Go to a Kural</SheetTitle>
          <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-secondary-foreground/30" aria-hidden="true" />
          <div className="mx-auto grid w-full max-w-lg gap-4 wide:max-w-3xl wide:grid-cols-[minmax(240px,0.75fr)_minmax(320px,1fr)] wide:items-start wide:gap-5">
            <div className="flex flex-col gap-3">
              <NumberReadout
                display={display}
                pending={p.pending}
                softDelay={p.softDelay}
                onBackspace={p.backspace}
              />
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
            <Keypad onDigit={p.pressDigit} onClear={p.clearEntry} onSubmit={submitFromSheet} />
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
