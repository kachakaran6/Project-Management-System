"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

export function Toaster() {
  const { theme = "light" } = useTheme();

  return (
    <Sonner
      theme={theme === "dark" ? "dark" : "light"}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "border-border bg-card text-card-foreground",
          title: "font-medium",
          description: "text-muted-foreground",
        },
      }}
    />
  );
}
