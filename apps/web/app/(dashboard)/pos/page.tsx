"use client";

import { ChevronLeft, MonitorSmartphone, ShoppingCart } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { StatusNote, useNoteToast } from "@/components/ui/status-note";
import { publishDisplay } from "@/lib/customer-display";
import { BranchNotice } from "@/components/layout/branch-notice";
import { CartPanel, type DeliveryDetails, type PosOrderType } from "@/components/pos/cart-panel";
import { cartLineKey, isDrinkCategory, portionText, SPICE_CHOICES, type CartLine, type Portion, type SpiceChoice } from "@/components/pos/cart-line";
import { clearDraft, switchTableDraft, type Drafts } from "@/lib/pos-drafts";
import { CheckoutPanel } from "@/components/pos/checkout-panel";
import { KitchenProgressWidget } from "@/components/pos/kitchen-progress-widget";
import { ModifierPickerDialog } from "@/components/pos/modifier-picker-dialog";
import { PosTablePicker } from "@/components/pos/pos-table-picker";
import { PosTableRail } from "@/components/pos/pos-table-rail";
import { ProductGrid } from "@/components/pos/product-grid";
import { Card } from "@/components/ui/card";
import { useBranch } from "@/hooks/use-branch";
import { useCurrentUser } from "@/hooks/use-auth";
import { useStoreStatus } from "@/hooks/use-store-status";
import type { MenuItem } from "@/hooks/use-menu";
import {
  useAddOrderItems,
  useBranchStaff,
  useCreateOrder,
  useOrder,
  useOpenOrdersForTable,
  type CreatedOrder,
  type OpenOrder,
} from "@/hooks/use-orders";
import { useFloors, type RestaurantTable } from "@/hooks/use-tables";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function PosPage() {
  return (
    <Suspense fallback={null}>
      <PosPageInner />
    </Suspense>
  );
}

