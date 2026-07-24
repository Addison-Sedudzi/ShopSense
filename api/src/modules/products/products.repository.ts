import { Inject, Injectable } from '@nestjs/common';
import { moneyFromPgNumeric, shopId as toShopId, type ShopId } from '@shopsense/shared';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { ProductRow } from './product.types';

interface ProductRowDb {
  id: string;
  shop_id: string;
  category_id: string | null;
  supplier_id: string | null;
  name: string;
  sku: string | null;
  base_unit: 'piece' | 'carton';
  units_per_carton: number | null;
  cost_price: string;
  selling_price: string;
  reorder_threshold: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

function toProductRow(row: ProductRowDb): ProductRow {
  return {
    id: row.id,
    shopId: toShopId(row.shop_id),
    categoryId: row.category_id,
    supplierId: row.supplier_id,
    name: row.name,
    sku: row.sku,
    unit: row.base_unit,
    unitsPerCarton: row.units_per_carton,
    costPrice: moneyFromPgNumeric(row.cost_price),
    sellingPrice: moneyFromPgNumeric(row.selling_price),
    reorderThreshold: row.reorder_threshold,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class ProductsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByShop(shopId: ShopId): Promise<ProductRow[]> {
    const result = await this.pool.query<ProductRowDb>(
      `select id, shop_id, category_id, supplier_id, name, sku, base_unit,
              units_per_carton, cost_price, selling_price, reorder_threshold,
              archived_at, created_at, updated_at
       from products
       where shop_id = $1 and archived_at is null
       order by name`,
      [shopId],
    );
    return result.rows.map(toProductRow);
  }
}
