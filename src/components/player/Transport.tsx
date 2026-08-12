import { Loader2, Pause, Play, Repeat1, SkipBack, SkipForward } from "lucide-react";
import type { AudioState } from "@/hooks/useKuralPlayer";

interface TransportProps {
  isPlaying: boolean;
  audioState: AudioState;
  canPrev: boolean;
  canNext: boolean;
  loopOne: boolean;
  disabled?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
  onToggleLoopOne: () => void;
}

export function Transport({
  isPlaying,
  audioState,
  canPrev,
  canNext,
  loopOne,
  disabled = false,
  onPrev,
  onNext,
  onToggle,
  onToggleLoopOne,
}: TransportProps) {
  // "Loading" only while audio is genuinely loading, never as a resting state.
  const loading = audioState === "loading" && !isPlaying;

  return (
    <div
      className="flex items-center justify-center gap-2 sm:gap-4"
      role="group"
      aria-label="Playback controls"
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev || disabled}
        aria-label="Previous kural"
        className="h-11 w-11 shrink-0 rounded-full text-secondary-foreground/80 disabled:opacity-30 disabled:cursor-not-allowed hover:text-primary transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <SkipBack className="w-5 h-5 mx-auto" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={
          audioState === "error"
            ? "Retry audio"
            : isPlaying
              ? "Pause audio"
              : "Play audio"
        }
        aria-pressed={isPlaying}
        className="h-[clamp(48px,8vh,68px)] w-[clamp(48px,8vh,68px)] shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_12px_30px_-12px_hsl(var(--gold)/0.9)] hover:brightness-110 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
      >
        {loading ? (
          <Loader2 className="w-7 h-7 animate-spin" aria-hidden="true" />
        ) : isPlaying ? (
          <Pause className="w-7 h-7" aria-hidden="true" />
        ) : (
          <Play className="w-7 h-7 ml-1" aria-hidden="true" />
        )}
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={!canNext || disabled}
        aria-label="Next kural"
        className="h-11 w-11 shrink-0 rounded-full text-secondary-foreground/80 disabled:opacity-30 disabled:cursor-not-allowed hover:text-primary transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <SkipForward className="w-5 h-5 mx-auto" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onToggleLoopOne}
        disabled={disabled}
        aria-pressed={loopOne}
        aria-label="Loop current kural"
        title={loopOne ? "Loop one: on" : "Loop one: off — play the next Kural automatically"}
        className={`h-11 w-11 shrink-0 rounded-full transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
          loopOne ? "text-gold-light" : "text-secondary-foreground/60 hover:text-secondary-foreground"
        }`}
      >
        <Repeat1 className="w-5 h-5 mx-auto" aria-hidden="true" />
      </button>
    </div>
  );
}
