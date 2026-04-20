import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Eye, 
  ExternalLink, 
  Edit2, 
  Copy, 
  Link, 
  Trash2,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextMenuItemProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "default" | "danger";
}

const ContextMenuItem = ({ label, icon: Icon, onClick, variant = "default" }: ContextMenuItemProps) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all duration-150 rounded-[8px] cursor-pointer",
      "hover:bg-[#1F2937]",
      variant === "danger" ? "text-rose-500 hover:text-rose-400" : "text-slate-300 hover:text-white"
    )}
  >
    <Icon className="size-4 shrink-0" />
    <span>{label}</span>
  </button>
);

const Separator = () => <div className="my-1.5 h-px bg-[#1F2937]/50" />;

export interface TaskContextMenuProps {
  x: number;
  y: number;
  taskId: string;
  onClose: () => void;
  // Actions
  onOpen: (id: string) => void;
  onOpenNewTab: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onCopyLink: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TaskContextMenu = ({
  x,
  y,
  taskId,
  onClose,
  onOpen,
  onOpenNewTab,
  onEdit,
  onDuplicate,
  onCopyLink,
  onDelete
}: TaskContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [isReady, setIsReady] = useState(false);

  useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const { innerWidth, innerHeight } = window;

      let newX = x;
      let newY = y;

      // Adjust positioning
      if (x + rect.width > innerWidth) newX = x - rect.width;
      if (y + rect.height > innerHeight) newY = y - rect.height;
      
      // Prevent negative overflow
      if (newX < 0) newX = 4;
      if (newY < 0) newY = 4;

      setPos({ x: newX, y: newY });
      setIsReady(true);
    }
  }, [x, y]);

  useEffect(() => {
    const handleGlobalEvents = (e: any) => {
      if (e.key === "Escape") onClose();
      if (e.type === "mousedown" && menuRef.current && !menuRef.current.contains(e.target)) onClose();
      if (e.type === "wheel") onClose();
    };

    window.addEventListener("mousedown", handleGlobalEvents);
    window.addEventListener("keydown", handleGlobalEvents);
    window.addEventListener("wheel", handleGlobalEvents, { passive: true });

    return () => {
      window.removeEventListener("mousedown", handleGlobalEvents);
      window.removeEventListener("keydown", handleGlobalEvents);
      window.removeEventListener("wheel", handleGlobalEvents);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      style={{ 
        top: pos.y, 
        left: pos.x,
        visibility: isReady ? 'visible' : 'hidden'
      }}
      className={cn(
        "fixed z-[9999] w-[200px] bg-[#111827] border border-[#1F2937] rounded-[10px] p-[6px] shadow-[0_10px_38px_-10px_rgba(0,0,0,0.5),0_10px_20px_-15px_rgba(0,0,0,0.3)]",
        "animate-in fade-in zoom-in-95 duration-100 ease-out"
      )}
      onContextMenu={(e) => e.preventDefault()}
    >
        <ContextMenuItem icon={Eye} label="Open" onClick={() => { onOpen(taskId); onClose(); }} />
        <ContextMenuItem icon={ExternalLink} label="Open in New Tab" onClick={() => { onOpenNewTab(taskId); onClose(); }} />
        
        <Separator />
        
        <ContextMenuItem icon={Edit2} label="Edit" onClick={() => { onEdit(taskId); onClose(); }} />
        <ContextMenuItem icon={Copy} label="Duplicate" onClick={() => { onDuplicate(taskId); onClose(); }} />
        
        <Separator />
        
        <ContextMenuItem icon={Link} label="Copy Link" onClick={() => { onCopyLink(taskId); onClose(); }} />
        
        <Separator />
        
        <ContextMenuItem icon={Trash2} label="Delete" variant="danger" onClick={() => { onDelete(taskId); onClose(); }} />
    </div>,
    document.body
  );
};
