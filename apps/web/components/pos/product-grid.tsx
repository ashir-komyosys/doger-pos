"use client";

import { Minus, Plus, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { QueryError } from "@/components/ui/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories, useMenuItems, type MenuItem } from "@/hooks/use-menu";
import { menuFoodTile } from "@/components/menu/food-image";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isDealCategory, isDrinkCategory } from "@/components/pos/cart-line";

const SECTIONS = [
  { label: "All", icon: "✦" },
  { label: "Food", icon: "🍽" },
  { label: "Drinks", icon: "🥤" },
  { label: "Deals", icon: "🔥" },
];

export function ProductGrid({
  branchId,
  onSelect,
  quantityForItem,
  onRemoveOne,
}: {
  branchId: string | null;
  onSelect: (item: MenuItem) => void;
  quantityForItem: (itemId: string) => number;
  onRemoveOne: (itemId: string) => void;
}) {
  const { data: categories } = useCategories(branchId);
  const [activeCategoryId, setActiveCategoryId] = useState<string | undefined>(undefined);
  const [activeSection, setActiveSection] = useState("All");
  const [search, setSearch] = useState("");
  const { data: items, isLoading, isError, error, refetch, isFetching } = useMenuItems(branchId, activeCategoryId);

  const matchesSection = (item: MenuItem) => {
    if (activeSection === "All") return true;
    const drinks = isDrinkCategory(item.category.name);
    const deals = item.isCombo || isDealCategory(item.category.name);
    if (activeSection === "Drinks") return drinks;
    if (activeSection === "Deals") return deals;
    return !drinks && !deals;
  };
  const sectionItems = items?.filter(matchesSection) ?? [];
  const sectionCategoryIds = new Set(sectionItems.map((item) => item.categoryId));
  const sectionCategories = categories?.filter((category) => sectionCategoryIds.has(category.id)) ?? [];
  const visibleCategories = activeSection === "All" ? categories : sectionCategories;
  const filtered = sectionItems.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <section aria-label="Restaurant menu" className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Fresh from the kitchen
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Choose your dishes</h2>
        </div>
        <label className="relative w-full sm:max-w-[270px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Search the menu"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 rounded-full border-border/80 bg-card pl-9 shadow-sm placeholder:text-muted-foreground/80"
            aria-label="Search menu items"
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 border-b border-border/80 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-0.5" role="group" aria-label="Menu section">
          {SECTIONS.map((section) => (
            <button
              key={section.label}
              type="button"
              aria-pressed={activeSection === section.label}
              onClick={() => {
                setActiveSection(section.label);
                setActiveCategoryId(undefined);
              }}
              className={cn(
                "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeSection === section.label
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-transparent bg-card/70 text-muted-foreground hover:border-border hover:bg-card hover:text-foreground",
              )}
            >
              <span aria-hidden>{section.icon}</span>
              {section.label === "All" ? "All items" : section.label}
            </button>
          ))}
        </div>

        {visibleCategories && visibleCategories.length > 0 && (
          <nav aria-label="Menu category" className="flex gap-1.5 overflow-x-auto">
            <button
              type="button"
              aria-current={activeCategoryId ? undefined : "true"}
              onClick={() => setActiveCategoryId(undefined)}
              className={cn(
                "min-h-8 shrink-0 rounded-full px-3 text-xs font-medium transition-colors",
                !activeCategoryId ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground",
              )}
            >
              Everything
            </button>
            {visibleCategories.map((category) => {
              const active = activeCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => setActiveCategoryId(category.id)}
                  className={cn(
                    "min-h-8 shrink-0 rounded-full px-3 text-xs font-medium transition-colors",
                    active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground",
                  )}
                >
                  {category.name}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {isError && !items ? (
          <QueryError error={error} what="the menu" onRetry={() => void refetch()} retrying={isFetching} />
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {isLoading && Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-56 rounded-[1.25rem]" />
            ))}
            {filtered.map((item, index) => {
              const quantity = quantityForItem(item.id);
              return (
              <article
                key={item.id}
                className="group flex min-w-0 flex-col overflow-hidden rounded-[1.25rem] border border-border/80 bg-card text-left shadow-[0_2px_8px_rgba(69,43,40,0.045)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_12px_24px_-14px_rgba(69,43,40,0.25)]"
              >
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  aria-label={`Add ${item.name} to the order`}
                  className="relative block aspect-[1.62/1] w-full overflow-hidden bg-[#F1E6D8] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- menu images are uploaded to the configured backend host.
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <span className="block h-full w-full bg-cover transition-transform duration-300 group-hover:scale-[1.04]" style={menuFoodTile(item.name, index)} aria-hidden />
                  )}
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-[#FFFCF5]/90 px-2 py-1 text-[10px] font-semibold text-[#452B28] shadow-sm backdrop-blur">
                    {item.isVeg ? "Veg" : "Non-veg"}
                  </span>
                </button>
                <span className="flex min-h-[92px] w-full flex-1 flex-col justify-between gap-3 p-3 sm:p-3.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground sm:text-[15px]">{item.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.category.name}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold tabular-nums text-[#9B4A10]">{formatCurrency(item.price)}</span>
                    {quantity > 0 ? (
                      <span className="inline-flex h-8 items-center rounded-full border border-border/80 bg-background p-0.5" aria-label={`${quantity} ${item.name} in order`}>
                        <button type="button" onClick={() => onRemoveOne(item.id)} aria-label={`Remove one ${item.name}`} className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <Minus className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <span className="min-w-6 text-center text-xs font-semibold tabular-nums">{quantity}</span>
                        <button type="button" onClick={() => onSelect(item)} aria-label={`Add one ${item.name}`} className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => onSelect(item)} aria-label={`Add ${item.name} to the order`} className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#FE8C00] to-[#FF3B00] px-3 text-xs font-semibold text-white shadow-[0_4px_10px_rgba(254,140,0,0.22)] transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <Plus className="h-3.5 w-3.5" aria-hidden /> Add item
                      </button>
                    )}
                  </span>
                </span>
              </article>
            );})}
            {filtered.length === 0 && !isLoading && (
              <p className="col-span-full rounded-2xl border border-dashed border-border bg-card/60 py-14 text-center text-sm text-muted-foreground">
                {search ? <>No items match &quot;{search}&quot;</> : "No items in this category yet"}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
