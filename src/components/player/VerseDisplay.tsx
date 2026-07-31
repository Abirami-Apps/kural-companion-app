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
  const rootRef = useRef<HTMLDivElement>(null);

  /**
   * Height guard: the width fitter keeps each source line unwrapped, but a
   * short column can still be too small for the whole block. Shrink the shared
   * verse scale (--vfit) until the verse, meaning and actions all fit — never
   * crop them.
   */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    const fitHeight = () => {
      let factor = 1;
      root.style.setProperty("--vfit", "1");
      for (let i = 0; i < 10; i++) {
        if (root.scrollHeight - root.clientHeight <= 2) break;
        factor = Math.max(0.7, factor - 0.06);
        root.style.setProperty("--vfit", String(factor));
      }
    };
    let settle = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fitHeight);
      // Re-run once the browser has settled fonts / rotation, so an early
      // measurement can never leave the verse permanently shrunken.
      window.clearTimeout(settle);
      settle = window.setTimeout(fitHeight, 300);
    };
    schedule();

    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, [kural.number]);

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
    <div ref={rootRef} className="w-full max-w-2xl mx-auto flex h-full min-h-0 flex-col overflow-hidden" aria-live="polite">

      <AnimatePresence mode="wait">
        <motion.article
          key={kural.number}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          aria-label={`Kural ${kural.number}, chapter ${kural.chapter}`}
          className="flex h-full min-h-0 flex-col justify-center"
        >
          <p className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground mb-1 font-tamil short:hidden">
            {kural.section}
          </p>
          <h1 className="font-tamil text-sm sm:text-base font-semibold text-primary mb-3 short:mb-2">
            {kural.chapterNumber}. {kural.chapter}
          </h1>

          <div className="relative pt-4 shrink-0">
            <span className="absolute left-6 sm:left-10 top-0 z-10 digital-display text-[0.7rem] leading-none px-2.5 py-1.5 rounded-full bg-card border border-primary/40 text-primary shadow-sm">
              {kural.number}
            </span>
            <div className="verse-card rounded-[1.75rem] bg-card px-5 py-5 short:py-4 sm:px-10 sm:py-9">
              {/* The source text carries a hard line break: 4 words on line 1, 3 on line 2.
                  Never re-wrap — both lines are nowrap and share one auto-fitted size. */}
              <VerseLines text={kural.tamil} />
            </div>
          </div>


          {kural.meaning && <Meaning text={kural.meaning} />}



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

/**
 * Meaning paragraph that fits the space left over instead of being cropped:
 * it measures its own available height and shows only as many whole lines as
 * fit, adding an ellipsis via line-clamp so text is never half-cut.
 */
function Meaning({ text }: { text: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState(2);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const p = box.firstElementChild as HTMLElement | null;
      if (!p) return;
      const lh = parseFloat(getComputedStyle(p).lineHeight) || 18;
      const available = box.clientHeight;
      const fit = Math.max(0, Math.floor(available / lh));
      setLines(Math.min(6, fit));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [text]);

  return (
    <div
      ref={boxRef}
      className="mt-3 pt-2 border-t border-border flex-1 min-h-0 overflow-hidden"
      aria-hidden={lines === 0 ? true : undefined}
    >
      <p
        className="font-tamil text-[0.82rem] sm:text-sm text-muted-foreground leading-relaxed overflow-hidden"
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: Math.max(1, lines),
          visibility: lines === 0 ? "hidden" : undefined,
        }}
      >
        {text}
      </p>
    </div>
  );
}



/**
 * Renders the kural's source lines (4 words, then 3) on exactly one visual line
 * each. The word split comes from the source data and must never be re-wrapped,
 * so both lines are nowrap and share a single font size — the largest size at
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

      // Reset to the CSS-defined size, measure every line, then apply one
      // shared size so the two lines stay visually balanced.
      els.forEach((el) => (el.style.fontSize = ""));
      const base = parseFloat(getComputedStyle(els[0]).fontSize);
      const widest = Math.max(...els.map((el) => el.scrollWidth));
      if (!widest) return;
      const next = widest > available ? Math.max(14, (base * available) / widest) : base;
      els.forEach((el) => (el.style.fontSize = `calc(${next}px * var(--vfit, 1))`));
    };

    // Instant reflow: measure on every layout-affecting signal, and once more
    // after the browser settles a rotation (mobile reports stale sizes first).
    const reflow = () => {
      fit();
      requestAnimationFrame(fit);
      window.setTimeout(fit, 250);
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



