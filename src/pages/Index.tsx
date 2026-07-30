import { Delete } from "lucide-react";
import logo from "@/assets/logo.png";
import { TOTAL_KURALS } from "@/data/sample-kurals";
import { useKuralPlayer } from "@/hooks/useKuralPlayer";
import { Keypad } from "@/components/player/Keypad";
import { Transport } from "@/components/player/Transport";
import { VerseDisplay } from "@/components/player/VerseDisplay";

const pad4 = (n: number) => n.toString().padStart(4, "0");
const fmt = (s: number) =>
  Number.isFinite(s) && s > 0
    ? `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`
    : "0:00";

const Index = () => {
  const p = useKuralPlayer();
  const display = p.entry ? p.entry.padStart(4, "0") : pad4(p.current.number);

  return (
    <div className="app-surface min-h-[100dvh] h-[100dvh] w-full overflow-hidden flex flex-col lg:flex-row safe-pad">
      {/* ============ VERSE ============ */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 px-5 py-4 lg:px-10 text-center overflow-y-auto">
        <div className="flex items-center gap-2.5">
          <img
            src={logo}
            alt="Thirukkural app logo"
            className="h-9 w-9 rounded-lg object-contain"
            loading="eager"
          />
          <div className="text-left leading-tight">
            <p className="font-tamil text-sm font-bold text-foreground">திருக்குறள்</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Thirukkural
            </p>
          </div>
        </div>

        <VerseDisplay
          kural={p.current}
          isFavourite={p.isFavourite}
          onToggleFavourite={p.toggleFavourite}
        />
      </main>

      {/* ============ CONTROLS ============ */}
      <aside className="control-rail bg-secondary text-secondary-foreground w-full lg:w-[380px] shrink-0 flex flex-col justify-center gap-3.5 px-4 py-4 lg:px-7 lg:py-8">
        {/* Readout */}
        <div className="w-full max-w-[380px] mx-auto flex items-center gap-3">
          <div className="relative flex-1 overflow-hidden rounded-2xl bg-secondary-foreground/[0.06] border border-secondary-foreground/10 px-4 py-2.5 flex items-baseline justify-between">
            <span className="digital-display text-3xl font-bold text-primary tabular-nums">
              {display}
            </span>
            <span className="text-[10px] text-secondary-foreground/45 tracking-widest">
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
            aria-label="Delete digit"
            className="h-12 w-12 rounded-2xl bg-secondary-foreground/[0.06] border border-secondary-foreground/10 flex items-center justify-center hover:bg-secondary-foreground/[0.12] active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[10px] text-center text-secondary-foreground/45 tracking-wide min-h-[14px]">
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
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {p.recents.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => p.load(n, true)}
                className={`px-2.5 py-1 rounded-full text-[11px] tabular-nums border transition ${
                  n === p.current.number
                    ? "border-primary/50 text-primary bg-primary/10"
                    : "border-secondary-foreground/10 text-secondary-foreground/55 hover:text-secondary-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {/* Progress */}
        <div className="w-full max-w-[380px] mx-auto flex items-center gap-2 text-[10px] text-secondary-foreground/55">
          <span className="tabular-nums w-8">{fmt(p.progress)}</span>
          <input
            type="range"
            min={0}
            max={p.duration || 0}
            step={0.1}
            value={p.progress}
            onChange={(e) => p.seek(Number(e.target.value))}
            aria-label="Seek"
            className="flex-1 h-1 accent-primary cursor-pointer"
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

      <audio ref={p.audioRef} src={p.current.audioUrl} preload="metadata" {...p.audioHandlers} />
      {p.neighbours.map((src) => (
        <link key={src} rel="prefetch" as="audio" href={src} />
      ))}
    </div>
  );
};

export default Index;
