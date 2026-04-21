"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PREDEFINED_STACKS = [
  "React", "Next.js", "TypeScript", "Node.js", "Python", 
  "Go", "MongoDB", "PostgreSQL", "TailwindCSS", "AWS", "Docker"
];

interface TechStackSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function TechStackSelector({ value, onChange }: TechStackSelectorProps) {
  const [query, setQuery] = useState("");

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setQuery("");
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-8 p-1.5 rounded-xl border border-border/40 bg-muted/20">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="pl-2 pr-1 h-6 text-[10px] bg-primary/5 border-primary/10">
            {tag}
            <Button
              size="icon"
              variant="ghost"
              className="size-3.5 ml-1 hover:bg-destructive/10 hover:text-destructive rounded-full"
              onClick={() => removeTag(tag)}
            >
              <X className="size-2" />
            </Button>
          </Badge>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(query);
            }
          }}
          placeholder={value.length === 0 ? "Add tech..." : ""}
          className="flex-1 bg-transparent border-none outline-none text-[11px] min-w-[70px] placeholder:opacity-50"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {PREDEFINED_STACKS.filter(s => !value.includes(s)).slice(0, 6).map(stack => (
          <Button
            key={stack}
            variant="ghost"
            size="sm"
            className="h-6 text-[9px] uppercase tracking-wider font-semibold border border-transparent hover:border-primary/20 hover:bg-primary/5 px-2"
            onClick={() => addTag(stack)}
          >
            {stack}
          </Button>
        ))}
      </div>
    </div>
  );
}
