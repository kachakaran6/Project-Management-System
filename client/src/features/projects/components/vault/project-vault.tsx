"use client";

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
  List as ListIcon,
  Loader2,
  Trash2
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
import { cn } from "@/lib/utils";
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
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="size-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Securing your vault...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
          <Input 
            placeholder="Search resources, tags, or descriptions..." 
            className="pl-10 h-11 rounded-2xl bg-muted/20 border-border/40 focus:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 rounded-2xl gap-2 px-4 border-border/40 hover:bg-muted/50">
                <Filter className="size-4 opacity-60" />
                <span className="text-sm font-semibold capitalize">{typeFilter === "all" ? "All Types" : typeFilter}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl min-w-[160px]">
              <DropdownMenuItem onClick={() => setTypeFilter("all")} className="gap-2">
                <LayoutGrid className="size-3.5 opacity-60" /> All Resources
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("link")} className="gap-2">
                <Globe className="size-3.5 text-blue-500" /> Links
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("credential")} className="gap-2">
                <Lock className="size-3.5 text-amber-500" /> Credentials
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("note")} className="gap-2">
                <FileText className="size-3.5 text-emerald-500" /> Notes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            className="h-11 rounded-2xl gap-2 px-6 shadow-lg shadow-primary/20 flex-1 sm:flex-none"
            onClick={() => {
              setSelectedResource(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add Resource
          </Button>
        </div>
      </div>

      {/* SECURITY NOTICE */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
        <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <ShieldCheck className="size-5 text-primary" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-primary">Secure Vault</h4>
          <p className="text-[11px] text-primary/70 font-medium">All credentials are encrypted using industry-standard AES-256-GCM. Passwords are only decrypted when you explicitly view them.</p>
        </div>
      </div>

      {/* GRID */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
        <div className="py-20 border border-dashed border-border/60 rounded-3xl bg-muted/5">
          <EmptyState 
            title={search || typeFilter !== "all" ? "No resources found" : "Your Vault is Empty"}
            description={search || typeFilter !== "all" ? "Try adjusting your search or filters to find what you're looking for." : "Store important links, access credentials, and technical notes safely in this project's secure vault."}
          />
        </div>
      )}

      <ResourceModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        projectId={projectId}
        resource={selectedResource}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this resource from the vault. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Resource
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
