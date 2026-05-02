
import { useState } from "react";
import { 
  Plus, 
  Search, 
  ShieldCheck, 
  Filter, 
  Globe, 
  Lock, 
  FileText,
  LayoutGrid,
  Loader2
} from "lucide-react";
import { 
  useProjectResourcesQuery, 
  useDeleteResourceMutation 
} from "../../hooks/use-project-resources";
import { ResourceCard } from "./resource-card";
import { ResourceModal } from "./resource-modal";
import { ProjectResource, ResourceType } from "../../api/project-resources.api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { cn } from "@/lib/utils";

interface ProjectVaultProps {
  projectId: string;
}

export function ProjectVault({ projectId }: ProjectVaultProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResourceType | "all">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<ProjectResource | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { data: resourcesResult, isLoading } = useProjectResourcesQuery(projectId);
  const deleteMutation = useDeleteResourceMutation(projectId);
  const { activeOrg } = useAuth();

  const canManage = activeOrg?.role === "OWNER" || activeOrg?.role === "ADMIN" || activeOrg?.role === "MANAGER";
  const resources = resourcesResult?.data || [];

  const filteredResources = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) || 
                         r.description?.toLowerCase().includes(search.toLowerCase()) ||
                         r.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === "all" || r.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleEdit = (resource: ProjectResource) => {
    setSelectedResource(resource);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="size-6 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Securing your vault...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
          <Input 
            placeholder="Search resources..." 
            className="pl-9 h-8 text-xs bg-muted/30 border-border/10 focus:ring-primary/20 rounded-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs px-3 rounded-lg border-border/10 gap-2">
                <Filter className="size-3.5 opacity-60" />
                <span className="capitalize">{typeFilter === "all" ? "All Types" : typeFilter}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
              <DropdownMenuItem onClick={() => setTypeFilter("all")} className="gap-2 text-xs">
                <LayoutGrid className="size-3 opacity-60" /> All Resources
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("link")} className="gap-2 text-xs">
                <Globe className="size-3 text-blue-500" /> Links
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("credential")} className="gap-2 text-xs">
                <Lock className="size-3 text-amber-500" /> Credentials
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("note")} className="gap-2 text-xs">
                <FileText className="size-3 text-emerald-500" /> Notes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            size="sm"
            className="h-8 text-xs px-4 rounded-lg gap-2"
            onClick={() => {
              setSelectedResource(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="size-3.5" />
            Add Resource
          </Button>
        </div>
      </div>

      {/* SECURITY NOTICE - Compact */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
        <ShieldCheck className="size-4 text-primary shrink-0" />
        <p className="text-[11px] text-primary/80 font-medium leading-tight">
          Credentials are AES-256-GCM encrypted and only decrypted on request.
        </p>
      </div>

      {/* GRID */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredResources.map((resource) => (
            <ResourceCard 
              key={resource.id} 
              resource={resource} 
              projectId={projectId}
              onEdit={handleEdit}
              onDelete={setDeleteId}
              canManage={canManage}
            />
          ))}
        </div>
      ) : (
        <div className="py-12 border border-dashed border-border/10 rounded-xl flex items-center justify-center">
          <p className="text-xs text-muted-foreground/40 font-medium uppercase tracking-widest">
            No resources found
          </p>
        </div>
      )}

      <ResourceModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        projectId={projectId}
        resource={selectedResource}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete Resource?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will permanently delete this resource. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="rounded-lg text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
