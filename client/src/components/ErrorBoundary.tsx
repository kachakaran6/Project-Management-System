"use client";

import { useRouteError, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, RefreshCcw, LayoutDashboard } from "lucide-react";

export default function ErrorBoundary() {
  const error = useRouteError() as any;
  console.error("Application Error:", error);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg shadow-2xl border-destructive/20 bg-destructive/5 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight">Something went wrong</CardTitle>
            <CardDescription className="text-lg">
              We encountered an unexpected error. Don't worry, your data is safe.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-background/50 p-4 font-mono text-sm border border-destructive/10 overflow-auto max-h-32">
            <p className="text-destructive font-semibold">
              {error?.statusText || error?.message || "Unknown error occurred"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="default" 
              className="flex-1 gap-2" 
              onClick={() => window.location.reload()}
            >
              <RefreshCcw className="size-4" />
              Reload Page
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 gap-2 border-primary/20 hover:bg-primary/5" 
              asChild
            >
              <Link to="/dashboard">
                <LayoutDashboard className="size-4" />
                Go to Dashboard
              </Link>
            </Button>
          </div>
          
          <p className="text-center text-xs text-muted-foreground">
            If this problem persists, please contact support with the error details above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
