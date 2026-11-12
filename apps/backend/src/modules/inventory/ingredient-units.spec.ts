import { convertIngredientQuantity } from './ingredient-units';

describe('convertIngredientQuantity', () => {
  it('converts recipe grams to kilograms for stock deduction', () => {
    expect(convertIngredientQuantity(150, 'G', 'KG')).toBe(0.15);
  });

  it('converts recipe millilitres to litres', () => {
    expect(convertIngredientQuantity(250, 'ML', 'L')).toBe(0.25);
  });

  it('converts dozens to individual pieces', () => {
    expect(convertIngredientQuantity(2, 'DOZEN', 'PIECE')).toBe(24);
  });

  it('keeps same-unit amounts unchanged to three decimals', () => {
    expect(convertIngredientQuantity(1.23456, 'KG', 'KG')).toBe(1.235);
  });

  it('rejects incompatible units', () => {
    expect(() => convertIngredientQuantity(1, 'KG', 'ML')).toThrow(
      'Cannot convert KG to ML',
    );
  });
});
