import { BadRequestException } from '@nestjs/common';
import { addMoney, moneyFromPgNumeric, scaleMoney, subtractMoney, sumMoney, ZERO_MONEY, type Money } from '@shopsense/shared';
import type { ProductUnit } from '../products/product.types';
import type { DiscountInput, DiscountType } from './sale.types';

export interface ResolvedDiscount {
  discountType: DiscountType;
  discountValue: number;
  amount: Money;
}

/**
 * Resolves a client-supplied discount against the amount it applies to, in Money,
 * never trusting a percentage or fixed amount the client sends without re-deriving
 * the actual currency figure from it here. Pure function — no DB access — kept
 * separate from SalesRepository specifically so the arithmetic can be unit
 * tested without a database.
 */
export function computeDiscount(
  base: Money,
  discount: DiscountInput | undefined,
  label: string,
): ResolvedDiscount | null {
  if (!discount) return null;

  const rawValue = Number(discount.value);
  let amount: Money;
  if (discount.type === 'percentage') {
    if (rawValue < 0 || rawValue > 100) {
      throw new BadRequestException(`${label} percentage discount must be between 0 and 100`);
    }
    amount = scaleMoney(base, rawValue / 100);
  } else {
    amount = moneyFromPgNumeric(discount.value);
  }

  if (amount > base) {
    throw new BadRequestException(`${label} discount cannot exceed the amount it applies to`);
  }

  return { discountType: discount.type, discountValue: rawValue, amount };
}

/** The price for one unit of `unit`, derived from the product's own base-unit
 * selling price — a carton is priced as unitsPerCarton times the base price,
 * there is no separately stored carton price. */
export function priceForUnit(
  unit: ProductUnit,
  product: { unit: ProductUnit; unitsPerCarton: number | null; sellingPrice: Money },
): Money {
  if (unit === product.unit) return product.sellingPrice;
  // convertToBaseUnit() validates unitsPerCarton is set and rejects the
  // unsupported piece-from-carton combination before this is ever reached.
  return scaleMoney(product.sellingPrice, product.unitsPerCarton as number);
}

export interface LineTotals {
  lineSubtotal: Money;
  discount: ResolvedDiscount | null;
}

export interface SaleTotals {
  subtotal: Money;
  itemDiscountTotal: Money;
  preSaleDiscountTotal: Money;
  saleDiscount: ResolvedDiscount | null;
  discountTotal: Money;
  grandTotal: Money;
}

/** Combines every line's subtotal and item-level discount into the sale-wide
 * figures, then resolves the sale-level discount against what's left after
 * item discounts — so a sale discount can never effectively exceed 100% of
 * what the customer still owes after their item-level discounts are applied. */
export function computeSaleTotals(lines: LineTotals[], saleDiscountInput: DiscountInput | undefined): SaleTotals {
  const subtotal = sumMoney(lines.map((line) => line.lineSubtotal));
  const itemDiscountTotal = sumMoney(lines.map((line) => line.discount?.amount ?? ZERO_MONEY));
  const preSaleDiscountTotal = subtractMoney(subtotal, itemDiscountTotal);
  const saleDiscount = computeDiscount(preSaleDiscountTotal, saleDiscountInput, 'Sale');
  const discountTotal = addMoney(itemDiscountTotal, saleDiscount?.amount ?? ZERO_MONEY);
  const grandTotal = subtractMoney(preSaleDiscountTotal, saleDiscount?.amount ?? ZERO_MONEY);

  return { subtotal, itemDiscountTotal, preSaleDiscountTotal, saleDiscount, discountTotal, grandTotal };
}
