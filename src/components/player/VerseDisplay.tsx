import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Grid3X3, Heart, Lock, Share2 } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
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
  onChooseNumber: () => void;
  locked?: boolean;
  onRequestPremium?: () => void;
}

export function VerseDisplay({
  kural,
  isFavourite,
  onToggleFavourite,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onChooseNumber,
  locked = false,
  onRequestPremium,
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
            <div className="flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 font-tamil text-xs text-muted-foreground sm:text-sm wide:short:!text-[12px]">
              <span>{kural.section}</span>
              <span className="h-4 w-px bg-border" aria-hidden="true" />
              <h1 className="font-semibold text-primary">
                {kural.chapterNumber}. {kural.chapter}
              </h1>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:mt-3 short:mt-1 short:gap-1.5 studio:mt-4">
              <span className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 py-1.5 font-tamil text-sm font-semibold text-primary-foreground shadow-sm wide:short:min-h-[44px] wide:short:text-[14px]">
                குறள் {kural.number}
              </span>
              <button
                type="button"
                onClick={onChooseNumber}
                aria-label={`Choose a Kural number, currently ${kural.number}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/45 bg-background/40 px-4 text-xs font-semibold text-primary transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring wide:short:min-h-[44px] wide:short:px-3 wide:short:text-[12px] studio:hidden"
              >
                <Grid3X3 className="h-4 w-4" aria-hidden="true" />
                <span className="wide:short:hidden">Enter number</span>
                <span className="hidden wide:short:inline">No.</span>
              </button>
              <div className="hidden items-center gap-1 wide:short:flex studio:hidden">
                <button
                  type="button"
                  onClick={onToggleFavourite}
                  aria-pressed={isFavourite}
                  aria-label={
                    isFavourite
                      ? `Remove kural ${kural.number} from favourites`
                      : `Add kural ${kural.number} to favourites`
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring wide:short:h-[44px] wide:short:w-[44px]"
                >
                  <Heart
                    className={`h-4 w-4 ${isFavourite ? "fill-primary text-primary" : ""}`}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  onClick={share}
                  aria-label={`Share kural ${kural.number}`}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring wide:short:h-[44px] wide:short:w-[44px]"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  ) : (
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="reading-divider my-2 sm:my-3 short:my-1 studio:my-3" aria-hidden="true" />

          <div className="flex min-h-14 flex-1 items-center px-1 py-0.5 sm:min-h-20 sm:px-3 short:min-h-12 short:px-1 short:py-0 studio:min-h-28 studio:px-5 studio:py-2">
            {/* The source text carries a hard line break. Never re-wrap:
                both source lines stay nowrap and share one auto-fitted size. */}
            <VerseLines text={kural.tamil} />
          </div>

          <div className="reading-divider my-2 sm:my-3 short:my-1 studio:my-3" aria-hidden="true" />

          {locked ? (
            <div
              className="rounded-2xl border border-border bg-muted/40 px-4 py-4 text-center"
              lang="en"
            >
              <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-foreground">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Subscribers only
              </p>
              <button
                type="button"
                onClick={onRequestPremium}
                className="mt-1 inline-flex min-h-11 items-center text-xs text-primary underline underline-offset-4"
              >
                Start free trial
              </button>
            </div>
          ) : (
            kural.meaning && <Meaning text={kural.meaning} />
          )}

          <div className="mt-2 grid shrink-0 grid-cols-[minmax(0,1fr)_auto_auto_minmax(0,1fr)] items-center gap-1.5 border-t border-border/70 pt-2 sm:mt-3 sm:gap-2 sm:pt-3 short:mt-1 short:pt-1 wide:short:hidden studio:mt-3 studio:grid studio:pt-3">
            <button
              type="button"
              onClick={onPrev}
              disabled={!canPrev}
              aria-label="Read earlier kural"
              className="inline-flex min-h-11 min-w-11 items-center justify-self-start gap-2 rounded-xl border border-border bg-background/35 px-3 text-sm font-medium text-foreground transition hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring studio:min-h-12 studio:px-4"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Previous</span>
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
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring studio:h-12 studio:w-12"
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
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring studio:h-12 studio:w-12"
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
              className="inline-flex min-h-11 min-w-11 items-center justify-self-end gap-2 rounded-xl border border-border bg-background/35 px-3 text-sm font-medium text-foreground transition hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring studio:min-h-12 studio:px-4"
            >
              <span className="hidden sm:inline">Next</span>
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
    <div className="meaning-box shrink-0 rounded-2xl border border-border/80 bg-background/45 px-3 py-2 text-center sm:px-4 sm:py-3 short:px-2 short:py-1 studio:px-5 studio:py-3">
      <p
        data-fit-probe="meaning"
        className="font-tamil text-[0.78rem] leading-snug text-foreground/80 sm:text-sm short:text-[0.7rem] short:leading-snug studio:text-[0.9rem] studio:leading-relaxed"
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
