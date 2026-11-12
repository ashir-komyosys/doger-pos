"use client";

import { BranchNotice } from "@/components/layout/branch-notice";
import { AlertTriangle, ChefHat, ClipboardList, Flame, Globe, LayoutGrid, ReceiptText, Store, Timer, TrendingUp, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StoreStatusControl } from "@/components/dashboard/store-status-control";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { OrderDetailDialog } from "@/components/orders/order-detail-dialog";
import { RefundDialog } from "@/components/orders/refund-dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranch } from "@/hooks/use-branch";
import { useManagedOrders } from "@/hooks/use-orders";
import { openEntity } from "@/lib/entity-events";
import { useDashboardOperations, useDashboardSummary, useDashboardTrends } from "@/hooks/use-dashboard";
import { useLowStockIngredients } from "@/hooks/use-inventory";
import { useCurrentUser, hasPermission } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const ONLINE_ORDER_TYPES = new Set(["QR_ORDER", "KIOSK"]);

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  accent?: "success" | "warning";
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            accent === "success" && "bg-success/10 text-success",
            accent === "warning" && "bg-warning/10 text-warning",
            !accent && "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </span>
    </Card>
  );
}

function TableStatusRow({ label, count, dotClass }: { label: string; count: number; dotClass: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", dotClass)} />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="font-medium tabular-nums text-foreground">{count}</span>
    </div>
  );
}

function DashboardStatusMetric({ label, count, dotClass }: { label: string; count: number; dotClass: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-border px-2 first:pl-0 last:pr-0 sm:border-r sm:last:border-r-0">
      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground sm:text-sm">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", dotClass)} />
        <span className="truncate">{label}</span>
      </div>
      <span className="pl-4 text-lg font-semibold tabular-nums text-foreground">{count}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { data: currentUser } = useCurrentUser();
  if (!currentUser) return <div className="min-h-40" aria-label="Loading dashboard" />;
  if (currentUser && !hasPermission(currentUser.user, "dashboard.sales.view")) {
    return <OperationsDashboard />;
  }
  return <SalesDashboard canViewInventory={hasPermission(currentUser.user, "inventory.manage")} />;
}

function OperationsDashboard() {
  const { branchId } = useBranch();
  const { data, isLoading } = useDashboardOperations(branchId);
  const stats = data ? [
    { label: "Active orders", value: data.activeOrders, icon: ReceiptText, href: "/orders" },
    { label: "Tables in use", value: data.tables.occupied, icon: ClipboardList, href: "/tables" },
    { label: "Kitchen preparing", value: data.kitchen.preparing + data.kitchen.new, icon: ChefHat, href: "/kds" },
    { label: "Ready to serve", value: data.kitchen.ready, icon: Flame, href: "/kds" },
  ] : [];
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-[32px] font-semibold tracking-tight text-foreground">Today</h1>
        <p className="text-sm text-muted-foreground">Your shift at a glance. Choose a task to keep service moving.</p></div>
      <BranchNotice />
      <StoreStatusControl />
      <PendingOrdersBanner branchId={branchId} />
      <QuickActions />
      {isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)}</div> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, icon, href }) => <Link key={label} href={href}><StatCard label={label} value={String(value)} icon={icon} /></Link>)}</div>
      )}
      {data && <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6"><h2 className="mb-3 text-lg font-medium">Table availability</h2>
          <TableStatusRow label="Available" count={data.tables.available} dotClass="bg-success" />
          <TableStatusRow label="Occupied" count={data.tables.occupied} dotClass="bg-primary" />
          <TableStatusRow label="Reserved" count={data.tables.reserved} dotClass="bg-warning" /></Card>
        <Card className="p-6"><h2 className="mb-3 text-lg font-medium">Kitchen queue</h2>
          <TableStatusRow label="New" count={data.kitchen.new} dotClass="bg-primary" />
          <TableStatusRow label="Preparing" count={data.kitchen.preparing} dotClass="bg-warning" />
          <TableStatusRow label="Ready to serve" count={data.kitchen.ready} dotClass="bg-success" /></Card>
      </div>}
    </div>
  );
}

