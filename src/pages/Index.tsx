import { Delete, Keyboard } from "lucide-react";
import { TOTAL_KURALS } from "@/data/sample-kurals";
import { useKuralPlayer } from "@/hooks/useKuralPlayer";
import { Keypad } from "@/components/player/Keypad";
import { Transport } from "@/components/player/Transport";
import { VerseDisplay } from "@/components/player/VerseDisplay";
import { ShortcutsDialog } from "@/components/player/ShortcutsDialog";

const pad4 = (n: number) => n.toString().padStart(4, "0");
const fmt = (s: number) =>
  Number.isFinite(s) && s > 0
    ? `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`
    : "0:00";

const Index = () => {
  const p = useKuralPlayer();
  const display = p.entry ? p.entry.padStart(4, "0") : pad4(p.current.number);

  return (
    <div id="player" className="flex min-h-0 flex-1 flex-col wide:flex-row lg:flex-row">
      {/* ============ VERSE ============ */}
      <section
        aria-label="Kural verse"
        className="flex-1 min-h-0 px-5 py-3 short:py-2 sm:py-6 lg:px-10 text-center overflow-y-auto"
      >
        <div className="min-h-full flex flex-col items-center justify-center gap-4">
          <VerseDisplay
            kural={p.current}
            isFavourite={p.isFavourite}
            onToggleFavourite={p.toggleFavourite}
          />
        </div>
      </section>

      {/* ============ CONTROLS ============ */}
      <aside
        aria-label="Player controls"
        className="control-rail bg-secondary text-secondary-foreground w-full wide:w-[340px] lg:w-[380px] shrink-0 flex flex-col justify-center gap-2 short:gap-1.5 sm:gap-3.5 px-4 py-3 short:py-2 sm:py-5 lg:px-7 lg:py-8"
      >
        {/* Readout */}
        <div className="w-full max-w-[380px] mx-auto flex items-center gap-2">
          <div className="relative flex-1 min-w-0 overflow-hidden rounded-2xl bg-secondary-foreground/[0.06] border border-secondary-foreground/15 px-3 py-2 sm:py-2.5 flex items-center justify-between gap-2">
            <span className="lcd shrink-0" aria-hidden="true">
              <span className="lcd-ghost digital-display text-[clamp(1.25rem,min(7vw,4.6vh),2rem)] font-bold">8888</span>
              <span className="digital-display relative text-[clamp(1.25rem,min(7vw,4.6vh),2rem)] font-bold text-primary">
                {display}
              </span>
            </span>
            <span className="sr-only" role="status">
              {p.entry
                ? `Entering ${p.entry}`
                : `Kural ${p.current.number} of ${TOTAL_KURALS}`}
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
            className="h-[clamp(40px,7vh,48px)] w-[clamp(40px,7vh,48px)] shrink-0 rounded-2xl bg-secondary-foreground/[0.06] border border-secondary-foreground/10 flex items-center justify-center hover:bg-secondary-foreground/[0.12] active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <Delete className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => p.setShortcutsOpen(true)}
            aria-label="Show keyboard shortcuts"
            className="hidden sm:flex h-[clamp(40px,7vh,48px)] w-[clamp(40px,7vh,48px)] shrink-0 rounded-2xl bg-secondary-foreground/[0.06] border border-secondary-foreground/10 items-center justify-center hover:bg-secondary-foreground/[0.12] active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <Keyboard className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <p
          className="text-[0.7rem] text-center text-secondary-foreground/60 tracking-wide min-h-[14px] short:hidden"
          role="status"
        >
          {p.audioState === "error"
            ? "Audio unavailable — showing verse"
            : p.pending
              ? "Playing…"
              : !p.hintSeen
                ? `Type a number 1–${TOTAL_KURALS}`
                : ""}
        </p>


        {/* Recents */}
        {p.recents.length > 1 && (
          <nav aria-label="Recently played" className="hidden short:hidden sm:flex items-center justify-center gap-1.5 flex-wrap">
            {p.recents.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => p.load(n, true)}
                aria-current={n === p.current.number ? "true" : undefined}
                aria-label={`Play kural ${n}`}
                className={`px-3 py-1.5 rounded-full text-[0.7rem] tabular-nums border transition ${
                  n === p.current.number
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
        <div className="w-full max-w-[380px] mx-auto flex items-center gap-2 text-[0.65rem] text-secondary-foreground/70">
          <span className="tabular-nums w-8">{fmt(p.progress)}</span>
          <input
            type="range"
            min={0}
            max={p.duration || 0}
            step={0.1}
            value={p.progress}
            onChange={(e) => p.seek(Number(e.target.value))}
            aria-label="Seek audio position"
            aria-valuetext={`${fmt(p.progress)} of ${fmt(p.duration)}`}
            className="flex-1 h-1 accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          />
          <span className="tabular-nums w-8 text-right">{fmt(p.duration)}</span>
        </div>

        <Keypad onDigit={p.pressDigit} onClear={p.clearEntry} onShuffle={p.shuffle} />

        <Transport
          isPlaying={p.isPlaying}
          audioState={p.audioState}
          canPrev={p.current.number > 1}
          canNext={p.current.number < TOTAL_KURALS}
          continuous={p.continuous}
          onPrev={() => p.load(p.current.number - 1, p.isPlaying)}
          onNext={() => p.load(p.current.number + 1, p.isPlaying)}
          onToggle={p.togglePlay}
          onToggleContinuous={() => p.setContinuous((c) => !c)}
        />
      </aside>

      <ShortcutsDialog open={p.shortcutsOpen} onOpenChange={p.setShortcutsOpen} />

      <audio ref={p.audioRef} src={p.current.audioUrl} preload="metadata" {...p.audioHandlers} />
      {p.neighbours.map((src) => (
        <link key={src} rel="prefetch" as="audio" href={src} />
      ))}
    </div>
  );
};

export default Index;
