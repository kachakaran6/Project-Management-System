import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemeMode = "light" | "dark" | "system";
export type AccentColor =
  | "blue" | "indigo" | "purple" | "violet" | "fuchsia"
  | "pink" | "rose" | "crimson" | "orange" | "amber"
  | "yellow" | "lime" | "green" | "emerald" | "teal"
  | "cyan" | "sky" | "slate" | "coffee" | "plum";

export interface AccentDefinition {
  id: AccentColor;
  label: string;
  primary: string; // raw hex for swatches
  dark: string; // dark-mode variant hex
}

export const ACCENT_COLORS: AccentDefinition[] = [
  { id: "blue", label: "Cobalt Blue", primary: "#155eef", dark: "#3b82f6" },
  { id: "indigo", label: "Royal Indigo", primary: "#4f46e5", dark: "#6366f1" },
  { id: "purple", label: "Deep Purple", primary: "#7c3aed", dark: "#8b5cf6" },
  { id: "violet", label: "Iris Violet", primary: "#5b21b6", dark: "#7c3aed" },
  { id: "fuchsia", label: "Modern Fuchsia", primary: "#d946ef", dark: "#e879f9" },
  { id: "pink", label: "Ruby Pink", primary: "#db2777", dark: "#f472b6" },
  { id: "rose", label: "Deep Rose", primary: "#e11d48", dark: "#fb7185" },
  { id: "crimson", label: "Professional Red", primary: "#991b1b", dark: "#f87171" },
  { id: "orange", label: "Vivid Orange", primary: "#f97316", dark: "#fb923c" },
  { id: "amber", label: "Warm Amber", primary: "#d97706", dark: "#fbbf24" },
  { id: "yellow", label: "Bright Saffron", primary: "#eab308", dark: "#facc15" },
  { id: "lime", label: "Electric Lime", primary: "#65a30d", dark: "#a3e635" },
  { id: "green", label: "Forest Green", primary: "#16a34a", dark: "#4ade80" },
  { id: "emerald", label: "Jewel Emerald", primary: "#10b981", dark: "#34d399" },
  { id: "teal", label: "Ocean Teal", primary: "#0d9488", dark: "#2dd4bf" },
  { id: "cyan", label: "Sky Cyan", primary: "#0891b2", dark: "#22d3ee" },
  { id: "sky", label: "Light Azure", primary: "#0ea5e9", dark: "#38bdf8" },
  { id: "slate", label: "Steel Slate", primary: "#475569", dark: "#94a3b8" },
  { id: "coffee", label: "Espresso Brown", primary: "#78350f", dark: "#d97706" },
  { id: "plum", label: "Berry Plum", primary: "#831843", dark: "#be185d" },
  { id: "navy", label: "Midnight Navy", primary: "#0f172a", dark: "#1e293b" },

  { id: "steelblue", label: "Industrial Steel Blue", primary: "#1d4ed8", dark: "#60a5fa" },

  { id: "mint", label: "Fresh Mint", primary: "#14b8a6", dark: "#5eead4" },

  { id: "aqua", label: "Deep Aqua", primary: "#0ea5a4", dark: "#67e8f9" },

  { id: "gold", label: "Rich Gold", primary: "#b45309", dark: "#facc15" },

  { id: "bronze", label: "Muted Bronze", primary: "#92400e", dark: "#fdba74" },

  { id: "charcoal", label: "Carbon Charcoal", primary: "#1f2937", dark: "#6b7280" },

  { id: "ice", label: "Glacier Ice", primary: "#e0f2fe", dark: "#7dd3fc" }
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
