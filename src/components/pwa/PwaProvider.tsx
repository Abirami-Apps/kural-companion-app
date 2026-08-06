import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { PwaContext, type InstallResult } from "@/contexts/PwaContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const standaloneDisplay = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);

const iosDevice = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

export function PwaProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [standalone, setStandalone] = useState(standaloneDisplay);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const displayQuery = window.matchMedia("(display-mode: standalone)");
    const markOnline = () => setOnline(true);
    const markOffline = () => setOnline(false);
    const updateDisplay = () => setStandalone(standaloneDisplay());
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const installed = () => {
      setInstallPrompt(null);
      setStandalone(true);
    };

    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", installed);
    displayQuery.addEventListener("change", updateDisplay);
    return () => {
      window.removeEventListener("online", markOnline);
      window.removeEventListener("offline", markOffline);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", installed);
      displayQuery.removeEventListener("change", updateDisplay);
    };
  }, []);

  const install = useCallback(async (): Promise<InstallResult> => {
    if (standalone) return "unavailable";
    if (!installPrompt) return iosDevice() ? "manual" : "unavailable";

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
    return choice.outcome;
  }, [installPrompt, standalone]);

  const value = useMemo(
    () => ({
      online,
      standalone,
      installAvailable: !standalone && (Boolean(installPrompt) || iosDevice()),
      install,
    }),
    [install, installPrompt, online, standalone],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}
