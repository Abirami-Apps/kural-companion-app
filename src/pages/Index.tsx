import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getKural,
  getRandomKural,
  TOTAL_KURALS,
  FREE_LIMIT,
  SECTIONS,
  type Kural,
} from "@/data/sample-kurals";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Pause, Play } from "lucide-react";

type InputMode = "kural" | "adhikaram";

const DIGIT_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

const Index = () => {
  const [input, setInput] = useState("0001");
  const [currentKural, setCurrentKural] = useState<Kural | undefined>(getKural(1));
  const [isPlaying, setIsPlaying] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("kural");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const navigate = useNavigate();

  const isPremium = currentKural && currentKural.number > FREE_LIMIT;
  const isSubscribed = false;
  const isLocked = isPremium && !isSubscribed;

  const padNumber = (n: number) => n.toString().padStart(4, "0");

  const loadKural = useCallback((num: number) => {
    if (num < 1 || num > TOTAL_KURALS) return;
    const k = getKural(num);
    if (k) {
      setCurrentKural(k);
      setInput(padNumber(num));
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, []);

  const handleDigit = useCallback(
    (digit: string) => {
      setInput((prev) => {
        const newVal = prev === "0000" ? digit.padStart(4, "0") : (prev + digit).slice(-4);
        return newVal;
      });
    },
    []
  );

  const handleGo = useCallback(() => {
    const num = parseInt(input, 10);
    if (num >= 1 && num <= TOTAL_KURALS) {
      loadKural(num);
    }
  }, [input, loadKural]);

  useEffect(() => {
    // Auto-load when input forms a valid number
    const num = parseInt(input, 10);
    if (num >= 1 && num <= TOTAL_KURALS) {
      const k = getKural(num);
      if (k) setCurrentKural(k);
    }
  }, [input]);

  const togglePlay = () => {
    if (!audioRef.current || isLocked) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleRandom = () => {
    const k = getRandomKural();
    loadKural(k.number);
  };

  const handlePlayAll = () => {
    loadKural(1);
    setActiveSection(null);
  };

  const handleSectionFilter = (section: string) => {
    setActiveSection(section === activeSection ? null : section);
  };

  const handleClear = () => {
    setInput("0000");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ===== TOP SECTION (Cream) ===== */}
      <div className="flex-1 bg-background px-4 pt-4 pb-3 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button className="w-10 h-10 rounded-lg border-2 border-primary flex items-center justify-center text-primary hover:bg-primary/10 transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-tamil text-lg font-bold text-foreground tracking-wide">
            {currentKural ? (
              <>{currentKural.chapterNumber}.{currentKural.chapter}</>
            ) : (
              "திருக்குறள்"
            )}
          </h1>
          <div className="w-10" /> {/* spacer */}
        </div>

        {/* Kural Frame */}
        <div className="kural-frame rounded-lg px-5 py-6 bg-card mb-3">
          {currentKural ? (
            <p className="font-tamil text-xl sm:text-2xl md:text-3xl font-bold leading-relaxed text-foreground text-center">
              {currentKural.tamil}
            </p>
          ) : (
            <p className="font-tamil text-lg text-muted-foreground text-center">
              குறள் எண்ணை உள்ளிடவும்
            </p>
          )}
        </div>

        {/* Section & Chapter info */}
        {currentKural && (
          <p className="font-tamil text-xs sm:text-sm text-muted-foreground text-center leading-relaxed px-2 mb-2">
            {currentKural.section} · {currentKural.chapter}
          </p>
        )}
      </div>

      {/* ===== BOTTOM SECTION (Navy) ===== */}
      <div className="bg-secondary px-3 pt-3 pb-4">
        {/* Section Filter Buttons */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          <FilterButton
            label="PLAY ALL"
            active={!activeSection}
            onClick={handlePlayAll}
          />
          {SECTIONS.map((s) => (
            <FilterButton
              key={s}
              label={s}
              active={activeSection === s}
              onClick={() => handleSectionFilter(s)}
              tamil
            />
          ))}
          <FilterButton
            label="RANDOM"
            onClick={handleRandom}
            dotColor="red"
          />
        </div>

        {/* Keypad + Controls Row */}
        <div className="flex gap-2">
          {/* Number Keys */}
          <div className="grid grid-cols-5 gap-1.5 flex-1">
            {DIGIT_KEYS.slice(0, 5).map((d) => (
              <KeyButton key={d} label={d} onClick={() => handleDigit(d)} />
            ))}
            {DIGIT_KEYS.slice(5).map((d) => (
              <KeyButton key={d} label={d} onClick={() => handleDigit(d)} />
            ))}
          </div>

          {/* Play/Pause */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={isLocked ? () => navigate("/subscribe") : togglePlay}
              className="flex-1 w-16 sm:w-20 rounded-xl bg-secondary-foreground/5 border border-primary/30 flex items-center justify-center text-secondary-foreground hover:bg-secondary-foreground/10 transition-colors active:scale-95"
            >
              {isLocked ? (
                <span className="text-xs font-tamil">🔒</span>
              ) : isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </button>
          </div>

          {/* Digital Display + Mode Toggle */}
          <div className="flex flex-col gap-1.5">
            <div className="flex-1 w-24 sm:w-28 rounded-xl bg-[hsl(228_40%_12%)] border border-primary/30 flex items-center justify-center px-2">
              <span className="digital-display text-2xl sm:text-3xl text-[hsl(200_80%_75%)] font-bold">
                {input}
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setInputMode("kural")}
                className={`flex-1 rounded-lg py-1 text-[10px] font-tamil font-medium flex items-center justify-center gap-1 transition-colors ${
                  inputMode === "kural"
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-secondary-foreground/5 text-secondary-foreground/60 border border-secondary-foreground/10"
                }`}
              >
                <span className={`indicator-dot ${inputMode === "kural" ? "" : "red"}`} />
                குறள்
              </button>
              <button
                onClick={() => setInputMode("adhikaram")}
                className={`flex-1 rounded-lg py-1 text-[10px] font-tamil font-medium flex items-center justify-center gap-1 transition-colors ${
                  inputMode === "adhikaram"
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-secondary-foreground/5 text-secondary-foreground/60 border border-secondary-foreground/10"
                }`}
              >
                அதிகாரம்
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Audio element */}
      {currentKural?.audioUrl && (
        <audio
          ref={audioRef}
          src={currentKural.audioUrl}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Footer links */}
      <div className="bg-secondary px-4 pb-3 flex justify-center gap-6 text-xs text-secondary-foreground/50">
        <button onClick={() => navigate("/subscribe")} className="hover:text-secondary-foreground transition-colors">
          Subscribe
        </button>
        <button onClick={() => navigate("/login")} className="hover:text-secondary-foreground transition-colors">
          Login
        </button>
      </div>
    </div>
  );
};

/* ===== Sub-components ===== */

function FilterButton({
  label,
  active,
  onClick,
  tamil,
  dotColor = "green",
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  tamil?: boolean;
  dotColor?: "green" | "red";
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
        ${tamil ? "font-tamil" : ""}
        ${
          active
            ? "bg-primary/20 text-primary border-primary/40"
            : "bg-secondary-foreground/5 text-secondary-foreground/70 border-secondary-foreground/15 hover:bg-secondary-foreground/10"
        }
      `}
    >
      {label}
      <span className={`indicator-dot ${dotColor === "red" ? "red" : ""}`} />
    </button>
  );
}

function KeyButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className="h-12 sm:h-14 rounded-xl bg-secondary-foreground/5 border border-secondary-foreground/10 text-secondary-foreground text-xl sm:text-2xl font-bold font-tamil hover:bg-secondary-foreground/10 transition-colors active:scale-95"
    >
      {label}
    </motion.button>
  );
}

export default Index;
