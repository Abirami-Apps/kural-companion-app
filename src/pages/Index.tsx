import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getKural,
  getRandomKural,
  TOTAL_KURALS,
  FREE_LIMIT,
  type Kural,
} from "@/data/sample-kurals";
import { motion, AnimatePresence } from "framer-motion";
import {
  Delete,
  Lock,
  Pause,
  Play,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";

const pad4 = (n: number) => n.toString().padStart(4, "0");
const fmt = (s: number) =>
  Number.isFinite(s)
    ? `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`
    : "0:00";

const Index = () => {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [entry, setEntry] = useState("");
  const [current, setCurrent] = useState<Kural>(() => getKural(1)!);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  const isLocked = current.number > FREE_LIMIT && false; // subscription gating placeholder

  const load = useCallback((num: number, play = false) => {
    if (num < 1 || num > TOTAL_KURALS) return;
    const k = getKural(num);
    if (!k) return;
    setCurrent(k);
    setEntry("");
    setProgress(0);
    setAutoPlay(play);
    setIsPlaying(play);
  }, []);

  // Load audio source whenever the kural changes
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.load();
    if (autoPlay) el.play().catch(() => setIsPlaying(false));
  }, [current.number, autoPlay]);

  const pressDigit = (d: string) => {
    setEntry((prev) => {
      const next = (prev + d).replace(/^0+/, "").slice(0, 4);
      const num = parseInt(next || "0", 10);
      if (num > TOTAL_KURALS) return prev;
      return next;
    });
  };

  const backspace = () => setEntry((p) => p.slice(0, -1));

  const submit = () => {
    const num = parseInt(entry || "0", 10);
    if (num >= 1 && num <= TOTAL_KURALS) load(num, true);
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el || isLocked) return;
    if (el.paused) {
      el.play().catch(() => {});
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const display = entry ? entry.padStart(4, "0") : pad4(current.number);

  return (
    <div className="h-[100dvh] w-full flex flex-col landscape:flex-row overflow-hidden bg-background">
      {/* ================= DISPLAY PANEL ================= */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center px-5 py-6 landscape:px-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
          Thirukkural
        </p>
        <p className="font-tamil text-xs sm:text-sm text-primary font-semibold mb-4">
          {current.chapterNumber}. {current.chapter} · {current.section}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.number}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-xl"
          >
            <div className="kural-frame rounded-2xl bg-card px-5 py-6 sm:px-8 sm:py-8">
              <p className="font-tamil text-lg sm:text-2xl font-bold leading-relaxed whitespace-pre-line text-foreground">
                {current.tamil}
              </p>
            </div>
            {current.meaning && (
              <p className="font-tamil text-xs sm:text-sm text-muted-foreground leading-relaxed mt-4 max-h-24 overflow-y-auto px-2">
                {current.meaning}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ================= CONTROL PANEL ================= */}
      <aside className="bg-secondary text-secondary-foreground w-full landscape:w-[360px] landscape:h-full flex flex-col justify-center gap-3 px-4 py-4 landscape:py-6 shrink-0">
        {/* Digital readout */}
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-xl bg-[hsl(228_40%_10%)] border border-primary/30 px-4 py-2 flex items-baseline justify-between">
            <span className="digital-display text-3xl font-bold text-[hsl(200_80%_75%)]">
              {display}
            </span>
            <span className="text-[10px] text-secondary-foreground/50 tracking-widest">
              / {TOTAL_KURALS}
            </span>
          </div>
          <button
            onClick={backspace}
            aria-label="Delete digit"
            className="h-12 w-12 rounded-xl bg-secondary-foreground/5 border border-secondary-foreground/10 flex items-center justify-center hover:bg-secondary-foreground/10 active:scale-95 transition"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 text-[10px] text-secondary-foreground/60">
          <span className="tabular-nums w-8">{fmt(progress)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={progress}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (audioRef.current) audioRef.current.currentTime = v;
              setProgress(v);
            }}
            aria-label="Seek"
            className="flex-1 h-1 accent-primary cursor-pointer"
          />
          <span className="tabular-nums w-8 text-right">{fmt(duration)}</span>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <Key key={d} label={d} onClick={() => pressDigit(d)} />
          ))}
          <Key label="0" onClick={() => pressDigit("0")} />
          <Key label="GO" onClick={submit} accent />
          <Key
            label={<Shuffle className="w-5 h-5 mx-auto" />}
            onClick={() => load(getRandomKural().number, true)}
          />
        </div>

        {/* Transport */}
        <div className="flex items-center justify-center gap-6 pt-1">
          <button
            onClick={() => load(current.number - 1, isPlaying)}
            disabled={current.number <= 1}
            aria-label="Previous kural"
            className="p-2 disabled:opacity-30 hover:text-primary transition active:scale-95"
          >
            <SkipBack className="w-6 h-6" />
          </button>
          <button
            onClick={isLocked ? () => navigate("/subscribe") : togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 active:scale-95 transition"
          >
            {isLocked ? (
              <Lock className="w-6 h-6" />
            ) : isPlaying ? (
              <Pause className="w-7 h-7" />
            ) : (
              <Play className="w-7 h-7 ml-1" />
            )}
          </button>
          <button
            onClick={() => load(current.number + 1, isPlaying)}
            disabled={current.number >= TOTAL_KURALS}
            aria-label="Next kural"
            className="p-2 disabled:opacity-30 hover:text-primary transition active:scale-95"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>
      </aside>

      <audio
        ref={audioRef}
        src={current.audioUrl}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onEnded={() => {
          setIsPlaying(false);
          load(current.number + 1, true);
        }}
      />
    </div>
  );
};

function Key({
  label,
  onClick,
  accent,
}: {
  label: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className={`h-11 sm:h-12 rounded-xl text-lg font-bold border transition-colors ${
        accent
          ? "bg-primary/20 text-primary border-primary/40 hover:bg-primary/30 text-sm tracking-widest"
          : "bg-secondary-foreground/5 border-secondary-foreground/10 hover:bg-secondary-foreground/10"
      }`}
    >
      {label}
    </motion.button>
  );
}

export default Index;
