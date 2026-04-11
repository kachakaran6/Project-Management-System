"use client";

import { useMemo, useState } from "react";

export function useTableControls<T>(rows: T[], pageSize = 10) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    return rows;
  }, [rows]);

  const sortedRows = useMemo(() => {
    if (!sortBy) return filteredRows;

    const output = [...filteredRows] as Array<Record<string, unknown>>;

    output.sort((a, b) => {
      const first = a[sortBy];
      const second = b[sortBy];
      const firstVal = first == null ? "" : String(first).toLowerCase();
      const secondVal = second == null ? "" : String(second).toLowerCase();

      if (firstVal < secondVal) return sortDirection === "asc" ? -1 : 1;
      if (firstVal > secondVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return output as T[];
  }, [filteredRows, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [currentPage, pageSize, sortedRows]);

  return {
    search,
    setSearch,
    sortBy,
    sortDirection,
    setSortBy,
    setSortDirection,
    page: currentPage,
    setPage,
    totalPages,
    pagedRows,
  };
}
