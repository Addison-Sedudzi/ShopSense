import type { Money } from './money';
import type { ProductUnit } from './product';
import type { ShopId } from './shop';

export type SaleStatus = 'completed' | 'voided';
export type DiscountType = 'percentage' | 'fixed_amount';

export interface DiscountInput {
  type: DiscountType;
  // A percentage (e.g. "10" for 10%) or a decimal money amount, depending on
  // type — resolved and validated server-side, never trusted as-is.
  value: string;
}

export interface DiscountRow {
  id: string;
  discountType: DiscountType;
  // The rate/amount as given, kept for the record. `amount` below is the
  // resolved Money value and is what every total is actually computed from.
  discountValue: number;
  amount: Money;
  reason: string | null;
}

export interface SaleItemInput {
  productId: string;
  quantity: number;
  unit: ProductUnit;
  discount?: DiscountInput;
}

export interface SaleItemRow {
  id: string;
  productId: string;
  productNameSnapshot: string;
  unit: ProductUnit;
  quantity: number;
  unitPriceSnapshot: Money;
  lineSubtotal: Money;
  discount: DiscountRow | null;
}

export interface SaleRow {
  id: string;
  shopId: ShopId;
  soldBy: string | null;
  status: SaleStatus;
  subtotal: Money;
  discountTotal: Money;
  grandTotal: Money;
  idempotencyKey: string | null;
  createdAt: string;
  items: SaleItemRow[];
  saleDiscount: DiscountRow | null;
}
