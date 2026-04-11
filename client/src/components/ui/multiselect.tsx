import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectProps {
  value: string[];
  options: MultiSelectOption[];
  onChange: (nextValue: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  value,
  options,
  onChange,
  placeholder = "Add items",
  className,
}: MultiSelectProps) {
  const selectedOptions = options.filter((option) =>
    value.includes(option.value),
  );
  const availableOptions = options.filter(
    (option) => !value.includes(option.value),
  );

  return (
    <div
      className={cn(
        "space-y-2 rounded-md border border-input bg-surface p-2",
        className,
      )}
    >
      <div className="flex flex-wrap gap-2">
        {selectedOptions.length ? (
          selectedOptions.map((option) => (
            <Badge
              key={option.value}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {option.label}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 px-1"
                onClick={() =>
                  onChange(value.filter((entry) => entry !== option.value))
                }
                aria-label={`Remove ${option.label}`}
              >
                <X className="size-3" />
              </Button>
            </Badge>
          ))
        ) : (
          <p className="px-1 text-sm text-muted-foreground">{placeholder}</p>
        )}
      </div>
      {availableOptions.length ? (
        <div className="flex flex-wrap gap-2">
          {availableOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange([...value, option.value])}
            >
              {option.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
