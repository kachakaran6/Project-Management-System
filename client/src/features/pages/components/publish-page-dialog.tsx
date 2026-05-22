import { Check, Copy, Globe } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PublishPageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageTitle: string;
  previewPath: string;
  publicUrl: string | null;
  isPublished: boolean;
  isPublishing: boolean;
  copied: boolean;
  onPublish: () => Promise<void> | void;
  onCopy: () => Promise<void> | void;
};

export function PublishPageDialog({
  open,
  onOpenChange,
  pageTitle,
  previewPath,
  publicUrl,
  isPublished,
  isPublishing,
  copied,
  onPublish,
  onCopy,
}: PublishPageDialogProps) {
  const linkReady = Boolean(isPublished && publicUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-4" />
            {linkReady ? "Public Link Ready" : "Publish Page"}
          </DialogTitle>
          <DialogDescription>
            {linkReady
              ? `Anyone with this link can view "${pageTitle || "this page"}" without logging in.`
              : "Anyone with this link can view this page without logging in."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-modal border border-border/60 bg-muted/20 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              Public URL Preview
            </div>
            <div className="mt-2 break-all rounded-modal bg-background/80 px-3 py-2 font-mono text-sm text-foreground/90">
              {publicUrl || previewPath}
            </div>
          </div>

          <Alert>
            <AlertTitle>Read-only public access</AlertTitle>
            <AlertDescription>
              Public visitors can read this page, but they cannot edit it or see internal workspace controls.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {!linkReady ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={onPublish} loading={isPublishing}>
                Publish Page
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={onCopy}>
                {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
                {copied ? "Copied" : "Copy Link"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
