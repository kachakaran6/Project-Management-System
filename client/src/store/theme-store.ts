import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemeMode   = "light" | "dark" | "system";
export type AccentColor = "blue" | "green" | "purple" | "orange" | "rose";

export interface AccentDefinition {
  id:       AccentColor;
  label:    string;
  primary:  string;   // raw hex for swatches
  dark:     string;   // dark-mode variant hex
}

export const ACCENT_COLORS: AccentDefinition[] = [
  { id: "blue",   label: "Medical Blue",   primary: "#155eef", dark: "#5b8dff" },
  { id: "green",  label: "Emerald Green",  primary: "#16a34a", dark: "#4ade80" },
  { id: "purple", label: "Royal Purple",   primary: "#7c3aed", dark: "#a78bfa" },
  { id: "orange", label: "Sunset Orange",  primary: "#ea580c", dark: "#fb923c" },
  { id: "rose",   label: "Rose Red",       primary: "#e11d48", dark: "#fb7185" },
];

export const THEME_MODES = [
  { id: "light",  label: "Light",  icon: "Sun"     },
  { id: "dark",   label: "Dark",   icon: "Moon"    },
  { id: "system", label: "System", icon: "Monitor" },
] as const;

// ─── Store ────────────────────────────────────────────────────────────────────

interface ThemeState {
  mode:        ThemeMode;
  accent:      AccentColor;
  setMode:     (mode: ThemeMode) => void;
  setAccent:   (accent: AccentColor) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode:      "system",
      accent:    "blue",
      setMode:   (mode)   => set({ mode }),
      setAccent: (accent) => set({ accent }),
    }),
    {
      name:    "themeMode",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// ─── Helper: resolve actual mode from "system" ────────────────────────────────

export function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
