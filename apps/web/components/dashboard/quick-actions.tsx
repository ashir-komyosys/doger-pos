import { CalendarPlus, ChefHat, LayoutGrid, ShoppingCart, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const ACTIONS = [
  { href: "/pos", label: "New order", icon: ShoppingCart, permission: "orders.create" },
  { href: "/tables", label: "Tables", icon: LayoutGrid, permission: "tables.view" },
  { href: "/reservations", label: "New reservation", icon: CalendarPlus, permission: "reservations.manage" },
  { href: "/kds", label: "Kitchen display", icon: ChefHat, permission: "kds.manage" },
  { href: "/menu", label: "Menu", icon: UtensilsCrossed, permission: "menu.view" },
];

// One-tap jumps into the flows staff reach for most during service — sits
// right under the header so it's the first thing visible, not buried below
// the stat cards.
export function QuickActions() {
  const { data } = useCurrentUser();

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
      {ACTIONS.filter((action) => hasPermission(data?.user, action.permission)).map((action) => (
        <Button key={action.href} variant="outline" size="sm" className="shrink-0" render={<Link href={action.href} />} nativeButton={false}>
          <action.icon className="h-4 w-4" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}
