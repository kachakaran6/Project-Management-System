import React, { useState } from "react";
import { Check, ChevronDown, Search, Tag as TagIcon, X, Plus } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useTagsQuery } from "../hooks/use-tags";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { TagPill } from "./tag-pill";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TagSelectProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  workspaceId?: string;
}

import { Command as CommandPrimitive } from "cmdk";

export function TagSelect({ selectedTagIds = [], onChange, workspaceId }: TagSelectProps) {
  const { activeOrg } = useAuth();
  const { data: tags = [] } = useTagsQuery(activeOrg?.id || "", workspaceId);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const toggleTag = (id: string) => {
    const newIds = selectedTagIds.includes(id)
      ? selectedTagIds.filter((tid) => tid !== id)
      : [...selectedTagIds, id];
    onChange(newIds);
  };

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
  const visibleTags = selectedTags.slice(0, 3);
  const hiddenCount = selectedTags.length - visibleTags.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5 w-full min-h-[32px]">
      {visibleTags.map((tag) => (
        <TagPill
          key={tag.id}
          label={tag.label}
          color={tag.color}
          iconName={tag.icon}
          onRemove={() => toggleTag(tag.id)}
        />
      ))}

      {hiddenCount > 0 && (
        <Badge variant="secondary" className="h-6 px-2 rounded-full bg-muted/40 text-muted-foreground text-[10px] font-bold border-none">
          +{hiddenCount}
        </Badge>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button 
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-dashed transition-all text-[11px] font-bold shrink-0 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0",
              selectedTagIds.length > 0 
                ? "border-primary/40 text-primary bg-primary/5 hover:bg-primary/10"
                : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary bg-transparent"
            )}
          >
            <Plus className="size-3 opacity-70" />
            <span>{selectedTagIds.length === 0 ? "Add tags" : "Add"}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-64 p-0 rounded-2xl border border-border/40 bg-popover/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200" 
          align="start" 
          side="bottom" 
          sideOffset={12}
        >
          <Command className="bg-transparent" value={search} onValueChange={setSearch}>
            <div className="flex items-center px-3.5 border-b border-white/5 bg-white/2">
              <Search className="size-3.5 text-muted-foreground/40 shrink-0" />
              <CommandPrimitive.Input 
                autoFocus
                placeholder="Search tags..." 
                className="flex h-11 w-full bg-transparent py-3 text-[13px] text-foreground placeholder:text-muted-foreground/40 !outline-none !border-none !ring-0 focus:!ring-0 focus:!outline-none focus:!border-none ml-2.5" 
              />
            </div>
            <CommandList className="max-h-[300px] custom-scrollbar p-1.5">
              <CommandEmpty className="py-14 text-center px-4">
                <div className="flex flex-col items-center gap-3 opacity-20">
                  <div className="p-4 rounded-full bg-muted">
                    <TagIcon className="size-7" />
                  </div>
                  <p className="text-xs font-bold tracking-tight">No matching tags</p>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  const Icon = (LucideIcons as any)[tag.icon] || TagIcon;
                  return (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => toggleTag(tag.id)}
                      className={cn(
                        "flex items-center justify-between py-2.5 px-3 rounded-xl cursor-pointer transition-all m-0.5 border border-transparent",
                        isSelected ? "bg-primary/20 border-primary/10" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div 
                          className="flex h-8 w-8 items-center justify-center rounded-xl shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all group-hover:scale-105"
                          style={{ backgroundColor: `${tag.color}25`, color: tag.color }}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className={cn("text-[13px] font-extrabold leading-tight truncate tracking-tight transition-colors", isSelected ? "text-primary" : "text-foreground")}>
                            {tag.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground/40 font-mono tracking-widest font-black uppercase mt-1">#{tag.name}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground animate-in zoom-in-75 duration-300 shadow-[0_0_15px_rgba(var(--primary),0.4)]">
                          <Check className="size-3 stroke-[3px]" />
                        </div>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
