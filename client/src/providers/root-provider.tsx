"use client";

import { Provider } from "react-redux";
import { store } from "@/app/store";
import { ThemeProvider } from "next-themes";
import QueryProvider from "./query-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./auth-provider";
import { AccentApplicator, SystemModeWatcher } from "./theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export function RootProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
        storageKey="pms-next-theme"
      >
        {/* Accent color applicator — sets data-accent on <html> */}
        <AccentApplicator />
        {/* System mode watcher — syncs OS preference to next-themes */}
        <SystemModeWatcher />

        <QueryProvider>
          <AuthProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </Provider>
  );
}
