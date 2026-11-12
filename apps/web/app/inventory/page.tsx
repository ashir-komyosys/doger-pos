"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ChefHat, Clock3, Package, Plus, Search, Trash2, TrendingUp, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { AddIngredientDialog } from "@/components/inventory/add-ingredient-dialog";
import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import { EditIngredientDialog } from "@/components/inventory/edit-ingredient-dialog";
import { InventoryTabs } from "@/components/inventory/inventory-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBranch } from "@/hooks/use-branch";
import { useBranchStockMovements, useDeleteIngredient, useIngredients, useRecipe, useSetRecipe, type Ingredient } from "@/hooks/use-inventory";
import { useMenuItems } from "@/hooks/use-menu";
import type { IngredientUnit } from "@nodedr-restaurant/types";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

type RecipeDraftLine = { ingredientId: string; quantity: string; unit: IngredientUnit };
const UNIT_OPTIONS: Record<IngredientUnit, IngredientUnit[]> = {
  KG: ["KG", "G"], G: ["G", "KG"], L: ["L", "ML"], ML: ["ML", "L"],
  PIECE: ["PIECE", "DOZEN"], DOZEN: ["DOZEN", "PIECE"], PACK: ["PACK"], BOX: ["BOX"],
};
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-PK", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi" }).format(new Date(value));
const quantityLabel = (value: string | number, unit: string) => `${Number(value).toLocaleString("en-PK", { maximumFractionDigits: 3 })} ${unit}`;

