"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@nodedr-restaurant/types";
import { hasPermission } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { NavDot } from "./nav-dot";
import { NAV_ITEMS } from "./nav-items";

const NAV_GROUPS = [
  { title: "Today", hrefs: ["/dashboard", "/pos", "/orders", "/tables", "/kds", "/reservations"] },
  { title: "Manage", hrefs: ["/menu", "/customers", "/inventory", "/delivery", "/team", "/attendance"] },
  { title: "Business", hrefs: ["/accounting", "/reports", "/marketing", "/operations", "/settings"] },
];

export function SidebarNav({ user, onNavigate }: { user?: SessionUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const badges = useNavBadges();
  const allowed = NAV_ITEMS.filter((item) => (!item.permission || hasPermission(user, item.permission))
    && (!item.anyPermission || item.anyPermission.some((permission) => hasPermission(user, permission))));

  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_GROUPS.map((group) => {
        const items = group.hrefs.map((href) => allowed.find((item) => item.href === href))
          .filter((item): item is (typeof allowed)[number] => !!item);
        if (items.length === 0) return null;
        return <div key={group.title} className="flex flex-col gap-1">
          <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">{group.title}</p>
          {items.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} onClick={onNavigate}
              className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")}>
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              {t(item.labelKey)}
              {badges.nav[item.href] && !isActive ? <NavDot /> : null}
            </Link>;
          })}
        </div>;
      })}
    </nav>
  );
}
