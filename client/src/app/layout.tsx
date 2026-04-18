import "./globals.css";
import { RootProvider } from "@/providers/root-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
        <RootProvider>{children}</RootProvider>
    </div>
  );
}
