import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import "./globals.css";
import { RootProvider } from "@/providers/root-provider";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: {
    template: "%s | PMS",
    default: "Project Management System",
  },
  description: "Enterprise-grade Multi-tenant Project Management System",
};

// ─── Anti-flicker inline script ───────────────────────────────────────────────
// Runs synchronously before any paint, reads localStorage and applies
// the correct [data-accent] and .dark class to <html> immediately.
// This prevents the flash of wrong theme on first load.
const themeScript = `(function() {
  try {
    var stored = JSON.parse(localStorage.getItem('pms-theme-v1') || '{}');
    var accent = stored.state && stored.state.accent ? stored.state.accent : 'blue';
    var mode   = stored.state && stored.state.mode   ? stored.state.mode   : 'system';

    document.documentElement.setAttribute('data-accent', accent);

    var isDark = mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch(e) {
    document.documentElement.setAttribute('data-accent', 'blue');
  }
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-flicker: apply theme before first paint */}
        <script
          id="pms-theme-init"
          dangerouslySetInnerHTML={{ __html: themeScript }}
          suppressHydrationWarning
        />
      </head>
      <body
        className={`${jakarta.variable} ${sora.variable} min-h-screen bg-background text-foreground font-sans antialiased`}
        suppressHydrationWarning
      >
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
