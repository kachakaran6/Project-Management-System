"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  useTaskCommentsQuery, 
  useCreateTaskCommentMutation,
  useDeleteCommentMutation
} from "@/features/comments/hooks/use-comments-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentUser } from "@/types/comment.types";
import { cn } from "@/lib/utils";

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [content, setContent] = useState("");
  const { data, isLoading } = useTaskCommentsQuery(taskId, {
    refetchInterval: 5000, // Faster refresh for "real-time" feel
  });
  const createCommentMutation = useCreateTaskCommentMutation(taskId);
  const deleteCommentMutation = useDeleteCommentMutation(taskId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const comments = data?.data?.items || [];

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim() || createCommentMutation.isPending) return;

    createCommentMutation.mutate(content, {
      onSuccess: () => {
        setContent("");
      }
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments.length]);

  const getAuthorInfo = (userData: any) => {
    const user = userData as CommentUser;
    const name = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || 'User';
    return {
      name,
      avatar: user?.avatarUrl,
      initials: name.charAt(0).toUpperCase()
    };
  };

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-center gap-2 pb-2">
        <MessageSquare className="size-4 text-muted-foreground/70" />
        <h3 className="text-[12px] font-bold text-muted-foreground/70 uppercase tracking-widest">Activity & Comments</h3>
        <span className="ml-2 text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
          {comments.length}
        </span>
      </div>

      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {isLoading && comments.length === 0 ? (
          <div className="space-y-6">
            <div className="flex gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="space-y-2 flex-1 pt-1">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground/50 italic text-sm border-2 border-dashed rounded-xl border-muted">
            No discussion yet. Be the first to chime in!
          </div>
        ) : (
          <div className="space-y-6 flex flex-col-reverse"> {/* Newest at bottom visually? No, usually Notion is newest at top or bottom. I'll stick to top-down but newest at top is common in panels. */}
            {comments.map((comment, index) => {
              const author = getAuthorInfo(comment.userId);
              const isOptimistic = String(comment.id).startsWith("optimistic-");
              
              return (
                <div 
                  key={comment.id || comment._id || index} 
                  className={cn(
                    "flex gap-3 group animate-in fade-in slide-in-from-top-2 duration-300",
                    isOptimistic && "opacity-60"
                  )}
                >
                  <Avatar className="size-8 border shadow-sm shrink-0">
                    <AvatarImage src={author.avatar} />
                    <AvatarFallback className="text-xs bg-muted">
                      {author.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-foreground/90">
                        {author.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground/60 font-medium">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                      {isOptimistic && (
                        <span className="text-[10px] text-primary/70 font-medium flex items-center gap-1">
                          <Loader2 className="size-2.5 animate-spin" />
                          sending...
                        </span>
                      )}
                    </div>
                    <div className="relative group/content max-w-[90%] flex items-start gap-2">
                       <div className="text-[14px] bg-accent/20 dark:bg-accent/10 p-3 rounded-lg rounded-tl-none border border-border/40 text-foreground/90 leading-relaxed flex-1">
                        {comment.content}
                      </div>
                      {comment.canDelete && (
                        <button 
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this comment?")) {
                              deleteCommentMutation.mutate(comment.id || comment._id || "");
                            }
                          }}
                          className="opacity-0 group-hover/content:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all self-center"
                          title="Delete comment"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="relative pt-4 flex gap-3">
         <Avatar className="size-8 border shrink-0">
            <AvatarFallback className="text-xs bg-primary/5 text-primary">Me</AvatarFallback>
         </Avatar>
         <div className="flex-1 relative group">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Discuss this task..."
            className="w-full min-h-[100px] p-4 text-sm bg-accent/10 border-border/40 border-2 rounded-xl focus:outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all resize-none placeholder:text-muted-foreground/40"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <Button 
              size="sm" 
              onClick={() => handleSubmit()} 
              disabled={!content.trim() || createCommentMutation.isPending}
              className="h-8 rounded-lg shadow-sm font-semibold text-[12px] px-3"
            >
              {createCommentMutation.isPending ? (
                <Loader2 className="size-3 animate-spin mr-1" />
              ) : (
                <Send className="size-3 mr-1.5" />
              )}
              Send
            </Button>
          </div>
         </div>
      </div>
    </div>
  );
}
