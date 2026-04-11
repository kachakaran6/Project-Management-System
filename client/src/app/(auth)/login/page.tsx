"use client";

import { LoginForm } from "@/features/auth/login-form";
import { GuestGuard } from "@/features/auth/components/guards";

export default function LoginPage() {
  return (
    <GuestGuard>
      <main className="flex min-h-screen items-center justify-center p-4 bg-background">
        <LoginForm />
      </main>
    </GuestGuard>
  );
}
