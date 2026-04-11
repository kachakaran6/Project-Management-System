"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { toast } from "sonner";

export default function LogoutPage() {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout();
        toast.success("Successfully logged out. See you soon!");
        router.push("/login");
      } catch (error) {
        console.error("Logout failed:", error);
        router.push("/login");
      }
    };

    performLogout();
  }, [logout, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Signing you out securely...</p>
      </div>
    </div>
  );
}