function RecipeUsagePanel({ branchId, ingredients }: { branchId: string | null; ingredients: Ingredient[] }) {
  const { data: menuItems = [] } = useMenuItems(branchId);
  const sellableItems = menuItems.filter((item) => item.isActive && !item.isCombo);
  const [menuItemId, setMenuItemId] = useState("");
  const { data: recipe } = useRecipe(branchId, menuItemId || null);
  const saveRecipe = useSetRecipe(branchId, menuItemId || null);
  const [lines, setLines] = useState<RecipeDraftLine[]>([]);

  useEffect(() => {
    if (!menuItemId && sellableItems[0]) setMenuItemId(sellableItems[0].id);
  }, [menuItemId, sellableItems]);
  useEffect(() => {
    if (recipe) setLines(recipe.lines.map((line) => ({ ingredientId: line.ingredientId, quantity: String(line.quantity), unit: line.unit })));
  }, [recipe, menuItemId]);

  const updateLine = (index: number, patch: Partial<RecipeDraftLine>) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  const addLine = () => {
    const available = ingredients.find((ingredient) => ingredient.isActive && !lines.some((line) => line.ingredientId === ingredient.id));
    if (!available) return toast.error("Add another stock ingredient or remove a duplicate from this recipe first.");
    setLines((current) => [...current, { ingredientId: available.id, quantity: "1", unit: available.unit }]);
  };
  const save = async () => {
    if (!menuItemId) return toast.error("Add a menu item before creating recipe deductions.");
    if (lines.some((line) => !line.ingredientId || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0)) return toast.error("Choose an ingredient and enter a quantity greater than zero for every row.");
    if (new Set(lines.map((line) => line.ingredientId)).size !== lines.length) return toast.error("Each ingredient can appear only once in a recipe.");
    try {
      await saveRecipe.mutateAsync(lines.map((line) => ({ ingredientId: line.ingredientId, quantity: Number(line.quantity), unit: line.unit })));
      toast.success("Recipe deductions saved.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Could not save recipe deductions.");
    }
  };

  return <Card id="recipe-deductions" className="flex min-h-[500px] scroll-mt-24 flex-col gap-4 p-4 sm:p-5">
    <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary"><UtensilsCrossed className="size-5" /></span><div><h2 className="font-semibold">Recipe deductions</h2><p className="text-xs text-muted-foreground">Choose the menu item, then set stock used per sale.</p></div></div>
    <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">Menu item
      <Select value={menuItemId} onValueChange={(value) => setMenuItemId(value ?? "")}><SelectTrigger className="w-full"><SelectValue placeholder="Choose a menu item" /></SelectTrigger><SelectContent>{sellableItems.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
    </label>
    {menuItemId ? <>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[minmax(0,1fr)_72px_82px_24px] gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[minmax(0,1fr)_86px_92px_24px]"><span>Ingredient</span><span>Quantity</span><span>Unit</span><span /></div>
        {lines.length ? lines.map((line, index) => {
          const ingredient = ingredients.find((item) => item.id === line.ingredientId);
          const usedIds = lines.filter((_, lineIndex) => lineIndex !== index).map((other) => other.ingredientId);
          const ingredientOptions = ingredients.filter((item) => item.isActive && (!usedIds.includes(item.id) || item.id === line.ingredientId));
          return <div key={`${line.ingredientId}-${index}`} className="grid grid-cols-[minmax(0,1fr)_72px_82px_24px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_86px_92px_24px]">
            <Select value={line.ingredientId} onValueChange={(value) => { const next = ingredients.find((item) => item.id === value); updateLine(index, { ingredientId: value ?? "", unit: next?.unit ?? line.unit }); }}><SelectTrigger className="h-9 min-w-0 w-full px-2 text-xs"><SelectValue placeholder="Ingredient" /></SelectTrigger><SelectContent>{ingredientOptions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
            <Input aria-label={`Quantity of ${ingredient?.name ?? "ingredient"} per menu item`} className="h-9 px-2 text-xs" type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} />
            <Select value={line.unit} onValueChange={(value) => updateLine(index, { unit: value as IngredientUnit })}><SelectTrigger className="h-9 w-full px-2 text-xs"><SelectValue /></SelectTrigger><SelectContent>{UNIT_OPTIONS[ingredient?.unit ?? line.unit].map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent></Select>
            <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive hover:bg-destructive/10" aria-label={`Remove ${ingredient?.name ?? "ingredient"} from recipe`} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><Trash2 className="size-4" /></Button>
          </div>;
        }) : <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No stock deductions set for this item.</p>}
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={addLine} disabled={!ingredients.some((ingredient) => ingredient.isActive && !lines.some((line) => line.ingredientId === ingredient.id))}><Plus className="size-4" />Add ingredient to recipe</Button>
      </div>
      <p className="rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">Enter amounts in a compatible unit. For example, 150 g used from chicken stock stored in kg is deducted as 0.15 kg.</p>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4"><div className="text-xs text-muted-foreground">Estimated cost <span className="font-semibold text-foreground">{formatCurrency(recipe?.totalCost ?? 0)}</span></div><Button onClick={() => void save()} disabled={saveRecipe.isPending || !menuItemId}>{saveRecipe.isPending ? "Saving…" : "Save deductions"}</Button></div>
    </> : <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Add an active menu item to start configuring stock usage.</div>}
    <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed text-muted-foreground"><ChefHat className="mr-1 inline size-3.5 text-warning" />Stock is reserved when the order goes to the kitchen and deducted when the ticket is marked ready. Unprepared cancellations release the reservation.</div>
  </Card>;
}

function MovementActivity({ branchId }: { branchId: string | null }) {
  const filters = useMemo(() => ({}), []);
  const { data, isLoading } = useBranchStockMovements(branchId, filters);
  const movements = data?.pages.flatMap((page) => page.data).slice(0, 5) ?? [];
  return <Card className="p-4 sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Clock3 className="size-4 text-muted-foreground" /><h2 className="font-semibold">Recent stock activity</h2></div><a href="/inventory/history" className="text-xs font-semibold text-primary hover:underline">View full history →</a></div>
    {isLoading ? <p className="py-4 text-sm text-muted-foreground">Loading recent stock changes…</p> : movements.length ? <div className="divide-y divide-border">{movements.map((movement) => {
      const change = movement.stockBefore !== null && movement.stockAfter !== null ? Number(movement.stockAfter) - Number(movement.stockBefore) : (movement.type === "CONSUMPTION" || movement.type === "WASTE" ? -Number(movement.quantity) : Number(movement.quantity));
      return <div key={movement.id} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto] items-center gap-3 py-2.5 text-xs sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto_auto]"><span className="truncate font-medium">{movement.ingredient?.name ?? "Stock item"}</span><span className="truncate text-muted-foreground">{movement.note ?? movement.type.replaceAll("_", " ")}</span><span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${change < 0 ? "text-destructive" : "text-success"}`}>{change < 0 ? <ArrowDownRight className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}{change > 0 ? "+" : ""}{quantityLabel(change, movement.ingredient?.unit ?? "")}</span><span className="hidden text-right text-muted-foreground sm:block">{dateLabel(movement.createdAt)}</span></div>;
    })}</div> : <p className="py-4 text-sm text-muted-foreground">No stock activity yet. Add an ingredient or receive stock to start a history.</p>}
  </Card>;
}

