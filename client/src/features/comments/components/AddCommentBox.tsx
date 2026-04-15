"use client";

import { useState } from "react";
import { Loader2, SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AddCommentBoxProps {
  onSubmit: (content: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function AddCommentBox({ onSubmit, isSubmitting = false }: AddCommentBoxProps) {
  const [content, setContent] = useState("");

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;

    await onSubmit(trimmed);
    setContent("");
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Write a comment..."
        rows={3}
        maxLength={2000}
        disabled={isSubmitting}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{content.length}/2000</p>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
          className="gap-2"
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
          Add Comment
        </Button>
      </div>
    </div>
  );
}
