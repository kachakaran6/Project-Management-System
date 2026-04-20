import React, { useState } from "react";
import { Plus, Search, Trash2, Edit2, Check, Tag as TagIcon, X, Info } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTagsQuery, useCreateTagMutation, useUpdateTagMutation, useDeleteTagMutation } from "../hooks/use-tags";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { TagPill } from "./tag-pill";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#f43f5e", "#ef4444", "#f97316", "#f59e0b", "#eab308", 
  "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#06b6d4", 
  "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", 
  "#d946ef", "#ec4899", "#64748b"
];

const PRESET_ICONS = [
  "Tag", "Bug", "Zap", "Flame", "Shield", "Flag", "Clock", "CheckCircle2", 
  "AlertCircle", "MessageSquare", "Hammer", "Terminal", "Cpu", "Globe", 
  "Database", "Cloud", "HardDrive", "Layout", "Type", "Palette"
];

export function TagManagement() {
  const { activeOrg } = useAuth();
  const { data: tags = [], isLoading } = useTagsQuery(activeOrg?.id || "");
  const createTag = useCreateTagMutation();
  const updateTag = useUpdateTagMutation();
  const deleteTag = useDeleteTagMutation();

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<any>(null);
  const [formData, setFormData] = useState({
    label: "",
    color: "#6366f1",
    icon: "Tag"
  });

  const handleOpenModal = (tag?: any) => {
    if (tag) {
      setEditingTag(tag);
      setFormData({
        label: tag.label,
        color: tag.color,
        icon: tag.icon || "Tag"
      });
    } else {
      setEditingTag(null);
      setFormData({
        label: "",
        color: "#6366f1",
        icon: "Tag"
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.label.trim()) {
      toast.error("Label is required");
      return;
    }

    try {
      if (editingTag) {
        await updateTag.mutateAsync({
          id: editingTag.id,
          data: formData
        });
      } else {
        await createTag.mutateAsync({
          ...formData,
          organizationId: activeOrg?.id
        });
      }
      setModalOpen(false);
    } catch (err) {
      // toast handled in hook
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this tag? This will remove it from all tasks.")) {
      await deleteTag.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Organization Tags</h3>
          <p className="text-xs text-muted-foreground">Define reusable tags for categorization and filtering.</p>
        </div>
        <Button onClick={() => handleOpenModal()} size="sm" className="rounded-xl gap-2 font-bold ring-offset-background transition-all hover:scale-102">
          <Plus className="size-3.5" />
          Create Tag
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LucideIcons.Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-2xl bg-muted/5 opacity-60">
          <TagIcon className="size-10 mb-4 text-muted-foreground/40" />
          <p className="text-sm font-bold text-muted-foreground">No tags found</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first tag to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tags.map((tag) => (
            <div 
              key={tag.id} 
              className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${tag.color}15`, color: tag.color }}
                >
                  {React.createElement((LucideIcons as any)[tag.icon] || LucideIcons.Tag, { className: "size-4" })}
                </div>
                <div>
                  <p className="text-sm font-bold">{tag.label}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">#{tag.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenModal(tag)}>
                  <Edit2 className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(tag.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-4 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
        <Info className="size-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-blue-500">How to use Tags</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tags allow you to categorize tasks across different dimensions. Use colors to define categories 
            (e.g., Red for blocking issues, Green for features) and icons to quickly identify the scope.
            Multi-select flags are available in the task editor.
          </p>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{editingTag ? "Edit Tag" : "Create New Tag"}</DialogTitle>
            <DialogDescription className="text-xs">
              Tags help in organizing and filtering tasks effectively.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Label</Label>
              <Input 
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Product Bug, UX Tuning, etc."
                className="h-11 rounded-xl border-border/40 focus-visible:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Color</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center justify-between w-full h-11 px-3 rounded-xl border border-border/40 bg-card hover:bg-muted/30 transition-all">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: formData.color }} />
                          <span className="text-sm font-mono text-xs">{formData.color}</span>
                        </div>
                        <Plus className="size-3.5 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3 rounded-2xl border-border/40 shadow-2xl">
                       <div className="grid grid-cols-6 gap-2">
                          {PRESET_COLORS.map(c => (
                            <button 
                              key={c}
                              onClick={() => setFormData({ ...formData, color: c })}
                              className={cn(
                                "h-8 w-8 rounded-lg transition-transform hover:scale-110",
                                formData.color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                              )}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                       </div>
                    </PopoverContent>
                  </Popover>
               </div>

               <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Icon</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center justify-between w-full h-11 px-3 rounded-xl border border-border/40 bg-card hover:bg-muted/30 transition-all">
                        <div className="flex items-center gap-2">
                          {React.createElement((LucideIcons as any)[formData.icon] || LucideIcons.Tag, { className: "size-4", style: { color: formData.color } })}
                          <span className="text-sm font-medium">{formData.icon}</span>
                        </div>
                        <Plus className="size-3.5 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3 rounded-2xl border-border/40 shadow-2xl">
                       <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                          {PRESET_ICONS.map(iconName => (
                            <button 
                              key={iconName}
                              onClick={() => setFormData({ ...formData, icon: iconName })}
                              className={cn(
                                "flex items-center justify-center h-10 w-10 rounded-lg hover:bg-muted/50 transition-all",
                                formData.icon === iconName ? "bg-primary/10 text-primary" : "text-muted-foreground"
                              )}
                            >
                              {React.createElement((LucideIcons as any)[iconName] || LucideIcons.Tag, { className: "size-5" })}
                            </button>
                          ))}
                       </div>
                    </PopoverContent>
                  </Popover>
               </div>
            </div>

            <div className="space-y-2 pt-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Preview</Label>
                <div className="flex items-center justify-center p-8 rounded-2xl border border-dashed border-border bg-muted/5">
                   <TagPill label={formData.label || "Sample Tag"} color={formData.color} iconName={formData.icon} />
                </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSubmit} disabled={createTag.isPending || updateTag.isPending} className="rounded-xl px-8 font-bold">
              {(createTag.isPending || updateTag.isPending) && <LucideIcons.Loader2 className="mr-2 size-4 animate-spin" />}
              {editingTag ? "Save Changes" : "Create Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
