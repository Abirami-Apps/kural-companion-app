import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Heart, Lock, Share2 } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Kural } from "@/data/sample-kurals";
import { useTheme } from "@/components/theme/ThemeProvider";

interface VerseDisplayProps {
  kural: Kural;
  isFavourite: boolean;
  onToggleFavourite: () => void;
  locked?: boolean;
}

export function VerseDisplay({
  kural,
  isFavourite,
  onToggleFavourite,
  locked = false,
}: VerseDisplayProps) {
  const systemReduce = useReducedMotion();
  const { reducedMotion } = useTheme();
  const reduce = systemReduce || reducedMotion;
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/kural/${kural.number}`;
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
    <div className="w-full max-w-[46rem] mx-auto flex h-full min-h-0 flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.article
          key={kural.number}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          aria-label={`Kural ${kural.number}, chapter ${kural.chapter}`}
          className="flex h-full min-h-0 flex-col justify-center gap-1"
        >
          <p className="hidden text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground font-tamil sm:block short:hidden">
            {kural.section}
          </p>
          <h1 className="font-tamil text-sm sm:text-base font-semibold text-primary mb-2 short:hidden wide:block">
            {kural.chapterNumber}. {kural.chapter}
          </h1>

          <div className="relative pt-4 shrink-0">
            <span className="absolute left-6 sm:left-10 top-0 z-10 digital-display text-[0.7rem] leading-none px-2.5 py-1.5 rounded-full bg-card border border-primary/40 text-primary shadow-sm">
              {kural.number}
            </span>
            <div className="verse-card rounded-[1.75rem] bg-card px-5 py-3 short:!py-3 sm:px-10 sm:py-5 wide:px-5 split:px-8 lg:px-10 lg:py-8">
              {/* The source text carries a hard line break. Never re-wrap:
                  both source lines stay nowrap and share one auto-fitted size. */}
              <VerseLines text={kural.tamil} />
            </div>
          </div>

          {locked ? (
            <div
              className="mt-3 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-center"
              lang="en"
            >
              <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-foreground">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Subscribers only
              </p>
              <Link
                to="/subscribe"
                className="mt-1 inline-flex min-h-11 items-center text-xs text-primary underline underline-offset-4"
              >
                See subscription options
              </Link>
            </div>
          ) : (
            kural.meaning && <Meaning text={kural.meaning} />
          )}

          {/* Actions sit directly under the meaning so the reading group stays together. */}
          <div className="mt-3 shrink-0 flex items-center justify-center gap-2">
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

function Meaning({ text }: { text: string }) {
  return (
    <div className="meaning-box mt-3 min-h-0 flex-1 overflow-hidden border-t border-border pt-1">
      <p
        data-fit-probe="meaning"
        className="font-tamil text-[0.9rem] sm:text-[0.95rem] text-foreground/80 leading-snug overflow-hidden"
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 2,
        }}
      >
        {text}
      </p>
    </div>
  );
}

/**
 * Renders the kural's stored source lines on exactly one visual line each.
 * The line break comes from the source data and must never be re-wrapped, so
 * both lines are nowrap and share a single font size — the largest size at
 * which the widest line still fits its container.
 */
function VerseLines({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const wrapRef = useRef<HTMLParagraphElement>(null);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const fit = () => {
      const available = wrap.clientWidth;
      const els = lineRefs.current.filter(Boolean) as HTMLSpanElement[];
      if (!available || !els.length) return;

      els.forEach((el) => (el.style.fontSize = ""));
      const base = parseFloat(getComputedStyle(els[0]).fontSize);
      const widest = Math.max(...els.map((el) => el.scrollWidth));
      if (!widest) return;
      const next = widest > available ? Math.max(14, (base * available) / widest) : base;
      els.forEach((el) => (el.style.fontSize = `${next}px`));
    };

    // Instant reflow: measure on every layout-affecting signal, and once more
    // after the browser settles a rotation (mobile reports stale sizes first).
    let settle = 0;
    const reflow = () => {
      fit();
      requestAnimationFrame(fit);
      window.clearTimeout(settle);
      settle = window.setTimeout(fit, 250);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    window.addEventListener("orientationchange", reflow);
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    const mq = window.matchMedia("(orientation: portrait)");
    mq.addEventListener("change", reflow);
    if (document.fonts?.ready) document.fonts.ready.then(fit).catch(() => {});
    return () => {
      window.clearTimeout(settle);
      ro.disconnect();
      window.removeEventListener("orientationchange", reflow);
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
      mq.removeEventListener("change", reflow);
    };
  }, [text]);

  return (
    <p ref={wrapRef} className="font-tamil font-semibold text-card-foreground">
      {lines.map((line, i) => (
        <span key={i} className="block w-full overflow-hidden text-center">
          <span
            ref={(el) => (lineRefs.current[i] = el)}
            data-fit-probe="verse-line"
            className="inline-block whitespace-nowrap text-[clamp(1rem,min(5vw,3.6vh),1.7rem)] leading-[1.9]"
          >
            {line}
          </span>
        </span>
      ))}
    </p>
  );
}
