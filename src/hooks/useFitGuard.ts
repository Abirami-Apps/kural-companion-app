import { useEffect, useRef, useState } from "react";

export interface FitMetrics {
  vw: number;
  vh: number;
  dvh: number;
  orientation: "portrait" | "landscape";
  overflowY: number;
  overflowX: number;
  fitScale: number;
  safe: { top: number; right: number; bottom: number; left: number };
  fonts: Record<string, string>;
}

const MIN_SCALE = 0.7;
const STEP = 0.04;

const px = (v: string) => Math.round(parseFloat(v) || 0);

function readSafeAreas() {
  const cs = getComputedStyle(document.documentElement);
  return {
    top: px(cs.getPropertyValue("--safe-top")),
    right: px(cs.getPropertyValue("--safe-right")),
    bottom: px(cs.getPropertyValue("--safe-bottom")),
    left: px(cs.getPropertyValue("--safe-left")),
  };
}

function measureFonts(): Record<string, string> {
  const out: Record<string, string> = {};
  const root = getComputedStyle(document.documentElement).fontSize;
  out.root = root;
  const lcd = document.querySelector<HTMLElement>("[data-fit-probe='lcd']");
  if (lcd) out.lcd = getComputedStyle(lcd).fontSize;
  document
    .querySelectorAll<HTMLElement>("[data-fit-probe='verse-line']")
    .forEach((el, i) => {
      out[`verseLine${i + 1}`] = getComputedStyle(el).fontSize;
    });
  return out;
}

/**
 * Runtime no-scroll guard.
 *
 * Measures document overflow after every layout-affecting event (resize,
 * orientation change, font-scale change, DOM mutation) and progressively
 * tightens a global `--fit-scale` until the app fits in one screen again.
 * The scale is released back toward 1 as soon as there is spare room.
 */
export function useFitGuard(enabled = true, applyScale = true) {
  const scaleRef = useRef(1);
  const [metrics, setMetrics] = useState<FitMetrics>({
    vw: 0,
    vh: 0,
    dvh: 0,
    orientation: "portrait",
    overflowY: 0,
    overflowX: 0,
    fitScale: 1,
    safe: { top: 0, right: 0, bottom: 0, left: 0 },
    fonts: {},
  });

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    let frame = 0;
    let settle = 0;

    const apply = (s: number) => {
      // Read-only consumers (the debug overlay) must not fight the guard.
      if (!applyScale) {
        scaleRef.current = parseFloat(
          getComputedStyle(root).getPropertyValue("--fit-scale"),
        ) || 1;
        return;
      }
      scaleRef.current = s;
      root.style.setProperty("--fit-scale", String(s));
      root.dataset.fit = s < 0.98 ? "tight" : "normal";
    };

    const overflow = () => {
      const targets = [
        document.getElementById("main"),
        document.getElementById("app-root"),
        root,
        document.body,
      ].filter(Boolean) as HTMLElement[];
      const y = Math.max(...targets.map((el) => el.scrollHeight - el.clientHeight));
      const x = Math.max(...targets.map((el) => el.scrollWidth - el.clientWidth));
      return { y, x };
    };

    const publish = (o: { y: number; x: number }) => {
      setMetrics({
        vw: Math.round(window.innerWidth),
        vh: Math.round(window.innerHeight),
        dvh: Math.round(window.visualViewport?.height ?? window.innerHeight),
        orientation:
          window.innerWidth >= window.innerHeight ? "landscape" : "portrait",
        overflowY: o.y,
        overflowX: o.x,
        fitScale: scaleRef.current,
        safe: readSafeAreas(),
        fonts: measureFonts(),
      });
    };

    // Converge on the largest scale that still fits, in a bounded loop.
    const converge = (budget = 12) => {
      const o = overflow();
      if (o.y > 1 && scaleRef.current > MIN_SCALE && budget > 0) {
        apply(Math.max(MIN_SCALE, +(scaleRef.current - STEP).toFixed(3)));
        frame = requestAnimationFrame(() => converge(budget - 1));
        return;
      }
      if (o.y <= 1 && scaleRef.current < 1 && budget > 0) {
        // Try to relax; revert immediately if it overflows again.
        const prev = scaleRef.current;
        apply(Math.min(1, +(prev + STEP).toFixed(3)));
        frame = requestAnimationFrame(() => {
          if (overflow().y > 1) {
            apply(prev);
            publish(overflow());
          } else {
            converge(budget - 1);
          }
        });
        return;
      }
      publish(o);
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      frame = requestAnimationFrame(() => converge());
      // Orientation changes settle asynchronously on mobile browsers.
      settle = window.setTimeout(() => converge(), 250);
    };

    apply(scaleRef.current);
    schedule();

    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    document.fonts?.ready.then(schedule).catch(() => {});

    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    const mo = new MutationObserver(schedule);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-contrast"] });

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      ro.disconnect();
      mo.disconnect();
    };
  }, [enabled]);

  return metrics;
}
