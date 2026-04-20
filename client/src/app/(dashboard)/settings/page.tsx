"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  User,
  KeyRound,
  Paintbrush,
  Bell,
  Building2,
  CreditCard,
  ShieldCheck,
  Puzzle,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Check,
  Loader2,
  AlertTriangle,
  LogOut,
  Eye,
  EyeOff,
  Zap,
  GitBranch,
  Calendar,
  MessageSquare,
  Sparkles,
  Lock,
  BellRing,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/api/axios-instance";
import { authApi } from "@/features/auth/api/auth.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApplyTheme } from "@/providers/theme-provider";
import { ACCENT_COLORS } from "@/store/theme-store";
import { organizationsApi } from "@/features/organizations/api/organizations.api";
import { UserWithRole } from "@/types/user.types";
import { OrganizationMembership } from "@/types/organization.types";
import * as LucideIcons from "lucide-react";
import { TagManagement } from "@/features/tags/components/tag-management";

// ─── Types ───────────────────────────────────────────────────────────────────

type SectionId =
  | "profile"
  | "account"
  | "appearance"
  | "notifications"
  | "workspace"
  | "organization"
  | "billing"
  | "security"
  | "integrations"
  | "tags"
  | "org_notifications";

interface UserWithOrganizations extends UserWithRole {
  organizations?: OrganizationMembership[];
}

// ─── Nav Items ────────────────────────────────────────────────────────────────

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  managerPlus?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account", icon: KeyRound },
  { id: "appearance", label: "Appearance", icon: Paintbrush },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "workspace", label: "Workspace", icon: Building2, managerPlus: true },
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "billing", label: "Billing", icon: CreditCard, adminOnly: true },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "integrations", label: "Integrations", icon: Puzzle },
  { id: "tags", label: "Tags", icon: LucideIcons.Tag, managerPlus: true },
  {
    id: "org_notifications",
    label: "Org Notifications",
    icon: BellRing,
    adminOnly: true,
  },
];

// ─── Shared UI Primitives ─────────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function DangerCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 shadow-sm">
      <div className="border-b border-destructive/20 px-6 py-4">
        <h2 className="font-heading text-base font-semibold text-destructive">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 ${checked ? "bg-primary" : "bg-muted"
        }`}>
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"
          }`}
      />
    </button>
  );
}

function FormRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 first:pt-0 last:pb-0 [&+&]:border-t [&+&]:border-border">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── 1. PROFILE SECTION ──────────────────────────────────────────────────────────

