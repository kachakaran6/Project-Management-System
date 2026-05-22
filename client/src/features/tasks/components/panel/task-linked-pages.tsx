import React, { useState } from "react";
import { FileText, Plus, X, Link as LinkIcon, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskApi } from "@/features/tasks/api/task.api";
import { pageApi } from "@/features/pages/api/page.api";
import { TaskPageLink } from "@/types/task.types";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TaskLinkedPagesProps {
  taskId: string;
}

export function TaskLinkedPages({ taskId }: TaskLinkedPagesProps) {
  const queryClient = useQueryClient();
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  
  const { data, isLoading } = useQuery({
    queryKey: ["task-pages", taskId],
    queryFn: () => taskApi.getLinkedPages(taskId),
  });

  const pages: TaskPageLink[] = data?.data || [];

  const detachMutation = useMutation({
    mutationFn: (pageId: string) => taskApi.detachPage(taskId, pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-pages", taskId] });
      toast.success("Page detached from task");
    },
    onError: () => {
      toast.error("Failed to detach page");
    }
  });

  if (isLoading) {
    return (
      <div className="py-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="size-8 rounded-button bg-primary/10 flex items-center justify-center text-primary shadow-sm ring-1 ring-primary/20">
            <FileText className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground/90">Linked Pages</h3>
            <p className="text-[10px] text-muted-foreground font-medium">Documentation context</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-8 pb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-button bg-primary/10 flex items-center justify-center text-primary shadow-sm ring-1 ring-primary/20">
            <FileText className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground/90">Linked Pages</h3>
            <p className="text-[10px] text-muted-foreground font-medium">Documentation context</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 px-2 text-xs font-semibold rounded-button"
          onClick={() => setIsAttachModalOpen(true)}
        >
          <Plus className="size-3.5 mr-1" />
          Attach
        </Button>
      </div>

      {pages.length === 0 ? (
        <div className="rounded-button border border-dashed border-border/60 bg-muted/20 p-6 flex flex-col items-center justify-center text-center space-y-2">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <LinkIcon className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">No pages linked</p>
            <p className="text-xs text-muted-foreground">Attach a page to build knowledge context for this task.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map(page => (
            <div key={page.id} className="group relative flex items-center gap-3 p-3 rounded-button border bg-card hover:border-primary/30 transition-colors shadow-sm">
              <div className="size-8 rounded bg-primary/5 flex items-center justify-center text-primary shrink-0">
                <FileText className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/pages/${page.id}`} className="block">
                  <h4 className="text-sm font-medium hover:text-primary hover:underline truncate transition-colors">
                    {page.title}
                  </h4>
                </Link>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase bg-muted px-1.5 py-0.5 rounded-sm">
                    {page.visibility}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    Updated {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {page.owner && (
                  <Avatar className="size-6 border">
                    <AvatarImage src={page.owner.avatarUrl} />
                    <AvatarFallback className="text-[10px]">
                      {page.owner.firstName?.[0] || page.owner.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <button
                  onClick={() => detachMutation.mutate(page.id)}
                  className="size-7 rounded-button flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="Detach page"
                  disabled={detachMutation.isPending}
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAttachModalOpen && (
        <AttachPageModal 
          taskId={taskId} 
          isOpen={isAttachModalOpen} 
          onClose={() => setIsAttachModalOpen(false)} 
        />
      )}
    </div>
  );
}

function AttachPageModal({ taskId, isOpen, onClose }: { taskId: string, isOpen: boolean, onClose: () => void }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["pages", { search }],
    queryFn: () => pageApi.getPages({ search, limit: 10 }),
    enabled: isOpen,
  });

  const attachMutation = useMutation({
    mutationFn: (pageId: string) => taskApi.attachPage(taskId, pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-pages", taskId] });
      toast.success("Page attached successfully");
      onClose();
    },
    onError: () => toast.error("Failed to attach page")
  });

  const createMutation = useMutation({
    mutationFn: (title: string) => taskApi.createAndAttachPage(taskId, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-pages", taskId] });
      toast.success("Page created and attached successfully");
      onClose();
    },
    onError: () => toast.error("Failed to create page")
  });

  const availablePages = (data?.data?.items || []).filter(
    (p: any) => !queryClient.getQueryData<{data: TaskPageLink[]}>(["task-pages", taskId])?.data.find(lp => lp.id === p.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/40 shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <DialogTitle className="text-base font-semibold">Attach Page to Task</DialogTitle>
        </DialogHeader>
        
        <div className="p-4 space-y-4">
          <input
            type="text"
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-button border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />

          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
            {isLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            ) : availablePages.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No pages found. {search && "Try creating a new one."}
              </div>
            ) : (
              availablePages.map((page: any) => (
                <div key={page.id} className="flex items-center justify-between p-2 rounded-button hover:bg-muted/50 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{page.title}</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 text-xs opacity-0 group-hover:opacity-100"
                    onClick={() => attachMutation.mutate(page.id)}
                    disabled={attachMutation.isPending}
                  >
                    Attach
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-dashed">
            <Button 
              className="w-full justify-between rounded-button group border-primary/20 hover:border-primary/50" 
              variant="outline"
              onClick={() => {
                if (!isCreating) {
                  const title = search || "New Page for Task";
                  createMutation.mutate(title);
                  setIsCreating(true);
                }
              }}
              disabled={isCreating}
            >
              <span className="flex items-center gap-2">
                <Plus className="size-4 text-primary" />
                <span className="text-sm font-medium">Create New Page</span>
              </span>
              {search && <span className="text-xs text-muted-foreground truncate max-w-[150px]">{search}</span>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
