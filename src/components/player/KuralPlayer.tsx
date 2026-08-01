import { Delete, Keyboard, Lock, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { TOTAL_KURALS } from "@/data/sample-kurals";
import { useKuralPlayer } from "@/hooks/useKuralPlayer";
import { formatTime } from "@/lib/player-utils";
import { Keypad } from "@/components/player/Keypad";
import { Transport } from "@/components/player/Transport";
import { VerseDisplay } from "@/components/player/VerseDisplay";
import { ShortcutsDialog } from "@/components/player/ShortcutsDialog";
import { Button } from "@/components/ui/button";

const pad4 = (n: number) => n.toString().padStart(4, "0");

/**
 * The one and only player composition. Rendered by `/`, `/?k=123` and
 * `/kural/123` so behaviour can never diverge between entry points.
 */
export function KuralPlayer() {
  const p = useKuralPlayer();
  const display = p.entry ? p.entry.padStart(4, "0") : pad4(p.number);
  const seekDisabled = !p.duration || p.locked;

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

  return (
    <div id="player" className="flex min-h-0 flex-1 flex-col wide:flex-row split:flex-row lg:flex-row">
      {/* ============ VERSE ============ */}
      <section
        aria-label="Kural verse"
        className="flex-1 min-h-0 basis-[54%] wide:basis-auto split:basis-auto px-5 py-3 short:py-2 sm:py-5 lg:px-10 text-center overflow-hidden"
      >
        <div className="h-full min-h-0 flex flex-col items-center justify-center">
          <VerseDisplay
            kural={p.current}
            isFavourite={p.isFavourite}
            onToggleFavourite={p.toggleFavourite}
            locked={p.locked}
          />
        </div>
      </section>

      {/* ============ CONTROLS ============ */}
      <aside
        aria-label="Player controls"
        className="control-rail fit-tighten bg-secondary text-secondary-foreground w-full max-h-[52vh] wide:max-h-none split:max-h-none wide:w-[350px] split:w-[350px] lg:w-[380px] shrink-0 flex flex-col justify-center gap-2 sm:gap-3.5 short:!gap-1.5 px-4 py-3 sm:py-5 short:!py-2 lg:px-7 lg:py-8 overflow-y-auto"
      >
        {/* Readout */}
        <div className="w-full max-w-[380px] mx-auto flex items-center gap-2">
          <div className="relative flex-1 min-w-0 overflow-hidden rounded-2xl bg-secondary-foreground/[0.06] border border-secondary-foreground/15 px-3 py-2 short:py-1.5 sm:py-2.5 flex items-center justify-between gap-2">
            <span className="lcd shrink-0" aria-hidden="true">
              <span className="lcd-ghost digital-display text-[clamp(1.25rem,min(7vw,4.6vh),2rem)] font-bold">8888</span>
              <span data-fit-probe="lcd" className="digital-display relative text-[clamp(1.25rem,min(7vw,4.6vh),2rem)] font-bold text-primary">
                {display}
              </span>
            </span>
            <span className="shrink-0 text-[0.7rem] font-medium tabular-nums text-secondary-foreground/75 tracking-wide">
              / {TOTAL_KURALS}
            </span>
            {p.pending && (
              <span
                key={p.entry}
                className="absolute left-0 bottom-0 h-[3px] bg-primary countdown-bar"
                style={{ animationDuration: `${p.softDelay}ms` }}
              />
            )}
          </div>

          <button
            type="button"
            onClick={p.backspace}
            aria-label="Delete last digit"
            className="h-11 w-11 shrink-0 rounded-2xl bg-secondary-foreground/[0.06] border border-secondary-foreground/10 flex items-center justify-center hover:bg-secondary-foreground/[0.12] active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <Delete className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => p.setShortcutsOpen(true)}
            aria-label="Show keyboard shortcuts"
            className="hidden sm:flex h-11 w-11 shrink-0 rounded-2xl bg-secondary-foreground/[0.06] border border-secondary-foreground/10 items-center justify-center hover:bg-secondary-foreground/[0.12] active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <Keyboard className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Status line */}
        <div
          className="flex min-h-[18px] items-center justify-center gap-2 text-[0.7rem] text-center text-secondary-foreground/70 tracking-wide short:hidden"
          lang="en"
        >
          {p.locked ? (
            <span className="inline-flex items-center gap-1.5 text-secondary-foreground/80">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Subscribers only
            </span>
          ) : p.audioState === "error" ? (
            <>
              <span>Audio unavailable</span>
              <button
                type="button"
                onClick={p.retry}
                className="inline-flex items-center gap-1 rounded-full border border-secondary-foreground/25 px-2 py-0.5 text-secondary-foreground hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" /> Retry
              </button>
            </>
          ) : p.pending ? (
            <span>Loading kural…</span>
          ) : !p.hintSeen ? (
            <span>Type a number 1–{TOTAL_KURALS}</span>
          ) : null}
        </div>

        {/* Recents */}
        {p.recents.length > 1 && (
          <nav aria-label="Recently played" className="hidden tall:flex items-center justify-center gap-1.5 flex-wrap">
            {p.recents.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => p.load(n, true)}
                aria-current={n === p.number ? "true" : undefined}
                aria-label={`Play kural ${n}`}
                className={`px-3 py-1.5 rounded-full text-[0.7rem] tabular-nums border transition ${
                  n === p.number
                    ? "border-primary/60 text-primary bg-primary/10"
                    : "border-secondary-foreground/15 text-secondary-foreground/70 hover:text-secondary-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </nav>
        )}

        {/* Progress */}
        <div className="w-full max-w-[380px] mx-auto flex items-center gap-2 text-[0.65rem] text-secondary-foreground/80">
          <span className="tabular-nums w-8">{formatTime(p.progress)}</span>
          <input
            type="range"
            min={0}
            max={p.duration || 0}
            step={0.1}
            value={p.progress}
            disabled={seekDisabled}
            onChange={(e) => p.seek(Number(e.target.value))}
            aria-label="Seek audio position"
            aria-valuetext={`${formatTime(p.progress)} of ${formatTime(p.duration)}`}
            className="flex-1 h-1 accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          />
          <span className="tabular-nums w-8 text-right">{formatTime(p.duration)}</span>
        </div>

        <Keypad onDigit={p.pressDigit} onClear={p.clearEntry} onShuffle={p.shuffle} />

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
          onToggleContinuous={() => p.setContinuous((c) => !c)}
        />

        {p.locked && (
          <p className="text-center text-[0.7rem] text-secondary-foreground/75" lang="en">
            <Link to="/subscribe" className="underline underline-offset-4 hover:text-primary">
              See subscription options
            </Link>
          </p>
        )}
      </aside>

      <ShortcutsDialog open={p.shortcutsOpen} onOpenChange={p.setShortcutsOpen} />

      <span className="sr-only" role="status" aria-live="polite">
        {p.entry ? `Entering ${p.entry}` : `Kural ${p.number} of ${TOTAL_KURALS}`}
      </span>

      {!p.locked && (
        <audio ref={p.audioRef} src={p.current.audioUrl} preload="metadata" {...p.audioHandlers} />
      )}
      {!p.locked &&
        p.neighbours.map((src) => <link key={src} rel="prefetch" as="audio" href={src} />)}
    </div>
  );
}

export default KuralPlayer;
