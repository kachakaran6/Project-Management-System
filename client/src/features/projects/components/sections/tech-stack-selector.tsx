
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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 min-h-[44px] p-2 rounded-lg border border-border bg-background focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-primary/50 transition-all">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="pl-2.5 pr-1 h-7 text-[12px] font-medium bg-secondary/50 hover:bg-secondary text-secondary-foreground border-none rounded-md transition-colors">
            {tag}
            <button
              type="button"
              className="size-4 ml-1 flex items-center justify-center hover:bg-foreground/10 rounded-full transition-colors"
              onClick={() => removeTag(tag)}
            >
              <X className="size-3" />
            </button>
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
          placeholder={value.length === 0 ? "Add technology..." : ""}
          className="flex-1 bg-transparent border-none outline-none text-[14px] px-1 min-w-[120px] placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {PREDEFINED_STACKS.filter(s => !value.includes(s)).slice(0, 8).map(stack => (
          <button
            key={stack}
            type="button"
            className="h-7 px-3 text-[11px] font-medium border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md transition-all"
            onClick={() => addTag(stack)}
          >
            {stack}
          </button>
        ))}
      </div>
    </div>
  );
}
