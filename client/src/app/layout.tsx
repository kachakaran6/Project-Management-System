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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jakarta.variable} ${sora.variable} min-h-screen bg-background text-foreground font-sans antialiased`}
      >
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
