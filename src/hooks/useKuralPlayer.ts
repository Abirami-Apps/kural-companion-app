import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getKural,
  getRandomKural,
  TOTAL_KURALS,
  type Kural,
} from "@/data/sample-kurals";

const SOFT_DELAY = 1000;
const RECENTS_KEY = "kural:recents";
const FAVS_KEY = "kural:favs";
const HINT_KEY = "kural:hint-seen";

const readList = (key: string): number[] => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
};

const initialNumber = () => {
  if (typeof window === "undefined") return 1;
  const fromUrl = Number(new URLSearchParams(window.location.search).get("k"));
  return fromUrl >= 1 && fromUrl <= TOTAL_KURALS ? fromUrl : 1;
};

/** Can this entry still grow into another valid kural number? */
const canGrow = (value: string) => {
  if (value.length >= 4) return false;
  return Number(value + "0") <= TOTAL_KURALS;
};

export type AudioState = "idle" | "loading" | "playing" | "error";

export function useKuralPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const shouldPlayRef = useRef(false);

  const [entry, setEntry] = useState("");
  const [pending, setPending] = useState(false);
  const [current, setCurrent] = useState<Kural>(() => getKural(initialNumber())!);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [continuous, setContinuous] = useState(false);
  const [recents, setRecents] = useState<number[]>(() => readList(RECENTS_KEY));
  const [favourites, setFavourites] = useState<number[]>(() => readList(FAVS_KEY));
  const [hintSeen, setHintSeen] = useState(
    () => typeof window !== "undefined" && !!localStorage.getItem(HINT_KEY),
  );
  const [shortcutsOpen, setShortcutsOpen] = useState(false);


  const isFavourite = favourites.includes(current.number);

  const toggleFavourite = useCallback(() => {
    setFavourites((prev) => {
      const next = prev.includes(current.number)
        ? prev.filter((n) => n !== current.number)
        : [current.number, ...prev].slice(0, 50);
      localStorage.setItem(FAVS_KEY, JSON.stringify(next));
      return next;
    });
  }, [current.number]);

  const load = useCallback((num: number, play = false) => {
    if (num < 1 || num > TOTAL_KURALS) return;
    const k = getKural(num);
    if (!k) return;
    clearTimeout(timerRef.current);
    shouldPlayRef.current = play;
    setPending(false);
    setEntry("");
    setProgress(0);
    setDuration(0);
    setAudioState(play ? "loading" : "idle");
    setIsPlaying(play);
    setCurrent(k);
    setRecents((prev) => {
      const next = [num, ...prev.filter((n) => n !== num)].slice(0, 5);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      return next;
    });
    const url = new URL(window.location.href);
    url.searchParams.set("k", String(num));
    window.history.replaceState({}, "", url);
  }, []);

  // Load audio whenever the kural changes
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.load();
    if (shouldPlayRef.current) {
      el.play().catch(() => {
        setIsPlaying(false);
        setAudioState("idle");
      });
    }
  }, [current.number]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    clearTimeout(timerRef.current);
    if (pending && entry) {
      const num = parseInt(entry, 10);
      setPending(false);
      if (num >= 1 && num <= TOTAL_KURALS) {
        load(num, true);
        return;
      }
    }
    if (el.paused) {
      shouldPlayRef.current = true;
      setAudioState("loading");
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(false);
          setAudioState("error");
        });
    } else {
      el.pause();
      setIsPlaying(false);
      setAudioState("idle");
    }
  }, [entry, load, pending]);

  const commit = useCallback(
    (value: string) => {
      const num = parseInt(value || "0", 10);
      if (num >= 1 && num <= TOTAL_KURALS) load(num, true);
      else setPending(false);
    },
    [load],
  );

  const schedule = useCallback(
    (value: string) => {
      clearTimeout(timerRef.current);
      if (!value) {
        setPending(false);
        return;
      }
      if (!canGrow(value)) {
        setPending(false);
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
      if (!seen) localStorage.setItem(HINT_KEY, "1");
      return true;
    });
  }, []);

  const pressDigit = useCallback(
    (d: string) => {
      markHintSeen();
      setEntry((prev) => {
        const next = (prev + d).replace(/^0+/, "").slice(0, 4);
        if (parseInt(next || "0", 10) > TOTAL_KURALS) return prev;
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

  const seek = useCallback((v: number) => {
    if (audioRef.current) audioRef.current.currentTime = v;
    setProgress(v);
  }, []);

  const shuffle = useCallback(() => load(getRandomKural().number, true), [load]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Physical keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable)
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        pressDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (e.key === "Enter") {
        e.preventDefault();
        setEntry((v) => {
          clearTimeout(timerRef.current);
          commit(v);
          return v;
        });
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "Escape") {
        clearEntry();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        load(current.number + 1, isPlaying);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        load(current.number - 1, isPlaying);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const a = audioRef.current;
        if (a) {
          a.currentTime = Math.min(a.duration || 0, a.currentTime + 5);
          setProgress(a.currentTime);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const a = audioRef.current;
        if (a) {
          a.currentTime = Math.max(0, a.currentTime - 5);
          setProgress(a.currentTime);
        }
      } else if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    backspace,
    clearEntry,
    commit,
    current.number,
    isPlaying,
    load,
    pressDigit,
    togglePlay,
  ]);


  // Media Session (lock screen / headphone controls)
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `குறள் ${current.number}`,
      artist: current.chapter,
      album: current.section,
      artwork: [{ src: "/icon.svg", sizes: "512x512", type: "image/svg+xml" }],
    });
    navigator.mediaSession.setActionHandler("play", togglePlay);
    navigator.mediaSession.setActionHandler("pause", togglePlay);
    navigator.mediaSession.setActionHandler("previoustrack", () =>
      load(current.number - 1, true),
    );
    navigator.mediaSession.setActionHandler("nexttrack", () =>
      load(current.number + 1, true),
    );
  }, [current, load, togglePlay]);

  // Prefetch neighbouring audio for instant skips
  const neighbours = useMemo(
    () =>
      [current.number - 1, current.number + 1]
        .map((n) => getKural(n)?.audioUrl)
        .filter(Boolean) as string[],
    [current.number],
  );

  const audioHandlers = {
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLAudioElement>) =>
      setDuration(e.currentTarget.duration),
    onTimeUpdate: (e: React.SyntheticEvent<HTMLAudioElement>) =>
      setProgress(e.currentTarget.currentTime),
    onWaiting: () => setAudioState("loading"),
    onPlaying: () => {
      setAudioState("playing");
      setIsPlaying(true);
    },
    onPause: () => setIsPlaying(false),
    onError: () => {
      setAudioState("error");
      setIsPlaying(false);
    },
    onEnded: () => {
      setIsPlaying(false);
      setAudioState("idle");
      if (continuous) load(current.number + 1, true);
    },
  };

  return {
    audioRef,
    audioHandlers,
    current,
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
    load,
    togglePlay,
    pressDigit,
    backspace,
    clearEntry,
    seek,
    shuffle,
    softDelay: SOFT_DELAY,
  };
}
