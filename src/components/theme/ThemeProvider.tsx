import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeName = "classic" | "palm" | "midnight" | "sepia";

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

const KEY = "kural:appearance";

const ThemeContext = createContext<ThemeState | null>(null);

interface Stored {
  theme: ThemeName;
  fontStep: number;
  highContrast: boolean;
  reducedMotion: boolean;
}

const defaults: Stored = {
  theme: "classic",
  fontStep: 1,
  highContrast: false,
  reducedMotion: false,
};

const read = (): Stored => {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Stored>(read);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = state.theme;
    root.dataset.contrast = state.highContrast ? "high" : "normal";
    root.dataset.motion = state.reducedMotion ? "reduced" : "full";
    root.dataset.fontStep = String(state.fontStep);
    const scale = FONT_STEPS[state.fontStep]?.scale ?? 1;
    root.style.setProperty("--font-scale", String(scale));
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state]);

  const patch = useCallback((p: Partial<Stored>) => setState((s) => ({ ...s, ...p })), []);

  const value = useMemo<ThemeState>(
    () => ({
      theme: state.theme,
      setTheme: (theme) => patch({ theme }),
      fontStep: state.fontStep,
      setFontStep: (fontStep) =>
        patch({ fontStep: Math.min(FONT_STEPS.length - 1, Math.max(0, fontStep)) }),
      increaseFont: () =>
        setState((s) => ({ ...s, fontStep: Math.min(FONT_STEPS.length - 1, s.fontStep + 1) })),
      decreaseFont: () => setState((s) => ({ ...s, fontStep: Math.max(0, s.fontStep - 1) })),
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
