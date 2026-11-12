"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Clock3 } from "lucide-react";
import { InventoryTabs } from "@/components/inventory/inventory-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBranch } from "@/hooks/use-branch";
import { useBranchStockMovements, useIngredients } from "@/hooks/use-inventory";

const formatDate = (value: string) => new Intl.DateTimeFormat("en-PK", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Karachi",
}).format(new Date(value));

export default function InventoryHistoryPage() {
  const { branchId } = useBranch();
  const { data: ingredients = [] } = useIngredients(branchId);
  const [ingredientId, setIngredientId] = useState("ALL");
  const [type, setType] = useState("ALL");
  const filters = useMemo(() => ({
    ...(ingredientId !== "ALL" ? { ingredientId } : {}),
    ...(type !== "ALL" ? { type } : {}),
  }), [ingredientId, type]);
  const movements = useBranchStockMovements(branchId, filters);
  const rows = movements.data?.pages.flatMap((page) => page.data) ?? [];

  return <div className="flex flex-col gap-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Link href="/inventory" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" />Inventory</Link>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Dogar&apos;s Fire &amp; Flavour · Stock control</p>
        <h1 className="text-3xl font-semibold tracking-tight">Stock history</h1>
        <p className="mt-1 text-sm text-muted-foreground">A dated record of every receipt, sale, adjustment, waste, and reversal.</p>
      </div>
    </div>
    <InventoryTabs />
    <Card className="overflow-hidden p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Clock3 className="size-4 text-primary" /><h2 className="font-semibold">Ingredient movements</h2></div>
        <div className="flex flex-wrap gap-2">
          <Select value={ingredientId} onValueChange={(value) => setIngredientId(value ?? "ALL")}>
            <SelectTrigger className="w-[190px]"><SelectValue placeholder="All ingredients" /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All ingredients</SelectItem>{ingredients.map((ingredient) => <SelectItem key={ingredient.id} value={ingredient.id}>{ingredient.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={type} onValueChange={(value) => setType(value ?? "ALL")}>
            <SelectTrigger className="w-[165px]"><SelectValue placeholder="All movement types" /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All changes</SelectItem><SelectItem value="RECEIPT">Stock added</SelectItem><SelectItem value="ADJUSTMENT">Adjustment</SelectItem><SelectItem value="CONSUMPTION">Order usage</SelectItem><SelectItem value="WASTE">Waste</SelectItem><SelectItem value="REVERSAL">Reversal</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Date &amp; time</TableHead><TableHead>Ingredient</TableHead><TableHead>Change</TableHead><TableHead>Before</TableHead><TableHead>After</TableHead><TableHead>Reason / reference</TableHead><TableHead>Recorded by</TableHead></TableRow></TableHeader>
          <TableBody>
            {movements.isLoading ? Array.from({ length: 5 }).map((_, index) => <TableRow key={index}><TableCell colSpan={7}><div className="h-8 animate-pulse rounded bg-muted" /></TableCell></TableRow>) : rows.map((row) => {
              const delta = row.stockBefore !== null && row.stockAfter !== null ? Number(row.stockAfter) - Number(row.stockBefore) : (row.type === "CONSUMPTION" || row.type === "WASTE" ? -Number(row.quantity) : Number(row.quantity));
              const unit = row.ingredient?.unit ?? "";
              const amount = `${Math.abs(delta).toLocaleString("en-PK", { maximumFractionDigits: 3 })} ${unit}`;
              return <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
                <TableCell className="font-medium">{row.ingredient?.name ?? "Removed ingredient"}</TableCell>
                <TableCell className={`whitespace-nowrap font-semibold tabular-nums ${delta < 0 ? "text-destructive" : "text-success"}`}><span className="inline-flex items-center gap-1">{delta < 0 ? <ArrowDownRight className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}{delta > 0 ? "+" : "−"}{amount}</span></TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{row.stockBefore === null ? "—" : `${Number(row.stockBefore).toLocaleString("en-PK", { maximumFractionDigits: 3 })} ${unit}`}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{row.stockAfter === null ? "—" : `${Number(row.stockAfter).toLocaleString("en-PK", { maximumFractionDigits: 3 })} ${unit}`}</TableCell>
                <TableCell className="min-w-[180px] text-xs">{row.note ?? row.type.replaceAll("_", " ")}{row.orderId && <span className="ml-1 text-muted-foreground">· order</span>}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{row.createdBy?.name ?? "System"}</TableCell>
              </TableRow>;
            })}
            {!movements.isLoading && rows.length === 0 && <TableRow><TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">{movements.isError ? "Could not load stock history." : "No stock changes match these filters."}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 flex justify-center border-t border-border pt-4">
        {movements.isError ? <Button variant="outline" onClick={() => void movements.refetch()}>Try again</Button> : movements.hasNextPage ? <Button variant="outline" onClick={() => void movements.fetchNextPage()} disabled={movements.isFetchingNextPage}>{movements.isFetchingNextPage ? "Loading…" : "Load older activity"}</Button> : rows.length > 0 ? <p className="text-xs text-muted-foreground">You&apos;re up to date.</p> : null}
      </div>
    </Card>
  </div>;
}
