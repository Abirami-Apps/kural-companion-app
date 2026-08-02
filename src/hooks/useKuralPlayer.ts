import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getKural, getRandomKural, TOTAL_KURALS, type Kural } from "@/data/sample-kurals";
import {
  FAVS_KEY,
  HINT_KEY,
  RECENTS_KEY,
  canGrow,
  isValidKuralNumber,
  nextNumber,
  parseKuralNumber,
  prevNumber,
  readNumberList,
  writeNumberList,
} from "@/lib/player-utils";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useHourlyKural } from "@/hooks/useHourlyKural";
import type { HourlyPlaybackRequest } from "@/contexts/HourlyKuralContext";
import artwork from "@/assets/logo.png";

const SOFT_DELAY = 1000;

export type AudioState = "idle" | "loading" | "playing" | "paused" | "error";

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (["INPUT", "TEXTAREA", "SELECT", "OPTION"].includes(el.tagName)) return true;
  if (el.isContentEditable) return true;
  return !!el.closest?.('[role="dialog"], [contenteditable="true"]');
}

function dialogOpen(): boolean {
  return !!document.querySelector('[role="dialog"][data-state="open"]');
}

/**
 * The single player hook. URL is the source of truth for which kural is shown,
 * so `/?k=123`, `/kural/123`, deep links and browser Back/Forward all agree.
 */
