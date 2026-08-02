import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getKural } from "@/data/sample-kurals";
import { HourlyKuralContext, type HourlyKuralContextValue, type HourlyNotificationPermission, type HourlyPlaybackStatus } from "@/contexts/HourlyKuralContext";
import { useEntitlements } from "@/hooks/useEntitlements";
import { FAVS_KEY, readNumberList } from "@/lib/player-utils";
import {
  HOURLY_LAST_KURAL_KEY,
  HOURLY_LAST_RUN_KEY,
  HOURLY_SETTINGS_KEY,
  chooseHourlyKuralNumber,
  getNextHourlyOccurrence,
  hourlyRunKey,
  isHourActive,
  readHourlySettings,
  timeAnnouncement,
  type HourlyKuralSettings,
} from "@/lib/hourly-kural";

const readLastKural = () => {
  if (typeof window === "undefined") return null;
  const number = Number(localStorage.getItem(HOURLY_LAST_KURAL_KEY));
  return Number.isInteger(number) && number >= 1 && number <= 1330 ? number : null;
};

const readNotificationPermission = (): HourlyNotificationPermission =>
  typeof Notification === "undefined" ? "unsupported" : Notification.permission;

export function HourlyKuralProvider({ children }: { children: React.ReactNode }) {
  const { premiumAccess, premiumPreview } = useEntitlements();
  const [settings, setSettings] = useState<HourlyKuralSettings>(readHourlySettings);
  const [status, setStatus] = useState<HourlyPlaybackStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nextRun, setNextRun] = useState<Date | null>(null);
  const [lastKuralNumber, setLastKuralNumber] = useState<number | null>(readLastKural);
  const [notificationPermission, setNotificationPermission] =
    useState<HourlyNotificationPermission>(readNotificationPermission);
  const audioRef = useRef<HTMLAudioElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const meaningRef = useRef<string | null>(null);
  const includeMeaningRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(HOURLY_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* storage can be unavailable in private browsing */
    }
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<HourlyKuralSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setSettings((current) => ({ ...current, enabled }));
  }, []);

  const stopPlayback = useCallback(() => {
    window.speechSynthesis?.cancel();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    meaningRef.current = null;
    setStatus("idle");
  }, []);

  const speak = useCallback((text: string, language: "ta" | "en") => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve();
      };
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "ta" ? "ta-IN" : "en-IN";
      utterance.rate = 0.88;
      utterance.onend = done;
      utterance.onerror = done;
      utteranceRef.current = utterance;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      const timeout = window.setTimeout(done, 12_000);
    });
  }, []);

  const rememberKural = useCallback((number: number) => {
    setLastKuralNumber(number);
    try {
      localStorage.setItem(HOURLY_LAST_KURAL_KEY, String(number));
    } catch {
      /* ignore */
    }
  }, []);

  const chooseNumber = useCallback(
    () =>
      chooseHourlyKuralNumber({
        selection: settings.selection,
        lastNumber: lastKuralNumber,
        favourites: readNumberList(FAVS_KEY),
      }),
    [lastKuralNumber, settings.selection],
  );

  const playHourlyKural = useCallback(
    async (date: Date) => {
      if (!premiumAccess) return;
      const number = chooseNumber();
      const kural = getKural(number);
      if (!kural?.audioUrl) {
        setStatus("error");
        setErrorMessage("Audio is unavailable for this Kural.");
        return;
      }

      setErrorMessage(null);
      document.querySelectorAll("audio").forEach((audio) => {
        if (audio !== audioRef.current) audio.pause();
      });
      rememberKural(number);
      meaningRef.current = kural.meaning ?? null;
      includeMeaningRef.current = settings.includeMeaning;

      setStatus("announcing");
      await speak(timeAnnouncement(date, settings.language), settings.language);

      const audio = audioRef.current;
      if (!audio) return;
      audio.src = kural.audioUrl;
      audio.load();
      try {
        await audio.play();
        setStatus("playing");
      } catch {
        setStatus("error");
        setErrorMessage("Playback was blocked. Keep this page open and tap “Test now” once to allow sound.");
      }
    },
    [chooseNumber, premiumAccess, rememberKural, settings.includeMeaning, settings.language, speak],
  );

  const showNotification = useCallback(
    (date: Date) => {
      const number = chooseNumber();
      const kural = getKural(number);
      if (!kural) return;
      rememberKural(number);
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const notification = new Notification(
        settings.language === "ta" ? "மணிக்குறள் தயாராக உள்ளது" : "Your Hourly Kural is ready",
        {
          body: `${timeAnnouncement(date, settings.language)} · குறள் ${number} · ${kural.chapter}`,
          icon: "/logo.png",
          tag: "hourly-kural",
        },
      );
      notification.onclick = () => {
        window.focus();
        window.location.assign(`/kural/${number}`);
        notification.close();
      };
    },
    [chooseNumber, rememberKural, settings.language],
  );

  const runScheduled = useCallback(
    async (date: Date) => {
      const key = hourlyRunKey(date);
      if (localStorage.getItem(HOURLY_LAST_RUN_KEY) === key) return;
      localStorage.setItem(HOURLY_LAST_RUN_KEY, key);
      if (document.visibilityState === "visible") await playHourlyKural(date);
      else showNotification(date);
    },
    [playHourlyKural, showNotification],
  );

  useEffect(() => {
    if (!settings.enabled || !premiumAccess) {
      setNextRun(null);
      return;
    }

    let timer = 0;
    const schedule = () => {
      const occurrence = getNextHourlyOccurrence(new Date(), settings);
      setNextRun(occurrence);
      const delay = Math.max(250, occurrence.getTime() - Date.now());
      timer = window.setTimeout(async () => {
        await runScheduled(occurrence);
        schedule();
      }, delay);
    };

    schedule();
    const reschedule = () => {
      window.clearTimeout(timer);
      schedule();
    };
    window.addEventListener("focus", reschedule);
    document.addEventListener("visibilitychange", reschedule);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", reschedule);
      document.removeEventListener("visibilitychange", reschedule);
    };
  }, [premiumAccess, runScheduled, settings]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === HOURLY_SETTINGS_KEY) setSettings(readHourlySettings());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
      audioRef.current?.pause();
    },
    [],
  );

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return "unsupported" as const;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission;
  }, []);

  const testNow = useCallback(async () => {
    if (!isHourActive(new Date().getHours(), settings.startHour, settings.endHour)) {
      setErrorMessage("This test is outside your active hours, but it will play once for setup.");
    }
    await playHourlyKural(new Date());
  }, [playHourlyKural, settings.endHour, settings.startHour]);

  const value = useMemo<HourlyKuralContextValue>(
    () => ({
      settings,
      updateSettings,
      setEnabled,
      premiumAccess,
      premiumPreview,
      status,
      errorMessage,
      nextRun,
      lastKuralNumber,
      notificationPermission,
      requestNotificationPermission,
      testNow,
      stopPlayback,
    }),
    [
      errorMessage,
      lastKuralNumber,
      nextRun,
      notificationPermission,
      premiumAccess,
      premiumPreview,
      requestNotificationPermission,
      setEnabled,
      settings,
      status,
      stopPlayback,
      testNow,
      updateSettings,
    ],
  );

  return (
    <HourlyKuralContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="none"
        onEnded={async () => {
          if (includeMeaningRef.current && meaningRef.current) {
            setStatus("announcing");
            await speak(meaningRef.current, "ta");
          }
          setStatus("idle");
        }}
        onError={() => {
          setStatus("error");
          setErrorMessage("The Hourly Kural audio could not be loaded.");
        }}
      />
    </HourlyKuralContext.Provider>
  );
}
