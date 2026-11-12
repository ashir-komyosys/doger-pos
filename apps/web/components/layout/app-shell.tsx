"use client";

import type { SessionUser } from "@nodedr-restaurant/types";
import { Flame, Menu } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { EntityDialogHost } from "@/components/layout/entity-dialog-host";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useBranch } from "@/hooks/use-branch";
import { useSettings } from "@/hooks/use-settings";
import { useRealtimeState } from "@/lib/realtime-status";
import { BrandFooter } from "./brand-footer";
import { BranchSwitcher } from "./branch-switcher";
import { LanguageSwitcher } from "./language-switcher";
import { Toaster } from "@/components/ui/sonner";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

// The restaurant's own logo + name lead the sidebar header — this is
// white-label self-hosted software, so the operator's branding takes the
// prime spot an operator actually looks at. The Dogar's Fire & Flavour product
// mark moves to a small credit line at the bottom (BrandFooter) instead of
// competing with it up here. Falls back to the product mark only until the
// restaurant sets its own logo/name under Settings.
function RestaurantBrand() {
  const { branchId } = useBranch();
  const { data } = useSettings(branchId);
  const restaurant = data?.restaurant;

  if (restaurant?.logoUrl) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded asset served from the backend, not a Next-optimizable remote source */}
        <img
          src={restaurant.logoUrl}
          alt={restaurant.name}
          className="h-8 w-8 shrink-0 rounded-lg object-contain"
        />
        <span className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
          {restaurant.name}
        </span>
      </>
    );
  }

  return (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFE3C7] text-[#FE8C00]">
        <Flame className="h-6 w-6 fill-current" strokeWidth={1.8} />
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className="truncate text-[15px] font-extrabold tracking-[-0.04em] text-sidebar-foreground">
          DOGAR&apos;S
        </span>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.24em] text-[#FE8C00]">
          Fire &amp; Flavour
        </span>
      </span>
    </>
  );
}

export function AppShell({
  user,
  children,
}: {
  user?: SessionUser;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const realtimeState = useRealtimeState();
  const connectionLabel = realtimeState === "live" ? "Online" : realtimeState === "offline" ? "Offline" : "Connecting";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <RestaurantBrand />
        </div>
        <div className="px-3 pb-3">
          <BranchSwitcher />
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav user={user} />
        </div>
        <BrandFooter />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 max-w-[85vw] bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-16 items-center gap-2 px-5">
            <RestaurantBrand />
          </div>
          <div className="px-3 pb-3">
            <BranchSwitcher />
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            <SidebarNav user={user} onNavigate={() => setMobileOpen(false)} />
          </div>
          <BrandFooter />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 pl-2 lg:hidden">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FFE3C7] text-[#FE8C00]">
              <Flame className="h-4 w-4 fill-current" strokeWidth={1.8} />
            </span>
            <span className="truncate text-xs font-bold uppercase tracking-wider text-foreground">
              Dogar&apos;s
            </span>
          </div>
          <div className="hidden min-w-0 flex-1 flex-col pl-3 lg:flex">
            <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">
              Welcome back, {user?.name?.split(" ")[0] ?? "there"} 👋
            </p>
            <p className="text-xs text-muted-foreground">Dogar&apos;s Fire &amp; Flavour · Your service at a glance</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground sm:flex">
              <span className={`h-2 w-2 rounded-full ${realtimeState === "live" ? "bg-success" : realtimeState === "offline" ? "bg-destructive" : "bg-warning"}`} />
              {connectionLabel}
            </div>
            <LanguageSwitcher compact />
            <NotificationBell />
            <UserMenu user={user} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(6rem+env(safe-area-inset-bottom))] lg:p-8 lg:pb-8">{children}</main>
        <EntityDialogHost />
      </div>
      {/* Toast popups (sonner) — mounted once here so every toast.success/error
         call across the app, including the menu add-item dialog, actually shows. */}
      <Toaster />
      <MobileBottomNav user={user} onMore={() => setMobileOpen(true)} />
    </div>
  );
}
