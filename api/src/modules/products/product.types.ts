import { ProductResponseBrand, type Money, type ProductResponse, type ProductUnit, type ShopId } from '@shopsense/shared';

export type { ProductResponse, ProductUnit };

/**
 * What the repository layer returns: the full row, including cost price.
 * Never return this type from a controller — use ProductResponse below.
 */
export interface ProductRow {
  id: string;
  shopId: ShopId;
  categoryId: string | null;
  supplierId: string | null;
  name: string;
  sku: string | null;
  unit: ProductUnit;
  unitsPerCarton: number | null;
  costPrice: Money;
  sellingPrice: Money;
  reorderThreshold: number;
  currentStock: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
    currentStock: row.currentStock,
    archived: row.archivedAt !== null,
  };
}
