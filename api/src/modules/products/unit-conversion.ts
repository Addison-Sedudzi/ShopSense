import { BadRequestException } from '@nestjs/common';
import type { ProductUnit } from './product.types';

/**
 * Converts a quantity given in `unit` into the product's base_unit, which is
 * the only unit the stock ledger ever deals in. Used by both receiving stock
 * and recording a sale, so the two never disagree about what a carton is worth.
 */
export function convertToBaseUnit(
  quantity: number,
  unit: ProductUnit,
  product: { unit: ProductUnit; unitsPerCarton: number | null },
): number {
  if (unit === product.unit) return quantity;

  if (!product.unitsPerCarton) {
    throw new BadRequestException(
      `Product has no unitsPerCarton configured, cannot use unit "${unit}"`,
    );
  }

  if (unit === 'carton') {
    return quantity * product.unitsPerCarton;
  }

  // unit === 'piece', product.unit === 'carton': selling/receiving loose
  // pieces of a product tracked by the carton isn't supported — there is no
  // well-defined per-piece price or stock count to work from.
  throw new BadRequestException('This product is tracked by carton; piece quantities are not supported');
}
