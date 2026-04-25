"use client";

import { useState } from "react";
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Check, 
  X, 
  AlertCircle,
  Loader2,
  Settings2,
  Workflow
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

function SortableStatusItem({ 
  status, 
  editingId, 
  editName, 
  editColor, 
  editHidden,
  setEditName, 
  setEditColor, 
  setEditHidden,
  handleUpdate, 
  setEditingId, 
  handleDelete 
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "group flex items-center justify-between p-4 hover:bg-muted/30 transition-colors border-b last:border-0",
        isDragging && "bg-muted/50 shadow-sm"
      )}
    >
      <div className="flex items-center gap-4 flex-1">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
          <GripVertical className="size-4 text-muted-foreground/30" />
        </div>
        
        {editingId === status.id ? (
          <div className="flex flex-col gap-3 flex-1 animate-in fade-in slide-in-from-left-2">
            <div className="flex items-center gap-3">
              <Input 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 max-w-[200px]"
                autoFocus
              />
              <Input 
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="h-8 w-10 p-1 cursor-pointer bg-transparent"
              />
              <Button size="icon-sm" onClick={() => handleUpdate(status.id)}>
                <Check className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(null)}>
                <X className="size-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                id={`hide-empty-${status.id}`}
                checked={editHidden}
                onCheckedChange={setEditHidden}
              />
              <Label htmlFor={`hide-empty-${status.id}`} className="text-[11px] text-muted-foreground">Hide from Kanban if empty</Label>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div 
              className="size-3 rounded-full" 
              style={{ backgroundColor: status.color }} 
            />
            <span className="text-sm font-medium">{status.name}</span>
            {status.isSystem && (
              <Badge variant="outline" className="text-[9px] uppercase h-4 px-1 opacity-50 bg-primary/5">System</Badge>
            )}
            {status.isHiddenIfEmpty && (
              <Badge variant="outline" className="text-[9px] uppercase h-4 px-1 opacity-50">Hidden if empty</Badge>
            )}
          </div>
        )}
      </div>

      {!editingId && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={() => {
              setEditingId(status.id);
              setEditName(status.name);
              setEditColor(status.color);
              setEditHidden(status.isHiddenIfEmpty || false);
            }}
          >
            <Settings2 className="size-3.5" />
          </Button>
          {!status.isSystem && (
            <Button 
              variant="ghost" 
              size="icon-sm" 
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleDelete(status.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function StatusManagement() {
  const { data: statuses = [], isLoading } = useStatusesQuery();
  const createMutation = useCreateStatusMutation();
  const updateMutation = useUpdateStatusMutation();
  const deleteMutation = useDeleteStatusMutation();
  const reorderMutation = useReorderStatusesMutation();

  const [isAdding, setIsAdding] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#3b82f6");
  const [newStatusHidden, setNewStatusHidden] = useState(true);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editHidden, setEditHidden] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = statuses.findIndex((s) => s.id === active.id);
      const newIndex = statuses.findIndex((s) => s.id === over.id);

      const newOrder = arrayMove(statuses, oldIndex, newIndex);
      
      // Update locally first for smooth UI
      // In a real app, you might want to use optimistic updates here
      
      const reorderData = newOrder.map((s, index) => ({
        id: s.id!,
        order: index
      }));

      try {
        await reorderMutation.mutateAsync(reorderData);
        toast.success("Order updated");
      } catch (err) {
        toast.error("Failed to update order");
      }
    }
  };

  const handleAdd = async () => {
    if (!newStatusName.trim()) {
      toast.error("Status name is required");
      return;
    }
    
    try {
      await createMutation.mutateAsync({
        name: newStatusName.trim(),
        color: newStatusColor,
        order: statuses.length,
        isHiddenIfEmpty: newStatusHidden,
        isSystem: false
      });
      setNewStatusName("");
      setNewStatusColor("#3b82f6");
      setNewStatusHidden(true);
      setIsAdding(false);
      toast.success("Status created successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create status");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) {
      toast.error("Status name is required");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          name: editName.trim(),
          color: editColor,
          isHiddenIfEmpty: editHidden,
        },
      });
      setEditingId(null);
      toast.success("Status updated successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this status? Tasks using this status will need to be reassigned.")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Status deleted successfully");
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to delete status");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Workflow className="size-4 text-primary" />
            Task Workflow
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Define the stages of your project's workflow. Drag to reorder.
          </p>
        </div>
        {!isAdding && (
          <Button size="sm" onClick={() => setIsAdding(true)} className="gap-2">
            <Plus className="size-4" />
            Add Status
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Status Name</label>
              <Input 
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                placeholder="e.g. In Progress, Quality Check"
                className="h-9"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Label Color</label>
              <div className="flex gap-2">
                <Input 
                  type="color"
                  value={newStatusColor}
                  onChange={(e) => setNewStatusColor(e.target.value)}
                  className="h-9 w-12 p-1 cursor-pointer bg-transparent"
                />
                <Input 
                  value={newStatusColor}
                  onChange={(e) => setNewStatusColor(e.target.value)}
                  placeholder="#000000"
                  className="h-9 font-mono text-xs"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-1">
            <Switch 
              id="new-status-hide"
              checked={newStatusHidden}
              onCheckedChange={setNewStatusHidden}
            />
            <Label htmlFor="new-status-hide" className="text-xs text-muted-foreground">Hide from Kanban board if no tasks are present</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-primary/10">
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="size-3 animate-spin mr-2" /> : <Check className="size-3 mr-2" />}
              Create Status
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
        <div className="divide-y divide-border">
          {statuses.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <AlertCircle className="size-10 mx-auto opacity-20 mb-3" />
              <p className="text-sm">No custom statuses found. Default ones will be used.</p>
            </div>
          ) : (
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={statuses.map(s => s.id!)}
                strategy={verticalListSortingStrategy}
              >
                {statuses.map((status) => (
                  <SortableStatusItem 
                    key={status.id}
                    status={status}
                    editingId={editingId}
                    editName={editName}
                    editColor={editColor}
                    setEditName={setEditName}
                    setEditColor={setEditColor}
                    handleUpdate={handleUpdate}
                    setEditingId={setEditingId}
                    handleDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