function PosPageInner() {
  const router = useRouter();
  const { branchId, currency, isLoading: branchLoading } = useBranch();
  const { note, clear: clearNote, toast } = useNoteToast();
  const floorsQuery = useFloors(branchId);
  const storeStatus = useStoreStatus(branchId);
  const branchStaffQuery = useBranchStaff(branchId);
  const currentUserQuery = useCurrentUser();
  const floors = floorsQuery.data;
  const tables = floors?.flatMap((f) => f.tables) ?? [];
  const searchParams = useSearchParams();
  const preselectedTableId = searchParams.get("tableId") ?? "";
  const preselectedOrderId = searchParams.get("orderId") ?? "";
  const openPaymentForOrder = searchParams.get("action") === "payment";
  const targetOrderQuery = useOrder(branchId, preselectedOrderId || null);
  const targetOrder = targetOrderQuery.data;

  const [lines, setLines] = useState<CartLine[]>([]);
  const [orderType, setOrderType] = useState<PosOrderType>("DINE_IN");
  const [delivery, setDelivery] = useState<DeliveryDetails>({ address: "", pincode: "", phone: "" });
  const [scheduledFor, setScheduledFor] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<OpenOrder["customer"]>(null);
  const [orderNotes, setOrderNotes] = useState("");
  const [assignedServerId, setAssignedServerId] = useState("");
  const [tableId, setTableIdRaw] = useState(preselectedTableId);
  // Unsent cart per table, so switching tables never moves or loses items.
  const [drafts, setDrafts] = useState<Drafts<CartLine>>({});
  const setTableId = (next: string) => {
    if (next === tableId) return;
    const r = switchTableDraft(drafts, tableId, next, lines);
    setDrafts(r.drafts);
    setLines(r.lines);
    setSelectedBillId(null);
    setTableIdRaw(next);
  };
  const [selectedBillId, setSelectedBillId] = useState<string | null>(preselectedOrderId || null);
  const [pickerItem, setPickerItem] = useState<MenuItem | null>(null);
  const [activeOrder, setActiveOrder] = useState<CreatedOrder | null>(null);
  const [activeCustomer, setActiveCustomer] = useState<OpenOrder["customer"]>(null);
  // /pos?tableId=... can change while this page stays mounted.
  const [seenPreselected, setSeenPreselected] = useState(preselectedTableId);
  if (preselectedTableId !== seenPreselected) {
    setSeenPreselected(preselectedTableId);
    if (preselectedTableId && !activeOrder) setTableId(preselectedTableId);
  }
  useEffect(() => {
    if (!targetOrder || targetOrder.id !== preselectedOrderId || targetOrder.status !== "OPEN") return;
    setOrderType(targetOrder.type as PosOrderType);
    setTableIdRaw(targetOrder.tableId ?? "");
    setSelectedBillId(targetOrder.id);
    setGuestName(targetOrder.guestName ?? "");
    setGuestCount(targetOrder.guestCount ?? 1);
    setSelectedCustomer(targetOrder.customer);
    setOrderNotes(targetOrder.notes ?? "");
    setAssignedServerId(targetOrder.assignedServer?.id ?? "");
    if (openPaymentForOrder) {
      setActiveCustomer(targetOrder.customer);
      setActiveOrder({
        id: targetOrder.id,
        orderNumber: targetOrder.orderNumber,
        subtotal: targetOrder.subtotal,
        taxAmount: targetOrder.taxAmount,
        discountAmount: targetOrder.discountAmount,
        tipAmount: targetOrder.tipAmount,
        loyaltyPointsRedeemed: targetOrder.loyaltyPointsRedeemed,
        loyaltyDiscountAmount: targetOrder.loyaltyDiscountAmount,
        totalAmount: targetOrder.totalAmount,
        deliveryFee: targetOrder.deliveryFee,
        status: targetOrder.status,
        payments: targetOrder.payments.map((payment) => ({
          method: payment.method,
          amount: payment.amount,
          tendered: payment.tendered,
          changeGiven: payment.changeGiven,
        })),
      });
      setCartOpen(true);
    }
  }, [targetOrder, preselectedOrderId, openPaymentForOrder]);
  // Phones show the menu full-screen and the cart/checkout as an overlay; from
  // lg up both sit side by side and this flag is ignored.
  const [cartOpen, setCartOpen] = useState(false);

  // Mirror the cart to the customer-facing display (/customer-display).
  useEffect(() => {
    if (activeOrder) return;
    publishDisplay(
      lines.length === 0
        ? { kind: "idle" }
        : {
            kind: "cart",
            lines: lines.map((l) => ({
              name: l.modifierLabel ? `${l.name} (${l.modifierLabel})` : l.name,
              quantity: l.quantity,
              total: l.unitPrice * l.quantity,
            })),
            subtotal: lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
            currency,
          },
    );
  }, [lines, activeOrder, currency]);

  const createOrder = useCreateOrder(branchId);
  const addOrderItems = useAddOrderItems(branchId);
  const openBillsQuery = useOpenOrdersForTable(
    branchId,
    orderType === "DINE_IN" ? tableId || null : null,
  );
  const existingOrders = openBillsQuery.data;
  const directOpenOrder: OpenOrder | undefined =
    targetOrder?.id === preselectedOrderId && targetOrder.status === "OPEN"
      ? {
          id: targetOrder.id,
          orderNumber: targetOrder.orderNumber,
          type: targetOrder.type,
          tableId: targetOrder.tableId,
          subtotal: targetOrder.subtotal,
          taxAmount: targetOrder.taxAmount,
          discountAmount: targetOrder.discountAmount,
          tipAmount: targetOrder.tipAmount,
          loyaltyPointsRedeemed: targetOrder.loyaltyPointsRedeemed,
          loyaltyDiscountAmount: targetOrder.loyaltyDiscountAmount,
          guestCount: targetOrder.guestCount,
          totalAmount: targetOrder.totalAmount,
          status: targetOrder.status,
          customer: targetOrder.customer,
          assignedServer: targetOrder.assignedServer,
        }
      : undefined;
  // A table can carry several open bills; the user picks which one gets the
  // new items (default: the newest). Until the table's bills are loaded we do
  // not know whether this is a new bill or a new round, so submitting waits.
  const checkingTable =
    orderType === "DINE_IN" && !!tableId && (openBillsQuery.isPending || openBillsQuery.isFetching);
  const targetOrderUnavailable =
    !!preselectedOrderId &&
    !!branchId &&
    !targetOrderQuery.isLoading &&
    (!targetOrder || targetOrder.id !== preselectedOrderId || targetOrder.status !== "OPEN");
  const checkingTargetOrder = !!preselectedOrderId && (!branchId || targetOrderQuery.isLoading);
  const existingOrder = preselectedOrderId
    ? directOpenOrder
    : existingOrders?.find((o) => o.id === selectedBillId) ?? existingOrders?.[0];

  const addLine = (
    menuItemId: string,
    name: string,
    unitPrice: number,
    modifierIds: string[],
    modifierLabel: string,
    portion?: Portion,
    askSpice = false,
    spiceChoice?: SpiceChoice,
    imageUrl?: string | null,
  ) => {
    const key = cartLineKey(menuItemId, modifierIds, portion, spiceChoice);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { key, menuItemId, name, imageUrl, unitPrice, quantity: 1, modifierIds, modifierLabel, askSpice, spiceChoice, portion }];
    });
  };

  const handleSelect = (item: MenuItem) => {
    if (item.modifierGroups.length > 0 || item.halfPrice != null) {
      setPickerItem(item);
      return;
    }
    addLine(item.id, item.name, Number(item.price), [], "", undefined, !isDrinkCategory(item.category.name), undefined, item.imageUrl);
  };

  const handleModifierConfirm = (modifierIds: string[], modifierLabel: string, portion?: Portion) => {
    if (!pickerItem) return;
    const modifierTotal = modifierIds.reduce((sum, id) => {
      const mod = pickerItem.modifierGroups
        .flatMap((g) => g.modifierGroup.modifiers)
        .find((m) => m.id === id);
      return sum + (mod ? Number(mod.priceAdjustment) : 0);
    }, 0);
    const base =
      portion?.customPrice ??
      (portion?.kind === "HALF" ? Number(pickerItem.halfPrice) : Number(pickerItem.price));
    const hasSpiceGroup = pickerItem.modifierGroups.some(({ modifierGroup }) => /spice|heat|hotness/i.test(modifierGroup.name));
    addLine(
      pickerItem.id,
      portion ? `${pickerItem.name} (${portionText(portion)})` : pickerItem.name,
      base + modifierTotal,
      modifierIds,
      modifierLabel,
      portion,
      !isDrinkCategory(pickerItem.category.name) && !hasSpiceGroup,
      undefined,
      pickerItem.imageUrl,
    );
  };

  const updateQuantity = (key: string, delta: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  };

  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const removeOneFromMenuItem = (menuItemId: string) => {
    const lastMatchingLine = [...lines].reverse().find((line) => line.menuItemId === menuItemId);
    if (lastMatchingLine) updateQuantity(lastMatchingLine.key, -1);
  };

  const handleSubmit = () => {
    if (checkingTable) return;
    const sentTableId = tableId;
    const items = lines.map((l) => {
      const spiceLabel = SPICE_CHOICES.find((choice) => choice.value === l.spiceChoice)?.label;
      const kitchenNote = [spiceLabel ? `Spice: ${spiceLabel}` : "", l.kitchenNote?.trim() ?? ""]
        .filter(Boolean)
        .join(" · ");
      return {
        menuItemId: l.menuItemId,
        quantity: l.quantity,
        modifierIds: l.modifierIds,
        ...(kitchenNote ? { kitchenNote } : {}),
        ...(l.portion
          ? {
              portion: l.portion.kind,
              customPrice: l.portion.customPrice,
              ...(l.portion.kind === "CUSTOM" ? { customLabel: l.portion.customLabel } : {}),
            }
          : {}),
      };
    });

    if (existingOrder) {
      addOrderItems.mutate(
        { orderId: existingOrder.id, dto: { items } },
        {
          onSuccess: (order) => {
            setDrafts((d) => clearDraft(d, sentTableId));
            setActiveCustomer(existingOrder.customer);
            setActiveOrder(order);
            toast.success(`Added to order #${order.orderNumber} — sent to kitchen`);
          },
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not add items"),
        },
      );
      return;
    }

    createOrder.mutate(
      {
        type: orderType,
        deferKitchen: true,
        tableId: orderType === "DINE_IN" ? tableId : undefined,
        ...(orderType === "DELIVERY" ? { delivery } : {}),
        ...(guestName.trim() ? { guestName: guestName.trim() } : {}),
        ...(selectedCustomer ? { customerId: selectedCustomer.id } : {}),
        ...(orderType === "DINE_IN" ? { guestCount } : {}),
        ...(orderNotes.trim() ? { notes: orderNotes.trim() } : {}),
        ...(assignedServerId ? { assignedServerId } : {}),
        ...(orderType !== "DINE_IN" && scheduledFor
          ? { scheduledFor: new Date(scheduledFor).toISOString() }
          : {}),
        items,
      },
      {
        onSuccess: (order) => {
          setDrafts((d) => clearDraft(d, sentTableId));
          setActiveCustomer(selectedCustomer);
          setActiveOrder(order);
          setCartOpen(true);
          toast.success(`Order #${order.orderNumber} confirmed. Send it to the kitchen when ready.`);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not create order"),
      },
    );
  };

  const viewExistingOrder = () => {
    if (existingOrder) {
      setActiveCustomer(existingOrder.customer);
      setActiveOrder(existingOrder);
      setCartOpen(true);
    }
  };

  const resetForNewOrder = () => {
    if (preselectedOrderId) {
      router.replace("/orders");
      return;
    }
    setActiveOrder(null);
    setCartOpen(false);
    // The sent cart is gone; other tables' unsent drafts stay.
    setDrafts((draftState) => clearDraft(draftState, tableId));
    setLines([]);
    setSelectedBillId(null);
    setTableIdRaw("");
    setActiveCustomer(null);
    setDelivery({ address: "", pincode: "", phone: "" });
    setScheduledFor("");
    setGuestName("");
    setGuestCount(1);
    setSelectedCustomer(null);
    setOrderNotes("");
    setAssignedServerId("");
  };

  const handleTablePick = (table: RestaurantTable) => setTableId(table.id);

  // Click-to-order: for a fresh dine-in ticket, land on a visual table grid
  // first — the rest of the flow (menu, cart, bill-or-add-more) is
  // unchanged once a table's picked. Takeaway orders and orders already
  // mid-flow (tableId set, or viewing/paying an order) skip straight past
  // it, same as arriving here from the Tables page's own "New order" link
  // (?tableId=... pre-fills this and never shows the picker).
  const showTablePicker = orderType === "DINE_IN" && !tableId && !activeOrder;

  return (
    <div className="flex min-h-[calc(100dvh-11rem)] flex-col gap-4">
      <StatusNote note={note} onClear={clearNote} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Dogar&apos;s Fire &amp; Flavour · Point of sale</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[30px]">Quick order</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose the dishes, confirm with your guest, then send the ticket to the kitchen.</p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <KitchenProgressWidget branchId={branchId} />
          <a
            href="/customer-display"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            title="Opens the customer-facing screen in a new window — drag it to the second monitor"
          >
            <MonitorSmartphone className="h-3.5 w-3.5" />
            Customer display
          </a>
        </div>
      </div>

      <BranchNotice />
      {targetOrderUnavailable && (
        <Card className="border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground" role="alert">
          This bill is no longer open or is unavailable. Return to Orders and refresh before making changes.
        </Card>
      )}
      {storeStatus.data && !storeStatus.data.isStoreOpen && (
        <Card className="border-warning/30 bg-warning/5 p-3 text-sm text-foreground">
          <p className="font-medium">{storeStatus.data.name} is closed to new orders</p>
          <p className="mt-1 text-xs text-muted-foreground">You can still open, prepare, and take payment for existing orders. Your unsent cart will remain here.</p>
        </Card>
      )}

      {showTablePicker && (
        <Card className="flex-1 overflow-hidden p-5 xl:hidden">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Choose a table</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">For takeaway or delivery, choose an order type to continue.</p>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Start order type">
              {([
                ["DINE_IN", "Dine-in"],
                ["TAKEAWAY", "Takeaway"],
                ["DELIVERY", "Delivery"],
              ] as const).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={orderType === type}
                  onClick={() => setOrderType(type)}
                  className={cn(
                    "min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    orderType === type
                      ? "border-primary bg-gradient-to-r from-[#FE8C00] to-[#FF3B00] text-white"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <PosTablePicker
            floors={floors ?? []}
            onSelect={handleTablePick}
            isLoading={floorsQuery.isLoading || branchLoading}
            error={floorsQuery.isError ? floorsQuery.error : null}
            onRetry={() => void floorsQuery.refetch()}
            retrying={floorsQuery.isFetching}
          />
        </Card>
      )}

      <div className={cn(
        "grid min-h-[520px] flex-1 grid-cols-1 gap-4 overflow-visible lg:h-[calc(100dvh-19rem)] lg:overflow-hidden lg:flex-none",
        showTablePicker && "hidden xl:grid",
        orderType === "DINE_IN"
          ? "lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_64px_340px] 2xl:grid-cols-[minmax(0,1fr)_72px_370px]"
          : "lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_370px]",
      )}>
          <Card className="min-h-0 overflow-hidden border-0 bg-transparent p-0 shadow-none">
            {showTablePicker ? (
              <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-border bg-card/45 px-6 text-center">
                <span className="text-4xl" aria-hidden="true">🍽️</span>
                <h2 className="mt-3 text-lg font-semibold text-foreground">Choose a table to start</h2>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">Pick a table from the rail. The menu and order details will open here.</p>
              </div>
            ) : (
              <ProductGrid
                branchId={branchId}
                onSelect={handleSelect}
                quantityForItem={(itemId) => lines.reduce((sum, line) => sum + (line.menuItemId === itemId ? line.quantity : 0), 0)}
                onRemoveOne={removeOneFromMenuItem}
              />
            )}
          </Card>

          {orderType === "DINE_IN" && (
            <PosTableRail
              floors={floors ?? []}
              selectedTableId={tableId}
              onSelect={handleTablePick}
              isLoading={floorsQuery.isLoading || branchLoading}
              error={floorsQuery.isError ? floorsQuery.error : null}
              onRetry={() => void floorsQuery.refetch()}
              retrying={floorsQuery.isFetching}
            />
          )}

          <Card
            className={cn(
              "min-h-0 overflow-hidden rounded-[1.5rem] border-border bg-card p-3 shadow-sm sm:p-3.5",
              cartOpen
                ? "max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:rounded-none max-lg:p-4 max-lg:pt-[max(1rem,env(safe-area-inset-top))] max-lg:pb-[max(1rem,env(safe-area-inset-bottom))]"
                : "max-lg:hidden",
            )}
          >
            <button
              type="button"
              onClick={() => setCartOpen(false)}
              className="mb-3 -ml-1 flex items-center gap-1 text-sm font-medium text-muted-foreground lg:hidden"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to menu
            </button>
            {activeOrder ? (
              <CheckoutPanel
                order={activeOrder}
                branchId={branchId}
                initialCustomer={activeCustomer}
                onDone={resetForNewOrder}
              />
            ) : (
              <CartPanel
                branchId={branchId}
                customer={selectedCustomer}
                onCustomerChange={(customer) => {
                  setSelectedCustomer(customer);
                  if (customer) setGuestName(customer.name ?? customer.phone ?? "");
                }}
                lines={lines}
                orderType={orderType}
                onOrderTypeChange={setOrderType}
                tables={tables}
                tableId={tableId}
                onTableChange={setTableId}
                guestCount={existingOrder?.guestCount ?? guestCount}
                onGuestCountChange={setGuestCount}
                guestCountLocked={!!existingOrder}
                onIncrement={(key) => updateQuantity(key, 1)}
                onDecrement={(key) => updateQuantity(key, -1)}
                onRemove={removeLine}
                onKitchenNoteChange={(key, kitchenNote) => setLines((prev) => prev.map((line) => line.key === key ? { ...line, kitchenNote } : line))}
                onSpiceChange={(key, spiceChoice) => setLines((prev) => prev.map((line) => line.key === key ? {
                  ...line,
                  spiceChoice,
                  key: cartLineKey(line.menuItemId, line.modifierIds, line.portion, spiceChoice),
                } : line))}
                onSubmit={handleSubmit}
                onReset={resetForNewOrder}
                isSubmitting={createOrder.isPending || addOrderItems.isPending}
                storeIsOpen={storeStatus.data?.isStoreOpen ?? true}
                existingOrderNumber={existingOrder?.orderNumber}
                onViewExistingOrder={existingOrder ? viewExistingOrder : undefined}
                openBills={existingOrders?.map((o) => ({ id: o.id, orderNumber: o.orderNumber }))}
                selectedBillId={existingOrder?.id ?? null}
                onSelectBill={setSelectedBillId}
                checkingTable={checkingTable || checkingTargetOrder || targetOrderUnavailable}
                delivery={delivery}
                onDeliveryChange={setDelivery}
                scheduledFor={scheduledFor}
                onScheduledForChange={setScheduledFor}
                guestName={guestName}
                onGuestNameChange={setGuestName}
                orderNotes={orderNotes}
                onOrderNotesChange={setOrderNotes}
                staff={branchStaffQuery.data ?? []}
                assignedServerId={assignedServerId || (branchStaffQuery.data?.some((member) => member.id === currentUserQuery.data?.user.id) ? currentUserQuery.data?.user.id ?? "" : "")}
                currentUserId={currentUserQuery.data?.user.id ?? ""}
                onAssignedServerChange={setAssignedServerId}
              />
            )}
          </Card>
        </div>

      {!showTablePicker && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className={cn(
            "fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex h-14 items-center justify-between rounded-2xl px-4 shadow-lg transition-all active:scale-[0.98] lg:hidden",
            lines.length > 0 || activeOrder || existingOrder
              ? "bg-primary text-primary-foreground"
              : "border border-border/80 bg-card/95 text-foreground backdrop-blur",
          )}
          style={lines.length > 0 || activeOrder || existingOrder ? { backgroundImage: "var(--gradient-primary)" } : undefined}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingCart className="h-5 w-5" />
            {activeOrder
              ? `Order #${activeOrder.orderNumber} — pay`
              : lines.length > 0
                ? `View cart · ${lines.reduce((n, l) => n + l.quantity, 0)} items`
                : existingOrder
                  ? `Open bill #${existingOrder.orderNumber} — view`
                  : orderType === "DINE_IN"
                    ? `Table ${tables.find((t) => t.id === tableId)?.name ?? `T-${tables.find((t) => t.id === tableId)?.number ?? "?"}`} · Cart`
                    : `${orderType === "TAKEAWAY" ? "Takeaway" : "Delivery"} · Cart`}
          </span>
          <span className="text-xs font-medium text-muted-foreground sm:text-sm">
            {!activeOrder && lines.length > 0 ? (
              <span className="font-semibold tabular-nums text-white">
                {formatCurrency(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0))}
              </span>
            ) : (
              "0 items · Details →"
            )}
          </span>
        </button>
      )}

      <ModifierPickerDialog
        item={pickerItem}
        open={!!pickerItem}
        onOpenChange={(open) => !open && setPickerItem(null)}
        onConfirm={handleModifierConfirm}
        allowCustom
      />
    </div>
  );
}
