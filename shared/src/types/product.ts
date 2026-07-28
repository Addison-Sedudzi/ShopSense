import type { Money } from './money';

export type ProductUnit = 'piece' | 'carton';

export const ProductResponseBrand: unique symbol = Symbol('ProductResponseBrand');

/**
 * What GET /api/products (and friends) actually return to a client — no cost
 * price. The brand is attached only by the backend's toProductResponse();
 * this package just needs the shape so the frontend can type what it
 * receives, never to construct one itself.
 */
export interface ProductResponse {
  readonly [ProductResponseBrand]: true;
  id: string;
  categoryId: string | null;
  name: string;
  sku: string | null;
  unit: ProductUnit;
  unitsPerCarton: number | null;
  sellingPrice: Money;
  reorderThreshold: number;
  currentStock: number;
  archived: boolean;
}

/**
 * What GET /api/products/inventory returns — includes cost price and the
 * derived margin. Deliberately a *different* endpoint from GET /api/products
 * (which ProductResponse above serves): the sale terminal's product search
 * has no business seeing cost price, but the inventory management screens
 * an owner uses to manage their own stock legitimately need it. No brand —
 * unlike ProductResponse, nothing needs to stop a bare row from being
 * returned here, since this endpoint's whole purpose is showing cost data.
 */
export interface ProductInventoryRow {
  id: string;
  categoryId: string | null;
  supplierId: string | null;
  name: string;
  sku: string | null;
  unit: ProductUnit;
  unitsPerCarton: number | null;
  costPrice: Money;
  sellingPrice: Money;
  margin: Money;
  reorderThreshold: number;
  currentStock: number;
  /** Units sold in the last 28 days, for the low-stock board's estimated
   * days-of-cover (currentStock / (quantitySoldLast28Days / 28)) — an
   * estimate from recent pace, not a forecast. */
  quantitySoldLast28Days: number;
  archived: boolean;
}
