"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { usePathname } from "@/lib/next-navigation";
import { useEffect } from "react";

import { AppHeader } from "@/components/layout/header/header";
import { Sidebar } from "@/components/layout/sidebar/sidebar";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isTasksPage = pathname.startsWith("/tasks");
  const { mobileSidebarOpen, setMobileSidebarOpen, setActiveRoute } =
    useUIStore();

  useEffect(() => {
    setActiveRoute(pathname);
    setMobileSidebarOpen(false);
  }, [pathname, setActiveRoute, setMobileSidebarOpen]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden h-full md:block transition-[width] duration-300">
        <Sidebar pathname={pathname} />
      </div>

      <DialogPrimitive.Root
        open={mobileSidebarOpen}
        onOpenChange={setMobileSidebarOpen}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[1px] md:hidden" />
          <DialogPrimitive.Content className="fixed left-0 top-0 z-50 h-screen w-72 border-r border-sidebar-border bg-sidebar p-0 outline-none md:hidden transition-transform duration-300">
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

      <div className="flex flex-1 flex-col min-w-0 h-full bg-background overflow-hidden">
        <AppHeader />
        <main className={cn(
          "h-full overflow-y-auto",
          !isTasksPage && "overflow-x-hidden"
        )}>
          <div className={cn(
            "w-full animate-in fade-in animate-duration-300",
            !isTasksPage && "mx-auto max-w-350 px-4 py-6 md:px-6 md:py-8"
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

