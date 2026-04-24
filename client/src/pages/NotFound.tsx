"use client";

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center px-4">
      <div className="space-y-6 max-w-md">
        <h1 className="text-9xl font-black text-primary/20 tracking-tighter">404</h1>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Page Not Found</h2>
          <p className="text-muted-foreground text-lg">
            Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Button variant="default" size="lg" className="w-full sm:w-auto gap-2" asChild>
            <Link to="/dashboard">
              <Home className="size-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2" onClick={() => window.history.back()}>
            <ArrowLeft className="size-4" />
            Go Back
          </Button>
        </div>
      </div>
      
      {/* Background Decorative Element */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
    </div>
  );
}
