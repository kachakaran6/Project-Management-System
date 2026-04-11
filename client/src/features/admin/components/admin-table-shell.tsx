"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdminTableShellProps {
  title: string;
  description: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
}

export function AdminTableShell({
  title,
  description,
  search,
  onSearchChange,
  searchPlaceholder,
  rightSlot,
  children,
  page,
  totalPages,
  onPageChange,
}: AdminTableShellProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">{title}</h1>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
        {rightSlot}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto]">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder ?? "Search..."}
        />
        <div className="justify-self-end">{rightSlot}</div>
      </div>

      {children}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