function SalesDashboard({ canViewInventory }: { canViewInventory: boolean }) {
  const { branchId } = useBranch();
  const { data, isLoading } = useDashboardSummary(branchId);
  const { data: trends, isLoading: trendsLoading } = useDashboardTrends(branchId);
  const lowStock = useLowStockIngredients(branchId, canViewInventory);
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Real-time overview of today&apos;s service</p>
      </div>

      <OrderDetailDialog
        branchId={branchId}
        orderId={viewingOrderId}
        open={!!viewingOrderId}
        onOpenChange={(open) => !open && setViewingOrderId(null)}
      />

      <BranchNotice />
      <StoreStatusControl />

      <QuickActions />

      <PendingOrdersBanner branchId={branchId} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="flex items-center gap-2 text-[18px] font-medium text-foreground">
            <LayoutGrid className="h-[18px] w-[18px] text-muted-foreground" />
            Tables
          </h2>
          {data ? (
            <div className="grid grid-cols-2 gap-y-3 sm:grid-cols-4 sm:gap-y-0">
              <DashboardStatusMetric label="Available" count={data.tables.available} dotClass="bg-success" />
              <DashboardStatusMetric label="Occupied" count={data.tables.occupied} dotClass="bg-primary" />
              <DashboardStatusMetric label="Reserved" count={data.tables.reserved} dotClass="bg-warning" />
              <DashboardStatusMetric label="Cleaning" count={data.tables.cleaning} dotClass="bg-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-lg" />)}
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <h2 className="flex items-center gap-2 text-[18px] font-medium text-foreground">
            <ChefHat className="h-[18px] w-[18px] text-muted-foreground" />
            Kitchen queue
          </h2>
          {data ? (
            <div className="grid grid-cols-2 gap-y-3 sm:grid-cols-4 sm:gap-y-0">
              <DashboardStatusMetric label="New" count={data.kitchenQueue.new} dotClass="bg-primary" />
              <DashboardStatusMetric label="Accepted" count={data.kitchenQueue.accepted} dotClass="bg-warning" />
              <DashboardStatusMetric label="Preparing" count={data.kitchenQueue.preparing} dotClass="bg-warning" />
              <DashboardStatusMetric label="Ready" count={data.kitchenQueue.ready} dotClass="bg-success" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-lg" />)}
            </div>
          )}
        </Card>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Today's sales"
            value={formatCurrency(data.todayRevenue)}
            icon={Wallet}
            accent="success"
          />
          <Link href="/orders" className="block rounded-xl transition hover:opacity-90" title="Manage orders">
            <StatCard label="Orders today" value={String(data.todayOrders)} icon={ReceiptText} />
          </Link>
          <StatCard
            label="Average order value"
            value={formatCurrency(data.todayPaidOrders > 0 ? data.todayRevenue / data.todayPaidOrders : 0)}
            icon={TrendingUp}
          />
          {canViewInventory ? (
            <Link href="/inventory" className="block rounded-xl transition hover:opacity-90" title="Review low stock">
              <StatCard
                label="Low stock items"
                value={lowStock.isLoading ? "…" : String(lowStock.data?.length ?? 0)}
                icon={AlertTriangle}
                accent="warning"
              />
            </Link>
          ) : (
            <StatCard
              label="Kitchen queue"
              value={String(data.kitchenQueue.new + data.kitchenQueue.accepted + data.kitchenQueue.preparing)}
              icon={Flame}
              accent="warning"
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TrendChart
          title="Revenue — last 14 days"
          icon={TrendingUp}
          data={trends?.revenue ?? []}
          valueKey="amount"
          color="var(--success)"
          valueFormatter={(v) => formatCurrency(v)}
          isLoading={trendsLoading}
          emptyMessage="No paid orders in the last 14 days yet."
        />
        <TrendChart
          title="Food waste cost — last 14 days"
          icon={Trash2}
          data={trends?.waste ?? []}
          valueKey="cost"
          color="var(--warning)"
          valueFormatter={(v) => formatCurrency(v)}
          isLoading={trendsLoading}
          emptyMessage="No waste logged in the last 14 days — nice."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="flex items-center gap-2 text-[18px] font-medium text-foreground">
            <Timer className="h-[18px] w-[18px] text-muted-foreground" />
            Recent transactions
          </h2>
          <div className="flex flex-col divide-y divide-border">
            {data?.recentOrders.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">No sales yet today.</p>
            )}
            {data?.recentOrders.map((order) => {
              const isOnline = ONLINE_ORDER_TYPES.has(order.type);
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setViewingOrderId(order.id)}
                  className="flex items-center justify-between py-2.5 text-left text-sm transition hover:opacity-80"
                  title="View order details"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">#{order.orderNumber}</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "mt-0.5 w-fit text-[11px] font-normal",
                        isOnline && "bg-primary/10 text-primary",
                      )}
                    >
                      {order.type.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium tabular-nums text-foreground">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    <RefundDialog
                      branchId={branchId}
                      orderId={order.id}
                      orderNumber={order.orderNumber}
                      maxAmount={Number(order.totalAmount)}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-6">
          <h2 className="flex items-center gap-2 text-[18px] font-medium text-foreground">
            <ReceiptText className="h-[18px] w-[18px] text-muted-foreground" />
            Order channels
          </h2>
          <p className="text-xs text-muted-foreground">Today, self-serve vs staff-entered</p>
          {data && (
            <>
              <div className="flex items-center justify-between py-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" />
                  Online (QR / kiosk)
                </div>
                <span className="font-medium tabular-nums text-foreground">
                  {data.channels.online}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Store className="h-3.5 w-3.5" />
                  Offline (dine-in / takeaway / phone)
                </div>
                <span className="font-medium tabular-nums text-foreground">
                  {data.channels.offline}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${
                      data.channels.online + data.channels.offline === 0
                        ? 0
                        : (data.channels.online / (data.channels.online + data.channels.offline)) * 100
                    }%`,
                  }}
                />
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

// Online orders waiting for a decision — shown on top so they can't be missed.
function PendingOrdersBanner({ branchId }: { branchId: string | null }) {
  const { data } = useManagedOrders(branchId, "pending");
  if (!data || data.length === 0) return null;
  return (
    <Card className="flex flex-col gap-3 border-primary/40 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-foreground">
          {data.length} online order{data.length === 1 ? "" : "s"} waiting for you
        </p>
        <p className="text-xs text-muted-foreground">Accept or reject so the kitchen can start.</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => openEntity("Order", data[0].id)}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Review #{data[0].orderNumber}
        </button>
        <Link href="/orders" className="rounded-lg border border-border px-3 py-1.5 text-sm">
          All orders
        </Link>
      </div>
    </Card>
  );
}
