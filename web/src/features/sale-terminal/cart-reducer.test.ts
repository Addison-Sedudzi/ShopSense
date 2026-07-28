import { money } from '@shopsense/shared';
import { describe, expect, it } from 'vitest';
import { cartReducer } from './cart-reducer';
import { emptyCart, type AddableProduct, type CartState } from './cart-types';

function product(overrides: Partial<AddableProduct> = {}): AddableProduct {
  return {
    id: 'p1',
    name: 'Milo 400g',
    unit: 'piece',
    unitsPerCarton: 24,
    sellingPrice: money(500),
    currentStock: 10,
    ...overrides,
  };
}

describe('cartReducer: add-product', () => {
  it('adds a new line for a product not already in the cart', () => {
    const state = cartReducer(emptyCart, { type: 'add-product', product: product() });
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0]).toMatchObject({ productId: 'p1', quantity: 1, maxQuantity: 10, discount: null });
  });

  it('increments quantity instead of duplicating the line when the product is already in the cart', () => {
    const withOne = cartReducer(emptyCart, { type: 'add-product', product: product() });
    const withTwo = cartReducer(withOne, { type: 'add-product', product: product() });
    expect(withTwo.lines).toHaveLength(1);
    expect(withTwo.lines[0].quantity).toBe(2);
  });

  it('does not increment past the available stock', () => {
    const one = cartReducer(emptyCart, { type: 'add-product', product: product({ currentStock: 1 }) });
    const stillOne = cartReducer(one, { type: 'add-product', product: product({ currentStock: 1 }) });
    expect(stillOne.lines[0].quantity).toBe(1);
  });
});

describe('cartReducer: remove-line', () => {
  it('removes only the matching line', () => {
    const state: CartState = {
      lines: [
        { ...cartReducer(emptyCart, { type: 'add-product', product: product() }).lines[0] },
        { ...cartReducer(emptyCart, { type: 'add-product', product: product({ id: 'p2' }) }).lines[0] },
      ],
      saleDiscount: null,
    };
    const next = cartReducer(state, { type: 'remove-line', productId: 'p1' });
    expect(next.lines.map((l) => l.productId)).toEqual(['p2']);
  });
});

describe('cartReducer: set-quantity', () => {
  const withLine = cartReducer(emptyCart, { type: 'add-product', product: product({ currentStock: 10 }) });

  it('sets the quantity within bounds', () => {
    const next = cartReducer(withLine, { type: 'set-quantity', productId: 'p1', quantity: 5 });
    expect(next.lines[0].quantity).toBe(5);
  });

  it('clamps below 1 up to 1', () => {
    const next = cartReducer(withLine, { type: 'set-quantity', productId: 'p1', quantity: 0 });
    expect(next.lines[0].quantity).toBe(1);
  });

  it('clamps above the effective max down to it', () => {
    const next = cartReducer(withLine, { type: 'set-quantity', productId: 'p1', quantity: 999 });
    expect(next.lines[0].quantity).toBe(10);
  });

  it('truncates a fractional quantity', () => {
    const next = cartReducer(withLine, { type: 'set-quantity', productId: 'p1', quantity: 3.7 });
    expect(next.lines[0].quantity).toBe(3);
  });
});

describe('cartReducer: set-unit', () => {
  it('re-clamps quantity when switching to a unit with a lower effective max', () => {
    // 10 pieces in stock, 24 per carton -> switching to carton clamps to floor(10/24) || 1 = 1
    const withLine = cartReducer(emptyCart, {
      type: 'add-product',
      product: product({ currentStock: 10, unitsPerCarton: 24 }),
    });
    const atFive = cartReducer(withLine, { type: 'set-quantity', productId: 'p1', quantity: 5 });
    const switched = cartReducer(atFive, { type: 'set-unit', productId: 'p1', unit: 'carton' });
    expect(switched.lines[0].selectedUnit).toBe('carton');
    expect(switched.lines[0].quantity).toBe(1);
  });
});

describe('cartReducer: discounts and clear', () => {
  it('sets a line discount only on the matching line', () => {
    const state: CartState = {
      lines: [
        cartReducer(emptyCart, { type: 'add-product', product: product() }).lines[0],
        cartReducer(emptyCart, { type: 'add-product', product: product({ id: 'p2' }) }).lines[0],
      ],
      saleDiscount: null,
    };
    const next = cartReducer(state, {
      type: 'set-line-discount',
      productId: 'p1',
      discount: { type: 'percentage', value: '10' },
    });
    expect(next.lines.find((l) => l.productId === 'p1')?.discount).toEqual({ type: 'percentage', value: '10' });
    expect(next.lines.find((l) => l.productId === 'p2')?.discount).toBeNull();
  });

  it('sets the sale-level discount', () => {
    const next = cartReducer(emptyCart, { type: 'set-sale-discount', discount: { type: 'fixed_amount', value: '5' } });
    expect(next.saleDiscount).toEqual({ type: 'fixed_amount', value: '5' });
  });

  it('clear resets to the empty cart', () => {
    const withLine = cartReducer(emptyCart, { type: 'add-product', product: product() });
    expect(cartReducer(withLine, { type: 'clear' })).toEqual(emptyCart);
  });
});
