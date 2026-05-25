import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UnsavedChangesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  onSaveDraft: () => void;
  isSaving?: boolean;
}

export function UnsavedChangesModal({ open, onOpenChange, onDiscard, onSaveDraft, isSaving }: UnsavedChangesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="max-w-105 p-6 border-border/10 bg-card/95 backdrop-blur-xl shadow-2xl rounded-modal gap-6 sm:rounded-2xl outline-none">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-[17px] font-semibold tracking-tight text-foreground/95">
            Save this draft?
          </DialogTitle>
          <DialogDescription className="text-[14px] leading-relaxed text-muted-foreground/80">
            You have unsaved changes in this work item.
            <br />
            <span className="text-[13px] text-muted-foreground/60 mt-1.5 block font-medium">
              You can save it as a draft and continue later.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
          <Button
            variant="ghost"
            className="w-full sm:w-auto text-destructive hover:bg-destructive/10 hover:text-destructive h-9 px-4 rounded-button text-[13px] font-semibold transition-colors focus-visible:ring-destructive/20"
            onClick={onDiscard}
          >
            Discard
          </Button>
          <div className="flex w-full sm:w-auto items-center gap-2.5">
            <Button
              variant="outline"
              className="w-full sm:w-auto border-border/20 bg-transparent hover:bg-muted/50 h-9 px-4 rounded-button text-[13px] font-medium transition-colors"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-5 rounded-button text-[13px] font-semibold transition-all shadow-sm focus-visible:ring-primary/20"
              onClick={onSaveDraft}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Saving...
                </>
              ) : (
                "Save Draft"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
