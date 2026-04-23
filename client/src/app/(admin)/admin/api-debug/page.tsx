"use client";

import { AlertTriangle, Play } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useApiDebugMutation } from "@/features/dev/hooks/use-dev";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
type HttpMethod = (typeof methods)[number];

export default function AdminApiDebugPage() {
  const { isSuperAdmin } = useAuth();

  const [method, setMethod] = useState<HttpMethod>("GET");
  const [endpoint, setEndpoint] = useState("/health");
  const [payload, setPayload] = useState("");

  const debugMutation = useApiDebugMutation();

  const prettyResponse = useMemo(() => {
    if (!debugMutation.data) return "";
    return JSON.stringify(debugMutation.data.data, null, 2);
  }, [debugMutation.data]);

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
        <h1 className="font-heading text-3xl font-semibold">
          API Debug Console
        </h1>
        <p className="text-muted-foreground mt-1">
          Execute authenticated requests against backend endpoints.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <Select
              value={method}
              onValueChange={(value: HttpMethod) => setMethod(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                {methods.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="/projects"
            />
          </div>

          <Textarea
            rows={6}
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder='{"name": "Example payload"}'
          />

          <Button
            onClick={() => {
              let parsedPayload: unknown = undefined;
              if (payload.trim()) {
                try {
                  parsedPayload = JSON.parse(payload);
                } catch {
                  parsedPayload = payload;
                }
              }

              debugMutation.mutate({
                method,
                endpoint,
                payload: parsedPayload,
              });
            }}
            disabled={debugMutation.isPending || !endpoint.trim()}
          >
            <Play className="mr-2 size-4" />
            Run Request
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Response</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Status: {debugMutation.data?.status ?? "-"} | Duration:{" "}
            {debugMutation.data?.durationMs ?? 0} ms
          </p>
          <pre className="max-h-105 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
            {prettyResponse || "No response yet."}
          </pre>
          {debugMutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>Request failed</AlertTitle>
              <AlertDescription>{debugMutation.error.message}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
