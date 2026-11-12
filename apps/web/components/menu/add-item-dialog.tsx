"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useCreateMenuItem,
  useStations,
  useUploadItemImage,
  type MenuCategory,
} from "@/hooks/use-menu";
import { useSettings } from "@/hooks/use-settings";
import { useIngredients } from "@/hooks/use-inventory";
import { ApiError } from "@/lib/api";

export function AddItemDialog({
  branchId,
  categories,
  categoriesLoading,
  categoriesError,
}: {
  branchId: string | null;
  categories: MenuCategory[];
  categoriesLoading: boolean;
  categoriesError: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [stationId, setStationId] = useState<string>("");
  const [price, setPrice] = useState("");
  const [halfPrice, setHalfPrice] = useState("");
  const [taxRatePercent, setTaxRatePercent] = useState("5");
  const [isVeg, setIsVeg] = useState(true);
  const [trackStock, setTrackStock] = useState(false);
  const [stockIngredientId, setStockIngredientId] = useState("");
  const [stockQuantityPerSale, setStockQuantityPerSale] = useState("1");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    undefined,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: stations } = useStations(branchId);
  const { data: settings } = useSettings(branchId);
  const createItem = useCreateMenuItem(branchId);
  const { data: ingredients } = useIngredients(branchId);
  const uploadImage = useUploadItemImage();
  const priceLabel =
    settings?.branch.taxMode === "EXCLUSIVE"
      ? "Price (excl. tax)"
      : "Price (incl. tax)";

  const reset = () => {
    setName("");
    setCategoryId("");
    setStationId("");
    setPrice("");
    setTaxRatePercent("5");
    setIsVeg(true);
    setTrackStock(false);
    setStockIngredientId("");
    setStockQuantityPerSale("1");
    setImageUrl(undefined);
    setImagePreview(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    uploadImage.mutate(file, {
      onSuccess: (res) => setImageUrl(res.url),
      onError: (err) => {
        toast.error(
          err instanceof ApiError ? err.message : "Could not upload image",
        );
        setImagePreview(undefined);
      },
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      toast.error("Choose a category");
      return;
    }
    if (!name.trim()) {
      toast.error("Enter an item name");
      return;
    }
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast.error("Enter a valid price");
      return;
    }
    const taxNum = Number(taxRatePercent);
    if (Number.isNaN(taxNum) || taxNum < 0 || taxNum > 100) {
      toast.error("Tax rate must be between 0 and 100");
      return;
    }
    const halfPriceNum =
      halfPrice.trim() === "" ? undefined : Number(halfPrice);
    if (
      halfPriceNum !== undefined &&
      (Number.isNaN(halfPriceNum) || halfPriceNum < 0)
    ) {
      toast.error("Enter a valid half-portion price");
      return;
    }
    if (trackStock && !stockIngredientId) {
      toast.error("Choose the stock item this menu item uses");
      return;
    }
    const stockQty = Number(stockQuantityPerSale);
    if (trackStock && (!Number.isFinite(stockQty) || stockQty <= 0)) {
      toast.error("Enter a stock quantity greater than zero");
      return;
    }
    try {
      await createItem.mutateAsync({
        name,
        categoryId,
        stationId: stationId || undefined,
        price: priceNum,
        halfPrice: halfPriceNum,
        taxRatePercent: taxNum,
        isVeg,
        isVegan: false,
        isJain: false,
        isHalal: false,
        isGlutenFree: false,
        spiceLevel: "NONE",
        allergens: [],
        isActive: true,
        modifierGroupIds: [],
        imageUrl,
        inventoryTracking: trackStock ? "DIRECT" : "NONE",
        ...(trackStock
          ? { stockIngredientId, stockQuantityPerSale: stockQty }
          : {}),
      });
      toast.success(
        `"${name}" added to menu${trackStock ? " and linked to inventory" : ""}`,
      );
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add item");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button
            size="sm"
            disabled={
              categoriesLoading || categoriesError || categories.length === 0
            }
            aria-describedby="add-menu-item-availability"
            title={
              categoriesLoading
                ? "Loading categories"
                : categoriesError
                  ? "Could not load categories"
                  : categories.length === 0
                    ? "Add a category first"
                    : undefined
            }
          >
            Add item
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New menu item</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label>Photo</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={onFileChange}
            />
            {imagePreview ? (
              <div className="relative h-28 w-28 overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob/uploaded preview, not a Next-optimizable remote asset */}
                <img
                  src={imagePreview}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl(undefined);
                    setImagePreview(undefined);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {uploadImage.isPending && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-xs">
                    Uploading…
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-28 w-28 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
              >
                <ImagePlus className="h-5 w-5" />
                <span className="text-xs">Add photo</span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Margherita Pizza"
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Category</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => setCategoryId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="price">{priceLabel}</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tax">Tax rate %</Label>
              <Input
                id="tax"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="add-half">Half portion price (optional)</Label>
            <Input
              id="add-half"
              type="number"
              min="0"
              step="0.01"
              value={halfPrice}
              onChange={(e) => setHalfPrice(e.target.value)}
              placeholder="Leave empty if there is no half/full choice"
            />
            <p className="text-xs text-muted-foreground">
              When set, the POS asks Half / Full / Custom. The price above is
              the Full portion.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Kitchen station</Label>
            <Select
              value={stationId}
              onValueChange={(v) => setStationId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {stations?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <Label htmlFor="is-veg" className="cursor-pointer">
              Vegetarian
            </Label>
            <Switch id="is-veg" checked={isVeg} onCheckedChange={setIsVeg} />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="track-stock" className="cursor-pointer">
                  Deduct stock when sold
                </Label>
                <p className="text-xs text-muted-foreground">
                  For packaged items or one-ingredient portions.
                </p>
              </div>
              <Switch
                id="track-stock"
                checked={trackStock}
                onCheckedChange={setTrackStock}
              />
            </div>
            {trackStock && (
              <>
                <Select
                  value={stockIngredientId}
                  onValueChange={(value) => setStockIngredientId(value ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an inventory item" />
                  </SelectTrigger>
                  <SelectContent>
                    {(ingredients ?? [])
                      .filter((ingredient) => ingredient.isActive)
                      .map((ingredient) => (
                        <SelectItem key={ingredient.id} value={ingredient.id}>
                          {ingredient.name} ({ingredient.unit})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="stock-quantity">
                    Quantity used per menu item
                  </Label>
                  <Input
                    id="stock-quantity"
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={stockQuantityPerSale}
                    onChange={(event) =>
                      setStockQuantityPerSale(event.target.value)
                    }
                  />
                </div>
                {(!ingredients ||
                  ingredients.filter((ingredient) => ingredient.isActive)
                    .length === 0) && (
                  <p className="text-xs text-muted-foreground">
                    Add an active ingredient in Inventory first.
                  </p>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={createItem.isPending || uploadImage.isPending}
            >
              {createItem.isPending ? "Adding…" : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
