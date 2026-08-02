import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Heart, Lock, Share2 } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Kural } from "@/data/sample-kurals";
import { useTheme } from "@/components/theme/ThemeProvider";

interface VerseDisplayProps {
  kural: Kural;
  isFavourite: boolean;
  onToggleFavourite: () => void;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  locked?: boolean;
}

export function VerseDisplay({
  kural,
  isFavourite,
  onToggleFavourite,
  canPrev,
  canNext,
  onPrev,
  onNext,
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
    <div className="flex h-full w-full min-w-0 flex-col">
      <AnimatePresence mode="wait">
        <motion.article
          key={kural.number}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          aria-label={`Kural ${kural.number}, chapter ${kural.chapter}`}
          className="flex h-full min-w-0 flex-col"
        >
          <div className="flex flex-col items-center text-center">
            <div className="flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 font-tamil text-xs text-muted-foreground sm:text-sm">
              <span>{kural.section}</span>
              <span className="h-4 w-px bg-border" aria-hidden="true" />
              <h1 className="font-semibold text-primary">
                {kural.chapterNumber}. {kural.chapter}
              </h1>
            </div>
            <span className="mt-4 inline-flex min-h-9 items-center rounded-full bg-primary px-4 py-1.5 font-tamil text-sm font-semibold text-primary-foreground shadow-sm">
              குறள் {kural.number}
            </span>
          </div>

          <div className="reading-divider my-5" aria-hidden="true" />

          <div className="flex min-h-[8rem] flex-1 items-center px-1 py-2 sm:min-h-[10rem] sm:px-5">
            {/* The source text carries a hard line break. Never re-wrap:
                both source lines stay nowrap and share one auto-fitted size. */}
            <VerseLines text={kural.tamil} />
          </div>

          <div className="reading-divider my-5" aria-hidden="true" />

          {locked ? (
            <div
              className="rounded-2xl border border-border bg-muted/40 px-4 py-4 text-center"
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

          <div className="mt-5 grid shrink-0 grid-cols-[minmax(0,1fr)_auto_auto_minmax(0,1fr)] items-center gap-2 border-t border-border/70 pt-4">
            <button
              type="button"
              onClick={onPrev}
              disabled={!canPrev}
              aria-label="Read earlier kural"
              className="inline-flex min-h-12 min-w-0 items-center justify-self-start gap-2 rounded-xl border border-border bg-background/35 px-3 text-sm font-medium text-foreground transition hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden brand:inline">Previous</span>
            </button>
            <button
              type="button"
              onClick={onToggleFavourite}
              aria-pressed={isFavourite}
              aria-label={
                isFavourite
                  ? `Remove kural ${kural.number} from favourites`
                  : `Add kural ${kural.number} to favourites`
              }
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Heart
                className={`h-5 w-5 ${isFavourite ? "fill-primary text-primary" : ""}`}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={share}
              aria-label={`Share kural ${kural.number}`}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copied ? (
                <Check className="h-5 w-5 text-primary" aria-hidden="true" />
              ) : (
                <Share2 className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!canNext}
              aria-label="Read next kural"
              className="inline-flex min-h-12 min-w-0 items-center justify-self-end gap-2 rounded-xl border border-border bg-background/35 px-3 text-sm font-medium text-foreground transition hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4"
            >
              <span className="hidden brand:inline">Next</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
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
    <div className="meaning-box rounded-2xl border border-border/80 bg-background/45 px-4 py-4 text-center sm:px-6 sm:py-5">
      <p
        data-fit-probe="meaning"
        className="font-tamil text-sm leading-relaxed text-foreground/80 sm:text-[0.95rem]"
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
    <p ref={wrapRef} className="w-full font-tamil font-semibold text-card-foreground">
      {lines.map((line, i) => (
        <span key={i} className="block w-full overflow-hidden text-center">
          <span
            ref={(el) => (lineRefs.current[i] = el)}
            data-fit-probe="verse-line"
            className="inline-block whitespace-nowrap text-[clamp(1.05rem,2.35vw,2rem)] leading-[1.95]"
          >
            {line}
          </span>
        </span>
      ))}
    </p>
  );
}
