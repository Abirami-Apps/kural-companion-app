import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getKural } from "@/data/sample-kurals";
import {
  HourlyKuralContext,
  type HourlyKuralContextValue,
  type HourlyNotificationPermission,
  type HourlyPlaybackRequest,
  type HourlyPlaybackStatus,
} from "@/contexts/HourlyKuralContext";
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
  const navigate = useNavigate();
  const { premiumAccess, premiumPreview } = useEntitlements();
  const [settings, setSettings] = useState<HourlyKuralSettings>(readHourlySettings);
  const [status, setStatus] = useState<HourlyPlaybackStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nextRun, setNextRun] = useState<Date | null>(null);
  const [lastKuralNumber, setLastKuralNumber] = useState<number | null>(readLastKural);
  const [playbackRequest, setPlaybackRequest] = useState<HourlyPlaybackRequest | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<HourlyNotificationPermission>(readNotificationPermission);
  const playbackRequestRef = useRef<HourlyPlaybackRequest | null>(null);
  const requestIdRef = useRef(0);
  const handoffTokenRef = useRef(0);

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
    handoffTokenRef.current += 1;
    window.speechSynthesis?.cancel();
    playbackRequestRef.current = null;
    setPlaybackRequest(null);
    setStatus("idle");
  }, []);

  const speak = useCallback((text: string, language: "ta" | "en") => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      let settled = false;
      let timeout = 0;
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
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      timeout = window.setTimeout(done, 12_000);
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

  const handoffToMainPlayer = useCallback(
    (number: number, includeMeaning: boolean) => {
      handoffTokenRef.current += 1;
      const request: HourlyPlaybackRequest = {
        id: ++requestIdRef.current,
        number,
        includeMeaning,
      };
      playbackRequestRef.current = request;
      setPlaybackRequest(request);
      setStatus("loading");
      navigate(`/kural/${number}`);
    },
    [navigate],
  );

  const markPlayerPlaybackStarted = useCallback((requestId: number) => {
    if (playbackRequestRef.current?.id !== requestId) return;
    setStatus("playing");
  }, []);

  const reportPlayerPlaybackError = useCallback((requestId: number, message: string) => {
    if (playbackRequestRef.current?.id !== requestId) return;
    playbackRequestRef.current = null;
    setPlaybackRequest(null);
    setStatus("error");
    setErrorMessage(message);
  }, []);

  const completePlayerPlayback = useCallback(
    async (requestId: number, meaning: string) => {
      const request = playbackRequestRef.current;
      if (!request || request.id !== requestId) return;

      playbackRequestRef.current = null;
      setPlaybackRequest(null);
      if (request.includeMeaning && meaning) {
        const completionToken = handoffTokenRef.current;
        setStatus("announcing");
        await speak(meaning, "ta");
        if (handoffTokenRef.current !== completionToken) return;
      }
      setStatus("idle");
    },
    [speak],
  );

  const playHourlyKural = useCallback(
    async (date: Date) => {
      if (!premiumAccess) return;
      const handoffToken = ++handoffTokenRef.current;
      const number = chooseNumber();
      const kural = getKural(number);
      if (!kural?.audioUrl) {
        setStatus("error");
        setErrorMessage("Audio is unavailable for this Kural.");
        return;
      }

      setErrorMessage(null);
      rememberKural(number);

      setStatus("announcing");
      await speak(timeAnnouncement(date, settings.language), settings.language);
      if (handoffTokenRef.current !== handoffToken) return;
      handoffToMainPlayer(number, settings.includeMeaning);
    },
    [
      chooseNumber,
      handoffToMainPlayer,
      premiumAccess,
      rememberKural,
      settings.includeMeaning,
      settings.language,
      speak,
    ],
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
        handoffToMainPlayer(number, settings.includeMeaning);
        notification.close();
      };
    },
    [chooseNumber, handoffToMainPlayer, rememberKural, settings.includeMeaning, settings.language],
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
      playbackRequest,
      notificationPermission,
      requestNotificationPermission,
      testNow,
      stopPlayback,
      markPlayerPlaybackStarted,
      completePlayerPlayback,
      reportPlayerPlaybackError,
    }),
    [
      errorMessage,
      completePlayerPlayback,
      lastKuralNumber,
      markPlayerPlaybackStarted,
      nextRun,
      notificationPermission,
      playbackRequest,
      premiumAccess,
      premiumPreview,
      reportPlayerPlaybackError,
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
    </HourlyKuralContext.Provider>
  );
}
