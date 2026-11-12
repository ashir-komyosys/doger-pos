export interface CartLine {
  key: string;
  menuItemId: string;
  name: string;
  imageUrl?: string | null;
  unitPrice: number;
  quantity: number;
  modifierIds: string[];
  modifierLabel?: string;
  askSpice?: boolean;
  spiceChoice?: SpiceChoice;
  kitchenNote?: string;
  portion?: Portion;
}

export type SpiceChoice = "BLAND" | "MILD" | "NORMAL" | "SPICY";

export const SPICE_CHOICES: { value: SpiceChoice; label: string }[] = [
  { value: "BLAND", label: "Bland" },
  { value: "MILD", label: "Mild" },
  { value: "NORMAL", label: "Normal" },
  { value: "SPICY", label: "Spicy" },
];

export function isDrinkCategory(name: string): boolean {
  return /drink|beverage|\bbar\b|\btea\b|coffee|juice|\bwater\b|soda|mocktail|cocktail|cafe|espresso|smoothie/i.test(name);
}

export function isDealCategory(name: string): boolean {
  return /deal|combo|offer|set\s*menu|bundle|special/i.test(name);
}

export type PortionKind = "HALF" | "FULL" | "CUSTOM";

export interface Portion {
  kind: PortionKind;
  // Only for CUSTOM: staff-typed label and unit price.
  customLabel?: string;
  customPrice?: number;
}

export function portionText(p?: Portion): string {
  if (!p) return "";
  if (p.kind === "HALF") return "Half";
  if (p.kind === "FULL") return "Full";
  return p.customLabel || "Custom";
}

export function cartLineKey(
  menuItemId: string,
  modifierIds: string[],
  portion?: Portion,
  spiceChoice?: SpiceChoice,
): string {
  const p = portion ? `${portion.kind}:${portion.customLabel ?? ""}:${portion.customPrice ?? ""}` : "";
  return `${menuItemId}::${[...modifierIds].sort().join(",")}::${p}::${spiceChoice ?? ""}`;
}
