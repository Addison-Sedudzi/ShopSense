import { money } from '@shopsense/shared';
import { describe, expect, it } from 'vitest';
import { cartTotals, effectiveMaxQuantity, lineDiscountAmount, lineSubtotal, priceForUnit } from './cart-math';
import { emptyCart, type CartLine } from './cart-types';

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    productId: 'p1',
    productName: 'Milo 400g',
    baseUnit: 'piece',
    unitsPerCarton: 24,
    basePrice: money(500), // GH₵5.00 per piece
    selectedUnit: 'piece',
    quantity: 2,
    maxQuantity: 100,
    discount: null,
    ...overrides,
  };
}

describe('effectiveMaxQuantity', () => {
  it('returns maxQuantity unchanged when selling in the base unit', () => {
    expect(effectiveMaxQuantity(line({ selectedUnit: 'piece', baseUnit: 'piece', maxQuantity: 50 }))).toBe(50);
  });

  it('divides down by unitsPerCarton when selling in cartons', () => {
    expect(
      effectiveMaxQuantity({ selectedUnit: 'carton', baseUnit: 'piece', unitsPerCarton: 24, maxQuantity: 100 }),
    ).toBe(4); // floor(100 / 24)
  });

  it('treats a missing unitsPerCarton as 1 rather than dividing by zero', () => {
    expect(
      effectiveMaxQuantity({ selectedUnit: 'carton', baseUnit: 'piece', unitsPerCarton: null, maxQuantity: 10 }),
    ).toBe(10);
  });
});

describe('priceForUnit', () => {
  it('returns basePrice as-is for the base unit', () => {
    expect(priceForUnit(line(), 'piece')).toBe(500);
  });

  it('scales basePrice by unitsPerCarton for the carton unit', () => {
    expect(priceForUnit(line(), 'carton')).toBe(500 * 24);
  });
});

describe('lineSubtotal', () => {
  it('multiplies the per-unit price by quantity', () => {
    expect(lineSubtotal(line({ quantity: 3, basePrice: money(500) }))).toBe(1500);
  });

  it('accounts for the selected unit, not just the base unit', () => {
    expect(lineSubtotal(line({ selectedUnit: 'carton', unitsPerCarton: 24, quantity: 2, basePrice: money(500) }))).toBe(
      500 * 24 * 2,
    );
  });
});

describe('lineDiscountAmount', () => {
  it('is zero with no discount', () => {
    expect(lineDiscountAmount(line({ discount: null }))).toBe(0);
  });

  it('applies a percentage discount to the line subtotal', () => {
    // subtotal = 500 * 2 = 1000; 10% => 100
    expect(lineDiscountAmount(line({ discount: { type: 'percentage', value: '10' } }))).toBe(100);
  });

  it('clamps a percentage above 100 down to 100%', () => {
    expect(lineDiscountAmount(line({ discount: { type: 'percentage', value: '250' } }))).toBe(1000);
  });

  it('ignores a zero or negative percentage', () => {
    expect(lineDiscountAmount(line({ discount: { type: 'percentage', value: '0' } }))).toBe(0);
    expect(lineDiscountAmount(line({ discount: { type: 'percentage', value: '-5' } }))).toBe(0);
  });

  it('applies a fixed-amount discount directly', () => {
    expect(lineDiscountAmount(line({ discount: { type: 'fixed_amount', value: '3.00' } }))).toBe(300);
  });

  it('caps a fixed-amount discount at the line subtotal so it never goes negative', () => {
    // subtotal = 1000, requested discount = 50.00 (5000 minor units)
    expect(lineDiscountAmount(line({ discount: { type: 'fixed_amount', value: '50.00' } }))).toBe(1000);
  });

  it('treats an unparseable fixed-amount value as no discount rather than throwing', () => {
    expect(lineDiscountAmount(line({ discount: { type: 'fixed_amount', value: 'not-a-number' } }))).toBe(0);
  });
});

describe('cartTotals', () => {
  it('is all zero for an empty cart', () => {
    expect(cartTotals(emptyCart)).toEqual({
      subtotal: 0,
      itemDiscountTotal: 0,
      saleDiscountAmount: 0,
      discountTotal: 0,
      grandTotal: 0,
    });
  });

  it('sums subtotals across lines with no discounts', () => {
    const state = { lines: [line({ quantity: 2 }), line({ productId: 'p2', quantity: 1 })], saleDiscount: null };
    // (500*2) + (500*1) = 1500
    const totals = cartTotals(state);
    expect(totals.subtotal).toBe(1500);
    expect(totals.grandTotal).toBe(1500);
  });

  it('applies a sale-level discount after item-level discounts, not before', () => {
    const state = {
      lines: [line({ quantity: 2, discount: { type: 'percentage' as const, value: '10' } })], // subtotal 1000, item discount 100
      saleDiscount: { type: 'percentage' as const, value: '10' }, // 10% of (1000-100) = 90
    };
    const totals = cartTotals(state);
    expect(totals.subtotal).toBe(1000);
    expect(totals.itemDiscountTotal).toBe(100);
    expect(totals.saleDiscountAmount).toBe(90);
    expect(totals.discountTotal).toBe(190);
    expect(totals.grandTotal).toBe(810);
  });
});
