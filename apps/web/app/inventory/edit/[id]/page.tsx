"use client";

import { useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Ingredient {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  reorderLevel: string;
  currentStock: string;
  availableStock: string;
  costPerUnit: string;
  isActive: boolean;
  initialStock: string;
}

export default function IngredientEditPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [ingredient, setIngredient] = useState<Ingredient>(() => ({
    id,
    name: "Test Ingredient",
    sku: "TEST-001",
    unit: "KG",
    reorderLevel: "10",
    currentStock: "50",
    availableStock: "50",
    costPerUnit: "5.00",
    isActive: true,
    initialStock: "0",
  }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredient?.name.trim()) {
      toast.error("Name is required");
      return;
    }

    toast.success("Ingredient updated");
    router.push("/inventory");
  };

  if (!ingredient) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background text-foreground">
        <div>
          <p className="text-error">Ingredient not found</p>
          <Button onClick={() => router.push("/inventory")}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex items-center justify-between border-b border-border/80 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Edit Ingredient</h1>
          <p className="text-muted-foreground/80">Modify the ingredient details below</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/inventory")}>
          Back
        </Button>
      </nav>

      <div className="p-8 max-w-2xl mx-auto">
        <form onSubmit={onSubmit} className="bg-card p-6 rounded-lg shadow-sm border-border/80">
          <h2 className="mb-4 text-lg font-semibold">Ingredient Details</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="e-name">Name</Label>
              <Input
                id="e-name"
                value={ingredient?.name ?? ""}
                onChange={(e) => setIngredient({ ...ingredient, name: e.target.value })}
                placeholder="e.g. Salt"
                required
              />
            </div>

            <div>
              <Label htmlFor="e-sku">SKU</Label>
              <Input
                id="e-sku"
                value={ingredient?.sku ?? ""}
                onChange={(e) => setIngredient({ ...ingredient, sku: e.target.value })}
                placeholder="e.g. SALT-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="e-unit">Unit</Label>
              <Select value={ingredient?.unit ?? "KG"} onValueChange={(v) => setIngredient({ ...ingredient, unit: v as string })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KG">KG</SelectItem>
                  <SelectItem value="G">G</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="ML">ML</SelectItem>
                  <SelectItem value="PIECE">PIECE</SelectItem>
                  <SelectItem value="DOZEN">DOZEN</SelectItem>
                  <SelectItem value="PACK">PACK</SelectItem>
                  <SelectItem value="BOX">BOX</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="e-reorder">Reorder Level</Label>
              <Input
                id="e-reorder"
                type="number"
                min="0"
                step="0.001"
                value={ingredient?.reorderLevel ?? "0"}
                onChange={(e) => setIngredient({ ...ingredient, reorderLevel: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="e-initialStock">Initial Stock</Label>
              <Input
                id="e-initialStock"
                type="number"
                min="0"
                step="0.001"
                value={ingredient?.initialStock ?? "0"}
                onChange={(e) => setIngredient({ ...ingredient, initialStock: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Recorded in the stock movement history as an opening adjustment.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="e-isActive">Active</Label>
              <Select value={ingredient?.isActive ? "1" : "0"} onValueChange={(v) => setIngredient({ ...ingredient, isActive: v === "1" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Yes</SelectItem>
                  <SelectItem value="0">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/inventory")}>Cancel</Button>
            <Button type="submit" disabled={!ingredient?.name.trim()}>Save Changes</Button>
          </DialogFooter>
        </form>
      </div>
    </div>
  );
}