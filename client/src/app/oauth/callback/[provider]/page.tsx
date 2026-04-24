"use client";

import { useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { handleOAuthCallback } from "@/features/auth/authSlice";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const hasCalled = useRef(false);

  const provider = params?.provider as string;
  const code = searchParams?.get("code");
  const error = searchParams?.get("error");

  useEffect(() => {
    if (hasCalled.current) return;

    if (error) {
      toast.error("OAuth Login Failed", { description: error });
      router.push("/login");
      return;
    }

    if (!code || !provider) {
      toast.error("Invalid OAuth callback parameters.");
      router.push("/login");
      return;
    }

    const processCallback = async () => {
      hasCalled.current = true;
      try {
        const result = await dispatch(handleOAuthCallback({ provider, code })).unwrap();
        if (result.success) {
          toast.success("Successfully logged in!");
          router.push("/dashboard");
        }
      } catch (err: any) {
        toast.error("Authentication Failed", { description: err || "Please try again." });
        router.push("/login");
      }
    };

    processCallback();
  }, [code, provider, error, dispatch, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Authenticating...</h1>
        <p className="text-muted-foreground">
          Please wait while we complete your {provider} sign-in.
        </p>
      </div>
    </div>
  );
}
