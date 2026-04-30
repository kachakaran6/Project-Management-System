
import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useThemeStore, resolveMode, AccentColor, RadiusPreset, RADIUS_CONFIGS } from "@/store/theme-store";

function applyThemeToDocument(mode: "light" | "dark" | "system") {
  const resolvedMode = resolveMode(mode);
  const html = document.documentElement;

  html.dataset.theme = resolvedMode;
  // next-themes handles the .dark class automatically
}

/**
 * AccentApplicator
 * ─────────────────
 * Subscribes to the accent color in the theme store and applies
 * [data-accent="..."] to the <html> element instantly.
 * Runs inside next-themes' ThemeProvider so both systems coexist.
 */
export function AccentApplicator() {
  const accent = useThemeStore((s) => s.accent);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-accent", accent);
  }, [accent]);

  return null;
}

/**
 * RadiusApplicator
 * ────────────────
 * Subscribes to the radius preset and applies CSS variables to :root.
 */
export function RadiusApplicator() {
  const radius = useThemeStore((s) => s.radius);

  useEffect(() => {
    const config = RADIUS_CONFIGS[radius];
    const root = document.documentElement;
    root.style.setProperty("--radius-xs", config.xs);
    root.style.setProperty("--radius-sm", config.sm);
    root.style.setProperty("--radius-md", config.md);
    root.style.setProperty("--radius-lg", config.lg);
    root.style.setProperty("--radius-xl", config.xl);
  }, [radius]);

  return null;
}

/**
 * SystemModeWatcher
 * ──────────────────
 * When mode === "system", listens to prefers-color-scheme and
 * delegates to next-themes' setTheme() so the .dark class is toggled
 * correctly and all next-themes consumers stay in sync.
 */
export function SystemModeWatcher() {
  const mode = useThemeStore((s) => s.mode);
  const { setTheme } = useTheme();

  // Apply mode via next-themes whenever store value changes
  useEffect(() => {
    applyThemeToDocument(mode);

    if (mode === "system") {
      setTheme("system");
    } else {
      setTheme(mode);
    }
  }, [mode, setTheme]);

  // Keep watching OS preference changes when in "system" mode
  useEffect(() => {
    if (mode !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      applyThemeToDocument(e.matches ? "dark" : "light");
      setTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, setTheme]);

  return null;
}

/**
 * useApplyTheme
 * ──────────────
 * Convenience hook that exposes typed helpers for changing mode and accent.
 * Components that need to alter the theme should use this.
 */
export function useApplyTheme() {
  const { setMode, setAccent, setRadius, mode, accent, radius } = useThemeStore();
  const { setTheme } = useTheme();

  const changeMode = (m: typeof mode) => {
    setMode(m);
    applyThemeToDocument(m);
    if (m !== "system") {
      setTheme(m);
    } else {
      const resolved = resolveMode("system");
      setTheme(resolved);
    }
  };

  const changeAccent = (a: AccentColor) => {
    setAccent(a);
    document.documentElement.setAttribute("data-accent", a);
  };

  const changeRadius = (r: RadiusPreset) => {
    setRadius(r);
  };

  return { mode, accent, radius, changeMode, changeAccent, changeRadius };
}
