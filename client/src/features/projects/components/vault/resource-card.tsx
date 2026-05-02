
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
import { Card, CardContent } from "@/components/ui/card";
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

  const getTypeColor = () => {
    switch (resource.type) {
      case "link": return "border-blue-500/20 bg-blue-500/5 text-blue-600";
      case "credential": return "border-amber-500/20 bg-amber-500/5 text-amber-600";
      case "note": return "border-emerald-500/20 bg-emerald-500/5 text-emerald-600";
    }
  };

  return (
    <Card className="group relative overflow-hidden rounded-xl border border-border/10 bg-card/30 hover:bg-card/50 hover:border-primary/20 transition-all duration-300">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("h-4 px-1.5 rounded-full text-[9px] uppercase font-medium tracking-wider", getTypeColor())}>
                {resource.type}
              </Badge>
              <h3 className="font-semibold text-sm tracking-tight truncate text-foreground/90">{resource.title}</h3>
            </div>
            {resource.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {resource.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7 rounded-lg text-muted-foreground hover:bg-primary/10 transition-all">
                <MoreVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => onEdit(resource)} className="gap-2 text-xs">
                <Edit2 className="size-3" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(resource.id)} 
                className="gap-2 text-xs text-destructive focus:text-destructive"
                disabled={!canManage}
              >
                <Trash2 className="size-3" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1.5">
          {resource.url && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/20 border border-border/5 group/item">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="size-3 text-muted-foreground shrink-0" />
                <span className="text-[11px] font-medium truncate text-muted-foreground">{resource.url}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="size-6 rounded-md hover:bg-muted/50" 
                  onClick={() => copyToClipboard(resource.url!, "URL")}
                >
                  {copiedField === "URL" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                </Button>
                <Button variant="ghost" size="icon" className="size-6 rounded-md hover:bg-muted/50" asChild>
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3" />
                  </a>
                </Button>
              </div>
            </div>
          )}

          {resource.type === "credential" && (
            <div className="space-y-1.5">
              {resource.username && (
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/20 border border-border/5 group/item">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[9px] font-medium text-muted-foreground/40 uppercase tracking-wider shrink-0">User</span>
                    <span className="text-[11px] font-medium truncate">{resource.username}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="size-6 rounded-md shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-muted/50" 
                    onClick={() => copyToClipboard(resource.username!, "Username")}
                  >
                    {copiedField === "Username" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/20 border border-border/5 group/item">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[9px] font-medium text-muted-foreground/40 uppercase tracking-wider shrink-0">Pass</span>
                  <span className={cn(
                    "text-[11px] font-medium tracking-widest",
                    !isRevealed && "blur-[2px] opacity-40 select-none"
                  )}>
                    {isRevealed ? (isLoading ? "..." : decryptedPassword || "********") : "••••••••"}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="size-6 rounded-md hover:bg-muted/50" 
                    onClick={handleReveal}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="size-3 animate-spin" /> : (isRevealed ? <EyeOff className="size-3" /> : <Eye className="size-3" />)}
                  </Button>
                  {isRevealed && decryptedPassword && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="size-6 rounded-md hover:bg-muted/50" 
                      onClick={() => copyToClipboard(decryptedPassword, "Password")}
                    >
                      {copiedField === "Password" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
