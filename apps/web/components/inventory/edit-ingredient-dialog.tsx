"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { IngredientUnit } from "@nodedr-restaurant/types";
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
  useDeleteIngredient,
  useUpdateIngredient,
  type Ingredient,
} from "@/hooks/use-inventory";
import { ApiError } from "@/lib/api";

const UNITS: IngredientUnit[] = [
  "KG",
  "G",
  "L",
  "ML",
  "PIECE",
  "DOZEN",
  "PACK",
  "BOX",
];

export function EditIngredientDialog({
  branchId,
  ingredient,
}: {
  branchId: string | null;
  ingredient: Ingredient;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(ingredient.name);
  const [sku, setSku] = useState(ingredient.sku ?? "");
  const [unit, setUnit] = useState<IngredientUnit>(ingredient.unit);
  const [reorderLevel, setReorderLevel] = useState(
    String(ingredient.reorderLevel),
  );
  const [isActive, setIsActive] = useState(ingredient.isActive);
  const update = useUpdateIngredient(branchId);
  const remove = useDeleteIngredient(branchId);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      await update.mutateAsync({
        id: ingredient.id,
        dto: {
          name: name.trim(),
          sku: sku.trim() || undefined,
          unit,
          reorderLevel: Number(reorderLevel),
          isActive,
        },
      });
      toast.success(`${name.trim()} updated`);
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not update ingredient",
      );
    }
  };

  const deleteIngredient = async () => {
    if (
      !window.confirm(
        `Delete ${ingredient.name}? Ingredients with stock or menu history must be deactivated instead.`,
      )
    )
      return;
    try {
      await remove.mutateAsync(ingredient.id);
      toast.success(`${ingredient.name} deleted`);
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not delete ingredient",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Edit
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Edit ingredient</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`ingredient-name-${ingredient.id}`}>Name</Label>
            <Input
              id={`ingredient-name-${ingredient.id}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`ingredient-sku-${ingredient.id}`}>
              SKU (optional)
            </Label>
            <Input
              id={`ingredient-sku-${ingredient.id}`}
              value={sku}
              onChange={(event) => setSku(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Unit</Label>
            <Select
              value={unit}
              onValueChange={(value) => setUnit(value as IngredientUnit)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`ingredient-reorder-${ingredient.id}`}>
              Reorder level
            </Label>
            <Input
              id={`ingredient-reorder-${ingredient.id}`}
              type="number"
              min="0"
              step="0.001"
              value={reorderLevel}
              onChange={(event) => setReorderLevel(event.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <Label
              htmlFor={`ingredient-active-${ingredient.id}`}
              className="cursor-pointer"
            >
              Available for recipes and sales
            </Label>
            <Switch
              id={`ingredient-active-${ingredient.id}`}
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
          <DialogFooter className="justify-between sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={deleteIngredient}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
