"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "@/lib/next-navigation";
import { ArrowRight, CheckCircle2, Loader2, Mail, Shield, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { organizationMembersApi, type OrganizationInviteRecord } from "@/features/organization/api/organization-members.api";
import { useSwitchOrganizationMutation } from "@/features/organization/hooks/use-org-query";
import { cn } from "@/lib/utils";
import { SocialAuth } from "@/features/auth/components/social-auth";

function roleLabel(role?: string) {
  if (role === "ADMIN") return "Admin";
  if (role === "MANAGER") return "Manager";
  return "Member";
}

function statusTone(status?: OrganizationInviteRecord["status"]) {
  if (status === "ACCEPTED") return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
  if (status === "EXPIRED") return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-amber-500/10 text-amber-700 border-amber-200";
}

export default function PublicInvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  const { isAuthenticated, isLoading, user } = useAuth();
  const switchOrganizationMutation = useSwitchOrganizationMutation();

  const [invite, setInvite] = useState<OrganizationInviteRecord | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = useMemo(() => {
    if (typeof window === "undefined") return "/invite/" + token;
    return `${window.location.pathname}${window.location.search}`;
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    const loadInvite = async () => {
      try {
        setLoadingInvite(true);
        setError(null);
        const response = await organizationMembersApi.getInviteByToken(token);
        if (!cancelled) {
          setInvite(response.data);
        }
      } catch (loadError: any) {
        if (!cancelled) {
          const message = loadError?.response?.data?.message || "This invite link is invalid or expired.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoadingInvite(false);
        }
      }
    };

    if (token) {
      loadInvite();
    } else {
      setLoadingInvite(false);
      setError("Missing invite token.");
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAccept = async () => {
    if (!invite) return;

    if (!isAuthenticated) {
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    try {
      setAccepting(true);
      const response = await organizationMembersApi.acceptInvite(token);
      const organizationId = response.data.organizationId;

      await switchOrganizationMutation.mutateAsync(organizationId);
      toast.success(response.data.alreadyMember ? "Invite already accepted." : "Invite accepted.");
      router.push("/dashboard");
    } catch (acceptError: any) {
      const message = acceptError?.response?.data?.message || "Unable to accept this invitation.";
      toast.error(message);
    } finally {
      setAccepting(false);
    }
  };

  const isDisabled =
    loadingInvite || accepting || isLoading || !invite || invite.status !== "PENDING";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.12),transparent_35%),linear-gradient(180deg,#050816_0%,#0b1020_100%)] text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl shadow-black/30">
            <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
              Secure organization invite
            </Badge>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Join the workspace with one click.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 md:text-base">
              This page validates the invitation token, shows the team details, and lets
              you accept the invite after signing in with the matching email address.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Mail, title: "Invite email", value: invite?.email || user?.email || "Waiting..." },
                { icon: Users, title: "Role", value: roleLabel(invite?.role) },
                { icon: Shield, title: "Status", value: invite?.status || "Loading" },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <item.icon className="h-5 w-5 text-emerald-300" />
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">{item.title}</p>
                  <p className="mt-1 text-sm font-medium text-white break-all">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-2 shadow-2xl shadow-black/40">
            <Card className="border-0 bg-transparent text-white shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl text-white">Invitation details</CardTitle>
                <CardDescription className="text-slate-400">
                  Review the invite before joining the organization.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {loadingInvite ? (
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-2/3 bg-white/10" />
                    <Skeleton className="h-10 w-full bg-white/10" />
                    <Skeleton className="h-10 w-1/2 bg-white/10" />
                  </div>
                ) : error ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">
                    {error}
                  </div>
                ) : invite ? (
                  <>
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Organization</p>
                        <p className="mt-1 text-lg font-semibold text-white">
                          {typeof invite.organizationId === "string"
                            ? invite.organizationId
                            : invite.organizationId.name || "Organization"}
                        </p>
                      </div>
                      <Badge className={cn("border", statusTone(invite.status))}>{invite.status}</Badge>
                    </div>

                    <div className="grid gap-3 text-sm text-slate-300">
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                        <span>Invitee email</span>
                        <span className="font-medium text-white break-all">{invite.email}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                        <span>Role</span>
                        <span className="font-medium text-white">{roleLabel(invite.role)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                        <span>Expires</span>
                        <span className="font-medium text-white">{new Date(invite.expiresAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {!isAuthenticated ? (
                      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm text-amber-50">
                        You need to sign in with the invited email address before you can join.
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button
                            onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)}
                            className="gap-2"
                          >
                            Sign in to continue
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-6">
                          <SocialAuth />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm text-emerald-50">
                        Signed in as <span className="font-semibold">{user?.email}</span>.
                        If this does not match the invite email, acceptance will be rejected.
                      </div>
                    )}

                    <Button
                      onClick={handleAccept}
                      disabled={isDisabled}
                      loading={accepting}
                      className="w-full gap-2"
                    >
                      {accepting ? "Accepting invite..." : invite.status === "PENDING" ? "Accept invitation" : "Invitation unavailable"}
                      {!accepting && <CheckCircle2 className="h-4 w-4" />}
                    </Button>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}

