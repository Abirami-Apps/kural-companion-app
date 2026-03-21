import { useParams, useNavigate } from "react-router-dom";
import { getKural, FREE_LIMIT, TOTAL_KURALS } from "@/data/sample-kurals";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Play, Pause, Music } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";

const KuralPlayer = () => {
  const { number } = useParams<{ number: string }>();
  const navigate = useNavigate();
  const kuralNum = parseInt(number || "0", 10);
  const kural = getKural(kuralNum);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isPremium = kuralNum > FREE_LIMIT;
  // TODO: Check actual subscription status
  const isSubscribed = false;
  const isLocked = isPremium && !isSubscribed;

  const togglePlay = () => {
    if (!audioRef.current || isLocked) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (kuralNum < 1 || kuralNum > TOTAL_KURALS) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-muted-foreground mb-4">Invalid Kural number</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </motion.div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Kural number badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
            <Music className="w-3.5 h-3.5" />
            குறள் {kuralNum}
          </span>
        </motion.div>

        {/* Verse */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-8"
        >
          {kural ? (
            <>
              <p className="font-tamil text-xl leading-relaxed text-foreground whitespace-pre-line">
                {kural.tamil}
              </p>
            </>
          ) : (
            <p className="font-tamil text-lg text-muted-foreground">
              Kural data not yet loaded. Please upload your JSON files.
            </p>
          )}
        </motion.div>

        {/* Chapter info */}
        {kural && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex gap-3 text-xs text-muted-foreground mb-10"
          >
            <span className="font-tamil">{kural.section}</span>
            <span>·</span>
            <span className="font-tamil">{kural.chapter}</span>
          </motion.div>
        )}

        {/* Player */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-xs"
        >
          {isLocked ? (
            <div className="text-center">
              <div className="bg-secondary rounded-2xl p-8 mb-4">
                <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">
                  Premium Content
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Subscribe to listen to all 1,330 kurals
                </p>
              </div>
              <Button
                onClick={() => navigate("/subscribe")}
                className="w-full rounded-xl h-12"
              >
                View Plans
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <button
                onClick={togglePlay}
                className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors active:scale-95"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 ml-1" />
                )}
              </button>
              <p className="text-xs text-muted-foreground mt-4">
                {isPlaying ? "Playing..." : "Tap to play"}
              </p>
              {kural?.audioUrl && (
                <audio
                  ref={audioRef}
                  src={kural.audioUrl}
                  onEnded={() => setIsPlaying(false)}
                />
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="flex justify-between mt-8"
      >
        <Button
          variant="ghost"
          size="sm"
          disabled={kuralNum <= 1}
          onClick={() => navigate(`/kural/${kuralNum - 1}`)}
        >
          ← Previous
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={kuralNum >= TOTAL_KURALS}
          onClick={() => navigate(`/kural/${kuralNum + 1}`)}
        >
          Next →
        </Button>
      </motion.div>
    </div>
  );
};

export default KuralPlayer;
