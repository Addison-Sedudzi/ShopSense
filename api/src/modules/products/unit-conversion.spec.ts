import { BadRequestException } from '@nestjs/common';
import { convertToBaseUnit } from './unit-conversion';

describe('convertToBaseUnit', () => {
  it('returns the quantity unchanged when the unit already matches the base unit', () => {
    const product = { unit: 'piece' as const, unitsPerCarton: null };
    expect(convertToBaseUnit(5, 'piece', product)).toBe(5);
  });

  it('returns the quantity unchanged for a carton-tracked product sold by carton', () => {
    const product = { unit: 'carton' as const, unitsPerCarton: 12 };
    expect(convertToBaseUnit(3, 'carton', product)).toBe(3);
  });

  it('multiplies by unitsPerCarton when converting carton -> piece', () => {
    const product = { unit: 'piece' as const, unitsPerCarton: 24 };
    expect(convertToBaseUnit(2, 'carton', product)).toBe(48);
  });

  it('rejects converting by carton when unitsPerCarton is not configured', () => {
    const product = { unit: 'piece' as const, unitsPerCarton: null };
    expect(() => convertToBaseUnit(2, 'carton', product)).toThrow(BadRequestException);
  });

  it('rejects selling/receiving loose pieces of a carton-tracked product', () => {
    const product = { unit: 'carton' as const, unitsPerCarton: 12 };
    expect(() => convertToBaseUnit(5, 'piece', product)).toThrow(BadRequestException);
  });

  it('rejects piece quantities for a carton-tracked product even with unitsPerCarton set', () => {
    // unitsPerCarton being set doesn't change the outcome for this direction -
    // there is still no defined per-piece price/stock to convert into.
    const product = { unit: 'carton' as const, unitsPerCarton: 12 };
    expect(() => convertToBaseUnit(1, 'piece', product)).toThrow(
      /tracked by carton/,
    );
  });
});
