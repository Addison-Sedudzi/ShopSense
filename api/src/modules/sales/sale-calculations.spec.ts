import { BadRequestException } from '@nestjs/common';
import { money } from '@shopsense/shared';
import { computeDiscount, computeSaleTotals, priceForUnit, type LineTotals } from './sale-calculations';

describe('computeDiscount', () => {
  it('returns null when no discount is given', () => {
    expect(computeDiscount(money(1000), undefined, 'Item')).toBeNull();
  });

  it('resolves a percentage discount to a Money amount', () => {
    const result = computeDiscount(money(5400), { type: 'percentage', value: '10' }, 'Item');
    expect(result).toEqual({ discountType: 'percentage', discountValue: 10, amount: 540 });
  });

  it('rounds a percentage discount to the nearest minor unit', () => {
    // 333 * 10% = 33.3, must round to 33, not truncate or throw on a fraction
    const result = computeDiscount(money(333), { type: 'percentage', value: '10' }, 'Item');
    expect(result?.amount).toBe(33);
  });

  it('resolves a fixed_amount discount by parsing the decimal string directly', () => {
    const result = computeDiscount(money(3600), { type: 'fixed_amount', value: '5.00' }, 'Sale');
    expect(result).toEqual({ discountType: 'fixed_amount', discountValue: 5, amount: 500 });
  });

  it('allows a percentage discount of exactly 100', () => {
    const result = computeDiscount(money(1000), { type: 'percentage', value: '100' }, 'Item');
    expect(result?.amount).toBe(1000);
  });

  it('allows a fixed_amount discount exactly equal to the base', () => {
    const result = computeDiscount(money(500), { type: 'fixed_amount', value: '5.00' }, 'Item');
    expect(result?.amount).toBe(500);
  });

  it('rejects a percentage below 0', () => {
    expect(() => computeDiscount(money(1000), { type: 'percentage', value: '-1' }, 'Item')).toThrow(
      BadRequestException,
    );
  });

  it('rejects a percentage above 100', () => {
    expect(() => computeDiscount(money(1000), { type: 'percentage', value: '101' }, 'Item')).toThrow(
      BadRequestException,
    );
  });

  it('rejects a fixed_amount discount that exceeds the base it applies to', () => {
    expect(() => computeDiscount(money(500), { type: 'fixed_amount', value: '5.01' }, 'Item')).toThrow(
      BadRequestException,
    );
  });

  it('labels the error with which discount failed', () => {
    expect(() => computeDiscount(money(500), { type: 'fixed_amount', value: '999.99' }, 'Sale')).toThrow(
      /Sale discount cannot exceed/,
    );
  });
});

describe('priceForUnit', () => {
  const baseProduct = { unit: 'piece' as const, unitsPerCarton: 12, sellingPrice: money(1800) };

  it('returns the product selling price unchanged when the unit matches the base unit', () => {
    expect(priceForUnit('piece', baseProduct)).toBe(1800);
  });

  it('scales the selling price by unitsPerCarton when selling by carton', () => {
    expect(priceForUnit('carton', baseProduct)).toBe(1800 * 12);
  });
});

describe('computeSaleTotals', () => {
  function line(lineSubtotal: number, discountAmount?: number): LineTotals {
    return {
      lineSubtotal: money(lineSubtotal),
      discount: discountAmount === undefined ? null : { discountType: 'fixed_amount', discountValue: discountAmount / 100, amount: money(discountAmount) },
    };
  }

  it('sums a single line with no discounts', () => {
    const result = computeSaleTotals([line(1800)], undefined);
    expect(result.subtotal).toBe(1800);
    expect(result.discountTotal).toBe(0);
    expect(result.grandTotal).toBe(1800);
  });

  it('sums multiple lines', () => {
    const result = computeSaleTotals([line(1800), line(1200), line(600)], undefined);
    expect(result.subtotal).toBe(3600);
    expect(result.grandTotal).toBe(3600);
  });

  it('applies item-level discounts to the total without affecting subtotal', () => {
    const result = computeSaleTotals([line(5400, 540)], undefined);
    expect(result.subtotal).toBe(5400);
    expect(result.itemDiscountTotal).toBe(540);
    expect(result.discountTotal).toBe(540);
    expect(result.grandTotal).toBe(4860);
  });

  it('applies a sale-level discount against the total after item discounts', () => {
    // subtotal 3600, no item discounts, 5.00 sale discount -> grandTotal 3100
    const result = computeSaleTotals([line(3600)], { type: 'fixed_amount', value: '5.00' });
    expect(result.preSaleDiscountTotal).toBe(3600);
    expect(result.discountTotal).toBe(500);
    expect(result.grandTotal).toBe(3100);
  });

  it('combines item-level and sale-level discounts', () => {
    // line 5400 with 540 item discount -> preSaleDiscountTotal 4860
    // sale discount 10% of 4860 = 486
    const result = computeSaleTotals([line(5400, 540)], { type: 'percentage', value: '10' });
    expect(result.preSaleDiscountTotal).toBe(4860);
    expect(result.saleDiscount?.amount).toBe(486);
    expect(result.discountTotal).toBe(540 + 486);
    expect(result.grandTotal).toBe(5400 - 540 - 486);
  });

  it('rejects a sale discount that would exceed what is left after item discounts', () => {
    expect(() =>
      computeSaleTotals([line(1000, 900)], { type: 'fixed_amount', value: '2.00' }),
    ).toThrow(BadRequestException);
  });
});
