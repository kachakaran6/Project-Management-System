"use client";

import { SignupForm } from "@/features/auth/components/signup-form";
import { GuestGuard } from "@/features/auth/components/guards";

export default function SignupPage() {
  return (
    <GuestGuard>
      <main className="flex min-h-screen items-center justify-center p-4 bg-background">
        <SignupForm />
      </main>
    </GuestGuard>
  );
}