function ProfileSection() {
  const { user: storeUser } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  // ── Fetch fresh profile from API ──
  const profileQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await authApi.me();
      return res.data; // { user, role, organizationId }
    },
    staleTime: 30_000,
  });

  const profileUser = profileQuery.data?.user ?? storeUser;

  // Local form state — sync when fresh data arrives
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (profileUser) {
      setFirstName(profileUser.firstName ?? "");
      setLastName(profileUser.lastName ?? "");
      // bio is not in the user type yet — keep empty unless API returns it
      setBio((profileUser as any).bio ?? "");
    }
  }, [profileUser]);

  // ── Update mutation ──
  const updateMutation = useMutation({
    mutationFn: (payload: { firstName: string; lastName: string; bio: string }) =>
      authApi.updateMe(payload),
    onSuccess: (res) => {
      // Normalise across response shapes: { data: { user } } or { data: user }
      const updatedUser =
        (res as any)?.data?.user || (res as any)?.user || null;

      if (updatedUser) {
        setUser({ ...storeUser!, ...updatedUser });
      } else {
        // Fallback: patch store with what we sent
        setUser({
          ...storeUser!,
          firstName,
          lastName,
        });
      }

      // Refresh the query so the avatar / initials update too
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Profile updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update profile. Please try again.");
    },
  });

  const handleSave = () => {
    if (!firstName.trim()) {
      toast.error("First name is required.");
      return;
    }
    updateMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      bio,
    });
  };

  const initials =
    `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "U";
  const isLoading = profileQuery.isLoading;
  const isSaving = updateMutation.isPending;

  return (
    <div className="space-y-5">
      <SectionCard
        title="Personal Information"
        description="Update your public profile details.">
        {/* Avatar & name header */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-md">
            {profileUser?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileUser.avatarUrl}
                alt="avatar"
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : isLoading ? (
              <Skeleton className="h-full w-full rounded-2xl" />
            ) : (
              initials
            )}
          </div>
          <div className="space-y-1">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">
                  {profileUser?.firstName} {profileUser?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {profileUser?.email}
                </p>
              </>
            )}
            <Badge variant="secondary" className="mt-1 capitalize text-[10px]">
              {profileUser?.role?.toLowerCase() ??
                storeUser?.role?.toLowerCase() ??
                "member"}
            </Badge>
          </div>
        </div>

        {/* Form fields */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
            <Skeleton className="h-24 rounded-lg" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="set-first-name">First Name</Label>
                <Input
                  id="set-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-last-name">Last Name</Label>
                <Input
                  id="set-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="h-10"
                />
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <Label htmlFor="set-bio">
                Bio <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="set-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell your team a little about yourself…"
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Button
                size="md"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2">
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                {isSaving ? "Saving…" : "Save Changes"}
              </Button>
              {updateMutation.isSuccess && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <Check className="size-3.5" />
                  Saved!
                </span>
              )}
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

// ─── 2. ACCOUNT SECTION ──────────────────────────────────────────────────────

function AccountSection() {
  const { user } = useAuth();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      toast.error("Passwords do not match.");
      return;
    }
    if (newPw.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: currentPw,
        newPassword: newPw,
      });
      toast.success("Password changed successfully!");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch {
      toast.error("Failed to change password. Check current password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionCard
        title="Account Information"
        description="Your login credentials and email address.">
        <div className="space-y-1.5">
          <Label htmlFor="set-email">Email Address</Label>
          <Input
            id="set-email"
            value={user?.email ?? ""}
            readOnly
            className="h-10 cursor-not-allowed bg-muted/40 text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed directly. Contact support if needed.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Change Password"
        description="Use a strong password you don't use anywhere else.">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="set-curr-pw">Current Password</Label>
            <div className="relative">
              <Input
                id="set-curr-pw"
                type={showPw ? "text" : "password"}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="h-10 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPw(!showPw)}>
                {showPw ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-new-pw">New Password</Label>
            <Input
              id="set-new-pw"
              type={showPw ? "text" : "password"}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="h-10"
              placeholder="Min 8 characters"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-confirm-pw">Confirm New Password</Label>
            <Input
              id="set-confirm-pw"
              type={showPw ? "text" : "password"}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className={`h-10 ${confirmPw && confirmPw !== newPw ? "border-destructive ring-destructive" : ""}`}
              placeholder="Repeat new password"
            />
            {confirmPw && confirmPw !== newPw && (
              <p className="text-xs text-destructive">
                Passwords don&apos;t match.
              </p>
            )}
          </div>
          <Button
            size="md"
            onClick={handleChangePassword}
            loading={saving}
            className="gap-2 mt-1">
            <KeyRound className="size-4" />
            Update Password
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── 3. APPEARANCE SECTION (Full Theme Engine UI) ───────────────────────────

function AppearanceSection() {
  const { mode, accent, changeMode, changeAccent } = useApplyTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const modes = [
    { id: "light" as const, label: "Light", icon: Sun, desc: "Clean & bright" },
    { id: "dark" as const, label: "Dark", icon: Moon, desc: "Easy on eyes" },
    { id: "system" as const, label: "System", icon: Monitor, desc: "Follows OS" },
  ];

  const densityOptions = [
    {
      id: "comfortable",
      label: "Comfortable",
      desc: "More breathing room",
      emoji: "🌊",
    },
    {
      id: "compact",
      label: "Compact",
      desc: "More content on screen",
      emoji: "⚡",
    },
  ];

  const [density, setDensity] = useState<string>(() => {
    if (typeof window === "undefined") return "comfortable";
    return localStorage.getItem("ui-density") ?? "comfortable";
  });

  if (!mounted) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <Skeleton className="mb-1 h-5 w-32" />
          <Skeleton className="mb-4 h-4 w-56" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <Skeleton className="mb-4 h-5 w-40" />
          <div className="flex gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-12 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Theme Mode ── */}
      <SectionCard
        title="Theme Mode"
        description="Switch between light, dark, or follow your OS preference.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {modes.map(({ id, label, icon: Icon, desc }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                onClick={() => {
                  changeMode(id);
                  toast.success(`Theme set to ${label}`);
                }}
                className={`group relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${active
                    ? "border-primary bg-primary/8 shadow-sm"
                    : "border-border bg-muted/10 hover:border-primary/40 hover:bg-muted/30"
                  }`}>
                {/* Mode thumbnail preview */}
                <div
                  className={`relative flex h-14 w-full max-w-20 overflow-hidden rounded-lg border ${active ? "border-primary/40" : "border-border"
                    }`}>
                  <div
                    className={`flex-1 ${id === "dark"
                        ? "bg-slate-900"
                        : id === "light"
                          ? "bg-white"
                          : "bg-linear-to-r from-white to-slate-900"
                      }`}>
                    <div
                      className={`m-1.5 h-1.5 w-8 rounded-full opacity-60 ${id === "dark" ? "bg-slate-500" : "bg-slate-300"
                        }`}
                    />
                    <div
                      className={`m-1.5 mt-1 h-1.5 w-5 rounded-full opacity-40 ${id === "dark" ? "bg-slate-600" : "bg-slate-200"
                        }`}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon
                    className={`size-3.5 ${active ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <p
                    className={`text-sm font-semibold ${active ? "text-primary" : ""}`}>
                    {label}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
                {active && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <Check className="size-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ── Accent Color ── */}
      <SectionCard
        title="Accent Color"
        description="Choose a brand color that applies across all buttons, links, and highlights.">
        <div className="flex flex-wrap gap-3">
          {ACCENT_COLORS.map(({ id, label, primary, dark: darkColor }) => {
            const active = accent === id;
            // Use dark color if currently in dark mode
            const currentMode =
              mode === "system"
                ? typeof window !== "undefined" &&
                  window.matchMedia("(prefers-color-scheme: dark)").matches
                  ? "dark"
                  : "light"
                : mode;
            const swatchColor = currentMode === "dark" ? darkColor : primary;

            return (
              <button
                key={id}
                title={label}
                onClick={() => {
                  changeAccent(id);
                  toast.success(`Accent color: ${label}`);
                }}
                className={`group relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${active
                    ? "border-foreground/30 scale-110 shadow-md"
                    : "border-transparent hover:border-foreground/20"
                  }`}
                style={{ background: swatchColor }}>
                {active && (
                  <Check className="size-5 text-white drop-shadow-sm" />
                )}
                {/* Tooltip */}
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Preview pill */}
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">Live preview</p>
          <button
            className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:brightness-95"
            style={{ background: "var(--primary)" }}>
            Primary Button
          </button>
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: "var(--accent)",
              color: "var(--accent-foreground)",
            }}>
            Accent Badge
          </span>
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: "var(--primary)" }}
          />
          <span className="text-xs" style={{ color: "var(--primary)" }}>
            Link color
          </span>
          <input
            type="text"
            readOnly
            value="Input field"
            className="h-8 rounded-md border px-2 text-xs"
            style={{
              borderColor: "var(--primary)",
              outline: "none",
              boxShadow: `0 0 0 2px color-mix(in srgb, var(--primary) 20%, transparent)`,
            }}
          />
        </div>
      </SectionCard>

      {/* ── UI Density ── */}
      <SectionCard
        title="UI Density"
        description="Control how compact the interface feels.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {densityOptions.map(({ id, label, desc, emoji }) => {
            const active = density === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setDensity(id);
                  if (typeof window !== "undefined")
                    localStorage.setItem("ui-density", id);
                  toast.success(`Density set to ${label}`);
                }}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all hover:-translate-y-0.5 ${active
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/40 hover:bg-muted/20"
                  }`}>
                <span className="text-2xl">{emoji}</span>
                <div>
                  <p
                    className={`text-sm font-semibold ${active ? "text-primary" : ""}`}>
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                {active && <Check className="ml-auto size-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── 4. NOTIFICATIONS SECTION ────────────────────────────────────────────────

type NotifPrefs = Record<string, boolean>;

const DEFAULT_NOTIFS: NotifPrefs = {
  emailTaskAssigned: true,
  emailTaskUpdated: false,
  emailComments: true,
  emailProjectUpdates: true,
  inAppAll: true,
  inAppRealtime: true,
  soundEnabled: false,
};

function NotificationsSection() {
  const [prefs, setPrefs] = useState<NotifPrefs>(() => {
    if (typeof window === "undefined") return DEFAULT_NOTIFS;
    try {
      return (
        JSON.parse(localStorage.getItem("notif-prefs") || "null") ??
        DEFAULT_NOTIFS
      );
    } catch {
      return DEFAULT_NOTIFS;
    }
  });

  const toggle = useCallback((key: string) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (typeof window !== "undefined")
        localStorage.setItem("notif-prefs", JSON.stringify(next));
      toast.success("Notification preference saved.");
      return next;
    });
  }, []);

  const emailNotifs = [
    {
      key: "emailTaskAssigned",
      label: "Task Assigned",
      desc: "When a task is assigned to you",
    },
    {
      key: "emailTaskUpdated",
      label: "Task Updated",
      desc: "When tasks you follow are modified",
    },
    {
      key: "emailComments",
      label: "Comments & Mentions",
      desc: "When someone mentions you in a comment",
    },
    {
      key: "emailProjectUpdates",
      label: "Project Updates",
      desc: "Status changes on your projects",
    },
  ];

  const inAppNotifs = [
    {
      key: "inAppAll",
      label: "All In-App Alerts",
      desc: "Master toggle for all notifications",
    },
    {
      key: "inAppRealtime",
      label: "Real-time Updates",
      desc: "Live feed updates without page reload",
    },
  ];

  return (
    <div className="space-y-5">
      <SectionCard
        title="Email Notifications"
        description="Control which events send you an email.">
        <div className="divide-y divide-border">
          {emailNotifs.map(({ key, label, desc }) => (
            <FormRow key={key} label={label} description={desc}>
              <Toggle checked={!!prefs[key]} onChange={() => toggle(key)} />
            </FormRow>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="In-App Notifications"
        description="Manage alerts within the application.">
        <div className="divide-y divide-border">
          {inAppNotifs.map(({ key, label, desc }) => (
            <FormRow key={key} label={label} description={desc}>
              <Toggle checked={!!prefs[key]} onChange={() => toggle(key)} />
            </FormRow>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Sound Notifications"
        description="Play sounds for important actions.">
        <FormRow
          label="Enable Sounds"
          description="Audio cues for task updates and mentions">
          <Toggle
            checked={!!prefs.soundEnabled}
            onChange={() => toggle("soundEnabled")}
          />
        </FormRow>
      </SectionCard>
    </div>
  );
}

// ─── 5. WORKSPACE SECTION ────────────────────────────────────────────────────

function WorkspaceSection() {
  const [name, setName] = useState("My Workspace");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch("/workspaces/current", { name, description: desc });
      toast.success("Workspace updated!");
    } catch {
      toast.error("Failed to update workspace.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionCard
        title="Workspace Details"
        description="Customize your workspace settings.">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">Workspace Name</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-desc">Description</Label>
            <Textarea
              id="ws-desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="What is this workspace used for?"
            />
          </div>
          <Button size="md" onClick={handleSave} loading={saving}>
            <Check className="mr-2 size-4" />
            Save Workspace
          </Button>
        </div>
      </SectionCard>

      <DangerCard
        title="Danger Zone"
        description="Irreversible actions for your workspace.">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Delete Workspace</p>
            <p className="text-xs text-muted-foreground">
              Permanently delete this workspace and all its data. This cannot be
              undone.
            </p>
          </div>
          <Button variant="destructive" size="sm" className="shrink-0">
            <AlertTriangle className="mr-1.5 size-3.5" />
            Delete
          </Button>
        </div>
      </DangerCard>
    </div>
  );
}

// ─── 6. ORGANIZATION SECTION ─────────────────────────────────────────────────

function OrganizationSection() {
  const { activeOrg, organizations, user } = useAuth();
  const queryClient = useQueryClient();
  const role = activeOrg?.role || user?.role;
  const canManageOrg = role === "SUPER_ADMIN" || role === "ADMIN";

  const requestStatusQuery = useQuery({
    queryKey: ["auth", "organization-access-status"],
    queryFn: () => authApi.getOrganizationAccessStatus(),
    staleTime: 20_000,
  });

  const requestAccessMutation = useMutation({
    mutationFn: (note?: string) =>
      authApi.requestOrganizationAccess({ requestedRole: "ADMIN", note }),
    onSuccess: async () => {
      toast.success("Access request submitted. Super Admin will review it.");
      await queryClient.invalidateQueries({
        queryKey: ["auth", "organization-access-status"],
      });
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to submit access request.";
      toast.error(message);
    },
  });

  const accessStatus = requestStatusQuery.data?.data;
  const status = accessStatus?.status ?? "NONE";

  // ── Create local state for organization creation ──
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createOrgMutation = useMutation({
    mutationFn: (name: string) => organizationsApi.create({ name }),
    onSuccess: async () => {
      // 1. Fetch updated organizations list
      const orgsRes = await organizationsApi.getMy();
      const organizations = orgsRes.data;

      // 2. Refresh user profile (it might have updated role/status)
      const meRes = await authApi.me();
      const userData = meRes.data.user;

      // 3. Update Global Auth Store
      useAuthStore
        .getState()
        .setAuth(
          userData as any,
          useAuthStore.getState().accessToken!,
          organizations as any,
        );

      // 4. Update Query Cache
      queryClient.invalidateQueries({
        queryKey: ["auth", "organization-access-status"],
      });

      toast.success(`Organization created! Your workspace is ready.`);
      setNewOrgName("");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to create organization.",
      );
    },
  });

  const handleCreateOrg = () => {
    if (!newOrgName.trim()) {
      toast.error("Please enter an organization name.");
      return;
    }
    createOrgMutation.mutate(newOrgName.trim());
  };

  const statusBadge =
    status === "APPROVED"
      ? {
        label: "Approved",
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
      }
      : status === "REJECTED"
        ? {
          label: "Rejected",
          className: "bg-red-100 text-red-700 border-red-200",
        }
        : status === "PENDING"
          ? {
            label: "Pending",
            className: "bg-amber-100 text-amber-700 border-amber-200",
          }
          : {
            label: "Not Requested",
            className: "bg-muted text-muted-foreground border-border",
          };

  return (
    <div className="space-y-5">
      <SectionCard
        title="Organization Details"
        description="Manage your organization's core settings.">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              defaultValue={activeOrg?.name ?? ""}
              className="h-10"
              readOnly
            />
          </div>
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20">
                Free Plan
              </Badge>
              <Button variant="secondary" size="sm">
                Upgrade to Pro
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Member Organizations"
        description="All organizations you are part of.">
        <div className="divide-y divide-border">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  {org.name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{org.name}</p>
                  {org.slug && (
                    <p className="text-xs text-muted-foreground">/{org.slug}</p>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="capitalize text-xs">
                {org.role.toLowerCase()}
              </Badge>
            </div>
          ))}
        </div>
      </SectionCard>

      {!canManageOrg &&
        organizations.length === 0 &&
        (user?.role as string) !== "MEMBER" ? (
        <SectionCard
          title="Organization Access Request"
          description="Request elevated organization access and track approval status.">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
              <div>
                <p className="text-sm font-semibold">Request Status</p>
                <p className="text-xs text-muted-foreground">
                  Requested role: {accessStatus?.requestedRole ?? "ADMIN"}
                </p>
              </div>
              <Badge className={statusBadge.className}>
                {statusBadge.label}
              </Badge>
            </div>

            {accessStatus?.requestedAt ? (
              <p className="text-xs text-muted-foreground">
                Requested on{" "}
                {new Date(accessStatus.requestedAt).toLocaleString()}
              </p>
            ) : null}

            {accessStatus?.reviewedAt ? (
              <p className="text-xs text-muted-foreground">
                Reviewed on {new Date(accessStatus.reviewedAt).toLocaleString()}
              </p>
            ) : null}

            {status === "APPROVED" && organizations.length === 0 && (
              <div className="mt-6 space-y-4 border-t border-border pt-6">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="create-org-name"
                    className="text-primary font-semibold">
                    Create Your Organization
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Your request was approved! Provide a name for your new
                    organization to get started.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="create-org-name"
                      placeholder="e.g. Acme Corp"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      className="h-10"
                    />
                    <Button
                      onClick={handleCreateOrg}
                      disabled={createOrgMutation.isPending}>
                      {createOrgMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Create"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => requestAccessMutation.mutate(undefined)}
                disabled={
                  requestAccessMutation.isPending ||
                  status === "PENDING" ||
                  status === "APPROVED"
                }
                loading={requestAccessMutation.isPending}>
                {status === "APPROVED"
                  ? "Access Granted"
                  : "Request Organization Access"}
              </Button>
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

// ─── 7. BILLING SECTION ──────────────────────────────────────────────────────

function BillingSection() {
  return (
    <div className="space-y-5">
      <SectionCard
        title="Current Plan"
        description="Your subscription details and usage.">
        <div className="overflow-hidden rounded-xl border border-border bg-linear-to-br from-primary/5 to-transparent p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="size-5 text-primary" />
                <h3 className="font-heading text-lg font-bold">Free Plan</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Up to 3 projects &amp; 10 members
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {[
                  "3 active projects",
                  "10 team members",
                  "2GB storage",
                  "Community support",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-1.5">
                    <Check className="size-3 text-emerald-500" /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              Active
            </Badge>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h3 className="font-heading text-lg font-bold">Pro Plan</h3>
                <Badge className="bg-primary text-primary-foreground">
                  Recommended
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Unlimited projects, advanced analytics &amp; priority support
              </p>
              <p className="mt-2 text-2xl font-bold">
                $12{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  /month
                </span>
              </p>
            </div>
          </div>
          <Button size="md" className="mt-4 w-full gap-2">
            <Sparkles className="size-4" />
            Upgrade to Pro
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Billing History"
        description="Recent invoices and payment records.">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <CreditCard className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No billing history yet.
          </p>
          <p className="text-xs text-muted-foreground">
            Invoices will appear here after upgrading.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── 8. SECURITY SECTION ─────────────────────────────────────────────────────

function SecuritySection() {
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogoutAll = async () => {
    setLoggingOut(true);
    try {
      await api.post("/auth/logout-all");
      toast.success("Logged out from all devices.");
      await logout();
    } catch {
      toast.error("Failed to logout from all devices.");
      setLoggingOut(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionCard
        title="Two-Factor Authentication"
        description="Add an extra layer of security to your account.">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Lock className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">Authenticator App</p>
              <p className="text-xs text-muted-foreground">
                Use an authenticator app like Google Authenticator for secure
                login.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">
            Coming Soon
          </Badge>
        </div>
      </SectionCard>

      <SectionCard
        title="Active Sessions"
        description="Devices currently signed in to your account.">
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-3">
              <Monitor className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Current Device</p>
                <p className="text-xs text-muted-foreground">
                  Active now ·{" "}
                  {typeof window !== "undefined"
                    ? navigator.platform
                    : "Browser"}
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 text-xs">
              This device
            </Badge>
          </div>
        </div>
      </SectionCard>

      <DangerCard
        title="Session Management"
        description="Manage active sessions across devices.">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Log Out All Devices</p>
            <p className="text-xs text-muted-foreground">
              Sign out from all browsers and devices except this one.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="shrink-0"
            onClick={handleLogoutAll}
            disabled={loggingOut}>
            {loggingOut ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <LogOut className="mr-1.5 size-3.5" />
            )}
            Log Out All
          </Button>
        </div>
      </DangerCard>
    </div>
  );
}

// ─── 9. INTEGRATIONS SECTION ──────────────────────────────────────────────────

const INTEGRATIONS = [
  {
    name: "Slack",
    icon: MessageSquare,
    desc: "Real-time team messaging and notifications",
    color: "#4A154B",
  },
  {
    name: "Google Calendar",
    icon: Calendar,
    desc: "Sync deadlines and milestones with your calendar",
    color: "#4285F4",
  },
  {
    name: "GitHub",
    icon: GitBranch,
    desc: "Link commits and pull requests to tasks",
    color: "#1a1a1a",
  },
];

function IntegrationsSection() {
  const { activeOrg } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connectionData, setConnectionData] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/telegram/settings");
      setData(res.data.data);
    } catch (error) {
      console.error("Failed to fetch telegram data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await api.post("/telegram/initiate");
      setConnectionData(res.data.data);
      toast.info("Follow the instructions to connect!");
    } catch (error) {
      toast.error("Failed to initiate connection");
    } finally {
      setConnecting(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await api.post("/telegram/verify");
      if (res.data.success) {
        toast.success("Telegram connected successfully!");
        setData({ ...data, connection: res.data.data });
        setConnectionData(null);
      } else {
        toast.error(res.data.message || "Still waiting for /start...");
      }
    } catch (error) {
      toast.error("Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect?")) return;
    try {
      await api.post("/telegram/disconnect");
      setData({ ...data, connection: { isConnected: false } });
      toast.success("Telegram disconnected");
    } catch (error) {
      toast.error("Failed to disconnect");
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const { connection } = data;

  return (
    <div className="space-y-5">
      <SectionCard
        title="Telegram Connection"
        description="Link your Telegram account to this organization to receive alerts.">
        {!connection?.isConnected ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/5 py-8 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500">
                <MessageSquare className="size-8" />
              </div>
              <h3 className="font-heading text-base font-bold">Connect your Telegram</h3>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                Stay updated with tasks and alerts for this organization directly on Telegram.
              </p>

              {!connectionData ? (
                <Button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="mt-5 bg-sky-500 hover:bg-sky-600 text-white gap-2">
                  {connecting ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                  Connect Telegram
                </Button>
              ) : (
                <div className="mt-6 w-full max-w-md rounded-2xl border border-border bg-card p-6 text-left animate-in fade-in zoom-in-95 duration-500 shadow-sm">
                  <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">!</div>
                    Complete your Integration
                  </h4>
                  
                  <div className="space-y-4">
                    {/* Step 1 */}
                    <div className="flex gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">1</div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">Open Telegram Bot</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Click the link below to open our global notification assistant.
                        </p>
                        <a
                          href={connectionData.connectionLink}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-600 transition-colors hover:bg-sky-500/20">
                          <MessageSquare className="size-3.5" />
                          @{import.meta.env.VITE_TELEGRAM_BOT_NAME || "PMS_Orbit_Bot"}
                        </a>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">2</div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">Press the Start Button</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Once the bot opens, click the <span className="font-bold text-foreground">START</span> button at the bottom of the chat.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">3</div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">Verify Connection</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Return here and click the verification button to finalize the link.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={handleVerify}
                      disabled={verifying}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-10 shadow-sm">
                      {verifying ? <Loader2 className="size-4 animate-spin mr-2" /> : <Check className="size-4 mr-2" />}
                      Verify &amp; Link Account
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setConnectionData(null)}
                      className="h-10">
                      Cancel
                    </Button>
                  </div>

                  <p className="mt-4 text-[10px] text-center text-muted-foreground bg-muted/30 p-2 rounded-lg">
                    <span className="font-bold">Pro Tip:</span> This connection is specific to <span className="font-bold text-foreground">{activeOrg?.name}</span>. Your unique verification token is automatically passed to the bot.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                  <Check className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-700">Account Linked</p>
                  <p className="text-xs text-emerald-600/80">You are ready to receive organization alerts.</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-destructive hover:bg-destructive/10">
                Disconnect
              </Button>
            </div>
            <div className="rounded-xl bg-primary/5 p-4 flex gap-3">
              <Sparkles className="size-5 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Notification delivery depends on organization-level settings managed by your administrator.
              </p>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Other Integrations"
        description="Connect your favorite tools to supercharge your workflow.">
        <div className="space-y-3">
          {INTEGRATIONS.map(({ name, icon: Icon, desc, color }) => (
            <div key={name} className="flex items-center justify-between rounded-xl border border-border bg-muted/10 p-4 opacity-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}20` }}>
                  <Icon className="size-5" style={{ color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{name}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">Coming Soon</Badge>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── 10. ORGANIZATION NOTIFICATIONS SECTION ───────────────────────────────────

function TelegramOrgSection() {
  const { activeOrg } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/telegram/settings");
      setData(res.data.data);
    } catch (error) {
      console.error("Failed to fetch org telegram data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleEvent = async (key: string) => {
    const updatedPrefs = {
      ...data.orgSettings.preferences,
      [key]: !data.orgSettings.preferences[key],
    };
    await updateSettings({ preferences: updatedPrefs });
  };

  const updateSettings = async (updates: any) => {
    setSaving(true);
    try {
      const res = await api.patch("/telegram/org-settings", {
        ...data.orgSettings,
        ...updates
      });
      setData({ ...data, orgSettings: res.data.data });
      toast.success("Settings updated");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const { orgSettings } = data;
  const isMasterAllEnabled = Boolean(orgSettings.preferences?.track_all);

  return (
    <div className="space-y-5">
      <SectionCard 
        title="Global Notifications Control" 
        description="Enable or disable automated Telegram alerts for high-level organization events.">
        <div className="flex items-center justify-between p-1">
          <div>
            <p className="text-sm font-semibold">Enable Telegram Notifications</p>
            <p className="text-xs text-muted-foreground">Turn off to silence all bot messages for this organization.</p>
          </div>
          <Switch 
            checked={orgSettings.isEnabled} 
            onCheckedChange={() => updateSettings({ isEnabled: !orgSettings.isEnabled })} 
          />
        </div>

        <div className="mt-4 rounded-xl bg-sky-500/5 border border-sky-500/10 p-4 flex gap-3">
          <AlertTriangle className="size-5 text-sky-600 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-sky-700">How Broadcaster Works</p>
            <p className="text-[11px] text-sky-600/80 leading-relaxed">
              When an event occurs, we check these settings and then look for members who have securely linked their Telegram account to <span className="font-bold underline">{activeOrg?.name}</span>. Only connected members will receive the alerts.
            </p>
          </div>
        </div>

        {orgSettings.isEnabled && (
          <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-2">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block px-1">Event Toggles</Label>
              {isMasterAllEnabled && (
                <p className="text-[11px] text-amber-600 mb-2 px-1">
                  All Activity is enabled. Individual event toggles are temporarily overridden.
                </p>
              )}
              <div className="divide-y divide-border rounded-xl border border-border bg-muted/5">
                {[
                  { key: "track_logins", label: "User Logins", desc: "Alert when a user logs in or out" },
                  { key: "track_tasks", label: "Task Activity", desc: "Alert on task creation, updates, and deletes" },
                  { key: "track_comments", label: "Comments & Mentions", desc: "Alert on new comments and mentions" },
                  { key: "track_activity", label: "Page Activity", desc: "Alert when users open important pages" },
                  { key: "track_all", label: "All Activity", desc: "Master toggle for all organization activity" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 transition-colors hover:bg-muted/10">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch 
                      checked={orgSettings.preferences?.[item.key]} 
                      onCheckedChange={() => toggleEvent(item.key)}
                      disabled={isMasterAllEnabled && item.key !== "track_all"}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block px-1">Target Audience</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'ONLY_ADMINS', label: 'Admins Only', desc: 'Secure alerts' },
                  { id: 'ALL_MEMBERS', label: 'All Members', desc: 'Broad updates' },
                  { id: 'CUSTOM', label: 'Specific Users', desc: 'Filtered list' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => updateSettings({ audience: opt.id })}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      orgSettings.audience === opt.id 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                        : 'border-border bg-card hover:bg-muted/50'
                    }`}>
                    <span className="text-sm font-bold">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                  </button>
                ))}
              </div>

              {orgSettings.audience === 'CUSTOM' && (
                <div className="mt-4 p-4 rounded-xl border border-border bg-muted/5 space-y-3 animate-in fade-in slide-in-from-top-1">
                   <p className="text-xs font-semibold">Select recipients:</p>
                   <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                     {data.activeConnections?.map((conn: any) => {
                       const isSelected = orgSettings.customRecipientIds?.includes(conn.userId);
                       return (
                        <div 
                          key={conn.userId} 
                          onClick={() => {
                            const newIds = isSelected 
                              ? orgSettings.customRecipientIds.filter((id: string) => id !== conn.userId)
                              : [...(orgSettings.customRecipientIds || []), conn.userId];
                            updateSettings({ customRecipientIds: newIds });
                          }}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                          <div className={`h-4 w-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                            {isSelected && <Check className="size-3 text-white" />}
                          </div>
                          <span className="text-sm">{conn.name}</span>
                        </div>
                       );
                     })}
                     {(!data.activeConnections || data.activeConnections.length === 0) && (
                       <p className="text-xs text-muted-foreground text-center py-2">No connected users to select.</p>
                     )}
                   </div>
                </div>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard 
        title="Connectivity Status" 
        description="View members who have linked their Telegram accounts.">
        <div className="space-y-4">
          {data.activeConnections && data.activeConnections.length > 0 ? (
            <div className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              {data.activeConnections.map((conn: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 hover:bg-muted/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 font-bold text-xs">
                      {conn.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{conn.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">ID: {conn.chatId.substring(0, 4)}****</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 uppercase tracking-tight">
                    {conn.role}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-border rounded-2xl bg-muted/5">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30 text-muted-foreground/40">
                <MessageSquare className="size-8" />
              </div>
              <h4 className="text-sm font-bold text-foreground">No Connections Found</h4>
              <p className="mt-1 px-10 text-center text-xs text-muted-foreground leading-relaxed">
                Connect your own account in the <span className="font-bold underline">Integrations</span> tab to start receiving alerts for {activeOrg?.name}.
              </p>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── SECTION RENDERER ─────────────────────────────────────────────────────────

function renderSection(id: SectionId) {
  switch (id) {
    case "profile":
      return <ProfileSection />;
    case "account":
      return <AccountSection />;
    case "appearance":
      return <AppearanceSection />;
    case "notifications":
      return <NotificationsSection />;
    case "workspace":
      return <WorkspaceSection />;
    case "organization":
      return <OrganizationSection />;
    case "billing":
      return <BillingSection />;
    case "security":
      return <SecuritySection />;
    case "integrations":
      return <IntegrationsSection />;
    case "org_notifications":
      return <TelegramOrgSection />;
    case "tags":
      return <TagManagement />;
  }
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const { user, activeOrg } = useAuth();
  const userRole = activeOrg?.role || user?.role;

  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
  const isManager = isAdmin || userRole === "MANAGER";

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.managerPlus && !isManager) return false;
    return true;
  });

  const activeItem = NAV_ITEMS.find((i) => i.id === activeSection)!;
  const ActiveIcon = activeItem.icon;

  return (
    <div className="mx-auto min-h-0 w-full max-w-7xl space-y-4">
      {/* Page Header */}
      {/* <div className="space-y-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, preferences, and workspace configuration.
        </p>
      </div> */}

      <div className="flex gap-4 lg:items-start max-lg:flex-col">
        {/* ── Left Sidebar ── */}
        <aside className="w-full lg:w-56 shrink-0 lg:sticky lg:top-2">
          <nav
            className="overflow-x-auto lg:overflow-visible rounded-2xl border border-border bg-card shadow-sm"
            aria-label="Settings navigation">
            <ul className="flex lg:flex-col gap-1 px-2 py-2 lg:px-0">
              {visibleNav.map(({ id, label, icon: Icon }) => {
                const active = activeSection === id;

                return (
                  <li key={id} className="shrink-0">
                    <button
                      onClick={() => setActiveSection(id)}
                      className={`group flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all
              ${active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}>
                      <Icon
                        className={`size-4 transition-transform group-hover:scale-110 ${active ? "text-primary" : ""
                          }`}
                      />
                      <span>{label}</span>
                      {active && (
                        <ChevronRight className="size-3.5 text-primary hidden lg:block" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User card (optional hide on mobile) */}
          <div className="mt-4 hidden lg:block rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="truncate text-[10px] text-muted-foreground capitalize">
                  {userRole?.toLowerCase()}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Right Content ── */}
        <main className="min-w-0 flex-1">
          {/* Section header */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ActiveIcon className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold">
                {activeItem.label}
              </h2>
              <p className="text-xs text-muted-foreground">
                {activeSection === "profile" &&
                  "Manage your public profile information"}
                {activeSection === "account" &&
                  "Credentials, email, and password settings"}
                {activeSection === "appearance" &&
                  "Customize how the app looks and feels"}
                {activeSection === "notifications" &&
                  "Control what alerts you receive and how"}
                {activeSection === "workspace" &&
                  "Configure your workspace settings"}
                {activeSection === "organization" &&
                  "Manage your organization and members"}
                {activeSection === "billing" &&
                  "Subscription plan and payment details"}
                {activeSection === "security" &&
                  "Protect your account with security controls"}
                {activeSection === "integrations" &&
                  "Connect third-party tools to your workflow"}
                {activeSection === "tags" &&
                  "Define organization-wide labels for tasks"}
              </p>
            </div>
          </div>

          {/* Animated section content */}
          <div
            key={activeSection}
            className="animate-in fade-in slide-in-from-right-2 duration-200">
            {renderSection(activeSection)}
          </div>
        </main>
      </div>
    </div>
  );
}

