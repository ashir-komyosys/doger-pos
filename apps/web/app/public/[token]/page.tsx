import Link from "next/link";

import { BellRing, CheckCircle2, Leaf, Minus, Plus, UtensilsCrossed } from "lucide-react";
import { use, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ModifierPickerDialog } from "@/components/pos/modifier-picker-dialog";
import { PopBurst } from "@/components/order/pop-burst";
import { api, ApiError } from "@/lib/api";
import { playSuccessChime, vibrateSuccess } from "@/lib/celebrate";
import { formatCurrency } from "@/lib/format";
import { uuid } from "@/lib/uuid";
import type { PickerItem } from "@/components/pos/modifier-picker-dialog";

// One cart line = an item plus its chosen options.
interface CartLine {
  key: string;
  menuItemId: string;
  modifierIds: string[];
  label: string;
  unitPrice: number;
  quantity: number;
}

interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string;
  isVeg: boolean;
  modifierGroups: {
    modifierGroup: {
      id: string;
      name: string;
      minSelect: number;
      maxSelect: number;
      isRequired: boolean;
      modifiers: { id: string; name: string; priceAdjustment: string; isDefault: boolean }[];
    };
  }[];
}

interface PublicMenuCategory {
  id: string;
  name: string;
  items: PublicMenuItem[];
}

interface PublicMenuResponse {
  restaurantName: string;
  branchName: string;
  logoUrl: string | null;
  currency: string;
  isStoreOpen: boolean;
  categories: PublicMenuCategory[];
}