export default function InventoryPage() {
  const { branchId } = useBranch();
  const { data: ingredients = [], isLoading, isError, refetch } = useIngredients(branchId);
  const deleteIngredient = useDeleteIngredient(branchId);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("ALL");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const filteredIngredients = useMemo(() => ingredients.filter((ingredient) => {
    const matchesName = ingredient.name.toLowerCase().includes(search.toLowerCase()) || (ingredient.sku ?? "").toLowerCase().includes(search.toLowerCase());
    const low = Number(ingredient.availableStock) <= Number(ingredient.reorderLevel);
    return matchesName && (stockFilter === "ALL" || (stockFilter === "LOW" ? low : !low));
  }), [ingredients, search, stockFilter]);
  const lowStock = ingredients.filter((ingredient) => ingredient.isActive && Number(ingredient.availableStock) <= Number(ingredient.reorderLevel));
  const stockValue = ingredients.reduce((sum, ingredient) => sum + Number(ingredient.currentStock) * Number(ingredient.costPerUnit), 0);
  const reservedCount = ingredients.filter((ingredient) => Number(ingredient.reservedStock) > 0).length;

  const removeIngredient = async (ingredient: Ingredient) => {
    if (!window.confirm(`Delete “${ingredient.name}”? Ingredients used by recipes or stock records must be deactivated to preserve history.`)) return;
    setDeleteId(ingredient.id);
    try {
      await deleteIngredient.mutateAsync(ingredient.id);
      toast.success(`${ingredient.name} deleted.`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not delete ingredient. Deactivate it if it has stock or history.");
    } finally {
      setDeleteId(null);
    }
  };

  return <div className="flex flex-col gap-5 xl:gap-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Dogar&apos;s Fire &amp; Flavour · Stock control</p><h1 className="text-3xl font-semibold tracking-tight">Inventory</h1><p className="mt-1 text-sm text-muted-foreground">Manage raw stock and control recipe deductions.</p></div><AddIngredientDialog branchId={branchId} /></div>
    <InventoryTabs />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={Package} label="Stock ingredients" value={String(ingredients.length)} tone="green" /><MetricCard icon={AlertTriangle} label="Low stock" value={String(lowStock.length)} tone="orange" /><MetricCard icon={TrendingUp} label="Stock value" value={formatCurrency(stockValue)} tone="brown" /><MetricCard icon={ChefHat} label="Reserved for kitchen" value={String(reservedCount)} tone="red" /></div>
    {isError && <Card className="flex items-center justify-between gap-4 border-destructive/30 p-4 text-sm"><span>Could not load stock ingredients.</span><Button variant="outline" size="sm" onClick={() => void refetch()}>Try again</Button></Card>}
    <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.65fr)_minmax(390px,0.95fr)]">
      <Card className="min-w-0 overflow-hidden p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Package className="size-4 text-primary" /><h2 className="font-semibold">Stock ingredients</h2></div><p className="text-xs text-muted-foreground">{ingredients.length} item{ingredients.length === 1 ? "" : "s"}</p></div>
        <div className="mb-3 flex flex-wrap gap-2"><div className="relative min-w-[180px] flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search ingredients…" value={search} onChange={(event) => setSearch(event.target.value)} /></div><Select value={stockFilter} onValueChange={(value) => setStockFilter(value ?? "ALL")}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All stock</SelectItem><SelectItem value="LOW">Low stock</SelectItem><SelectItem value="HEALTHY">In stock</SelectItem></SelectContent></Select></div>
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Ingredient</TableHead><TableHead>On hand</TableHead><TableHead>Reserved</TableHead><TableHead>Available</TableHead><TableHead>Reorder at</TableHead><TableHead>Date added</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>{isLoading ? Array.from({ length: 4 }).map((_, index) => <TableRow key={index}><TableCell colSpan={8}><div className="h-8 animate-pulse rounded bg-muted" /></TableCell></TableRow>) : filteredIngredients.map((ingredient) => {
            const low = ingredient.isActive && Number(ingredient.availableStock) <= Number(ingredient.reorderLevel);
            return <TableRow key={ingredient.id}><TableCell><div className="min-w-[150px]"><p className="font-medium">{ingredient.name}</p>{ingredient.sku && <p className="text-[10px] text-muted-foreground">{ingredient.sku}</p>}</div></TableCell><TableCell className="whitespace-nowrap tabular-nums">{quantityLabel(ingredient.currentStock, ingredient.unit)}</TableCell><TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{quantityLabel(ingredient.reservedStock, ingredient.unit)}</TableCell><TableCell className="whitespace-nowrap font-semibold tabular-nums">{quantityLabel(ingredient.availableStock, ingredient.unit)}</TableCell><TableCell className="whitespace-nowrap tabular-nums">{quantityLabel(ingredient.reorderLevel, ingredient.unit)}</TableCell><TableCell className="whitespace-nowrap text-xs text-muted-foreground">{dateLabel(ingredient.createdAt)}</TableCell><TableCell><span className={`inline-flex whitespace-nowrap items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold ${!ingredient.isActive ? "bg-muted text-muted-foreground" : low ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}><span className={`size-1.5 rounded-full ${!ingredient.isActive ? "bg-muted-foreground" : low ? "bg-warning" : "bg-success"}`} />{!ingredient.isActive ? "Inactive" : low ? "Low stock" : "In stock"}</span></TableCell><TableCell><div className="flex justify-end gap-1"><AdjustStockDialog branchId={branchId} ingredient={ingredient} /><EditIngredientDialog key={ingredient.id} branchId={branchId} ingredient={ingredient} /><Button variant="ghost" size="icon" className="size-8 text-destructive hover:bg-destructive/10" aria-label={`Delete ${ingredient.name}`} disabled={deleteId === ingredient.id} onClick={() => void removeIngredient(ingredient)}><Trash2 className="size-4" /></Button></div></TableCell></TableRow>;
          })}{!isLoading && filteredIngredients.length === 0 && <TableRow><TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">{ingredients.length ? "No ingredients match these filters." : "No stock ingredients yet. Add your first raw ingredient to begin."}</TableCell></TableRow>}</TableBody>
        </Table></div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground"><span>Available stock = on hand − active kitchen reservations.</span><span>Stock value: {formatCurrency(stockValue)}</span></div>
      </Card>
      <RecipeUsagePanel branchId={branchId} ingredients={ingredients} />
    </div>
    <MovementActivity branchId={branchId} />
  </div>;
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: typeof Package; label: string; value: string; tone: "green" | "orange" | "brown" | "red" }) {
  const colors = { green: "bg-success/10 text-success", orange: "bg-warning/10 text-warning", brown: "bg-accent text-primary", red: "bg-destructive/10 text-destructive" };
  return <Card className="flex min-w-0 items-center gap-3 p-4"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${colors[tone]}`}><Icon className="size-5" /></span><div className="min-w-0"><p className="truncate text-xs text-muted-foreground">{label}</p><p className="truncate text-xl font-semibold tabular-nums">{value}</p></div></Card>;
}
