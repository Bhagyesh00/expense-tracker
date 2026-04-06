"use client";

import {
  useState,
  useRef,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface Column<T> {
  id: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface AccessibleTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string;
  caption?: string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

export function AccessibleTable<T>({
  columns,
  data,
  getRowId,
  caption,
  onRowClick,
  emptyMessage = "No data available",
  className,
}: AccessibleTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [focusedRow, setFocusedRow] = useState<number>(-1);
  const [announcement, setAnnouncement] = useState("");
  const tableRef = useRef<HTMLTableElement>(null);

  const handleSort = useCallback(
    (columnId: string) => {
      const col = columns.find((c) => c.id === columnId);
      if (!col?.sortable) return;

      let newDirection: SortDirection;
      if (sortColumn !== columnId) {
        newDirection = "asc";
      } else if (sortDirection === "asc") {
        newDirection = "desc";
      } else {
        newDirection = null;
      }

      setSortColumn(newDirection ? columnId : null);
      setSortDirection(newDirection);
      setAnnouncement(
        newDirection
          ? `Sorted by ${col.header} ${newDirection === "asc" ? "ascending" : "descending"}`
          : `Sort cleared`
      );
    },
    [columns, sortColumn, sortDirection]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTableElement>) => {
      const rowCount = data.length;
      if (rowCount === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedRow((prev) => Math.min(prev + 1, rowCount - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedRow((prev) => Math.max(prev - 1, 0));
          break;
        case "Home":
          e.preventDefault();
          setFocusedRow(0);
          break;
        case "End":
          e.preventDefault();
          setFocusedRow(rowCount - 1);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedRow >= 0 && onRowClick) {
            onRowClick(data[focusedRow]);
          }
          break;
      }
    },
    [data, focusedRow, onRowClick]
  );

  return (
    <div className={cn("overflow-x-auto", className)}>
      {/* Live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <table
        ref={tableRef}
        role="grid"
        aria-rowcount={data.length}
        onKeyDown={handleKeyDown}
        className="w-full border-collapse"
      >
        {caption && (
          <caption className="mb-2 text-left text-sm font-medium text-foreground">
            {caption}
          </caption>
        )}

        <thead>
          <tr role="row">
            {columns.map((col) => (
              <th
                key={col.id}
                role="columnheader"
                scope="col"
                aria-sort={
                  sortColumn === col.id && sortDirection
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
                tabIndex={col.sortable ? 0 : -1}
                onClick={() => col.sortable && handleSort(col.id)}
                onKeyDown={(e) => {
                  if (
                    col.sortable &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    e.preventDefault();
                    handleSort(col.id);
                  }
                }}
                className={cn(
                  "border-b border-border bg-muted/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                  col.sortable &&
                    "cursor-pointer select-none hover:bg-muted",
                  col.width
                )}
              >
                <div className="flex items-center gap-1.5">
                  {col.header}
                  {col.sortable && (
                    <span className="inline-flex flex-col" aria-hidden="true">
                      <ArrowUp
                        className={cn(
                          "h-3 w-3 -mb-0.5",
                          sortColumn === col.id && sortDirection === "asc"
                            ? "text-primary"
                            : "text-muted-foreground/40"
                        )}
                      />
                      <ArrowDown
                        className={cn(
                          "h-3 w-3 -mt-0.5",
                          sortColumn === col.id && sortDirection === "desc"
                            ? "text-primary"
                            : "text-muted-foreground/40"
                        )}
                      />
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={getRowId(row)}
                role="row"
                aria-rowindex={rowIndex + 1}
                tabIndex={focusedRow === rowIndex ? 0 : -1}
                onClick={() => onRowClick?.(row)}
                onFocus={() => setFocusedRow(rowIndex)}
                className={cn(
                  "border-b border-border transition-colors",
                  onRowClick && "cursor-pointer",
                  focusedRow === rowIndex
                    ? "bg-primary/5 outline-none ring-2 ring-inset ring-primary"
                    : "hover:bg-accent/50"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    role="gridcell"
                    className={cn(
                      "px-4 py-3 text-sm text-foreground",
                      col.width
                    )}
                  >
                    {col.accessor(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
