
import { useState, useEffect, useCallback } from "react";

export function useProjectLayout() {
  const [isFocusMode, setIsFocusMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("projectFocusMode") === "true";
    }
    return false;
  });

  const toggleFocusMode = useCallback(() => {
    setIsFocusMode(prev => {
      const next = !prev;
      localStorage.setItem("projectFocusMode", String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus mode toggle on 'F' key (if not in input)
      if (
        e.key.toLowerCase() === "f" && 
        !["input", "textarea"].includes((e.target as HTMLElement).tagName.toLowerCase()) &&
        !(e.target as HTMLElement).isContentEditable
      ) {
        toggleFocusMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFocusMode]);

  return { isFocusMode, toggleFocusMode };
}
