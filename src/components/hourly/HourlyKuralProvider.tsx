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
import { useOptionalUserData } from "@/hooks/useUserData";
import { isNativeApp } from "@/lib/native";
import {
  checkNativeNotificationPermission,
  requestNativeNotificationPermission,
  scheduleNativeHourlyNotification,
} from "@/lib/native-notifications";
import { FAVS_KEY, readNumberList } from "@/lib/player-utils";
import {
  HOURLY_LAST_KURAL_KEY,
  HOURLY_LAST_RUN_KEY,
  HOURLY_SETTINGS_KEY,
  chooseHourlyKuralNumber,
  getNextHourlyOccurrence,
  hourlyNotificationContent,
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
  isNativeApp
    ? "default"
    : typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission;

export function HourlyKuralProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { premiumAccess, premiumPreview } = useEntitlements();
  const userData = useOptionalUserData();
  const [fallbackSettings, setFallbackSettings] =
    useState<HourlyKuralSettings>(readHourlySettings);
  const settings = userData?.hourlySettings ?? fallbackSettings;
  const [status, setStatus] = useState<HourlyPlaybackStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nextRun, setNextRun] = useState<Date | null>(null);
  const [fallbackLastKuralNumber, setFallbackLastKuralNumber] =
    useState<number | null>(readLastKural);
  const lastKuralNumber = userData ? userData.lastHourlyKural : fallbackLastKuralNumber;
  const [playbackRequest, setPlaybackRequest] = useState<HourlyPlaybackRequest | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<HourlyNotificationPermission>(readNotificationPermission);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const playbackRequestRef = useRef<HourlyPlaybackRequest | null>(null);
  const requestIdRef = useRef(0);
  const handoffTokenRef = useRef(0);

  useEffect(() => {
    try {
      if (!userData) localStorage.setItem(HOURLY_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* storage can be unavailable in private browsing */
    }
  }, [settings, userData]);

  useEffect(() => {
    if (!isNativeApp) return;
    let active = true;
    void checkNativeNotificationPermission().then((permission) => {
      if (active) setNotificationPermission(permission);
    });
    return () => {
      active = false;
    };
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<HourlyKuralSettings>) => {
      if (userData) userData.updateHourlySettings(patch);
      else setFallbackSettings((current) => ({ ...current, ...patch }));
    },
    [userData],
  );

  const setEnabled = useCallback(
    (enabled: boolean) => {
      if (userData) userData.updateHourlySettings({ enabled });
      else setFallbackSettings((current) => ({ ...current, enabled }));
    },
    [userData],
  );

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
    if (userData) {
      userData.setLastHourlyKural(number);
      return;
    }
    setFallbackLastKuralNumber(number);
    try {
      localStorage.setItem(HOURLY_LAST_KURAL_KEY, String(number));
    } catch {
      /* ignore */
    }
  }, [userData]);

  const chooseNumber = useCallback(
    () =>
      chooseHourlyKuralNumber({
        selection: settings.selection,
        lastNumber: lastKuralNumber,
        favourites: userData?.favourites ?? readNumberList(FAVS_KEY),
      }),
    [lastKuralNumber, settings.selection, userData?.favourites],
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
    async (date: Date, isTest = false) => {
      const number = chooseNumber();
      const kural = getKural(number);
      if (!kural) return;
      rememberKural(number);

      const content = hourlyNotificationContent({
        date,
        language: settings.language,
        number,
        chapter: kural.chapter,
      });

      if (isNativeApp) {
        const scheduled = await scheduleNativeHourlyNotification({
          title: content.title,
          body: content.body,
          number,
        });
        setNotificationMessage(
          scheduled
            ? isTest
              ? "Test reminder scheduled. Check your device notifications."
              : "Hourly reminder scheduled on this device."
            : "This device cannot schedule the reminder yet. Hourly playback still works while the app is open.",
        );
        return;
      }

      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

      try {
        const options: NotificationOptions = {
          body: content.body,
          icon: "/pwa-192.png",
          tag: "hourly-kural",
          lang: settings.language === "ta" ? "ta-IN" : "en-IN",
          data: {
            url: `/kural/${number}?autoplay=1`,
          },
        };
        let registration = "serviceWorker" in navigator
          ? await navigator.serviceWorker.getRegistration()
          : undefined;

        if (!registration?.active && "serviceWorker" in navigator) {
          registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<undefined>((resolve) => window.setTimeout(resolve, 1_000)),
          ]);
        }

        let deliveredByWorker = false;
        if (registration?.active) {
          try {
            await registration.showNotification(content.title, options);
            deliveredByWorker = true;
          } catch {
            /* Fall back to the window Notification API below. */
          }
        }

        if (!deliveredByWorker) {
          const notification = new Notification(content.title, options);
          notification.onclick = () => {
            window.focus();
            handoffToMainPlayer(number, settings.includeMeaning);
            notification.close();
          };
        }
        if (isTest) {
          setNotificationMessage("Test reminder sent. Check your device notifications.");
        }
      } catch {
        setNotificationMessage(
          "This device cannot show the reminder from the browser. Hourly playback still works while the app is open.",
        );
      }
    },
    [chooseNumber, handoffToMainPlayer, rememberKural, settings.includeMeaning, settings.language],
  );

  const runScheduled = useCallback(
    async (date: Date) => {
      const key = hourlyRunKey(date);
      const runStorageKey = userData?.deviceKey(HOURLY_LAST_RUN_KEY) ?? HOURLY_LAST_RUN_KEY;
      if (localStorage.getItem(runStorageKey) === key) return;
      localStorage.setItem(runStorageKey, key);
      if (document.visibilityState === "visible") await playHourlyKural(date);
      else await showNotification(date);
    },
    [playHourlyKural, showNotification, userData],
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
      if (!userData && event.key === HOURLY_SETTINGS_KEY) {
        setFallbackSettings(readHourlySettings());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userData]);

  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
    },
    [],
  );

  const requestNotificationPermission = useCallback(async () => {
    if (isNativeApp) {
      const permission = await requestNativeNotificationPermission();
      setNotificationPermission(permission);
      setNotificationMessage(
        permission === "granted"
          ? "Notifications are on. Send a test reminder to preview one."
          : permission === "denied"
            ? "Notifications are blocked. Allow them in this device's Settings."
            : permission === "unsupported"
              ? "Notifications are not available on this device yet."
              : null,
      );
      return permission;
    }

    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      setNotificationMessage("Notifications are not available on this device yet.");
      return "unsupported" as const;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      setNotificationMessage(
        permission === "granted"
          ? "Notifications are on. Send a test reminder to preview one."
          : permission === "denied"
            ? "Notifications are blocked. Allow them in this site's browser settings."
            : null,
      );
      return permission;
    } catch {
      setNotificationPermission("unsupported");
      setNotificationMessage("Notifications are not available on this device yet.");
      return "unsupported" as const;
    }
  }, []);

  const sendTestNotification = useCallback(async () => {
    setNotificationMessage(null);
    await showNotification(new Date(), true);
  }, [showNotification]);

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
      notificationMessage,
      requestNotificationPermission,
      sendTestNotification,
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
      notificationMessage,
      notificationPermission,
      playbackRequest,
      premiumAccess,
      premiumPreview,
      reportPlayerPlaybackError,
      requestNotificationPermission,
      sendTestNotification,
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
