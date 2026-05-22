
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { AppDispatch } from "@/app/store";
import { logoutAllDevices } from "@/features/auth/authSlice";
import {
  User,
  KeyRound,
  UserPlus,
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
  Smartphone,
  Tablet,
  CheckCircle2,
  Clock3,
  Link as LinkIcon,
  LayoutPanelTop,
  History,
  ExternalLink,
  GitCommit,
  GitPullRequest,
  Copy,
  MessagesSquare,
  Settings2,
  Tag,
  Workflow,
  Menu,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";


import { GithubIcon } from "@/components/icons/github-icon";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { fetchMe, updateUser } from "@/features/auth/authSlice";
import { cn } from "@/lib/utils";
import { authApi } from "@/features/auth/api/auth.api";
import { api } from "@/lib/api/axios-instance";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApplyTheme } from "@/providers/theme-provider";
import { ACCENT_COLORS } from "@/store/theme-store";
import { organizationsApi } from "@/features/organizations/api/organizations.api";
import { UserWithRole } from "@/types/user.types";
import { OrganizationMembership } from "@/types/organization.types";
import { TagManagement } from "@/features/tags/components/tag-management";

import { StatusManagement } from "@/features/status/components/status-management";
import { settingsApi, DefaultAssignee } from "@/features/auth/api/settings.api";
import { MultiUserSelect } from "@/features/team/components/multi-user-select";

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
  | "workflow"
  | "default_assignees"
  | "preferences"
  | "github";




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
  { id: "tags", label: "Tags", icon: Tag, managerPlus: true },
  { id: "workflow", label: "Workflow", icon: Workflow, managerPlus: true },
  { id: "default_assignees", label: "Default Assignees", icon: UserPlus },
  { id: "preferences", label: "Preferences", icon: Settings2 },
  { id: "github", label: "GitHub Workflow", icon: GitBranch },

];




// ─── Shared UI Primitives ─────────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-card border border-border/50 bg-card/50 backdrop-blur-sm transition-all", className)}>
      <div className="border-b border-border/50 px-4 py-3">
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-4">{children}</div>
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
    <div className="rounded-card border border-destructive/20 bg-destructive/5 transition-all">
      <div className="border-b border-destructive/10 px-4 py-3">
        <h3 className="text-[15px] font-semibold text-destructive tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-4">{children}</div>
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
  className,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0 [&+&]:border-t border-border/40", className)}>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-medium leading-tight">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground leading-normal">{description}</p>
        )}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

// ─── 1. PROFILE SECTION ──────────────────────────────────────────────────────────

