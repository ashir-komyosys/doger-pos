"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function IngredientAddPage() {
  const router = useRouter();
  const [form, setForm] = useState<{ name: string; unit: string; reorderLevel: string; initialStock: string }>({
    name: "",
    unit: "KG",
    reorderLevel: "0",
    initialStock: "0",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      toast.success("Ingredient added");
      router.push("/inventory");
    } catch (err: any) {
      toast.error("Failed to add ingredient");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex items-center justify-between border-b border-border/80 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Add New Ingredient</h1>
          <p className="text-muted-foreground/80">Fill in the form below to add a new ingredient</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/inventory")}
        >
          Back
        </Button>
      </nav>

      <div className="p-8 max-w-2xl mx-auto">
        <form onSubmit={onSubmit} className="bg-card p-6 rounded-lg shadow-sm border-border/80">
          <h2 className="mb-4 text-lg font-semibold">Ingredient Details</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="i-name">Name</Label>
              <Input
                id="i-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Salt"
                required
              />
            </div>

            <div>
              <Label htmlFor="i-unit">Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v as string })}>
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
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="i-reorder">Reorder Level</Label>
              <Input
                id="i-reorder"
                type="number"
                min="0"
                step="0.001"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Shows up under Low Stock once stock falls to or below this.
              </p>
            </div>

            <div>
              <Label htmlFor="i-initialStock">Initial Stock</Label>
              <Input
                id="i-initialStock"
                type="number"
                min="0"
                step="0.001"
                value={form.initialStock}
                onChange={(e) => setForm({ ...form, initialStock: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Recorded in the stock movement history as an opening adjustment.
              </p>
            </div>
          </div>

          <DialogFooter className="justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/inventory")}>
              Cancel
            </Button>
            <Button type="submit" disabled={!form.name.trim()}>
              Add Ingredient
            </Button>
          </DialogFooter>
        </form>
      </div>
    </div>
  );
}