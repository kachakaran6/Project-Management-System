"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignupMutation } from "@/features/auth/hooks/use-auth-queries";
import { toast } from "sonner";

const signupBaseSchema = z
  .object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
    registerAsAdmin: z.boolean().default(false),
  });

const signupSchema = signupBaseSchema.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupValues = z.infer<typeof signupBaseSchema>;

export function SignupForm() {
  const router = useRouter();
  const signupMutation = useSignupMutation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema) as any,
    defaultValues: {
      registerAsAdmin: false,
    },
  });

  const onSubmit = async (values: SignupValues) => {
    try {
      const payload = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        role: values.registerAsAdmin ? "ADMIN" : "USER",
      };
      await signupMutation.mutateAsync(payload as any);
      
      if (values.registerAsAdmin) {
        toast.info("Admin request submitted. Please wait for Super Admin approval.");
      } else {
        toast.success("Account created successfully!");
      }
      
      router.push("/login?registered=true");
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to create account.";
      toast.error(message);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-white/5 bg-surface/80 backdrop-blur-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>
          Join PMS today. Fast and secure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" error={errors.firstName?.message}>
              <Input {...register("firstName")} placeholder="John" />
            </FormField>
            <FormField label="Last Name" error={errors.lastName?.message}>
              <Input {...register("lastName")} placeholder="Doe" />
            </FormField>
          </div>

          <FormField label="Email" error={errors.email?.message}>
            <Input
              {...register("email")}
              type="email"
              placeholder="name@example.com"
            />
          </FormField>

          <FormField label="Password" error={errors.password?.message}>
            <PasswordInput {...register("password")} placeholder="••••••••" />
          </FormField>
          
          <FormField
            label="Confirm Password"
            error={errors.confirmPassword?.message}
          >
            <PasswordInput
              {...register("confirmPassword")}
              placeholder="••••••••"
            />
          </FormField>

          <div className="flex items-center space-x-2 py-2">
            <input
              type="checkbox"
              id="registerAsAdmin"
              {...register("registerAsAdmin")}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary bg-background"
            />
            <label
              htmlFor="registerAsAdmin"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Register as Admin (requires approval)
            </label>
          </div>

          <Button
            type="submit"
            className="w-full"
            loading={isSubmitting || signupMutation.isPending}
            disabled={isSubmitting || signupMutation.isPending}
          >
            Create Account
          </Button>

          <div className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
