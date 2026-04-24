"use client";

import {FormWrapper} from "@/components/shared/form-wrapper";
import {loginSchema, LoginValues} from "./login-schema";
import {useRouter} from "@/lib/next-navigation";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {FormField} from "@/components/ui/form-field";
import {Input} from "@/components/ui/input";
import {PasswordInput} from "@/components/ui/password-input";
import {Button} from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { loginUser } from "@/features/auth/authSlice";
import { toast } from "sonner";
import { SocialAuth } from "./components/social-auth";

export function LoginForm() {
  const router = useRouter();
  const { login, loading } = useAuth();

  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const initialEmail = searchParams?.get("email") || "";

  const onSubmit = async (values: LoginValues) => {
    try {
      const resultAction = await login({
        email: values.email,
        password: values.password,
      });

      if (loginUser.fulfilled.match(resultAction)) {
        toast.success("Welcome back. Session restored successfully.");
        const callbackUrl = searchParams?.get("callbackUrl");
        router.push(callbackUrl || "/dashboard");
      } else {
        throw new Error(resultAction.payload as string);
      }
    } catch (error: any) {
      const status = error.response?.status;
      const message = error.response?.data?.message || "Unable to sign in.";

      if (status === 403) {
        toast.warning(message);
      } else {
        toast.error(message);
      }
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md shadow-md">
      <CardHeader>
        <CardTitle className="text-center">Login to PMS</CardTitle>
      </CardHeader>
      <CardContent>
        <FormWrapper
          schema={loginSchema}
          onSubmit={onSubmit}
          defaultValues={{email: initialEmail} as any}>
          {(methods) => (
            <div className="space-y-4">
              <FormField
                id="email"
                label="Email"
                required
                error={methods.formState.errors.email?.message}>
                <Input
                  id="email"
                  {...methods.register("email")}
                  error={Boolean(methods.formState.errors.email)}
                  placeholder="name@company.com"
                />
              </FormField>
              <FormField
                id="password"
                label="Password"
                required
                error={methods.formState.errors.password?.message}>
                <PasswordInput
                  id="password"
                  {...methods.register("password")}
                  error={Boolean(methods.formState.errors.password)}
                  placeholder="••••••••"
                />
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    type="button"
                    size="sm"
                    className="px-0 font-normal text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => router.push("/forgot-password")}>
                    Forgot your password?
                  </Button>
                </div>
              </FormField>
              <Button
                disabled={methods.formState.isSubmitting || loading}
                loading={methods.formState.isSubmitting || loading}
                className="w-full">
                {methods.formState.isSubmitting || loading
                  ? "Logging in..."
                  : "Sign In"}
              </Button>
              <SocialAuth />
            </div>
          )}
        </FormWrapper>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Button
            variant="ghost"
            type="button"
            className="px-1 font-medium text-primary hover:underline hover:bg-transparent"
            onClick={() => router.push("/signup")}>
            Register now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