export function useKuralPlayer() {
  const params = useParams<{ number?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const routeStyle: "path" | "query" = params.number !== undefined ? "path" : "query";
  const rawTarget = params.number ?? searchParams.get("k");
  const parsedTarget = parseKuralNumber(rawTarget);
  const hasTarget = rawTarget !== null && rawTarget !== undefined && rawTarget !== "";
  const invalidTarget = hasTarget && parsedTarget === null;
  const number = parsedTarget ?? 1;
  const current = getKural(number) as Kural;

  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const settleRef = useRef<ReturnType<typeof setTimeout>>();
  const shouldPlayRef = useRef(false);
  const playTokenRef = useRef(0);
  const activeHourlyRequestRef = useRef<HourlyPlaybackRequest | null>(null);

  const { canAccessKural, gatingActive } = useEntitlements();
  const {
    playbackRequest: hourlyPlaybackRequest,
    markPlayerPlaybackStarted,
    completePlayerPlayback,
    reportPlayerPlaybackError,
  } = useHourlyKural();
  const locked = !canAccessKural(number);

  const [entry, setEntry] = useState("");
  const [pending, setPending] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [continuous, setContinuous] = useState(false);
  const [recents, setRecents] = useState<number[]>(() => readNumberList(RECENTS_KEY));
  const [favourites, setFavourites] = useState<number[]>(() => readNumberList(FAVS_KEY));
  const [hintSeen, setHintSeen] = useState(
    () => typeof window !== "undefined" && !!localStorage.getItem(HINT_KEY),
  );
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const isFavourite = favourites.includes(number);
  const canPrev = prevNumber(number) !== null;
  const canNext = nextNumber(number) !== null;

  const toggleFavourite = useCallback(() => {
    setFavourites((prev) => {
      const next = prev.includes(number)
        ? prev.filter((n) => n !== number)
        : [number, ...prev].slice(0, 100);
      writeNumberList(FAVS_KEY, next);
      return next;
    });
  }, [number]);

  /** Navigate to a kural. URL change drives the actual load. */
  const load = useCallback(
    (num: number, play = false) => {
      if (!isValidKuralNumber(num)) return;
      clearTimeout(timerRef.current);
      shouldPlayRef.current = play && canAccessKural(num);
      setPending(false);
      setEntry("");
      if (num === number) {
        // Same kural: re-trigger playback intent without a history entry.
        if (shouldPlayRef.current) {
          const el = audioRef.current;
          if (el) void el.play().catch(() => undefined);
        }
        return;
      }
      const to =
        routeStyle === "path"
          ? `/kural/${num}`
          : `/?k=${num}${location.hash ?? ""}`;
      navigate(to);
    },
    [canAccessKural, location.hash, navigate, number, routeStyle],
  );

  // Track recents whenever the displayed kural changes.
  useEffect(() => {
    if (!isValidKuralNumber(number)) return;
    setRecents((prev) => {
      const next = [number, ...prev.filter((n) => n !== number)].slice(0, 5);
      writeNumberList(RECENTS_KEY, next);
      return next;
    });
  }, [number]);

  // Reset + load audio whenever the kural changes (including Back/Forward).
  useEffect(() => {
    const activeHourlyRequest = activeHourlyRequestRef.current;
    if (activeHourlyRequest && activeHourlyRequest.number !== number) {
      activeHourlyRequestRef.current = null;
      void completePlayerPlayback(activeHourlyRequest.id, "");
    }
    setProgress(0);
    setDuration(0);
    setIsPlaying(false);
    const el = audioRef.current;
    if (!el || locked) {
      setAudioState("idle");
      return;
    }
    const token = ++playTokenRef.current;
    el.load();
    if (shouldPlayRef.current) {
      setAudioState("loading");
      void el.play().catch(() => {
        if (token !== playTokenRef.current) return;
        setIsPlaying(false);
        setAudioState("error");
      });
    } else {
      setAudioState("idle");
    }
  }, [completePlayerPlayback, number, locked]);

  // Hourly Kural hands playback to this one shared player after its time announcement.
  useEffect(() => {
    const request = hourlyPlaybackRequest;
    if (!request || request.number !== number || activeHourlyRequestRef.current?.id === request.id) {
      return;
    }

    const el = audioRef.current;
    if (!el || locked) {
      reportPlayerPlaybackError(request.id, "The selected Hourly Kural cannot be played.");
      return;
    }

    activeHourlyRequestRef.current = request;
    shouldPlayRef.current = true;
    const token = ++playTokenRef.current;
    setAudioState("loading");
    el.load();
    void el.play().catch(() => {
      if (token !== playTokenRef.current) return;
      activeHourlyRequestRef.current = null;
      setIsPlaying(false);
      setAudioState("error");
      reportPlayerPlaybackError(
        request.id,
        "Playback was blocked. Tap the main player’s play button once to allow sound.",
      );
    });
  }, [hourlyPlaybackRequest, locked, number, reportPlayerPlaybackError]);

  const retry = useCallback(() => {
    const el = audioRef.current;
    if (!el || locked) return;
    const token = ++playTokenRef.current;
    setAudioState("loading");
    el.load();
    void el.play().catch(() => {
      if (token !== playTokenRef.current) return;
      setIsPlaying(false);
      setAudioState("error");
    });
  }, [locked]);

  const commit = useCallback(
    (value: string) => {
      const num = parseKuralNumber(value);
      setPending(false);
      if (num !== null) load(num, true);
    },
    [load],
  );

  const togglePlay = useCallback(() => {
    if (locked) return;
    const el = audioRef.current;
    clearTimeout(timerRef.current);
    if (pending && entry) {
      const num = parseKuralNumber(entry);
      setPending(false);
      if (num !== null) {
        load(num, true);
        return;
      }
    }
    if (!el) return;
    if (audioState === "error") {
      retry();
      return;
    }
    if (el.paused) {
      const token = ++playTokenRef.current;
      shouldPlayRef.current = true;
      setAudioState("loading");
      void el.play().catch(() => {
        if (token !== playTokenRef.current) return;
        setIsPlaying(false);
        setAudioState("error");
      });
    } else {
      shouldPlayRef.current = false;
      const activeHourlyRequest = activeHourlyRequestRef.current;
      if (activeHourlyRequest) {
        activeHourlyRequestRef.current = null;
        void completePlayerPlayback(activeHourlyRequest.id, "");
      }
      el.pause();
      setIsPlaying(false);
      setAudioState("paused");
    }
  }, [audioState, completePlayerPlayback, entry, load, locked, pending, retry]);

  const schedule = useCallback(
    (value: string) => {
      clearTimeout(timerRef.current);
      if (!value) {
        setPending(false);
        return;
      }
      if (!canGrow(value)) {
        commit(value);
        return;
      }
      setPending(true);
      timerRef.current = setTimeout(() => commit(value), SOFT_DELAY);
    },
    [commit],
  );

  const markHintSeen = useCallback(() => {
    setHintSeen((seen) => {
      if (!seen) {
        try {
          localStorage.setItem(HINT_KEY, "1");
        } catch {
          /* ignore */
        }
      }
      return true;
    });
  }, []);

  const pressDigit = useCallback(
    (d: string) => {
      markHintSeen();
      setEntry((prev) => {
        const next = (prev + d).replace(/^0+/, "").slice(0, 4);
        if (Number(next || "0") > TOTAL_KURALS) return prev;
        schedule(next);
        return next;
      });
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(8);
      }
    },
    [markHintSeen, schedule],
  );

  const backspace = useCallback(() => {
    setEntry((p) => {
      const next = p.slice(0, -1);
      schedule(next);
      return next;
    });
  }, [schedule]);

  const clearEntry = useCallback(() => {
    clearTimeout(timerRef.current);
    setPending(false);
    setEntry("");
  }, []);

  const submitEntry = useCallback(() => {
    clearTimeout(timerRef.current);
    if (entry) commit(entry);
  }, [commit, entry]);

  const seek = useCallback((v: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
    el.currentTime = Math.min(Math.max(0, v), el.duration);
    setProgress(el.currentTime);
  }, []);

  const shuffle = useCallback(() => load(getRandomKural().number, true), [load]);

  const goNext = useCallback(() => {
    const n = nextNumber(number);
    if (n !== null) load(n, isPlaying || shouldPlayRef.current);
  }, [isPlaying, load, number]);

  const goPrev = useCallback(() => {
    const p = prevNumber(number);
    if (p !== null) load(p, isPlaying || shouldPlayRef.current);
  }, [isPlaying, load, number]);

  // Cleanup every pending timer on unmount.
  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      clearTimeout(settleRef.current);
      playTokenRef.current++;
      const activeHourlyRequest = activeHourlyRequestRef.current;
      if (activeHourlyRequest) {
        activeHourlyRequestRef.current = null;
        void completePlayerPlayback(activeHourlyRequest.id, "");
      }
    },
    [completePlayerPlayback],
  );

  // Physical keyboard support — never while typing or with a dialog open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || dialogOpen()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        pressDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (e.key === "Enter") {
        e.preventDefault();
        clearTimeout(timerRef.current);
        if (entry) commit(entry);
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "Escape") {
        clearEntry();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const a = audioRef.current;
        if (a && Number.isFinite(a.duration) && a.duration > 0) {
          const delta = e.key === "ArrowRight" ? 5 : -5;
          a.currentTime = Math.min(a.duration, Math.max(0, a.currentTime + delta));
          setProgress(a.currentTime);
        }
      } else if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [backspace, clearEntry, commit, entry, goNext, goPrev, pressDigit, togglePlay]);

  // Media Session (lock screen / headphone controls) — respects boundaries.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    try {
      session.metadata = new MediaMetadata({
        title: `குறள் ${number}`,
        artist: current.chapter,
        album: current.section,
        artwork: [{ src: artwork, sizes: "512x512", type: "image/png" }],
      });
    } catch {
      /* MediaMetadata unavailable */
    }
    const handlers: [MediaSessionAction, (() => void) | null][] = [
      ["play", togglePlay],
      ["pause", togglePlay],
      ["previoustrack", canPrev ? goPrev : null],
      ["nexttrack", canNext ? goNext : null],
    ];
    handlers.forEach(([action, handler]) => {
      try {
        session.setActionHandler(action, handler);
      } catch {
        /* unsupported action */
      }
    });
    return () => {
      handlers.forEach(([action]) => {
        try {
          session.setActionHandler(action, null);
        } catch {
          /* ignore */
        }
      });
    };
  }, [canNext, canPrev, current.chapter, current.section, goNext, goPrev, number, togglePlay]);

  // Prefetch only real neighbours (never 0 or 1331).
  const neighbours = useMemo(() => {
    const ns = [prevNumber(number), nextNumber(number)].filter(
      (n): n is number => n !== null,
    );
    return ns.map((n) => getKural(n)?.audioUrl).filter(Boolean) as string[];
  }, [number]);

  const audioHandlers = {
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLAudioElement>) => {
      const d = e.currentTarget.duration;
      setDuration(Number.isFinite(d) ? d : 0);
    },
    onTimeUpdate: (e: React.SyntheticEvent<HTMLAudioElement>) =>
      setProgress(e.currentTarget.currentTime),
    onWaiting: () => setAudioState((s) => (s === "playing" ? "loading" : s)),
    onPlaying: () => {
      setAudioState("playing");
      setIsPlaying(true);
      const activeHourlyRequest = activeHourlyRequestRef.current;
      if (activeHourlyRequest) markPlayerPlaybackStarted(activeHourlyRequest.id);
    },
    onPause: () => {
      setIsPlaying(false);
      setAudioState((s) => (s === "error" ? s : "paused"));
    },
    onError: () => {
      setAudioState("error");
      setIsPlaying(false);
      const activeHourlyRequest = activeHourlyRequestRef.current;
      if (activeHourlyRequest) {
        activeHourlyRequestRef.current = null;
        reportPlayerPlaybackError(
          activeHourlyRequest.id,
          "The Hourly Kural audio could not be loaded in the main player.",
        );
      }
    },
    onEnded: () => {
      setIsPlaying(false);
      setAudioState("idle");
      const activeHourlyRequest = activeHourlyRequestRef.current;
      if (activeHourlyRequest) {
        activeHourlyRequestRef.current = null;
        shouldPlayRef.current = false;
        void completePlayerPlayback(activeHourlyRequest.id, current.meaning ?? "");
        return;
      }
      const n = nextNumber(number);
      if (continuous && n !== null) load(n, true);
      else shouldPlayRef.current = false;
    },
  };

  return {
    audioRef,
    audioHandlers,
    shortcutsOpen,
    setShortcutsOpen,

    number,
    current,
    invalidTarget,
    locked,
    gatingActive,
    hourlyPlayback: hourlyPlaybackRequest?.number === number,

    entry,
    pending,
    isPlaying,
    audioState,
    progress,
    duration,
    continuous,
    setContinuous,
    recents,
    favourites,
    isFavourite,
    toggleFavourite,
    hintSeen,
    neighbours,
    canPrev,
    canNext,
    load,
    goNext,
    goPrev,
    togglePlay,
    retry,
    pressDigit,
    backspace,
    clearEntry,
    submitEntry,
    seek,
    shuffle,
    softDelay: SOFT_DELAY,
  };
}