interface OrderResult {
  orderNumber: string;
  createdAt: string;
  currency: string;
  items: { name: string; quantity: number; lineTotal: string }[];
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  paid: false;
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

export default function PublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const nameStorageKey = `web-guest-name:${token}`;
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pickerItem, setPickerItem] = useState<PublicMenuItem | null>(null);
  const queryClient = useQueryClient();
  const [placed, setPlaced] = useState<OrderResult | null>(null);
  const [guestName, setGuestName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [orderType, setOrderType] = useState<"TAKEAWAY" | "DELIVERY">("TAKEAWAY");
  const [delivery, setDelivery] = useState({ address: "", pincode: "", phone: "" });

  useEffect(() => {
    const saved = sessionStorage.getItem(nameStorageKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setGuestName(saved);
  }, []);

  useEffect(() => {
    if (placed) {
      vibrateSuccess();
      playSuccessChime();
    }
  }, [placed]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-menu", token],
    queryFn: () => api.get<PublicMenuResponse>(`/public/${token}/menu`),
    retry: false,
  });

  const placeOrder = useMutation({
    mutationFn: () =>
      api.post<OrderResult>(`/public/${token}/order`, {
        clientRequestId: uuid(),
        guestName,
        type: orderType,
        ...(orderType === "DELIVERY" ? { delivery } : {}),
        items: cart.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          modifierIds: l.modifierIds,
        })),
      }),
    onSuccess: (order) => {
      setPlaced(order);
      setCart([]);
      sessionStorage.removeItem(nameStorageKey);
    },
  });

  const confirmName = () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    sessionStorage.setItem(nameStorageKey, trimmed);
    setGuestName(trimmed);
  };

  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);
  const cartTotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const quantityOfItem = (itemId: string) =>
    cart.filter((l) => l.menuItemId === itemId).reduce((sum, l) => sum + l.quantity, 0);

  const canSubmit =
    cart.length > 0 &&
    guestName.trim().length > 0 &&
    (orderType !== "DELIVERY" ||
      (delivery.address.trim().length >= 5 &&
        delivery.pincode.trim().length >= 3 &&
        delivery.phone.trim().length >= 6));

  const addLine = (item: PublicMenuItem, modifierIds: string[], label: string, extra: number) => {
    const key = `${item.id}:${[...modifierIds].sort().join(",")}`;
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      return [
        ...prev,
        { key, menuItemId: item.id, modifierIds, label, unitPrice: Number(item.price) + extra, quantity: 1 },
      ];
    });
  };

  const handleAdd = (item: PublicMenuItem) => {
    if (item.modifierGroups.length > 0) setPickerItem(item);
    else addLine(item, [], "", 0);
  };

  const removeOne = (itemId: string) =>
    setCart((prev) => {
      const idx = [...prev].reverse().findIndex((l) => l.menuItemId === itemId);
      if (idx < 0) return prev;
      const at = prev.length - 1 - idx;
      return prev
        .map((l, i) => (i === at ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0);
    });

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background px-6 text-center">
        <UtensilsCrossed className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium text-foreground">This menu isn&rsquo;t available right now</p>
        <p className="text-sm text-muted-foreground">
          {error instanceof ApiError ? error.message : "Please try again later."}
        </p>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <div className="relative flex h-10 w-10 items-center justify-center">
          <PopBurst />
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>
        <p className="text-lg font-medium text-foreground">
          Thank you, {placed.items.length > 0 ? guestName : ""}!
        </p>
        <p className="text-sm text-muted-foreground">
          Your order <strong>#{placed.orderNumber}</strong> has been sent to {data?.branchName}.
        </p>
        <p className="text-xs text-muted-foreground">
          We&rsquo;ll confirm when it&rsquo;s ready. Payment is taken at the counter (takeaway) or on delivery.
        </p>
        <Button variant="outline" className="mt-2" onClick={() => setPlaced(null)}>
          Order more
        </Button>
      </div>
    );
  }

  if (!guestName) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="absolute right-4 top-4">
          <Link href="/" className="text-xs text-muted-foreground underline">
            &larr; Back
          </Link>
        </div>
        {isLoading ? (
          <Skeleton className="h-7 w-40" />
        ) : (
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {data?.branchName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{data?.restaurantName}</p>
          </div>
        )}
        <form
          className="flex w-full max-w-xs flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            confirmName();
          }}
        >
          <div className="flex flex-col gap-2 text-left">
            <Label htmlFor="guest-name">Your name</Label>
            <Input
              id="guest-name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="e.g. Priya Sharma"
              autoFocus
              maxLength={60}
            />
          </div>
          <Button type="submit" className="h-11" disabled={!nameDraft.trim()}>
            Continue to menu
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background pb-24">
      <header className="border-b border-border px-5 py-6 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {data?.logoUrl && (
              <img src={data.logoUrl} alt="" className="h-8 w-8 rounded" />
            )}
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {data?.branchName}
              </h1>
              <p className="text-xs text-muted-foreground">{data?.restaurantName}</p>
            </div>
          </div>
          <Link href="/" className="text-xs text-muted-foreground underline">
            &larr; Back
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Browse the menu and place an order for {ORDER_TYPE_LABEL[orderType]}.
        </p>
        {data && !data.isStoreOpen && <p role="status" className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">This restaurant is currently closed and is not accepting orders.</p>}
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {data?.categories.map((category) => (
              <section key={category.id} className="flex flex-col gap-3">
                <h2 className="text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
                  {category.name}
                </h2>
                <div className="flex flex-col divide-y divide-border">
                  {category.items.map((item) => {
                    const quantity = quantityOfItem(item.id);
                    return (
                      <div key={item.id} className="flex items-start justify-between gap-4 py-3">
                        <div className="flex items-start gap-2">
                          <Leaf
                            className={`mt-1 h-3.5 w-3.5 shrink-0 ${item.isVeg ? "text-success" : "text-destructive"}`}
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.name}</p>
                            {item.description && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                            <span className="mt-1 block text-sm font-medium tabular-nums text-foreground">
                              {formatCurrency(Number(item.price), data.currency)}
                            </span>
                          </div>
                        </div>
                        {quantity > 0 ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => removeOne(item.id)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-5 text-center text-sm tabular-nums">{quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleAdd(item)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            disabled={!data?.isStoreOpen}
                            onClick={() => handleAdd(item)}
                          >
                            Add
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4 rounded-xl border border-border bg-secondary/30 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-sm font-medium">Order type</Label>
            <Select
              value={orderType}
              onValueChange={(v) => setOrderType(v as "TAKEAWAY" | "DELIVERY")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue>{ORDER_TYPE_LABEL[orderType]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TAKEAWAY">Takeaway</SelectItem>
                <SelectItem value="DELIVERY">Delivery</SelectItem>
              </SelectContent>
            </Select>
            {orderType === "DELIVERY" && (
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Delivery address"
                  value={delivery.address}
                  onChange={(e) => setDelivery({ ...delivery, address: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Pincode"
                    inputMode="numeric"
                    value={delivery.pincode}
                    onChange={(e) => setDelivery({ ...delivery, pincode: e.target.value })}
                  />
                  <Input
                    placeholder="Phone"
                    inputMode="tel"
                    value={delivery.phone}
                    onChange={(e) => setDelivery({ ...delivery, phone: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {cartCount > 0 && (
          <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background px-5 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
            <div className="mx-auto flex max-w-lg flex-col gap-3">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {formatCurrency(cartTotal, data?.currency)}
                </span>
              </div>
              <Button
                className="h-12 w-full"
                disabled={placeOrder.isPending || !canSubmit || !data?.isStoreOpen}
                onClick={() => placeOrder.mutate()}
              >
                {placeOrder.isPending
                  ? "Placing order…"
                  : !data?.isStoreOpen ? "Currently closed" : `${cartCount} item${cartCount > 1 ? "s" : ""} · Place order — ${formatCurrency(cartTotal, data?.currency)}`}
              </Button>
              {!canSubmit && (
                <p className="mx-auto mt-1 max-w-lg text-center text-xs text-destructive">
                  {orderType === "DELIVERY"
                    ? "Please enter your name, address, pincode and phone."
                    : "Please enter your name."}
                </p>
              )}
              {placeOrder.isError && (
                <p className="mx-auto mt-2 max-w-lg text-center text-xs text-destructive">
                  {placeOrder.error instanceof ApiError
                    ? placeOrder.error.message
                    : "Could not place order"}
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      <ModifierPickerDialog
        item={pickerItem as PickerItem | null}
        open={!!pickerItem}
        onOpenChange={(open) => !open && setPickerItem(null)}
        onConfirm={(ids, label) => {
          if (!pickerItem) return;
          const extra = ids.reduce((sum, id) => {
            const m = pickerItem.modifierGroups.flatMap((g) => g.modifierGroup.modifiers).find((x) => x.id === id);
            return sum + (m ? Number(m.priceAdjustment) : 0);
          }, 0);
          addLine(pickerItem, ids, label, extra);
        }}
      />
    </div>
  );
}
