import type { IngredientUnit } from '@prisma/client';

const UNIT_SCALE: Record<IngredientUnit, { family: string; scale: number }> = {
  KG: { family: 'mass', scale: 1000 },
  G: { family: 'mass', scale: 1 },
  L: { family: 'volume', scale: 1000 },
  ML: { family: 'volume', scale: 1 },
  PIECE: { family: 'count', scale: 1 },
  DOZEN: { family: 'count', scale: 12 },
  PACK: { family: 'pack', scale: 1 },
  BOX: { family: 'box', scale: 1 },
};

const round3 = (value: number) =>
  Math.round((value + Number.EPSILON) * 1000) / 1000;

/** Convert an entered recipe amount to the ingredient's stock unit. */
export function convertIngredientQuantity(
  quantity: number,
  fromUnit: IngredientUnit,
  toUnit: IngredientUnit,
) {
  if (fromUnit === toUnit) return round3(quantity);
  const from = UNIT_SCALE[fromUnit];
  const to = UNIT_SCALE[toUnit];
  if (from.family !== to.family) {
    throw new Error(`Cannot convert ${fromUnit} to ${toUnit}`);
  }
  return round3((quantity * from.scale) / to.scale);
}
