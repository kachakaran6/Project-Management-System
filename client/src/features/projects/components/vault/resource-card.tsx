"use client";

import { useState } from "react";
import { 
  Globe, 
  Lock, 
  FileText, 
  Copy, 
  Eye, 
  EyeOff, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ExternalLink,
  Check,
  Loader2
} from "lucide-react";
import { ProjectResource } from "../../api/project-resources.api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useProjectResourceDetailQuery } from "../../hooks/use-project-resources";
import { cn } from "@/lib/utils";

interface ResourceCardProps {
  resource: ProjectResource;
  projectId: string;
  onEdit: (resource: ProjectResource) => void;
  onDelete: (id: string) => void;
  canManage: boolean;
}

export function ResourceCard({
  resource,
  projectId,
  onEdit,
  onDelete,
  canManage,
}: ResourceCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: detailResult, isLoading } = useProjectResourceDetailQuery(
    projectId,
    resource.id,
    shouldFetch
  );

  const decryptedPassword = detailResult?.data?.password;

  const handleReveal = () => {
    if (!shouldFetch) setShouldFetch(true);
    setIsRevealed(!isRevealed);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getTypeIcon = () => {
    switch (resource.type) {
      case "link": return <Globe className="size-4 text-blue-500" />;
      case "credential": return <Lock className="size-4 text-amber-500" />;
      case "note": return <FileText className="size-4 text-emerald-500" />;
    }
  };

  const getTypeColor = () => {
    switch (resource.type) {
      case "link": return "border-blue-500/20 bg-blue-500/5 text-blue-600";
      case "credential": return "border-amber-500/20 bg-amber-500/5 text-amber-600";
      case "note": return "border-emerald-500/20 bg-emerald-500/5 text-emerald-600";
    }
  };

  return (
    <Card className="group relative overflow-hidden rounded-2xl border-border/40 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
      <CardHeader className="p-5 pb-3 flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5 flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("h-5 px-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider", getTypeColor())}>
              {resource.type}
            </Badge>
            <h3 className="font-bold text-base tracking-tight truncate">{resource.title}</h3>
          </div>
          {resource.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {resource.description}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={() => onEdit(resource)} className="gap-2 text-sm">
              <Edit2 className="size-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(resource.id)} 
              className="gap-2 text-sm text-destructive focus:text-destructive"
              disabled={!canManage}
            >
              <Trash2 className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="p-5 pt-0 space-y-4">
        {/* Content Section */}
        <div className="space-y-2.5">
          {resource.url && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/30 border border-border/10 group/item">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium truncate text-muted-foreground/80">{resource.url}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-xl hover:bg-muted/50 active:scale-90 transition-all" 
                  onClick={() => copyToClipboard(resource.url!, "URL")}
                >
                  {copiedField === "URL" ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted/50 active:scale-90 transition-all" asChild>
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            </div>
          )}

          {resource.type === "credential" && (
            <div className="space-y-2">
              {resource.username && (
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/30 border border-border/10 group/item">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest shrink-0">User</span>
                    <span className="text-xs font-bold truncate">{resource.username}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-muted/50 active:scale-90" 
                    onClick={() => copyToClipboard(resource.username!, "Username")}
                  >
                    {copiedField === "Username" ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/30 border border-border/10 group/item">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest shrink-0">Pass</span>
                  <span className={cn(
                    "text-xs font-bold tracking-widest",
                    !isRevealed && "blur-[2px] opacity-40 select-none"
                  )}>
                    {isRevealed ? (isLoading ? "Decrypting..." : decryptedPassword || "********") : "••••••••"}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl hover:bg-muted/50 active:scale-90 transition-all" 
                    onClick={handleReveal}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : (isRevealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />)}
                  </Button>
                  {isRevealed && decryptedPassword && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-xl hover:bg-muted/50 active:scale-90 transition-all" 
                      onClick={() => copyToClipboard(decryptedPassword, "Password")}
                    >
                      {copiedField === "Password" ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {resource.tags.map(tag => (
              <span key={tag} className="text-[10px] font-bold text-muted-foreground/60 bg-muted px-2 py-0.5 rounded-full border border-border/10">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
