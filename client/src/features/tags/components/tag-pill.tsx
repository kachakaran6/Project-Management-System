import React from "react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

interface TagPillProps {
  label: string;
  color: string;
  iconName?: string;
  className?: string;
  onRemove?: () => void;
}

export function TagPill({ label, color, iconName, className, onRemove }: TagPillProps) {
  const Icon = (LucideIcons as any)[iconName || "Tag"] || LucideIcons.Tag;

  return (
    <div
      style={{
        backgroundColor: `${color}15`, // 10-15% opacity
        color: color,
        borderColor: `${color}30`,
      }}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold tracking-tight select-none",
        className
      )}
    >
      <Icon className="size-3" style={{ color }} />
      <span>{label}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
        >
          <LucideIcons.X className="size-3" />
        </button>
      )}
    </div>
  );
}
