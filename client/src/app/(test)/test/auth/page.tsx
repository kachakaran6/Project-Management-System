"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  useLoginMutation,
  useUserQuery,
} from "@/features/auth/hooks/use-auth-queries";
import { useAuth } from "@/features/auth/hooks/use-auth";

export default function TestAuthPage() {
  const loginMutation = useLoginMutation();
  const {
    data: userData,
    isLoading: isProfileLoading,
    error: profileError,
    refetch,
  } = useUserQuery();
  const { isAuthenticated, activeOrg, hasPermission, logout } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="font-heading text-3xl font-semibold">
        Auth Integration Test
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>1. Login User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField id="test-email" label="Email">
            <Input
              id="test-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />
          </FormField>
          <FormField id="test-password" label="Password">
            <Input
              id="test-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="******"
            />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => loginMutation.mutate({ email, password })}
              loading={loginMutation.isPending}
              disabled={!email || !password}
            >
              Login
            </Button>
            <Button
              variant="outline"
              onClick={() => refetch()}
              loading={isProfileLoading}
            >
              2. Fetch User Profile
            </Button>
            <Button variant="ghost" onClick={() => logout()}>
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session and RBAC</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>
            Status: {isAuthenticated ? "Authenticated" : "Not authenticated"}
          </p>
          <p>Active Organization: {activeOrg?.name || "N/A"}</p>
          <div className="flex flex-wrap gap-2">
            {hasPermission("MANAGE_TASKS") ? (
              <Button size="sm">Create Task (allowed)</Button>
            ) : null}
            {hasPermission("DELETE_PROJECT") ? (
              <Button size="sm" variant="destructive">
                Delete Project (allowed)
              </Button>
            ) : null}
            {!hasPermission("DELETE_PROJECT") ? (
              <Button size="sm" variant="outline" disabled>
                Delete Project (restricted)
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw Response</CardTitle>
        </CardHeader>
        <CardContent>
          {profileError ? (
            <p className="text-destructive">{String(profileError)}</p>
          ) : null}
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(userData?.data ?? null, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
