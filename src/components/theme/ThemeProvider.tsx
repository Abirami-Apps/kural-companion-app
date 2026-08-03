import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useOptionalUserData } from "@/hooks/useUserData";
import {
  APPEARANCE_KEY,
  DEFAULT_APPEARANCE,
  parseAppearance,
  type AppearancePreferences,
  type ThemeName,
} from "@/lib/user-data";

export type { ThemeName } from "@/lib/user-data";

export const THEMES: { id: ThemeName; label: string; swatch: string[] }[] = [
  { id: "classic", label: "Classic", swatch: ["#1e2540", "#eae0d0", "#b5762a"] },
  { id: "palm", label: "Palm Leaf", swatch: ["#2f3d24", "#efe7cf", "#7d8f36"] },
  { id: "midnight", label: "Midnight", swatch: ["#0d1120", "#dfe4f2", "#7aa2f7"] },
  { id: "sepia", label: "Sepia", swatch: ["#4a3524", "#f3e7d3", "#a4622c"] },
];

export const FONT_STEPS = [
  { id: 0, label: "Small", scale: 0.9 },
  { id: 1, label: "Default", scale: 1 },
  { id: 2, label: "Large", scale: 1.15 },
  { id: 3, label: "Extra large", scale: 1.32 },
];

interface ThemeState {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  fontStep: number;
  setFontStep: (n: number) => void;
  increaseFont: () => void;
  decreaseFont: () => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

const read = (): AppearancePreferences => {
  if (typeof window === "undefined") return { ...DEFAULT_APPEARANCE };
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    return raw ? parseAppearance(JSON.parse(raw)) : { ...DEFAULT_APPEARANCE };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const userData = useOptionalUserData();
  const [fallbackState, setFallbackState] = useState<AppearancePreferences>(read);
  const state = userData?.appearance ?? fallbackState;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = state.theme;
    root.dataset.contrast = state.highContrast ? "high" : "normal";
    root.dataset.motion = state.reducedMotion ? "reduced" : "full";
    root.dataset.fontStep = String(state.fontStep);
    const scale = FONT_STEPS[state.fontStep]?.scale ?? 1;
    root.style.setProperty("--font-scale", String(scale));
    try {
      if (!userData) localStorage.setItem(APPEARANCE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state, userData]);

  const patch = useCallback(
    (preferences: Partial<AppearancePreferences>) => {
      if (userData) userData.updateAppearance(preferences);
      else setFallbackState((current) => ({ ...current, ...preferences }));
    },
    [userData],
  );

  const value = useMemo<ThemeState>(
    () => ({
      theme: state.theme,
      setTheme: (theme) => patch({ theme }),
      fontStep: state.fontStep,
      setFontStep: (fontStep) =>
        patch({ fontStep: Math.min(FONT_STEPS.length - 1, Math.max(0, fontStep)) }),
      increaseFont: () =>
        patch({ fontStep: Math.min(FONT_STEPS.length - 1, state.fontStep + 1) }),
      decreaseFont: () => patch({ fontStep: Math.max(0, state.fontStep - 1) }),
      highContrast: state.highContrast,
      setHighContrast: (highContrast) => patch({ highContrast }),
      reducedMotion: state.reducedMotion,
      setReducedMotion: (reducedMotion) => patch({ reducedMotion }),
    }),
    [patch, state],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
