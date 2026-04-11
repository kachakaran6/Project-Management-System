"use client";

import { ThemeProvider } from "next-themes";
import QueryProvider from "./query-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./auth-provider";

export function RootProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryProvider>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
