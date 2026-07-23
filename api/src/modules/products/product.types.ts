import type { Money } from '@shopsense/shared';

export type ProductUnit = 'piece' | 'carton';

/**
 * What the repository layer returns: the full row, including cost price.
 * Never return this type from a controller — use ProductResponse below.
 */
export interface ProductRow {
  id: string;
  shopId: string;
  categoryId: string | null;
  supplierId: string | null;
  name: string;
  sku: string | null;
  unit: ProductUnit;
  unitsPerCarton: number | null;
  costPrice: Money;
  sellingPrice: Money;
  reorderThreshold: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const ProductResponseBrand: unique symbol = Symbol('ProductResponseBrand');

/**
 * What a controller may return to a client. Declaring a return type of ProductResponse
 * is not enough on its own: TypeScript's structural typing lets a full ProductRow
 * satisfy it by accident, since a row already has every field a response needs plus
 * more, and the excess-property check only fires on object literals, not on a returned
 * variable. The brand below closes that gap — only toProductResponse() can produce a
 * value carrying it, so returning a bare row where a response is expected fails to compile.
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
  archived: boolean;
}

export function toProductResponse(row: ProductRow): ProductResponse {
  return {
    [ProductResponseBrand]: true,
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    sku: row.sku,
    unit: row.unit,
    unitsPerCarton: row.unitsPerCarton,
    sellingPrice: row.sellingPrice,
    reorderThreshold: row.reorderThreshold,
    archived: row.archivedAt !== null,
  };
}
