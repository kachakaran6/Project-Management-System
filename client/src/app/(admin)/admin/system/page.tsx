"use client";

import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useClientInfoQuery,
  useSystemInfoQuery,
} from "@/features/dev/hooks/use-dev";

export default function AdminSystemPage() {
  const { activeOrg } = useAuth();
  const role = activeOrg?.role;
  const isSuperAdmin = role === "SUPER_ADMIN";

  const systemQuery = useSystemInfoQuery();
  const clientInfoQuery = useClientInfoQuery();

  if (!isSuperAdmin) {
    return (
      <Alert variant="warning">
        <AlertTriangle className="size-4" />
        <AlertTitle>Super Admin only</AlertTitle>
        <AlertDescription>
          This section is restricted to SUPER_ADMIN users.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-semibold">System Health</h1>
        <p className="text-muted-foreground mt-1">
          Backend reachability and local environment metadata.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">API Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              Status:{" "}
              <span className="font-medium">
                {systemQuery.data?.status ?? "checking..."}
              </span>
            </p>
            <p>
              Response time:{" "}
              <span className="font-medium">
                {systemQuery.data?.responseTimeMs ?? 0} ms
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Runtime</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Platform: {clientInfoQuery.data?.platform ?? "unknown"}</p>
            <p>Language: {clientInfoQuery.data?.language ?? "unknown"}</p>
            <p>Online: {String(clientInfoQuery.data?.online ?? true)}</p>
            <p>CPU Cores: {clientInfoQuery.data?.cores ?? "n/a"}</p>
            <p>Memory (GB): {clientInfoQuery.data?.memoryGb ?? "n/a"}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
