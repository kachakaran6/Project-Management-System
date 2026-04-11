"use client";

interface JsonViewerProps {
  data: unknown;
  emptyMessage?: string;
  className?: string;
}

export function JsonViewer({
  data,
  emptyMessage = "No data available.",
  className,
}: JsonViewerProps) {
  return (
    <pre
      className={`max-h-[420px] overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs ${className ?? ""}`}
    >
      {data ? JSON.stringify(data, null, 2) : emptyMessage}
    </pre>
  );
}
