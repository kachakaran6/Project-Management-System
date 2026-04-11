"use client";

import { FormWrapper } from "@/components/shared/form-wrapper";
import { loginSchema, LoginValues } from "./login-schema";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { useLoginMutation } from "@/features/auth/hooks/use-auth-queries";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const loginMutation = useLoginMutation();

  const onSubmit = async (values: LoginValues) => {
    try {
      await loginMutation.mutateAsync({
        email: values.email,
        password: values.password,
      });
      toast.success("Welcome back. Session restored successfully.");

      const callbackUrl =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("callbackUrl")
          : null;
      router.push(callbackUrl || "/dashboard");
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
        <FormWrapper schema={loginSchema} onSubmit={onSubmit}>
          {(methods) => (
            <div className="space-y-4">
              <FormField
                id="email"
                label="Email"
                required
                error={methods.formState.errors.email?.message}
              >
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
                error={methods.formState.errors.password?.message}
              >
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
                    onClick={() => router.push("/forgot-password")}
                  >
                    Forgot your password?
                  </Button>
                </div>
              </FormField>
              <Button
                disabled={
                  methods.formState.isSubmitting || loginMutation.isPending
                }
                loading={
                  methods.formState.isSubmitting || loginMutation.isPending
                }
                className="w-full"
              >
                {methods.formState.isSubmitting || loginMutation.isPending
                  ? "Logging in..."
                  : "Sign In"}
              </Button>
            </div>
          )}
        </FormWrapper>
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Button
            variant="ghost"
            type="button"
            className="px-1 font-medium text-primary hover:underline hover:bg-transparent"
            onClick={() => router.push("/signup")}
          >
            Register now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
