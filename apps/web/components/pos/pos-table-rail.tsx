"use client";

import type { Floor, RestaurantTable } from "@/hooks/use-tables";
import { cn } from "@/lib/utils";
import { useState } from "react";

const TABLE_STATE: Record<RestaurantTable["status"], string> = {
  AVAILABLE: "border-success/25 bg-success/5 text-success hover:bg-success/10",
  OCCUPIED: "border-primary/25 bg-primary/5 text-primary hover:bg-primary/10",
  RESERVED: "border-warning/25 bg-warning/5 text-warning hover:bg-warning/10",
  CLEANING: "border-border bg-muted text-muted-foreground",
  OUT_OF_SERVICE: "border-border bg-muted text-muted-foreground opacity-50",
};

export function PosTableRail({
  floors,
  selectedTableId,
  onSelect,
  isLoading = false,
  error = null,
  onRetry,
  retrying = false,
}: {
  floors: Floor[];
  selectedTableId: string;
  onSelect: (table: RestaurantTable) => void;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const [floorId, setFloorId] = useState<string>();
  const floor = floors.find((candidate) => candidate.id === floorId) ?? floors[0];

  return (
    <aside className="hidden min-h-0 flex-col items-center gap-2 rounded-[1.25rem] border border-border/70 bg-card/70 p-2 xl:flex" aria-label="Choose a table">
      <span className="pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Tables</span>

      {floors.length > 1 && (
        <select
          aria-label="Dining floor"
          value={floor?.id ?? ""}
          onChange={(event) => setFloorId(event.target.value)}
          className="h-8 w-full rounded-lg border border-border bg-background px-1 text-center text-[10px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {floors.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
        </select>
      )}

      <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-y-auto py-1" role="group" aria-label="Tables on this floor">
        {isLoading && floors.length === 0 ? (
          <span role="status" className="py-3 text-center text-[10px] text-muted-foreground">Loading…</span>
        ) : error && floors.length === 0 ? (
          <div className="flex flex-col items-center gap-1 text-center">
            <span role="alert" className="text-[10px] leading-tight text-destructive">Tables unavailable</span>
            <button type="button" onClick={() => onRetry?.()} disabled={retrying} className="min-h-7 rounded-full px-1 text-[10px] font-semibold text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {retrying ? "Loading…" : "Retry"}
            </button>
          </div>
        ) : !floor ? (
          <span className="py-3 text-center text-[10px] text-muted-foreground">No tables</span>
        ) : floor.tables.map((table) => {
          const unavailable = table.status === "CLEANING" || table.status === "OUT_OF_SERVICE";
          const selected = selectedTableId === table.id;
          const label = table.name ?? `Table ${table.number}`;
          return (
            <button
              key={table.id}
              type="button"
              disabled={unavailable}
              aria-pressed={selected}
              aria-label={`${label}, ${table.status.toLowerCase()}`}
              title={`${label} · ${table.status.toLowerCase()}`}
              onClick={() => onSelect(table)}
              className={cn(
                "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                TABLE_STATE[table.status],
                selected && "border-primary bg-[#FFE3C7] text-[#6B351D] ring-2 ring-primary/25",
                unavailable && "cursor-not-allowed",
              )}
            >
              {`T-${table.number}`}
              <span className={cn(
                "absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-card",
                table.status === "AVAILABLE" && "bg-success",
                table.status === "OCCUPIED" && "bg-primary",
                table.status === "RESERVED" && "bg-warning",
                unavailable && "bg-muted-foreground",
              )} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
