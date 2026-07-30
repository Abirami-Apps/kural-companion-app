import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Heart, Share2 } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { Kural } from "@/data/sample-kurals";
import { useTheme } from "@/components/theme/ThemeProvider";

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
  const systemReduce = useReducedMotion();
  const { reducedMotion } = useTheme();
  const reduce = systemReduce || reducedMotion;
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
          aria-label={`Kural ${kural.number}, chapter ${kural.chapter}`}
        >
          <p className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground mb-1.5 font-tamil">
            {kural.section}
          </p>
          <h1 className="font-tamil text-sm sm:text-base font-semibold text-primary mb-5">
            {kural.chapterNumber}. {kural.chapter}
          </h1>

          <div className="relative pt-4">
            <span className="absolute left-6 sm:left-10 top-0 z-10 digital-display text-[0.7rem] leading-none px-2.5 py-1.5 rounded-full bg-card border border-primary/40 text-primary shadow-sm">
              {kural.number}
            </span>
            <div className="verse-card rounded-[1.75rem] bg-card px-5 py-8 sm:px-10 sm:py-11">
              {/* The source text carries a hard line break: 4 words on line 1, 3 on line 2.
                  Never re-wrap — each line is nowrap and auto-scaled to fit its container. */}
              <p className="font-tamil font-semibold text-card-foreground">
                {kural.tamil.split(/\r?\n/).map((line, i) => (
                  <FitLine key={i} text={line} />
                ))}
              </p>
            </div>
          </div>


          {kural.meaning && (
            <div className="mt-5 pt-4 border-t border-border max-h-28 overflow-y-auto">
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
              aria-label={
                isFavourite
                  ? `Remove kural ${kural.number} from favourites`
                  : `Add kural ${kural.number} to favourites`
              }
              className="h-11 w-11 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Heart
                className={`w-4 h-4 ${isFavourite ? "fill-primary text-primary" : ""}`}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={share}
              aria-label={`Share kural ${kural.number}`}
              className="h-11 w-11 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copied ? (
                <Check className="w-4 h-4 text-primary" aria-hidden="true" />
              ) : (
                <Share2 className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
            <span className="sr-only" role="status">
              {copied ? "Kural copied to clipboard" : ""}
            </span>
          </div>
        </motion.article>
      </AnimatePresence>
    </div>
  );
}

/**
 * Renders one source line of a kural on a single visual line.
 * The word count per line (4 then 3) comes from the source data and must never
 * be re-wrapped, so the line is nowrap and scaled down to fit narrow screens
 * and large font scales.
 */
function FitLine({ text }: { text: string }) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;

    const fit = () => {
      const available = wrap.clientWidth;
      const natural = inner.scrollWidth;
      if (!available || !natural) return;
      setScale(Math.min(1, available / natural));
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    if (document.fonts?.ready) document.fonts.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, [text]);

  return (
    <span ref={wrapRef} className="block w-full overflow-hidden text-center">
      <span
        ref={innerRef}
        className="inline-block whitespace-nowrap text-[1.35rem] sm:text-[1.7rem] leading-[2.1] origin-center"
        style={{ transform: scale < 1 ? `scale(${scale})` : undefined }}
      >
        {text}
      </span>
    </span>
  );
}

