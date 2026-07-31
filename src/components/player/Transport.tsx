import { Loader2, Pause, Play, Repeat, SkipBack, SkipForward } from "lucide-react";
import type { AudioState } from "@/hooks/useKuralPlayer";

interface TransportProps {
  isPlaying: boolean;
  audioState: AudioState;
  canPrev: boolean;
  canNext: boolean;
  continuous: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
  onToggleContinuous: () => void;
}

export function Transport({
  isPlaying,
  audioState,
  canPrev,
  canNext,
  continuous,
  onPrev,
  onNext,
  onToggle,
  onToggleContinuous,
}: TransportProps) {
  const loading = audioState === "loading" && !isPlaying;

  return (
    <div className="flex items-center justify-center gap-3 short:gap-2 sm:gap-4" role="group" aria-label="Playback controls">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label="Previous kural"
        className="min-h-11 min-w-11 short:min-h-9 short:min-w-9 p-2.5 short:p-1.5 rounded-full text-secondary-foreground/80 disabled:opacity-30 hover:text-primary transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <SkipBack className="w-6 h-6 short:w-5 short:h-5 mx-auto" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onToggle}
        aria-label={isPlaying ? "Pause audio" : "Play audio"}
        aria-pressed={isPlaying}
        className="w-[clamp(40px,8vh,68px)] h-[clamp(40px,8vh,68px)] rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_12px_30px_-12px_hsl(var(--gold)/0.9)] hover:brightness-110 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
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
        disabled={!canNext}
        aria-label="Next kural"
        className="min-h-11 min-w-11 short:min-h-9 short:min-w-9 p-2.5 short:p-1.5 rounded-full text-secondary-foreground/80 disabled:opacity-30 hover:text-primary transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <SkipForward className="w-6 h-6 short:w-5 short:h-5 mx-auto" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onToggleContinuous}
        aria-pressed={continuous}
        aria-label={continuous ? "Turn off continuous play" : "Turn on continuous play"}
        className={`min-h-11 min-w-11 p-2 rounded-full transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
          continuous ? "text-primary" : "text-secondary-foreground/60 hover:text-secondary-foreground"
        }`}
      >
        <Repeat className="w-5 h-5 mx-auto" aria-hidden="true" />
      </button>
    </div>
  );
}
