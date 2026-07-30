import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Heart, Share2 } from "lucide-react";
import { useState } from "react";
import type { Kural } from "@/data/sample-kurals";

interface VerseDisplayProps {
  kural: Kural;
  isFavourite: boolean;
  onToggleFavourite: () => void;
}

export function VerseDisplay({
  kural,
  isFavourite,
  onToggleFavourite,
}: VerseDisplayProps) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/?k=${kural.number}`;
    const text = `குறள் ${kural.number}\n${kural.tamil}\n\n${url}`;
    try {
      if (navigator.share) await navigator.share({ title: `குறள் ${kural.number}`, text, url });
      else await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* dismissed */
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.article
          key={kural.number}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
            {kural.section}
          </p>
          <h1 className="font-tamil text-sm sm:text-base font-semibold text-primary mb-5">
            {kural.chapterNumber}. {kural.chapter}
          </h1>

          <div className="verse-card relative rounded-[1.75rem] bg-card px-6 py-8 sm:px-10 sm:py-11">
            <span className="absolute left-6 sm:left-10 -top-3 digital-display text-[11px] px-2.5 py-0.5 rounded-full bg-card border border-primary/30 text-primary">
              {kural.number}
            </span>
            <p className="font-tamil text-[1.35rem] sm:text-[1.7rem] font-semibold leading-[2.1] whitespace-pre-line text-foreground text-balance">
              {kural.tamil}
            </p>
          </div>

          {kural.meaning && (
            <div className="mt-5 pt-4 border-t border-border/60 max-h-28 overflow-y-auto">
              <p className="font-tamil text-[0.82rem] sm:text-sm text-muted-foreground leading-relaxed">
                {kural.meaning}
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onToggleFavourite}
              aria-pressed={isFavourite}
              aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
              className="h-9 w-9 rounded-full border border-border/70 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <Heart
                className={`w-4 h-4 ${isFavourite ? "fill-primary text-primary" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={share}
              aria-label="Share this kural"
              className="h-9 w-9 rounded-full border border-border/70 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </motion.article>
      </AnimatePresence>
    </div>
  );
}
