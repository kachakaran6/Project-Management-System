"use client";

import { Provider } from "react-redux";
import { store } from "@/app/store";
import { ThemeProvider } from "next-themes";
import QueryProvider from "./query-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./auth-provider";
import { SocketProvider } from "./socket-provider";
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
            <SocketProvider>
              <TooltipProvider>
                {children}
                <Toaster />
              </TooltipProvider>
            </SocketProvider>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </Provider>
  );
}
