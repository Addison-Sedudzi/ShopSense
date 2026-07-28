import type { DiscountInput, Money, ProductUnit } from '@shopsense/shared';

export interface CartLine {
  productId: string;
  productName: string;
  baseUnit: ProductUnit;
  unitsPerCarton: number | null;
  /** Price per one baseUnit — a snapshot taken when added, so the cart
   * doesn't silently reprice mid-sale if the product changes elsewhere. */
  basePrice: Money;
  selectedUnit: ProductUnit;
  quantity: number;
  /** Stock at add-time, in baseUnit terms — a soft client-side cap only; the
   * server re-checks live stock inside the sale transaction regardless. */
  maxQuantity: number;
  discount: DiscountInput | null;
}

export interface CartState {
  lines: CartLine[];
  saleDiscount: DiscountInput | null;
}

export const emptyCart: CartState = { lines: [], saleDiscount: null };

export interface AddableProduct {
  id: string;
  name: string;
  unit: ProductUnit;
  unitsPerCarton: number | null;
  sellingPrice: Money;
  currentStock: number;
}

export type CartAction =
  | { type: 'add-product'; product: AddableProduct }
  | { type: 'remove-line'; productId: string }
  | { type: 'set-quantity'; productId: string; quantity: number }
  | { type: 'set-unit'; productId: string; unit: ProductUnit }
  | { type: 'set-line-discount'; productId: string; discount: DiscountInput | null }
  | { type: 'set-sale-discount'; discount: DiscountInput | null }
  | { type: 'clear' };
