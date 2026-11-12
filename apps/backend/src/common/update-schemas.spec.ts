import {
  ingredientUpdateSchema,
  menuCategoryUpdateSchema,
  menuItemUpdateSchema,
  modifierGroupUpdateSchema,
  supplierUpdateSchema,
} from '@nodedr-restaurant/types';

describe('update request schemas', () => {
  it('strips protected branch and stock fields from ingredient updates', () => {
    expect(
      ingredientUpdateSchema.parse({
        name: 'Milk',
        branchId: 'another-branch',
        currentStock: 900,
        openingStock: 900,
      }),
    ).toEqual({ name: 'Milk' });
  });

  it('does not apply create defaults to omitted menu patch fields', () => {
    expect(
      menuItemUpdateSchema.parse({ price: 12, branchId: 'other' }),
    ).toEqual({ price: 12 });
    expect(menuCategoryUpdateSchema.parse({ name: 'Food' })).toEqual({
      name: 'Food',
    });
    expect(modifierGroupUpdateSchema.parse({ name: 'Size' })).toEqual({
      name: 'Size',
    });
  });

  it('strips branch ownership from supplier updates', () => {
    expect(
      supplierUpdateSchema.parse({
        name: 'Local supplier',
        branchId: 'another-branch',
      }),
    ).toEqual({ name: 'Local supplier' });
  });
});
