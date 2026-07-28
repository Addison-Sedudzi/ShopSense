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
