import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { copyTextToClipboard, triggerHapticFeedback } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

interface TaskCopyButtonProps {
  value: string;
  ariaLabel: string;
  successMessage: string;
  className?: string;
}

export function TaskCopyButton({
  value,
  ariaLabel,
  successMessage,
  className,
}: TaskCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!value) return null;

  const handleCopy = async () => {
    try {
      const didCopy = await copyTextToClipboard(value);
      if (!didCopy) {
        throw new Error("Clipboard copy failed");
      }

      setCopied(true);
      triggerHapticFeedback();
      toast.success(successMessage);
    } catch {
      toast.error("Clipboard is unavailable right now");
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          onClick={handleCopy}
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border/50",
            "bg-background/80 text-muted-foreground transition-all duration-200",
            "hover:border-primary/30 hover:bg-primary/5 hover:text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
            "active:scale-[0.97]",
            copied && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
            className,
          )}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent>
    </Tooltip>
  );
}
