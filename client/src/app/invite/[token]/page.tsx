"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock3, Loader2, Lock, ShieldCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { organizationMembersApi } from "@/features/organization/api/organization-members.api";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";

function roleLabel(role?: string) {
  return role === "ADMIN" ? "Admin" : "Member";
}

function resolveOrgName(organizationId: unknown) {
  if (!organizationId || typeof organizationId === "string") return "Organization";
  const org = organizationId as { name?: string; slug?: string };
  return org.name || org.slug || "Organization";
}

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token ?? "";
  const { user, logout } = useAuth();

  const inviteQuery = useQuery({
    queryKey: ["invite", token],
    queryFn: () => organizationMembersApi.getInviteByToken(token),
    enabled: Boolean(token),
  });

  const acceptMutation = useMutation({
    mutationFn: () => organizationMembersApi.acceptInvite(token),
    onSuccess: async (response) => {
      toast.success(response.message || "Invite accepted.");
      const orgId = response.data.organizationId;
      router.push(`/organization/${orgId}/members`);
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to accept invitation.";
      toast.error(message);
    },
  });

  const invite = inviteQuery.data?.data;
  const status = invite?.status ?? "PENDING";
  const orgName = useMemo(() => resolveOrgName(invite?.organizationId), [invite?.organizationId]);

  const isEmailMismatch = user && invite?.email && user.email.toLowerCase() !== invite.email.toLowerCase();

  const handleSwitchAccount = async () => {
    await logout();
    router.push(`/login?callbackUrl=${encodeURIComponent(window.location.href)}&email=${encodeURIComponent(invite?.email || "")}`);
  };

  const handleRegisterNew = async () => {
    await logout();
    router.push(`/signup?callbackUrl=${encodeURIComponent(window.location.href)}&email=${encodeURIComponent(invite?.email || "")}`);
  };

  if (inviteQuery.isLoading) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (inviteQuery.isError || !invite) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-10">
        <Card className="w-full border-red-100 shadow-xl">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has been revoked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-10">
      <Card className="w-full overflow-hidden border-border/60 shadow-2xl">
        <div className="h-2 bg-gradient-to-r from-primary via-indigo-500 to-emerald-500" />
        <CardHeader className="space-y-3 pb-6">
          <div className="flex items-center gap-2">
            <Badge className={
              status === "PENDING" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : 
              status === "ACCEPTED" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : 
              "bg-red-500/10 text-red-600 border-red-500/20"
            }>
              {status}
            </Badge>
            <Badge variant="outline" className="gap-1 border-primary/20 text-primary/80">
              <ShieldCheck className="size-3.5" />
              Secure Invite
            </Badge>
          </div>
          <CardTitle className="text-4xl font-extrabold tracking-tight">You're invited to join {orgName}</CardTitle>
          <CardDescription className="text-lg text-muted-foreground/80">
            Join the workspace as <span className="font-semibold text-foreground">{roleLabel(invite?.role)}</span>. 
            Invite expires in {invite?.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : "a few days"}.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {status === "EXPIRED" ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 text-center">
              <p className="text-lg font-bold text-red-700">Invite Expired</p>
              <p className="mt-2 text-muted-foreground">This invitation link is no longer valid. Please ask the administrator to send a new one.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/dashboard">Back to Home</Link>
              </Button>
            </div>
          ) : status === "ACCEPTED" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center">
              <p className="text-lg font-bold text-emerald-700">Already a Member</p>
              <p className="mt-2 text-muted-foreground">You have already accepted this invitation and are a member of {orgName}.</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/50 bg-muted/5 p-4 flex flex-col items-center text-center">
                  <div className="p-2 rounded-full bg-primary/5 mb-3 text-primary">
                    <ShieldCheck className="size-5" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Org</p>
                  <p className="mt-1 font-bold truncate w-full">{orgName}</p>
                </div>
                <div className="rounded-2xl border border-border/50 bg-muted/5 p-4 flex flex-col items-center text-center">
                  <div className="p-2 rounded-full bg-primary/5 mb-3 text-primary">
                    <Users className="size-5" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</p>
                  <p className="mt-1 font-bold">{roleLabel(invite?.role)}</p>
                </div>
                <div className="rounded-2xl border border-border/50 bg-muted/5 p-4 flex flex-col items-center text-center">
                  <div className="p-2 rounded-full bg-primary/5 mb-3 text-primary">
                    <Clock3 className="size-5" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expiry</p>
                  <p className="mt-1 font-bold">
                    {invite?.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>

              {isEmailMismatch ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm ring-1 ring-amber-200/50">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-amber-200/50 text-amber-700">
                      <Lock className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-amber-900">Account Mismatch</p>
                      <p className="text-sm text-amber-800/80 leading-relaxed">
                        You're signed in as <span className="font-semibold">{user?.email}</span>, 
                        but this invite was sent to <span className="font-semibold">{invite.email}</span>.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button onClick={handleSwitchAccount} variant="default" size="lg" className="bg-amber-600 hover:bg-amber-700 text-white border-0 shadow-lg shadow-amber-600/20">
                      Switch to invited account
                    </Button>
                    <Button onClick={handleRegisterNew} variant="outline" size="lg" className="border-amber-200 hover:bg-amber-100/50 text-amber-700">
                      Create new account
                    </Button>
                  </div>
                </div>
              ) : user ? (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm ring-1 ring-primary/10">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/20 text-primary">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-primary-900">Signed in as {user.email}</p>
                      <p className="text-sm text-primary-800/70">
                        Click below to accept and join the organization.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button 
                      onClick={() => acceptMutation.mutate()} 
                      loading={acceptMutation.isPending} 
                      size="lg"
                      className="gap-2 shadow-xl shadow-primary/20 px-8 h-12 text-lg font-bold"
                    >
                      <CheckCircle2 className="size-5" />
                      Accept & Join
                    </Button>
                    <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
                      <Link href="/logout">Not you? Log out</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-muted/20 p-8 text-center space-y-6">
                  <div className="space-y-2">
                    <p className="text-xl font-bold">New to PMS Orbit?</p>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Please sign in or create an account with <strong>{invite.email}</strong> to accept your invitation.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button asChild size="lg" className="w-full sm:w-auto px-10 h-12 text-lg font-bold shadow-lg shadow-primary/20">
                      <Link href={`/login?callbackUrl=${encodeURIComponent(window.location.href)}&email=${encodeURIComponent(invite.email)}`}>
                        Sign In
                      </Link>
                    </Button>
                    <Button variant="outline" asChild size="lg" className="w-full sm:w-auto px-10 h-12 text-lg font-bold">
                      <Link href={`/signup?callbackUrl=${encodeURIComponent(window.location.href)}&email=${encodeURIComponent(invite.email)}`}>
                        Create Account
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              {invite?.email ? (
                <p className="text-center text-xs text-muted-foreground font-medium opacity-60">
                  Secure invitation intended for <strong>{invite.email}</strong>
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