function ProfileSection() {
  const { user: storeUser } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await authApi.me();
      return res.data;
    },
    staleTime: 30_000,
  });

  const profileUser = profileQuery.data?.user ?? storeUser;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (profileUser) {
      setFirstName(profileUser.firstName ?? "");
      setLastName(profileUser.lastName ?? "");
      setBio((profileUser as any).bio ?? "");
    }
  }, [profileUser]);

  const updateMutation = useMutation({
    mutationFn: (payload: { firstName: string; lastName: string; bio: string }) =>
      authApi.updateMe(payload),
    onSuccess: () => {
      dispatch(fetchMe());
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Profile updated!");
    },
    onError: () => {
      toast.error("Update failed.");
    },
  });

  const handleSave = () => {
    if (!firstName.trim()) return toast.error("First name required");
    updateMutation.mutate({ firstName: firstName.trim(), lastName: lastName.trim(), bio });
  };

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "U";
  const isLoading = profileQuery.isLoading;
  const isSaving = updateMutation.isPending;

  return (
    <div className="space-y-4">
      <SectionCard title="Personal Information" description="Update your public profile details.">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 flex items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-background ring-offset-2 ring-offset-border/10 shadow-sm overflow-hidden">
              {profileUser?.avatarUrl ? (
                <img src={profileUser.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : isLoading ? (
                <Skeleton className="h-full w-full rounded-full" />
              ) : (
                <span className="text-xl font-bold">{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold truncate">
                {profileUser?.firstName} {profileUser?.lastName}
              </h4>
              <p className="text-xs text-muted-foreground truncate">{profileUser?.email}</p>
              <Badge variant="secondary" className="mt-1 text-[10px] h-4.5">
                {profileUser?.role?.toLowerCase() ?? "member"}
              </Badge>
            </div>
          </div>

          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium" htmlFor="set-first-name">First Name</Label>
              <Input
                id="set-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium" htmlFor="set-last-name">Last Name</Label>
              <Input
                id="set-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-[13px] font-medium" htmlFor="set-bio">Bio <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea
                id="set-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="resize-none text-sm min-h-[80px]"
                placeholder="Tell your team about yourself..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-border/50 pt-4 gap-3">
             {updateMutation.isSuccess && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 animate-in fade-in slide-in-from-right-1">
                  <CheckCircle2 className="size-3.5" />
                  Saved
                </span>
              )}
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
              {isSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Check className="size-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
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
    if (newPw !== confirmPw) return toast.error("Passwords don't match");
    if (newPw.length < 8) return toast.error("Too short");
    setSaving(true);
    try {
      await api.post("/auth/change-password", { currentPassword: currentPw, newPassword: newPw });
      toast.success("Password changed!");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch {
      toast.error("Failed. Check current password.");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Account Information" description="Your login credentials and email address.">
        <div className="space-y-2 max-w-md">
          <Label className="text-[13px] font-medium" htmlFor="set-email">Email Address</Label>
          <Input id="set-email" value={user?.email ?? ""} readOnly className="h-9 cursor-not-allowed bg-muted/50" />
          <p className="text-[10px] text-muted-foreground">Email changes require support verification.</p>
        </div>
      </SectionCard>

      <SectionCard title="Change Password" description="Ensure your account is using a long, random password.">
        <div className="flex flex-col gap-4">
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium" htmlFor="set-curr-pw">Current Password</Label>
              <div className="relative">
                <Input
                  id="set-curr-pw"
                  type={showPw ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="h-9 pr-9"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>
            <div className="hidden md:block" />
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium" htmlFor="set-new-pw">New Password</Label>
              <Input
                id="set-new-pw"
                type={showPw ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="h-9"
                placeholder="Min. 8 chars"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium" htmlFor="set-confirm-pw">Confirm Password</Label>
              <Input
                id="set-confirm-pw"
                type={showPw ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className={cn("h-9", confirmPw && confirmPw !== newPw && "border-destructive")}
                placeholder="Repeat new password"
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-border/50 pt-4">
            <Button size="sm" onClick={handleChangePassword} disabled={saving} className="min-w-[140px]">
              {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <KeyRound className="size-4 mr-2" />}
              Update Password
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── 3. APPEARANCE SECTION (Full Theme Engine UI) ───────────────────────────

function AppearanceSection() {
  const { mode, accent, radius, changeMode, changeAccent, changeRadius } = useApplyTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const modes = [
    { id: "light" as const, label: "Light", icon: Sun, color: "text-amber-500" },
    { id: "dark" as const, label: "Dark", icon: Moon, color: "text-blue-500" },
    { id: "system" as const, label: "System", icon: Monitor, color: "text-slate-500" },
  ];

  const radiusOptions = [
    { id: "compact" as const, label: "Compact", emoji: "🟦", desc: "Sharp & modern" },
    { id: "standard" as const, label: "Standard", emoji: "🟩", desc: "Balanced feel" },
    { id: "comfortable" as const, label: "Comfortable", emoji: "🟪", desc: "Soft & friendly" },
  ];

  return (
    <div className="space-y-4">
      <SectionCard title="Interface Theme" description="Choose how Project Management System looks on your screen.">
        <div className="grid grid-cols-3 gap-3">
          {modes.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => changeMode(m.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-card border p-3 transition-all",
                  active ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm" : "border-border hover:bg-muted/50"
                )}
              >
                <div className={cn("p-2 rounded-card bg-background border border-border/50 shadow-sm", active && "border-primary/20")}>
                  <m.icon className={cn("size-4", active ? "text-primary" : m.color)} />
                </div>
                <span className={cn("text-xs font-semibold", active ? "text-primary" : "text-muted-foreground")}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Accent Color" description="Personalize the brand color across the workspace.">
        <div className="flex flex-wrap gap-2.5">
          {ACCENT_COLORS.map(({ id, label, primary, dark: darkColor }) => {
            const active = accent === id;
            const swatchColor = mode === "dark" ? darkColor : primary;
            return (
              <button
                key={id}
                title={label}
                onClick={() => changeAccent(id)}
                className={cn(
                  "relative size-9 rounded-full transition-all hover:scale-110",
                  active ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "ring-1 ring-border"
                )}
                style={{ backgroundColor: swatchColor }}
              >
                {active && <Check className="size-4 text-white absolute inset-0 m-auto drop-shadow-sm" />}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Interface Rounding" description="Choose the border radius for components.">
        <div className="grid grid-cols-3 gap-3">
          {radiusOptions.map((opt) => {
            const active = radius === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => changeRadius(opt.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-card border p-3 transition-all",
                  active ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm" : "border-border hover:bg-muted/50"
                )}
              >
                <span className="text-xl">{opt.emoji}</span>
                <div className="text-center">
                   <p className={cn("text-[11px] font-bold", active ? "text-primary" : "text-foreground")}>{opt.label}</p>
                   <p className="text-[9px] text-muted-foreground leading-tight hidden md:block">{opt.desc}</p>
                </div>
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
  const { user, activeOrg } = useAuth();
  const dispatch = useAppDispatch();
  const isAdmin = activeOrg?.role === "OWNER" || activeOrg?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  // Personal Settings (Sync with Backend)
  const [personalSaving, setPersonalSaving] = useState(false);
  const personalNotifs = user?.settings?.notifications || {
    email: true,
    push: true,
    telegram: true,
    notifyOnAssignment: true,
    notifyOnMention: true,
    notifyOnComment: true,
    notifyOnTaskUpdate: false
  };

  const updatePersonalSettings = async (updates: any) => {
    setPersonalSaving(true);
    try {
      const nextSettings = { 
        ...user?.settings, 
        notifications: { ...personalNotifs, ...updates } 
      };
      const res = await authApi.updateMe({ settings: nextSettings });
      dispatch(updateUser(res.data.user));
      toast.success("Personal preferences updated");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setPersonalSaving(false);
    }
  };

  // Telegram Role-Based Settings
  const telegramSettings = user?.settings?.telegramSettings || {
    enabled: true,
    taskNotifications: { all: false, assigned: true, created: true },
    projectNotifications: { all: false, created: true },
    activityNotifications: { all: true, own: true },
    loginNotifications: { all: true, own: true }
  };

  const updateTelegramPref = async (path: string, val: boolean) => {
    setPersonalSaving(true);
    try {
      const nextTelegram = JSON.parse(JSON.stringify(telegramSettings));
      const keys = path.split(".");
      let current = nextTelegram;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = val;

      const nextSettings = { 
        ...user?.settings, 
        telegramSettings: nextTelegram 
      };
      const res = await authApi.updateMe({ settings: nextSettings });
      dispatch(updateUser(res.data.user));
      toast.success("Telegram preferences updated");
    } catch {
      toast.error("Failed to save Telegram preferences");
    } finally {
      setPersonalSaving(false);
    }
  };

  // Telegram Org Settings (Admin Only)
  const [tgData, setTgData] = useState<any>(null);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgSaving, setTgSaving] = useState(false);

  const fetchTgData = useCallback(async () => {
    if (!isAdmin) return;
    setTgLoading(true);
    try {
      const res = await api.get("/telegram/settings");
      setTgData(res.data.data);
    } catch { } finally { setTgLoading(false); }
  }, [isAdmin]);

  useEffect(() => { fetchTgData(); }, [fetchTgData]);

  const updateTgSettings = async (updates: any) => {
    setTgSaving(true);
    try {
      const res = await api.patch("/telegram/org-settings", { ...tgData.orgSettings, ...updates });
      setTgData({ ...tgData, orgSettings: res.data.data });
      toast.success("Organization Telegram settings updated");
    } catch { toast.error("Failed to update organization settings"); } finally { setTgSaving(false); }
  };

  const personalEvents = [
    { section: "Direct Alerts", items: [
      { key: "notifyOnAssignment", label: "Task Assignments", desc: "When someone assigns a task to you" },
      { key: "notifyOnMention", label: "Mentions", desc: "When you are @mentioned in a comment" },
      { key: "notifyOnComment", label: "Task Activity", desc: "New comments on your tasks" },
      { key: "notifyOnTaskUpdate", label: "Property Changes", desc: "When tasks you follow are modified" },
    ]}
  ];

  const tgEvents = [
    { section: "Tasks", items: [
      { key: "notify_task_created", label: "Task Created", desc: "Alert when a new task is added" },
      { key: "notify_task_updated", label: "Task Properties", desc: "Title, description or priority changes" },
      { key: "notify_task_status_updated", label: "Status Changes", desc: "When a task moves between columns" },
      { key: "notify_task_assigned", label: "Task Assignments", desc: "When users are assigned to tasks" },
      { key: "notify_task_deleted", label: "Task Deletions", desc: "Alert when a task is permanently removed" },
    ]},
    { section: "Projects", items: [
      { key: "notify_project_created", label: "Project Created", desc: "When a new project is launched" },
      { key: "notify_project_updated", label: "Project Updates", desc: "Changes to project metadata" },
      { key: "notify_project_deleted", label: "Project Deleted", desc: "When a project is archived/deleted" },
    ]},
    { section: "Collaboration", items: [
      { key: "notify_comment_created", label: "New Comments", desc: "Every new comment in the organization" },
      { key: "notify_mentions", label: "Mentions", desc: "Direct alerts for @user mentions" },
    ]},
    { section: "Security", items: [
      { key: "notify_user_login", label: "User Logins", desc: "Successful session starts" },
      { key: "notify_failed_login", label: "Security Alerts", desc: "Failed login attempts and threats" },
    ]},
    { section: "Activity Tracking", items: [
      { key: "notify_page_opened", label: "Page Navigation", desc: "Track which pages users are visiting" },
      { key: "notify_action_performed", label: "System Actions", desc: "Miscellaneous button clicks and triggers" },
    ]}
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard title="Personal Notification Channels" description="Configure where you want to receive direct alerts.">
           <FormRow label="Email Notifications" description="Receive direct alerts in your inbox.">
              <Switch checked={personalNotifs.email} onCheckedChange={(val) => updatePersonalSettings({ email: val })} disabled={personalSaving} />
           </FormRow>
           <FormRow label="In-App Alerts" description="Enable push notifications and badge alerts.">
              <Switch checked={personalNotifs.push} onCheckedChange={(val) => updatePersonalSettings({ push: val })} disabled={personalSaving} />
           </FormRow>
           <FormRow label="Telegram DM" description="Receive direct messages from our bot.">
              <Switch checked={personalNotifs.telegram} onCheckedChange={(val) => updatePersonalSettings({ telegram: val })} disabled={personalSaving} />
           </FormRow>
        </SectionCard>

        {personalNotifs.telegram && (
          <div className="space-y-6">
            <SectionCard title="Individual Preferences" description="Control which automated alerts reach your individual Telegram inbox.">
               <div className="space-y-4">
                 <FormRow label="Enable Telegram Alerts" description="Master switch for all your personal bot notifications.">
                    <Switch checked={telegramSettings.enabled} onCheckedChange={(val) => updateTelegramPref("enabled", val)} disabled={personalSaving} />
                 </FormRow>

                 {telegramSettings.enabled && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-1">
                       {/* Task Notifications */}
                       <div className="space-y-3">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-primary/80">Task Notifications</p>
                          <div className="grid gap-2">
                             {isAdmin ? (
                                <div className="flex items-center justify-between p-3 rounded-card bg-muted/20 border border-border/50">
                                   <div>
                                      <p className="text-[13px] font-bold">Receive ALL Task Updates</p>
                                      <p className="text-[10px] text-muted-foreground">Get notified for every creation, update, and deletion in the org.</p>
                                   </div>
                                   <Switch 
                                      checked={telegramSettings.taskNotifications?.all} 
                                      onCheckedChange={(val) => updateTelegramPref("taskNotifications.all", val)} 
                                      disabled={personalSaving}
                                   />
                                </div>
                             ) : (
                                <>
                                   <div className="flex items-center justify-between p-3 rounded-card bg-muted/20 border border-border/50">
                                      <div>
                                         <p className="text-[13px] font-bold">Tasks Assigned to Me</p>
                                         <p className="text-[10px] text-muted-foreground">Receive alerts when you are set as an assignee.</p>
                                      </div>
                                      <Switch 
                                         checked={telegramSettings.taskNotifications?.assigned} 
                                         onCheckedChange={(val) => updateTelegramPref("taskNotifications.assigned", val)} 
                                         disabled={personalSaving}
                                      />
                                   </div>
                                   <div className="flex items-center justify-between p-3 rounded-card bg-muted/20 border border-border/50">
                                      <div>
                                         <p className="text-[13px] font-bold">Tasks Created by Me</p>
                                         <p className="text-[10px] text-muted-foreground">Follow updates on tasks you initiated.</p>
                                      </div>
                                      <Switch 
                                         checked={telegramSettings.taskNotifications?.created} 
                                         onCheckedChange={(val) => updateTelegramPref("taskNotifications.created", val)} 
                                         disabled={personalSaving}
                                      />
                                   </div>
                                </>
                             )}
                          </div>
                       </div>

                       {/* Project Notifications */}
                       <div className="space-y-3">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-primary/80">Project Notifications</p>
                          <div className="grid gap-2">
                             {isAdmin ? (
                                <div className="flex items-center justify-between p-3 rounded-card bg-muted/20 border border-border/50">
                                   <div>
                                      <p className="text-[13px] font-bold">Receive ALL Project Updates</p>
                                      <p className="text-[10px] text-muted-foreground">Monitor every new project and modification.</p>
                                   </div>
                                   <Switch 
                                      checked={telegramSettings.projectNotifications?.all} 
                                      onCheckedChange={(val) => updateTelegramPref("projectNotifications.all", val)} 
                                      disabled={personalSaving}
                                   />
                                </div>
                             ) : (
                                <div className="flex items-center justify-between p-3 rounded-card bg-muted/20 border border-border/50">
                                   <div>
                                      <p className="text-[13px] font-bold">Projects Created by Me</p>
                                      <p className="text-[10px] text-muted-foreground">Updates for projects where you are the owner.</p>
                                   </div>
                                   <Switch 
                                      checked={telegramSettings.projectNotifications?.created} 
                                      onCheckedChange={(val) => updateTelegramPref("projectNotifications.created", val)} 
                                      disabled={personalSaving}
                                   />
                                </div>
                             )}
                          </div>
                       </div>
                       {/* Activity Notifications */}
                       <div className="space-y-3">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-primary/80">Activity & Security</p>
                          <div className="grid gap-2">
                             {isAdmin ? (
                                <>
                                   <div className="flex items-center justify-between p-3 rounded-card bg-muted/20 border border-border/50">
                                      <div>
                                         <p className="text-[13px] font-bold">Track All User Activity</p>
                                         <p className="text-[10px] text-muted-foreground">Get alerts for page views and actions across the org.</p>
                                      </div>
                                      <Switch 
                                         checked={telegramSettings.activityNotifications?.all ?? true} 
                                         onCheckedChange={(val) => updateTelegramPref("activityNotifications.all", val)} 
                                         disabled={personalSaving}
                                      />
                                   </div>
                                   <div className="flex items-center justify-between p-3 rounded-card bg-muted/20 border border-border/50">
                                      <div>
                                         <p className="text-[13px] font-bold">Track All Login Events</p>
                                         <p className="text-[10px] text-muted-foreground">Monitor every login attempt in the organization.</p>
                                      </div>
                                      <Switch 
                                         checked={telegramSettings.loginNotifications?.all ?? true} 
                                         onCheckedChange={(val) => updateTelegramPref("loginNotifications.all", val)} 
                                         disabled={personalSaving}
                                      />
                                   </div>
                                </>
                             ) : (
                                <>
                                   <div className="flex items-center justify-between p-3 rounded-card bg-muted/20 border border-border/50">
                                      <div>
                                         <p className="text-[13px] font-bold">My Personal Activity</p>
                                         <p className="text-[10px] text-muted-foreground">Alerts for your own interactions and navigation.</p>
                                      </div>
                                      <Switch 
                                         checked={telegramSettings.activityNotifications?.own ?? true} 
                                         onCheckedChange={(val) => updateTelegramPref("activityNotifications.own", val)} 
                                         disabled={personalSaving}
                                      />
                                   </div>
                                   <div className="flex items-center justify-between p-3 rounded-card bg-muted/20 border border-border/50">
                                      <div>
                                         <p className="text-[13px] font-bold">My Login Events</p>
                                         <p className="text-[10px] text-muted-foreground">Security alerts for your account logins.</p>
                                      </div>
                                      <Switch 
                                         checked={telegramSettings.loginNotifications?.own ?? true} 
                                         onCheckedChange={(val) => updateTelegramPref("loginNotifications.own", val)} 
                                         disabled={personalSaving}
                                      />
                                   </div>
                                </>
                             )}
                          </div>
                       </div>
                    </div>
                 )}
               </div>
            </SectionCard>

            <SectionCard title="Legacy Alerts (Personal)" description="Old-style direct alerts for your personal actions (deprecated).">
               <div className="space-y-3">
                 {personalEvents[0].items.map(item => (
                   <div key={item.key} className="flex items-center justify-between p-2.5 rounded-card bg-muted/20 border border-border/40 opacity-70">
                      <div>
                        <p className="text-[12px] font-bold">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch 
                        checked={personalNotifs[item.key] ?? true} 
                        onCheckedChange={(val) => updatePersonalSettings({ [item.key]: val })} 
                        disabled={personalSaving}
                      />
                   </div>
                 ))}
               </div>
            </SectionCard>
          </div>
        )}
      </div>

      <SectionCard title="System Feedback" description="Configure audio cues for task updates and mentions.">
        <FormRow label="Enable Sounds" description="High-fidelity audio alerts for dashboard activities.">
          <Switch checked={!!user?.settings?.soundEnabled} onCheckedChange={(val) => {
             authApi.updateMe({ settings: { ...user?.settings, soundEnabled: val } }).then(res => dispatch(updateUser(res.data.user)));
          }} />
        </FormRow>
      </SectionCard>

      {isAdmin && (
        <div className="space-y-6 pt-6 border-t border-border/50">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold tracking-tight">Team-Wide Broadcasts (Admins Only)</h2>
            <p className="text-sm text-muted-foreground">Manage automated Telegram notifications that are sent to the entire team.</p>
          </div>

          {tgLoading ? (
            <Skeleton className="h-48 w-full rounded-card" />
          ) : tgData ? (
            <div className="space-y-6">
              <SectionCard title="Telegram Broadcast Engine" description="Master controls for the organization-wide Telegram bot.">
                <FormRow label="Global Broadcast" description="Master switch for all automated bot activity.">
                  <Switch 
                    disabled={tgSaving}
                    checked={tgData.orgSettings.isEnabled} 
                    onCheckedChange={() => updateTgSettings({ isEnabled: !tgData.orgSettings.isEnabled })} 
                  />
                </FormRow>

                {tgData.orgSettings.isEnabled && (
                  <div className="mt-6 space-y-8 animate-in fade-in slide-in-from-top-2">
                    {tgEvents.map((group) => (
                      <div key={group.section} className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary px-1">{group.section}</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {group.items.map(item => (
                            <div key={item.key} className="flex items-center justify-between p-3 rounded-card bg-muted/20 border border-border/50 hover:bg-muted/30 transition-all group">
                              <div className="min-w-0 pr-2">
                                <p className="text-[13px] font-bold truncate group-hover:text-primary transition-colors">{item.label}</p>
                                <p className="text-[10px] text-muted-foreground line-clamp-1">{item.desc}</p>
                              </div>
                              <Switch 
                                disabled={tgSaving}
                                checked={tgData.orgSettings.preferences?.[item.key] ?? true} 
                                onCheckedChange={() => {
                                  const currentVal = tgData.orgSettings.preferences?.[item.key] ?? true;
                                  const next = { ...tgData.orgSettings.preferences, [item.key]: !currentVal };
                                  updateTgSettings({ preferences: next });
                                }} 
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {tgData.orgSettings.isEnabled && (
                <SectionCard title="Target Audience" description="Who should receive these automated broadcasts?">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'ONLY_ADMINS', label: 'Admins Only', desc: 'Secure alerts' },
                      { id: 'ALL_MEMBERS', label: 'All Members', desc: 'Team-wide' },
                      { id: 'CUSTOM', label: 'Custom List', desc: 'Specific users' }
                    ].map(opt => (
                      <button 
                        key={opt.id} 
                        disabled={tgSaving}
                        onClick={() => updateTgSettings({ audience: opt.id })} 
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-card border text-center transition-all", 
                          tgData.orgSettings.audience === opt.id 
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm" 
                            : "border-border hover:bg-muted/50 hover:border-border/80"
                        )}
                      >
                        <p className={cn("text-[11px] font-bold", tgData.orgSettings.audience === opt.id ? "text-primary" : "text-foreground")}>{opt.label}</p>
                        <p className="text-[9px] text-muted-foreground leading-tight">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>
          ) : (
             <div className="p-8 rounded-card border border-dashed border-border flex flex-col items-center justify-center text-center bg-muted/5">
                <BellRing className="size-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-bold">Telegram Not Configured</p>
                <p className="text-xs text-muted-foreground max-w-xs mt-1">Connect your organization to Telegram in the Integrations tab first.</p>
             </div>
          )}
        </div>
      )}
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
      toast.success("Workspace updated");
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Workspace Details" description="Customize your workspace identity.">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-1">
            <Label className="text-[13px] font-medium" htmlFor="ws-name">Workspace Name</Label>
            <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-[13px] font-medium" htmlFor="ws-desc">Description</Label>
            <Textarea id="ws-desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="resize-none" placeholder="What is this workspace used for?" />
          </div>
        </div>
        <div className="flex justify-end border-t border-border/50 mt-4 pt-4">
          <Button size="sm" onClick={handleSave} disabled={saving} className="min-w-[120px]">
            {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Check className="size-4 mr-2" />}
            Save Workspace
          </Button>
        </div>
      </SectionCard>

      <DangerCard title="Danger Zone" description="Irreversible actions for your workspace.">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-[13px] font-semibold text-destructive">Delete Workspace</p>
            <p className="text-[11px] text-muted-foreground">Permanently delete this workspace and all its data. This cannot be undone.</p>
          </div>
          <Button variant="destructive" size="sm" className="w-full sm:w-auto h-9">
            <AlertTriangle className="mr-2 size-3.5" />
            Delete Workspace
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
  const dispatch = useDispatch<AppDispatch>();
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
      dispatch(fetchMe());

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
                <div className="flex h-8 w-8 items-center justify-center rounded-card bg-primary/10 text-sm font-bold text-primary">
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
            <div className="flex items-center justify-between rounded-card border border-border bg-muted/20 p-4">
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
    <div className="space-y-4">
      <SectionCard title="Current Subscription" description="Manage your plan and billing cycles.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-card border border-primary/20 bg-primary/5 p-4 flex flex-col justify-between">
            <div>
               <div className="flex items-center gap-2 mb-1">
                 <Zap className="size-4 text-primary" />
                 <h3 className="text-sm font-bold">Free Plan</h3>
               </div>
               <p className="text-[11px] text-muted-foreground mb-3">Perfect for individuals and small teams.</p>
               <ul className="space-y-1.5">
                 {["3 active projects", "10 team members", "2GB cloud storage"].map(f => (
                   <li key={f} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                     <Check className="size-3 text-emerald-500" /> {f}
                   </li>
                 ))}
               </ul>
            </div>
            <Badge className="mt-4 w-fit bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active Now</Badge>
          </div>

          <div className="rounded-card border border-border bg-card p-4 flex flex-col justify-between hover:border-primary/50 transition-colors group">
            <div>
               <div className="flex items-center justify-between mb-1">
                 <div className="flex items-center gap-2">
                   <Sparkles className="size-4 text-primary" />
                   <h3 className="text-sm font-bold">Pro Plan</h3>
                 </div>
                 <span className="text-sm font-bold">$12<span className="text-[10px] font-normal text-muted-foreground">/mo</span></span>
               </div>
               <p className="text-[11px] text-muted-foreground mb-3">Unlimited power for growing organizations.</p>
               <ul className="space-y-1.5">
                 {["Unlimited projects", "Advanced analytics", "Priority support"].map(f => (
                   <li key={f} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                     <Check className="size-3 text-primary" /> {f}
                   </li>
                 ))}
               </ul>
            </div>
            <Button size="sm" className="mt-4 w-full h-8 text-[11px] font-bold">Upgrade Workspace</Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Invoices" description="Your recent transaction history.">
        <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border rounded-card">
          <CreditCard className="size-8 text-muted-foreground/30 mb-2" />
          <p className="text-xs font-medium text-muted-foreground">No invoices yet</p>
          <p className="text-[10px] text-muted-foreground/60">Your billing history will appear here.</p>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── 8. SECURITY SECTION ─────────────────────────────────────────────────────

function SecuritySection() {
  const dispatch = useDispatch<AppDispatch>();
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: () => authApi.getSessions(),
    staleTime: 15_000,
  });

  const logoutSessionMutation = useMutation({
    mutationFn: (sessionId?: string) => authApi.logoutSession(sessionId),
    onSuccess: (_, sessionId) => {
      toast.success(sessionId ? "Session terminated" : "Logged out");
      queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => dispatch(logoutAllDevices()).unwrap(),
    onSuccess: () => { toast.success("Logged out from all devices"); window.location.href = "/login"; },
  });

  const sessions = sessionsQuery.data?.data?.sessions ?? [];

  return (
    <div className="space-y-4">
      <SectionCard title="Security Auth" description="Enhanced protection for your workspace.">
        <FormRow label="Two-Factor Authentication" description="Add an extra layer of security using an authenticator app.">
          <Badge variant="outline" className="text-[10px]">Coming Soon</Badge>
        </FormRow>
      </SectionCard>

      <SectionCard title="Active Sessions" description="Devices currently signed into your account.">
        {sessionsQuery.isLoading ? (
          <div className="space-y-2"><Skeleton className="h-12 w-full rounded-card" /><Skeleton className="h-12 w-full rounded-card" /></div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-card border border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-card bg-background border border-border flex items-center justify-center">
                    {s.deviceType === 'mobile' ? <Smartphone className="size-4" /> : <Monitor className="size-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold flex items-center gap-2">
                      {s.deviceName} {s.isCurrent && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-tighter">Current</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{new Date(s.lastActiveAt).toLocaleString()} • {s.ipAddress}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => logoutSessionMutation.mutate(s.id)} className="h-7 text-[10px] text-destructive hover:bg-destructive/10">Terminate</Button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <DangerCard title="Session Control" description="Force logout across all platforms.">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold text-destructive">Sign out of everything</p>
            <p className="text-[11px] text-muted-foreground">This will invalidate all active sessions immediately.</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => logoutAllMutation.mutate()} disabled={logoutAllMutation.isPending} className="h-9 px-4">
            {logoutAllMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-2" /> : <LogOut className="size-3.5 mr-2" />}
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
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await api.post("/telegram/initiate");
      setConnectionData(res.data.data);
      toast.info("Follow instructions to link Telegram");
    } catch { toast.error("Init failed"); } finally { setConnecting(false); }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await api.post("/telegram/verify");
      if (res.data.success) {
        toast.success("Telegram linked!");
        setData({ ...data, ...res.data.data });
        setConnectionData(null);
      } else { toast.error(res.data.message || "Still waiting..."); }
    } catch { toast.error("Verification failed"); } finally { setVerifying(false); }
  };

  const handleDisconnect = async () => {
    try {
      await api.delete("/telegram/disconnect");
      toast.success("Telegram disconnected");
      setData({ 
        ...data, 
        connection: { isConnected: false },
        telegram: { connected: false } 
      });
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  if (loading || !data) return <div className="space-y-4"><Skeleton className="h-32 w-full rounded-card" /></div>;

  const { connection } = data;

  return (
    <div className="space-y-4">
      <SectionCard title="Telegram Connection" description="Link your account for real-time alerts.">
        {!connection?.isConnected ? (
          <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-card bg-muted/5 text-center">
            <div className="size-12 rounded-card bg-sky-500/10 text-sky-600 flex items-center justify-center mb-3">
              <MessageSquare className="size-6" />
            </div>
            <h4 className="text-sm font-bold">Connect Telegram</h4>
            <p className="text-[11px] text-muted-foreground max-w-[240px] mt-1 mb-4">Stay updated with tasks directly on your phone.</p>
            {!connectionData ? (
              <Button onClick={handleConnect} disabled={connecting} size="sm" className="bg-sky-500 hover:bg-sky-600 text-white h-9 px-6 font-bold text-[11px]">
                {connecting ? <Loader2 className="size-3.5 animate-spin mr-2" /> : <Zap className="size-3.5 mr-2" />}
                Initiate Link
              </Button>
            ) : (
              <div className="w-full max-w-md p-6 rounded-card border border-border bg-card text-left animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                      </span>
                      Finalize Connection
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-medium">Follow these 3 simple steps to link your account.</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setConnectionData(null)} className="h-8 w-8 rounded-full hover:bg-muted">
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-border/60">
                  <div className="flex gap-4 relative">
                    <div className="z-10 size-6 shrink-0 rounded-full bg-sky-500 text-white flex items-center justify-center text-[11px] font-bold shadow-sm shadow-sky-500/20">1</div>
                    <div className="space-y-3 flex-1">
                      <div>
                        <p className="text-[11px] font-bold text-foreground">Launch Telegram Bot</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed font-medium">Open the bot and it will automatically recognize your session using your secure token.</p>
                      </div>
                      <Button asChild className="w-full h-10 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold rounded-card shadow-lg shadow-sky-500/10 transition-all active:scale-95 group">
                        <a href={connectionData?.connectionLink || "https://t.me/PMS_Orbit_Bot"} target="_blank" rel="noopener noreferrer">
                          <Send className="mr-2 size-3.5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                          Launch Telegram Bot
                        </a>
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-4 relative">
                    <div className="z-10 size-6 shrink-0 rounded-full bg-muted border border-border flex items-center justify-center text-[11px] font-bold">2</div>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-foreground">Press Start</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed font-medium">Once the chat opens, simply tap the <span className="font-bold text-sky-500 underline decoration-sky-500/30">START</span> button at the bottom.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 relative">
                    <div className="z-10 size-6 shrink-0 rounded-full bg-muted border border-border flex items-center justify-center text-[11px] font-bold">3</div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-[11px] font-bold text-foreground">Verify & Finalize</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed font-medium">Return here and click the button below to confirm the link.</p>
                      </div>
                      <Button 
                        onClick={handleVerify} 
                        disabled={verifying} 
                        className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-card shadow-lg shadow-emerald-500/10 transition-all active:scale-95"
                      >
                        {verifying ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <ShieldCheck className="mr-2 size-3.5" />}
                        {verifying ? "Verifying Session..." : "Verify Connection"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-card border border-emerald-500/20 bg-emerald-500/5 transition-all">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                <Check className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900 leading-tight">
                  Connected as {data.telegram.firstName || ''} {data.telegram.lastName || ''} 
                  {data.telegram.username ? ` (@${data.telegram.username})` : (!data.telegram.firstName && !data.telegram.lastName) ? ` (ID: ${data.telegram.telegramId || data.telegram.chatId})` : ''}
                </p>
                <p className="text-xs text-emerald-600/80 font-medium mt-0.5">
                  Receiving org alerts
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDisconnect} 
              className="h-8 text-xs text-destructive hover:bg-destructive/10 font-bold px-4"
            >
              Disconnect
            </Button>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Other Platforms" description="Tools we support or are coming soon.">
        <div className="grid gap-2">
          {INTEGRATIONS.map(i => (
            <div key={i.name} className="flex items-center justify-between p-3 rounded-card border border-border bg-muted/10 opacity-60">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-card flex items-center justify-center" style={{ background: `${i.color}15` }}>
                  <i.icon className="size-4" style={{ color: i.color }} />
                </div>
                <div><p className="text-xs font-bold">{i.name}</p><p className="text-[10px] text-muted-foreground">{i.desc}</p></div>
              </div>
              <Badge variant="secondary" className="text-[9px] h-4">Soon</Badge>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── 10. ORGANIZATION NOTIFICATIONS SECTION ───────────────────────────────────



function GithubSection() {
  const { activeOrg } = useAuth();
  const examples = [
    { label: "Resolve Task", value: `fix PMS-123 resolved login loop`, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Start Work", value: `feat PMS-123 adding auth layer`, icon: Clock3, color: "text-blue-500" },
  ];

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copied"); };

  return (
    <div className="space-y-4">
      <SectionCard title="Commit Automation" description="Control task status directly from your code commits.">
        <div className="grid gap-4 sm:grid-cols-2">
           <div className="p-4 rounded-card border border-emerald-500/20 bg-emerald-500/5">
              <p className="text-[10px] font-black uppercase text-emerald-700 mb-1">Move to Done</p>
              <p className="text-[11px] text-emerald-600/80 mb-3 leading-tight">Use keywords like fix, close, or resolve.</p>
              <div className="flex flex-wrap gap-1">
                 {['fix', 'close', 'resolve', 'done'].map(k => <code key={k} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[9px] font-mono text-emerald-700">{k}</code>)}
              </div>
           </div>
           <div className="p-4 rounded-card border border-blue-500/20 bg-blue-500/5">
              <p className="text-[10px] font-black uppercase text-blue-700 mb-1">In Progress</p>
              <p className="text-[11px] text-blue-600/80 mb-3 leading-tight">Use keywords like start, feat, or working.</p>
              <div className="flex flex-wrap gap-1">
                 {['start', 'feat', 'work', 'chore'].map(k => <code key={k} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[9px] font-mono text-blue-700">{k}</code>)}
              </div>
           </div>
        </div>
      </SectionCard>

      <SectionCard title="Usage Examples" description="Common commit message patterns.">
        <div className="space-y-3">
          {examples.map(ex => (
            <div key={ex.label} className="p-3 rounded-card border border-border bg-muted/10 group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ex.icon className={cn("size-3.5", ex.color)} />
                  <span className="text-[11px] font-bold">{ex.label}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copy(ex.value)} className="h-6 text-[9px] uppercase font-black">Copy Message</Button>
              </div>
              <code className="block p-2 rounded bg-background border border-border/50 text-[10px] font-mono">{ex.value}</code>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}


function PreferencesSection() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [saving, setSaving] = useState(false);

  const taskSuggestionsEnabled = user?.settings?.taskSuggestionsEnabled ?? false;
  const taskDraftEnabled = user?.settings?.taskDraftEnabled ?? false;

  const toggleSetting = async (key: string, enabled: boolean) => {
    setSaving(true);
    try {
      const nextSettings = { 
        ...user?.settings, 
        [key]: enabled 
      };
      const res = await authApi.updateMe({ settings: nextSettings });
      dispatch(updateUser(res.data.user));
      
      // Update local cache
      localStorage.setItem(key, JSON.stringify(enabled));
      
      const label = key === 'taskSuggestionsEnabled' ? 'Suggestions' : 'Draft auto-save';
      toast.success(`${label} ${enabled ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Productivity Features" description="Configure smart features to help you work faster.">
        <div className="space-y-2">
          <FormRow 
            label="Enable Task Suggestions" 
            description="Get AI-powered suggestions for similar tasks while creating a new task to avoid duplicates."
          >
            <Switch 
              checked={taskSuggestionsEnabled} 
              onCheckedChange={(val) => toggleSetting('taskSuggestionsEnabled', val)} 
              disabled={saving} 
            />
          </FormRow>

          <FormRow 
            label="Enable Task Draft Auto-Save" 
            description="Automatically save unfinished tasks as drafts to avoid losing progress."
          >
            <Switch 
              checked={taskDraftEnabled} 
              onCheckedChange={(val) => toggleSetting('taskDraftEnabled', val)} 
              disabled={saving} 
            />
          </FormRow>
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
    case "tags":
      return <TagManagement />;
    case "workflow":
      return <StatusManagement />;
    case "default_assignees":
      return <DefaultAssigneesSection />;
    case "preferences":
      return <PreferencesSection />;
    case "github":
      return <GithubSection />;

  }
}



// ─── 11. DEFAULT ASSIGNEES SECTION ───────────────────────────────────────────

function DefaultAssigneesSection() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["settings", "default-assignees"],
    queryFn: () => settingsApi.getDefaultAssignees(),
  });

  const updateMutation = useMutation({
    mutationFn: (ids: string[]) => settingsApi.updateDefaultAssignees(ids),
    onSuccess: () => {
      toast.success("Default assignees updated");
      queryClient.invalidateQueries({ queryKey: ["settings", "default-assignees"] });
    },
  });

  useEffect(() => {
    if (data?.data?.defaultAssignees && !isInitialized) {
      setSelectedIds(data.data.defaultAssignees.map((u: any) => u.id));
      setIsInitialized(true);
    }
  }, [data, isInitialized]);

  return (
    <div className="space-y-4">
      <SectionCard title="Auto-Assign Rules" description="Team members automatically assigned to your new tasks.">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Primary Assignees</Label>
            <MultiUserSelect value={selectedIds} onChange={setSelectedIds} prefilledUsers={data?.data?.defaultAssignees || []} placeholder="Search team members..." disabled={isLoading || updateMutation.isPending} />
            <p className="text-[10px] text-muted-foreground px-1">Note: This only applies to tasks you create manually.</p>
          </div>
          <div className="flex justify-end pt-2 border-t border-border/40">
            <Button onClick={() => updateMutation.mutate(selectedIds)} disabled={isLoading || updateMutation.isPending || !isInitialized} size="sm" className="min-w-[120px] h-9">
              {updateMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Check className="size-4 mr-2" />}
              Save Rules
            </Button>
          </div>
        </div>
      </SectionCard>

      <div className="p-3 rounded-card border border-primary/10 bg-primary/5 flex gap-3">
        <Sparkles className="size-4 text-primary shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-bold text-primary">Pro Tip:</span> Setting default assignees is great for recurring tasks or small teams where everyone is involved in every task.
        </p>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────


import { useSearchParams, useRouter, usePathname } from "next/navigation";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize from URL or default to "profile"
  const currentTab = searchParams.get("tab") as SectionId || "profile";
  
  // Local state to keep UI snappy, but we sync it with URL
  const [activeSection, setActiveSection] = useState<SectionId>(currentTab);

  // Sync state if URL changes (e.g. back button)
  useEffect(() => {
    const tab = searchParams.get("tab") as SectionId;
    if (tab && tab !== activeSection) {
      setActiveSection(tab);
    }
  }, [searchParams]);

  const handleTabChange = (id: SectionId) => {
    setActiveSection(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const { user, activeOrg } = useAuth();
  const userRole = activeOrg?.role || user?.role;

  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
  const isManager = isAdmin || userRole === "MANAGER";

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.managerPlus && !isManager) return false;
    return true;
  });

  const activeItem = NAV_ITEMS.find((i) => i.id === activeSection) || NAV_ITEMS[0];
  const ActiveIcon = activeItem.icon;

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background/50">
      {/* Mobile Header with Breadcrumb-like title and Menu */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-card bg-primary/10">
            <ActiveIcon className="size-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold">{activeItem.label}</h2>
        </div>
        <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle className="text-left flex items-center gap-2">
                <Settings2 className="size-5 text-primary" />
                Settings
              </SheetTitle>
            </SheetHeader>
            <nav className="p-2">
              <ul className="space-y-1">
                {visibleNav.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        handleTabChange(item.id);
                        setIsMobileNavOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-button transition-colors",
                        activeSection === item.id
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <item.icon className="size-4" />
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Sidebar (Desktop) ── */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/30 backdrop-blur-sm">
          <div className="p-4 border-b border-border/50">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              General
            </h2>
          </div>
          <nav className="flex-1 overflow-y-auto p-3" aria-label="Settings navigation">
            <ul className="space-y-1">
              {visibleNav.map(({ id, label, icon: Icon }) => {
                const active = activeSection === id;
                return (
                  <li key={id}>
                    <button
                      onClick={() => handleTabChange(id)}
                      className={cn(
                        "w-full group flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-card transition-all",
                        active
                          ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("size-4 transition-transform group-hover:scale-110", active ? "text-primary" : "text-muted-foreground/70")} />
                      <span className="flex-1 text-left">{label}</span>
                      {active && <ChevronRight className="size-3 text-primary/60" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User card at bottom */}
          <div className="p-4 border-t border-border/50 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card bg-primary/20 text-[10px] font-bold text-primary ring-1 ring-primary/30">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold leading-none">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="truncate text-[10px] text-muted-foreground mt-1 capitalize">
                  {userRole?.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Right Content ── */}
        <main className="flex-1 overflow-y-auto bg-background/30 custom-scrollbar">
          <div className="mx-auto max-w-4xl p-4 md:p-6 lg:p-8 space-y-6">
            {/* Header Section */}
            <div className="flex flex-col gap-1.5 pb-6 border-b border-border/50">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                <Settings2 className="size-3" />
                <ChevronRight className="size-3" />
                <span className="text-foreground/70">{activeItem.label}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {activeItem.label}
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                {activeSection === "profile" && "Manage your personal profile information and how others see you."}
                {activeSection === "account" && "Update your email, password, and manage active sessions."}
                {activeSection === "appearance" && "Choose your preferred theme, colors, and layout style."}
                {activeSection === "notifications" && "Configure how and when you receive task and activity alerts."}
                {activeSection === "workspace" && "Manage shared settings, naming, and organizational structure."}
                {activeSection === "organization" && "Manage your organization, teams, and member access."}
                {activeSection === "billing" && "Manage your subscription, invoices, and payment methods."}
                {activeSection === "security" && "Enhance your account safety with additional security layers."}
                {activeSection === "integrations" && "Connect and manage third-party applications and API keys."}
                {activeSection === "tags" && "Create and manage organization-wide labels for better organization."}
                {activeSection === "workflow" && "Configure task lifecycles, statuses, and board automation."}
                {activeSection === "default_assignees" && "Set up default users who are automatically assigned to new tasks."}
                {activeSection === "preferences" && "Customize your personal workflow and productivity tools."}
                {activeSection === "github" && "Manage GitHub repository links and automation workflows."}
              </p>
            </div>

            {/* Content Area */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {renderSection(activeSection)}
            </div>
            
            {/* Footer / Spacing */}
            <div className="h-20" />
          </div>
        </main>
      </div>
    </div>
  );
}


