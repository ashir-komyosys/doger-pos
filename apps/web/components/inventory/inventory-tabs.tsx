"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Ingredients", href: "/inventory" },
  { label: "Recipe deductions", href: "/inventory#recipe-deductions" },
  { label: "Stock history", href: "/inventory/history" },
  { label: "Suppliers", href: "/inventory/suppliers" },
  { label: "Purchase Orders", href: "/inventory/purchase-orders" },
  { label: "Procurement", href: "/inventory/procurement" },
  { label: "Transfers", href: "/inventory/transfers" },
  { label: "Waste", href: "/inventory/waste" },
];

export function InventoryTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-border overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
      {TABS.map((tab) => {
        const tabPath = tab.href.split("#")[0];
        const isActive = tabPath === "/inventory"
          ? pathname === "/inventory" && tab.href === "/inventory"
          : pathname?.startsWith(tabPath);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 border-b-2 px-3 pb-3 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
