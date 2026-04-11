"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useOrganizationsQuery,
  useSwitchOrganizationMutation,
} from "@/features/organization/hooks/use-org-query";
import { useAuthStore } from "@/store/auth-store";

export default function TestOrgPage() {
  const organizationsQuery = useOrganizationsQuery();
  const switchOrganizationMutation = useSwitchOrganizationMutation();
  const activeOrgId = useAuthStore((state) => state.activeOrgId);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="font-heading text-3xl font-semibold">
        Organization Context Test
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>3. Fetch Organizations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            onClick={() => organizationsQuery.refetch()}
            loading={organizationsQuery.isFetching}
          >
            Reload Organizations
          </Button>
          {organizationsQuery.error ? (
            <p className="text-destructive">
              {String(organizationsQuery.error)}
            </p>
          ) : null}
          <div className="space-y-2">
            {(organizationsQuery.data?.data.items ?? []).map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="font-medium">{org.name}</p>
                  <p className="text-xs text-muted-foreground">ID: {org.id}</p>
                </div>
                <Button
                  variant={activeOrgId === org.id ? "secondary" : "outline"}
                  onClick={() => switchOrganizationMutation.mutate(org.id)}
                  loading={
                    switchOrganizationMutation.isPending &&
                    activeOrgId !== org.id
                  }
                >
                  {activeOrgId === org.id ? "Active" : "4. Switch Organization"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Header Context</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify({ "x-organization-id": activeOrgId }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
