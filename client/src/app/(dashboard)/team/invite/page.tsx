"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteMemberForm } from "@/features/team/components/invite-member-form";
import { useInviteMemberMutation } from "@/features/team/hooks/use-team-query";
import { InviteMemberValues } from "@/features/team/schemas/invite.schema";

export default function InviteTeamMemberPage() {
  const router = useRouter();
  const inviteMutation = useInviteMemberMutation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Invite Member</h1>
        <p className="text-muted-foreground mt-1">
          Send organization invite with role assignment.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite Form</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteMemberForm
            isSubmitting={inviteMutation.isPending}
            onSubmit={async (values: InviteMemberValues) => {
              try {
                await inviteMutation.mutateAsync(values);
                toast.success("Invite sent");
                router.push("/team");
              } catch {
                toast.error("Failed to send invite");
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
