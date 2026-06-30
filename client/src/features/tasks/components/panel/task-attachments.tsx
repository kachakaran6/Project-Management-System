import React from "react";
import { Paperclip, Image as ImageIcon } from "lucide-react";
import type { Task } from "@/types/task.types";

interface TaskAttachmentsProps {
  task: Task;
}

export function TaskAttachments({ task }: TaskAttachmentsProps) {
  const images = task.images || [];

  if (images.length === 0) {
    return null;
  }

  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:5001/api/v1";
  const baseUrl = backendUrl.replace("/api/v1", "");

  return (
    <div className="pb-4 pt-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-button bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
          <Paperclip className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground/90">
            Attachments
          </h3>
          <p className="text-[10px] font-medium text-muted-foreground">
            {images.length} uploaded {images.length === 1 ? "image" : "images"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((imagePath, idx) => {
          // Construct absolute URL if path starts with /uploads
          const imageUrl = imagePath.startsWith("/") 
            ? `${baseUrl}${imagePath}` 
            : imagePath;

          return (
            <a
              key={idx}
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden rounded-xl border border-border/50 bg-muted/20 shadow-sm transition-all hover:border-primary/40 hover:shadow-md block"
            >
              {/* Fallback icon while loading or if broken */}
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
                <ImageIcon className="size-8" />
              </div>

              <img
                src={imageUrl}
                alt={`Attachment ${idx + 1}`}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex items-center justify-center">
                <span className="text-xs font-semibold text-white tracking-wide uppercase px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/20">
                  View Full
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
