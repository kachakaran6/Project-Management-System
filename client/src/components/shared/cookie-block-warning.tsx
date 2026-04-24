"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Cookie, X, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CookieBlockWarning() {
  const [isBlocked, setIsBlocked] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkCookies = () => {
      if (typeof navigator !== "undefined" && navigator.cookieEnabled === false) return false;
      try {
        const testKey = "pms_cookie_test";
        document.cookie = `${testKey}=1; SameSite=Lax`;
        const ret = document.cookie.indexOf(`${testKey}=`) !== -1;
        document.cookie = `${testKey}=1; expires=Thu, 01-Jan-1970 00:00:01 GMT; SameSite=Lax`;
        return ret;
      } catch (e) {
        return false;
      }
    };

    if (!checkCookies()) {
      setIsBlocked(true);
    }
  }, []);

  if (!isBlocked || dismissed) return null;

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[200] animate-in slide-in-from-right-full duration-700">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-surface/80 p-5 shadow-2xl backdrop-blur-xl">
          {/* Decorative Gradient */}
          <div className="absolute -right-4 -top-4 size-24 bg-destructive/10 blur-3xl" />
          
          <div className="flex gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <ShieldAlert className="size-6" />
            </div>
            
            <div className="flex-1 space-y-1">
              <h3 className="font-bold text-foreground">Cookies are Blocked</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We've detected that cookies are disabled in your browser. This will prevent you from staying logged in.
              </p>
            </div>
            
            <button 
              onClick={() => setDismissed(true)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
          
          <div className="mt-5 flex items-center gap-3">
            <Button 
              variant="destructive" 
              size="sm" 
              className="w-full font-semibold shadow-lg shadow-destructive/20"
              onClick={() => setShowModal(true)}
            >
              How to Unblock?
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full bg-white/5 border-white/10"
              onClick={() => setDismissed(true)}
            >
              I'll do it later
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md bg-surface/90 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
              <Cookie className="size-8 text-destructive" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center">Enable Cookies to Continue</DialogTitle>
            <DialogDescription className="text-center text-base">
              To provide a secure and stable experience, PMS Orbit requires cookies to manage your session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                Chrome / Edge / Brave
              </h4>
              <p className="text-sm text-muted-foreground ml-6">
                Settings → Privacy and security → Cookies → Allow all cookies
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                Safari (iPhone/Mac)
              </h4>
              <p className="text-sm text-muted-foreground ml-6">
                Settings → Safari → Privacy → Uncheck "Block All Cookies"
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                Firefox
              </h4>
              <p className="text-sm text-muted-foreground ml-6">
                Settings → Privacy & Security → Standard (Enhanced Tracking Protection)
              </p>
            </div>
          </div>

          <Button 
            className="w-full h-12 text-lg font-bold" 
            onClick={() => window.location.reload()}
          >
            I've enabled them. Refresh
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
