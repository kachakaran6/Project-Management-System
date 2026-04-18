import {
  useRef,
  useState,
  useEffect,
  KeyboardEvent,
  ClipboardEvent,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "@/lib/next-link";
import { useRouter } from "@/lib/next-navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useSignupMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
} from "@/features/auth/hooks/use-auth-queries";

// ─── Schema ───────────────────────────────────────────────────────────────────

const signupSchema = z
  .object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Minimum 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
    registerAsAdmin: z.boolean().default(false),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupValues = z.infer<typeof signupSchema>;

// ─── OTP_LENGTH constant ─────────────────────────────────────────────────────

const OTP_DIGITS = 8;
const RESEND_COOLDOWN = 60; // seconds

// ─── OTP Input component ──────────────────────────────────────────────────────

function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.padEnd(OTP_DIGITS, "").split("").slice(0, OTP_DIGITS);

  const update = (index: number, char: string) => {
    const next = digits.slice();
    next[index] = char.replace(/\D/, "");
    onChange(next.join(""));
    if (char && index < OTP_DIGITS - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKey = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        update(index, "");
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        update(index - 1, "");
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_DIGITS - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_DIGITS);
    onChange(pasted.padEnd(OTP_DIGITS, "").slice(0, OTP_DIGITS));
    // Focus last filled or next empty
    const nextIdx = Math.min(pasted.length, OTP_DIGITS - 1);
    inputRefs.current[nextIdx]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: OTP_DIGITS }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ""}
          disabled={disabled}
          onChange={(e) => update(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={`OTP digit ${i + 1}`}
          className={[
            "h-12 w-10 rounded-xl border text-center text-lg font-bold tabular-nums",
            "transition-all duration-150 outline-none",
            "border-border bg-card text-foreground",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            digits[i] ? "border-primary/60 bg-primary/5" : "border-border",
            disabled && "opacity-50 cursor-not-allowed",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

// ─── Step 1: Registration form ─────────────────────────────────────────────────

function StepRegistration({
  initialEmail = "",
  onSuccess,
}: {
  initialEmail?: string;
  onSuccess: (email: string) => void;
}) {
  const signupMutation = useSignupMutation();
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema) as any,
    defaultValues: { registerAsAdmin: false, email: initialEmail },
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
      toast.success("Account created! Check your email for the OTP.");
      onSuccess(values.email);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to create account.";
      // Even on "already registered but unverified" the backend returns needsVerification
      if (err.response?.data?.data?.needsVerification) {
        toast.info("Account pending verification. A new OTP has been sent.");
        onSuccess(err.response.data.data.email || "");
      } else {
        toast.error(msg);
      }
    }
  };

  return (
    <>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>Join PMS Orbit. Fast and secure.</CardDescription>
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
            <div className="relative">
              <Input
                {...register("password")}
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
              >
                {showPw ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </FormField>

          <FormField
            label="Confirm Password"
            error={errors.confirmPassword?.message}
          >
            <div className="relative">
              <Input
                {...register("confirmPassword")}
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
              >
                {showConfirm ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </FormField>
          {/* 
          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="registerAsAdmin"
              {...register("registerAsAdmin")}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-background"
            />
            <label htmlFor="registerAsAdmin" className="text-sm font-medium cursor-pointer">
              Register as Admin <span className="text-muted-foreground">(requires approval)</span>
            </label>
          </div> */}

          <Button
            type="submit"
            className="w-full"
            loading={isSubmitting || signupMutation.isPending}
            disabled={isSubmitting || signupMutation.isPending}
          >
            {isSubmitting || signupMutation.isPending
              ? "Creating account…"
              : "Create Account"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </>
  );
}

// ─── Step 2: OTP Verification ─────────────────────────────────────────────────

function StepOtpVerify({
  email,
  onBack,
  onVerified,
}: {
  email: string;
  onBack: () => void;
  onVerified: () => void;
}) {
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const verifyMutation = useVerifyOtpMutation();
  const resendMutation = useSendOtpMutation();

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleVerify = async () => {
    if (otp.replace(/\D/g, "").length < OTP_DIGITS) {
      toast.error(`Please enter all ${OTP_DIGITS} digits.`);
      return;
    }
    try {
      await verifyMutation.mutateAsync({ email, otp: otp.replace(/\D/g, "") });
      toast.success("Email verified! You can now log in.");
      onVerified();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Verification failed.";
      toast.error(msg);
    }
  };

  const handleResend = async () => {
    try {
      await resendMutation.mutateAsync(email);
      toast.success("A new OTP has been sent to your email.");
      setCooldown(RESEND_COOLDOWN);
      setOtp("");
    } catch {
      toast.error("Failed to resend OTP.");
    }
  };

  const isFull = otp.replace(/\D/g, "").length === OTP_DIGITS;

  return (
    <>
      <CardHeader className="space-y-1">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <ShieldCheck className="size-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
        <CardDescription>
          We sent an {OTP_DIGITS}-digit code to{" "}
          <span className="font-semibold text-foreground">{email}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* OTP input */}
        <OtpInput
          value={otp}
          onChange={setOtp}
          disabled={verifyMutation.isPending}
        />

        {/* Hint */}
        <p className="text-center text-xs text-muted-foreground">
          <Mail className="mr-1 inline size-3" />
          Check your spam folder if you don&apos;t see it. Code expires in 10
          minutes.
        </p>

        {/* Verify button */}
        <Button
          className="w-full"
          disabled={!isFull || verifyMutation.isPending}
          onClick={handleVerify}
        >
          {verifyMutation.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Verifying…
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 size-4" />
              Verify OTP
            </>
          )}
        </Button>

        {/* Resend */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={onBack}
          >
            <ArrowLeft className="size-3.5" />
            Change email
          </button>

          <button
            type="button"
            disabled={cooldown > 0 || resendMutation.isPending}
            onClick={handleResend}
            className={[
              "flex items-center gap-1.5 text-sm font-medium transition-colors",
              cooldown > 0
                ? "text-muted-foreground cursor-not-allowed"
                : "text-primary hover:underline",
            ].join(" ")}
          >
            {resendMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
          </button>
        </div>
      </CardContent>
    </>
  );
}

// ─── Step 3: Success ──────────────────────────────────────────────────────────

function StepSuccess({ onLogin }: { onLogin: () => void }) {
  return (
    <>
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
          <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <CardTitle className="text-2xl font-bold">
          You&apos;re verified!
        </CardTitle>
        <CardDescription>
          Your email has been confirmed. Your account is ready.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={onLogin}>
          Continue to Login
        </Button>
      </CardContent>
    </>
  );
}

// ─── Main SignupForm ──────────────────────────────────────────────────────────

type Step = "register" | "otp" | "success";

export function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("register");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const emailParam = searchParams.get("email");
      if (emailParam) setEmail(emailParam);
    }
  }, []);

  const callbackUrl =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("callbackUrl")
      : null;

  // Step indicator
  const steps = [
    { id: "register", label: "Account" },
    { id: "otp", label: "Verify" },
    { id: "success", label: "Done" },
  ];
  const currentIdx = steps.findIndex((s) => s.id === step);

  return (
    <Card className="w-full max-w-md shadow-lg border-white/5 bg-surface/80 backdrop-blur-md">
      {/* ── Step progress indicator ────────────────────────────────────────── */}
      <div className="relative border-b border-white/[0.03] bg-white/[0.01] px-10 py-8">
        {/* Background Line */}
        <div className="absolute left-10 right-10 top-[46px] h-[2px] bg-white/5" />

        {/* Active Progress Line */}
        <div
          className="absolute left-10 top-[46px] h-[2px] bg-primary transition-all duration-500 ease-in-out"
          style={{
            width: `calc(${currentIdx * 50}% - ${currentIdx === 0 ? "0px" : currentIdx === 1 ? "0px" : "0px"})`,
            maxWidth: "calc(100% - 80px)",
          }}
        />

        <div className="relative flex justify-between">
          {steps.map((s, i) => {
            const isActive = i === currentIdx;
            const isCompleted = i < currentIdx;

            return (
              <div key={s.id} className="flex flex-col items-center gap-3">
                <div
                  className={[
                    "relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-500",
                    isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : isActive
                        ? "border-primary bg-background text-primary shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.3)]"
                        : "border-white/10 bg-surface text-muted-foreground",
                  ].join(" ")}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span
                  className={[
                    "text-[11px] font-semibold uppercase tracking-wider transition-colors duration-300",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Step content ──────────────────────────────────────────────────── */}
      {step === "register" && (
        <StepRegistration
          initialEmail={email}
          onSuccess={(em) => {
            setEmail(em);
            setStep("otp");
          }}
        />
      )}

      {step === "otp" && (
        <StepOtpVerify
          email={email}
          onBack={() => setStep("register")}
          onVerified={() => setStep("success")}
        />
      )}

      {step === "success" && (
        <StepSuccess
          onLogin={() => {
            const target = `/login?verified=true${callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`;
            router.push(target);
          }}
        />
      )}
    </Card>
  );
}