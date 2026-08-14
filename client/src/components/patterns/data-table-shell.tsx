import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EntityLoadingState, EntityEmptyState } from "./entity-list-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DataTableShellProps<T> {
  data: T[];
  columns: Array<{
    key: string;
    header: React.ReactNode;
    cell: (item: T) => React.ReactNode;
    className?: string;
  }>;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

export function DataTableShell<T extends { id?: string | number; _id?: string | number }>({
  data,
  columns,
  isLoading = false,
  emptyTitle = "No items found",
  emptyDescription = "No data available in this table view.",
  onRowClick,
  page,
  totalPages,
  onPageChange,
  className,
}: DataTableShellProps<T>) {
  if (isLoading) {
    return <EntityLoadingState type="table" count={5} className={className} />;
  }

  if (data.length === 0) {
    return (
      <EntityEmptyState
        title={emptyTitle}
        description={emptyDescription}
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/70">
              {columns.map((col) => (
                <TableHead key={col.key} className={cn("text-xs font-semibold text-muted-foreground", col.className)}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, idx) => {
              const rowKey = String(item.id || item._id || idx);
              return (
                <TableRow
                  key={rowKey}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={cn(
                    "transition-colors hover:bg-muted/30 border-b border-border/50 last:border-b-0",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn("py-3 text-sm text-foreground", col.className)}>
                      {col.cell(item)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {page !== undefined && totalPages !== undefined && totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>
            Page <span className="font-semibold text-foreground">{page}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
