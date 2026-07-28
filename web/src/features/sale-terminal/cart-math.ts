import { money, moneyFromPgNumeric, scaleMoney, subtractMoney, sumMoney, ZERO_MONEY, type DiscountInput, type Money } from '@shopsense/shared';
import type { CartLine, CartState } from './cart-types';

/**
 * Client-side ESTIMATE only, for live display while building a sale. This
 * intentionally mirrors (in miniature) the backend's
 * api/src/modules/sales/sale-calculations.ts, but is not authoritative:
 * POST /api/sales recomputes every price and discount server-side from the
 * live product data inside the transaction, and that response — not this
 * one — is what actually gets recorded and shown on the receipt. If the two
 * ever disagree (a price changed since the cart was built, a discount edge
 * case), the server wins and the receipt reflects the server's numbers.
 */

export function effectiveMaxQuantity(line: Pick<CartLine, 'selectedUnit' | 'baseUnit' | 'unitsPerCarton' | 'maxQuantity'>): number {
  if (line.selectedUnit === line.baseUnit) return line.maxQuantity;
  return Math.floor(line.maxQuantity / (line.unitsPerCarton ?? 1));
}

export function priceForUnit(line: Pick<CartLine, 'baseUnit' | 'unitsPerCarton' | 'basePrice'>, unit: 'piece' | 'carton'): Money {
  if (unit === line.baseUnit) return line.basePrice;
  return scaleMoney(line.basePrice, line.unitsPerCarton ?? 1);
}

export function lineSubtotal(line: CartLine): Money {
  return scaleMoney(priceForUnit(line, line.selectedUnit), line.quantity);
}

function estimateDiscount(base: Money, discount: DiscountInput | null): Money {
  if (!discount) return ZERO_MONEY;
  if (discount.type === 'percentage') {
    const pct = Number(discount.value);
    if (!Number.isFinite(pct) || pct <= 0) return ZERO_MONEY;
    return scaleMoney(base, Math.min(pct, 100) / 100);
  }
  try {
    const amount = moneyFromPgNumeric(discount.value);
    return amount > base ? base : amount;
  } catch {
    return ZERO_MONEY;
  }
}

export function lineDiscountAmount(line: CartLine): Money {
  return estimateDiscount(lineSubtotal(line), line.discount);
}

export interface CartTotals {
  subtotal: Money;
  itemDiscountTotal: Money;
  saleDiscountAmount: Money;
  discountTotal: Money;
  grandTotal: Money;
}

export function cartTotals(state: CartState): CartTotals {
  const subtotal = sumMoney(state.lines.map(lineSubtotal));
  const itemDiscountTotal = sumMoney(state.lines.map(lineDiscountAmount));
  const preSaleDiscountTotal = subtractMoney(subtotal, itemDiscountTotal);
  const saleDiscountAmount = estimateDiscount(preSaleDiscountTotal, state.saleDiscount);
  const discountTotal = money(itemDiscountTotal + saleDiscountAmount);
  const grandTotal = subtractMoney(preSaleDiscountTotal, saleDiscountAmount);
  return { subtotal, itemDiscountTotal, saleDiscountAmount, discountTotal, grandTotal };
}
