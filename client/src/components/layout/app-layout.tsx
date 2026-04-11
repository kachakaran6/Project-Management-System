"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { AppHeader } from "@/components/layout/header/header";
import { Sidebar } from "@/components/layout/sidebar/sidebar";
import { useUIStore } from "@/store/ui-store";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { mobileSidebarOpen, setMobileSidebarOpen, setActiveRoute } =
    useUIStore();

  useEffect(() => {
    setActiveRoute(pathname);
    setMobileSidebarOpen(false);
  }, [pathname, setActiveRoute, setMobileSidebarOpen]);

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:fixed md:inset-y-0 md:block">
        <Sidebar pathname={pathname} />
      </div>

      <DialogPrimitive.Root
        open={mobileSidebarOpen}
        onOpenChange={setMobileSidebarOpen}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[1px] md:hidden" />
          <DialogPrimitive.Content className="fixed left-0 top-0 z-50 h-screen w-72 border-r border-sidebar-border bg-sidebar p-0 outline-none md:hidden">
            <div className="absolute right-3 top-3 z-10">
              <DialogPrimitive.Close
                className="rounded-md p-1 text-sidebar-foreground hover:bg-sidebar-accent"
                aria-label="Close navigation"
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>
            <Sidebar pathname={pathname} mobile />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="md:pl-72">
        <AppHeader />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
