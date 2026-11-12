"use client";

import { Minus, Plus, RotateCcw, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SPICE_CHOICES, type CartLine, type SpiceChoice } from "@/components/pos/cart-line";
import { menuFoodTile } from "@/components/menu/food-image";
import type { RestaurantTable } from "@/hooks/use-tables";
import { CustomerPicker } from "@/components/pos/customer-picker";
import type { Customer } from "@/hooks/use-customers";
import { formatCurrency } from "@/lib/format";
import { subtotalOf } from "@/lib/pricing-preview";
import { cn } from "@/lib/utils";
import { useState } from "react";

export type PosOrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export interface DeliveryDetails {
  address: string;
  pincode: string;
  phone: string;
}

export function CartPanel({
  branchId,
  customer,
  onCustomerChange,
  lines,
  orderType,
  onOrderTypeChange,
  tables,
  tableId,
  onTableChange,
  guestCount,
  onGuestCountChange,
  guestCountLocked = false,
  onIncrement,
  onDecrement,
  onRemove,
  onKitchenNoteChange,
  onSpiceChange,
  onSubmit,
  onReset,
  isSubmitting,
  storeIsOpen,
  existingOrderNumber,
  onViewExistingOrder,
  openBills,
  selectedBillId,
  onSelectBill,
  checkingTable = false,
  delivery,
  onDeliveryChange,
  scheduledFor,
  onScheduledForChange,
  guestName,
  onGuestNameChange,
  orderNotes,
  onOrderNotesChange,
  staff,
  assignedServerId,
  currentUserId,
  onAssignedServerChange,
}: {
  branchId: string | null;
  customer: Customer | null;
  onCustomerChange: (customer: Customer | null) => void;
  lines: CartLine[];
  orderType: PosOrderType;
  onOrderTypeChange: (type: PosOrderType) => void;
  tables: RestaurantTable[];
  tableId: string;
  onTableChange: (id: string) => void;
  guestCount: number;
  onGuestCountChange: (count: number) => void;
  guestCountLocked?: boolean;
  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
  onRemove: (key: string) => void;
  onKitchenNoteChange: (key: string, note: string) => void;
  onSpiceChange: (key: string, spiceChoice: SpiceChoice) => void;
  onSubmit: () => void;
  onReset: () => void;
  isSubmitting: boolean;
  storeIsOpen: boolean;
  existingOrderNumber?: string;
  onViewExistingOrder?: () => void;
  /** All unpaid bills on the selected table (more than one is possible). */
  openBills?: { id: string; orderNumber: string }[];
  selectedBillId?: string | null;
  onSelectBill?: (id: string) => void;
  /** The table's open bills are still loading - sending now could start a duplicate bill. */
  checkingTable?: boolean;
  delivery: DeliveryDetails;
  onDeliveryChange: (d: DeliveryDetails) => void;
  scheduledFor: string;
  onScheduledForChange: (v: string) => void;
  guestName: string;
  onGuestNameChange: (v: string) => void;
  orderNotes: string;
  onOrderNotesChange: (v: string) => void;
  staff: { id: string; name: string; role: { label: string } }[];
  assignedServerId: string;
  currentUserId: string;
  onAssignedServerChange: (v: string) => void;
}) {
  const [step, setStep] = useState<"items" | "spice" | "review">("items");
  const spiceLines = lines.filter((line) => line.askSpice);
  const spiceChoicesComplete = spiceLines.every((line) => !!line.spiceChoice);
  const hasMissingSpiceChoice = lines.some((line) => line.askSpice && !line.spiceChoice);
  const subtotal = subtotalOf(lines.map((l) => l.unitPrice * l.quantity));
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const flowSteps = spiceLines.length > 0
    ? [{ key: "items", label: "Items" }, { key: "spice", label: "Spice" }, { key: "review", label: "Confirm" }]
    : [{ key: "items", label: "Items" }, { key: "review", label: "Confirm" }];
  const deliveryReady =
    orderType !== "DELIVERY" ||
    (delivery.address.trim().length >= 5 && delivery.pincode.trim().length >= 3 && delivery.phone.trim().length >= 6);
  const canSubmit =
    lines.length > 0 &&
    (orderType !== "DINE_IN" || !!tableId) &&
    deliveryReady &&
    !isSubmitting &&
    !checkingTable &&
    (storeIsOpen || !!existingOrderNumber);
  const isNewOrderBlocked = !storeIsOpen && !existingOrderNumber;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-1 pt-1">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Dogar&apos;s Fire &amp; Flavour</p>
          <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">Your order</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {lines.length > 0 && <button type="button" onClick={onReset} className="inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-muted-foreground hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset order</button>}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
            <ShoppingCart className="h-3.5 w-3.5 text-primary" aria-hidden /> {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      {!existingOrderNumber && (
        <div className="rounded-2xl border border-border/80 bg-background/50 p-3 shadow-sm">
          <CustomerPicker branchId={branchId} customer={customer} onSelect={onCustomerChange} />
        </div>
      )}

      {lines.length > 0 && (
        <div className="flex items-center gap-1" role="group" aria-label="Order steps">
          {flowSteps.map((flowStep, index) => (
            <div key={flowStep.key} className={cn(
              "flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[10px] font-semibold",
              step === flowStep.key ? "bg-card text-primary" : "bg-card/70 text-muted-foreground",
            )} aria-current={step === flowStep.key ? "step" : undefined}>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-background text-[9px] tabular-nums">{index + 1}</span>
              {flowStep.label}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/50 p-3 shadow-sm">
        <Tabs value={orderType} onValueChange={(v) => onOrderTypeChange(v as PosOrderType)}>
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-card/70 p-1">
          <TabsTrigger value="DINE_IN" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
            Dine-in
          </TabsTrigger>
          <TabsTrigger value="TAKEAWAY" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
            Takeaway
          </TabsTrigger>
          <TabsTrigger value="DELIVERY" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
            Delivery
          </TabsTrigger>
          </TabsList>
        </Tabs>

      {orderType === "DINE_IN" && (
        <>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex min-w-0 flex-col gap-1.5 text-[11px] font-medium text-muted-foreground">
            Table number
            <Select value={tableId} onValueChange={(v) => onTableChange(v ?? "")}>
              <SelectTrigger className="h-10 w-full rounded-xl border-border/80 bg-background text-sm text-foreground">
                <SelectValue placeholder="Select table">
                  {(value: string | null) => {
                    const t = tables.find((table) => table.id === value);
                    if (!t) return "Select table";
                    return `${t.name ?? `Table ${t.number}`}${t.status === "OCCUPIED" ? " (occupied)" : ""}`;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tables.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name ?? `Table ${t.number}`} {t.status === "OCCUPIED" ? "(occupied)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="flex min-w-0 flex-col gap-1.5 text-[11px] font-medium text-muted-foreground">
            Guests
            <div className="flex h-10 items-center justify-between rounded-xl border border-border/80 bg-background px-1.5">
              <button type="button" disabled={guestCountLocked || guestCount <= 1} onClick={() => onGuestCountChange(Math.max(1, guestCount - 1))} aria-label="Remove one guest" className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Minus className="h-3.5 w-3.5" aria-hidden />
              </button>
              <span className="min-w-7 text-center text-sm font-semibold tabular-nums text-foreground" aria-live="polite">{guestCount}</span>
              <button type="button" disabled={guestCountLocked || guestCount >= 100} onClick={() => onGuestCountChange(Math.min(100, guestCount + 1))} aria-label="Add one guest" className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Plus className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
        <label className="flex min-w-0 flex-col gap-1.5 text-[11px] font-medium text-muted-foreground">
          Customer name
          <Input
            value={guestName}
            onChange={(event) => onGuestNameChange(event.target.value)}
            maxLength={60}
            placeholder="Walk-in guest"
            className="h-10 rounded-xl border-border/80 bg-background text-sm"
          />
        </label>
        </>
      )}

      {orderType !== "DINE_IN" && (
        <label className="flex flex-col gap-1.5 text-[11px] font-medium text-muted-foreground">
          Customer name
          <Input
            value={guestName}
            onChange={(event) => onGuestNameChange(event.target.value)}
            maxLength={60}
            placeholder="Walk-in guest"
            className="h-10 rounded-xl border-border/80 bg-background text-sm"
          />
        </label>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <label className="flex min-w-0 flex-col gap-1.5 text-[11px] font-medium text-muted-foreground">
          Serving this order
          <Select value={assignedServerId} onValueChange={(value) => onAssignedServerChange(value ?? "")}>
            <SelectTrigger className="h-10 w-full rounded-xl border-border/80 bg-background text-sm text-foreground">
              <SelectValue placeholder="Choose staff">
                {(value: string | null) => {
                  if (!value) return "Choose staff";
                  const member = staff.find((candidate) => candidate.id === value);
                  if (!member) return "Staff unavailable";
                  return `${member.name}${member.id === currentUserId ? " · Me" : ""}`;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {staff.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}{member.id === currentUserId ? " · Me" : ""} · {member.role.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        {orderType !== "DINE_IN" ? (
          <label className="flex min-w-0 flex-col gap-1.5 text-[11px] font-medium text-muted-foreground">
            Date &amp; time
            <Input type="datetime-local" value={scheduledFor} onChange={(event) => onScheduledForChange(event.target.value)} className="h-10 min-w-0 rounded-xl border-border/80 bg-background px-2 text-xs text-foreground" />
          </label>
        ) : (
          <label className="flex min-w-0 flex-col gap-1.5 text-[11px] font-medium text-muted-foreground">
            Order note
            <Textarea
              value={orderNotes}
              onChange={(event) => onOrderNotesChange(event.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Optional instructions"
              className="min-h-12 rounded-xl border-border/80 bg-background px-2 py-1.5 text-xs"
            />
          </label>
        )}
      </div>

      {orderType !== "DINE_IN" && (
        <label className="flex flex-col gap-1.5 text-[11px] font-medium text-muted-foreground">
          Order note
          <Textarea value={orderNotes} onChange={(event) => onOrderNotesChange(event.target.value)} maxLength={500} rows={2} placeholder="Special instructions (optional)" className="min-h-12 rounded-xl border-border/80 bg-background px-2 py-1.5 text-xs" />
        </label>
      )}

      {orderType === "DELIVERY" && (
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Delivery address"
            value={delivery.address}
            onChange={(e) => onDeliveryChange({ ...delivery, address: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Pincode"
              inputMode="numeric"
              value={delivery.pincode}
              onChange={(e) => onDeliveryChange({ ...delivery, pincode: e.target.value })}
            />
            <Input
              placeholder="Phone"
              inputMode="tel"
              value={delivery.phone}
              onChange={(e) => onDeliveryChange({ ...delivery, phone: e.target.value })}
            />
          </div>
        </div>
      )}

      </div>

      {checkingTable && (
        <p role="status" className="rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
          Checking for an existing open bill…
        </p>
      )}
      {openBills && openBills.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" role="group" aria-label="Open bills on this table">
          <span>{openBills.length} open bills here — add to:</span>
          {openBills.map((b) => (
            <Button
              key={b.id}
              type="button"
              size="sm"
              variant={b.id === selectedBillId ? "default" : "outline"}
              className="h-7 px-2 text-xs"
              aria-pressed={b.id === selectedBillId}
              onClick={() => onSelectBill?.(b.id)}
            >
              #{b.orderNumber}
            </Button>
          ))}
        </div>
      )}
      {existingOrderNumber && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
          <span>
            This table already has open order{" "}
            <span className="font-medium text-foreground">#{existingOrderNumber}</span>
            {lines.length > 0 && " — these items will be added to it as a new round."}
          </span>
          {onViewExistingOrder && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 px-2 text-xs"
              onClick={onViewExistingOrder}
            >
              View & pay
            </Button>
          )}
        </div>
      )}

      {step === "review" ? (
        <div className="flex-1 overflow-y-auto rounded-xl border border-border p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground">Review order</h3>
              <p className="text-xs text-muted-foreground">Check the items and instructions with the customer before confirming.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setStep(spiceLines.length ? "spice" : "items")}>Edit</Button>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">{orderType.replace("_", " ")}{tableId ? ` · ${tables.find((table) => table.id === tableId)?.name ?? "Table"}` : ""}{guestName.trim() ? ` · ${guestName.trim()}` : ""}</p>
          <div className="divide-y divide-border">
            {lines.map((line) => <div key={line.key} className="py-2 text-sm"><div className="flex justify-between gap-3"><span>{line.quantity} × {line.name}</span><span>{formatCurrency(line.unitPrice * line.quantity)}</span></div>{line.modifierLabel && <p className="text-xs text-muted-foreground">{line.modifierLabel}</p>}{line.spiceChoice && <p className="text-xs text-muted-foreground">Spice: {SPICE_CHOICES.find((choice) => choice.value === line.spiceChoice)?.label}</p>}{line.kitchenNote?.trim() && <p className="text-xs text-muted-foreground">Kitchen note: {line.kitchenNote.trim()}</p>}</div>)}
          </div>
          {orderNotes.trim() && <p className="mt-3 rounded-lg bg-secondary/60 p-2 text-xs">Note: {orderNotes.trim()}</p>}
          <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-semibold"><span>Total</span><span>{formatCurrency(subtotal)}</span></div>
        </div>
      ) : step === "spice" ? (
        <div className="flex-1 overflow-y-auto rounded-xl border border-border p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground">Choose spice levels</h3>
              <p className="text-xs text-muted-foreground">Ask the customer for each food item. Choose one level per item.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setStep("items")}>Back to menu</Button>
          </div>
          <div className="divide-y divide-border">
            {spiceLines.map((line) => (
              <div key={line.key} className="py-4">
                <div className="mb-3 flex justify-between gap-3 text-sm">
                  <span className="font-medium">{line.quantity} × {line.name}</span>
                  <span className="text-muted-foreground">{formatCurrency(line.unitPrice * line.quantity)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label={`Spice level for ${line.name}`}>
                  {SPICE_CHOICES.map((choice) => (
                    <button
                      key={choice.value}
                      type="button"
                      aria-pressed={line.spiceChoice === choice.value}
                      onClick={() => onSpiceChange(line.key, choice.value)}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${line.spiceChoice === choice.value ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-secondary"}`}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : <div className="flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <ShoppingCart className="h-8 w-8 opacity-40" />
            <p className="text-sm">Cart is empty</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {lines.map((line) => (
              <div key={line.key} className="flex items-start justify-between gap-2.5 rounded-xl bg-card px-2.5 py-2.5 shadow-[0_2px_7px_rgba(69,43,40,0.04)]">
                <div className="flex min-w-0 flex-1 gap-2.5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card">
                    {line.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- uploaded menu photos are served from the backend host.
                      <img src={line.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="h-full w-full bg-cover" style={menuFoodTile(line.name)} aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{line.name}</p>
                    {line.modifierLabel && (
                      <p className="truncate text-xs text-muted-foreground">{line.modifierLabel}</p>
                    )}
                    <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
                      {formatCurrency(line.unitPrice * line.quantity)}
                    </p>
                    <Input className="mt-2 h-8 rounded-lg border-border/70 bg-background text-xs" value={line.kitchenNote ?? ""}
                      placeholder="Kitchen note (optional)" aria-label={`Kitchen note for ${line.name}`} maxLength={240}
                      onChange={(event) => onKitchenNoteChange(line.key, event.target.value)} />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-full border border-border/80 bg-background p-0.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-full border-0 bg-transparent shadow-none hover:bg-accent"
                    aria-label={`Remove one ${line.name}`}
                    onClick={() => onDecrement(line.key)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-5 text-center text-sm font-semibold tabular-nums text-foreground">{line.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-full border-0 bg-transparent shadow-none hover:bg-accent"
                    aria-label={`Add one ${line.name}`}
                    onClick={() => onIncrement(line.key)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${line.name} from the order`}
                    onClick={() => onRemove(line.key)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}

      <div className="flex flex-col gap-3 border-t border-border/80 pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal (tax included)</span>
          <span className="font-bold tabular-nums text-foreground">
            {formatCurrency(subtotal)}
          </span>
        </div>
        <Button
          className="h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 font-semibold text-primary-foreground shadow-[0_6px_14px_rgba(251,113,133,0.22)] hover:brightness-105"
          disabled={!canSubmit || (step === "spice" && !spiceChoicesComplete)}
          onClick={() => {
            if (step === "items") setStep(spiceLines.length ? "spice" : "review");
            else if (step === "spice") setStep("review");
            else if (hasMissingSpiceChoice) setStep("spice");
            else onSubmit();
          }}
        >
          {isNewOrderBlocked
            ? "Store is closed"
            : isSubmitting
              ? existingOrderNumber ? "Sending to kitchen…" : "Saving order…"
              : step === "review"
                ? hasMissingSpiceChoice ? "Choose spice levels" : existingOrderNumber ? "Confirm & send to kitchen" : "Confirm order"
                : step === "spice"
                  ? "Next: review order"
                  : spiceLines.length
                    ? "Next: spice levels"
                    : existingOrderNumber ? "Review items to add" : "Review order"}
        </Button>
        {isNewOrderBlocked && (
          <p role="status" className="text-center text-xs text-muted-foreground">
            Reopen the store before confirming a new order. You can still finish existing bills.
          </p>
        )}
      </div>
    </div>
  );
}
