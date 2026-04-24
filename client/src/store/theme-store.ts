import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemeMode = "light" | "dark" | "system";
export type AccentColor = "blue" | "green" | "purple" | "orange" | "rose" | "teal" | "indigo" | "amber" | "cyan" | "lime";

export interface AccentDefinition {
  id: AccentColor;
  label: string;
  primary: string; // raw hex for swatches
  dark: string; // dark-mode variant hex
}

export const ACCENT_COLORS: AccentDefinition[] = [
  { id: "blue", label: "Medical Blue", primary: "#155eef", dark: "#3b82f6" },
  { id: "green", label: "Emerald Green", primary: "#16a34a", dark: "#22c55e" },
  { id: "purple", label: "Royal Purple", primary: "#7c3aed", dark: "#8b5cf6" },
  { id: "orange", label: "Sunset Orange", primary: "#ea580c", dark: "#f97316" },
  { id: "rose", label: "Rose Red", primary: "#e11d48", dark: "#f43f5e" },
  { id: "teal", label: "Ocean Teal", primary: "#0d9488", dark: "#14b8a6" },
  { id: "indigo", label: "Electric Indigo", primary: "#4f46e5", dark: "#6366f1" },
  { id: "amber", label: "Warm Amber", primary: "#d97706", dark: "#f59e0b" },
  { id: "cyan", label: "Sky Cyan", primary: "#0891b2", dark: "#06b6d4" },
  { id: "lime", label: "Acid Lime", primary: "#65a30d", dark: "#84cc16" },
];

export const THEME_MODES = [
  { id: "light", label: "Light", icon: "Sun" },
  { id: "dark", label: "Dark", icon: "Moon" },
  { id: "system", label: "System", icon: "Monitor" },
] as const;

// ─── Store ────────────────────────────────────────────────────────────────────

interface ThemeState {
  mode: ThemeMode;
  accent: AccentColor;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "system",
      accent: "blue",
      setMode: (mode) => set({ mode }),
      setAccent: (accent) => set({ accent }),
    }),
    {
      name: "themeMode",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// ─── Helper: resolve actual mode from "system" ────────────────────────────────

export function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
