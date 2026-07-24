import { Inject, Injectable } from '@nestjs/common';
import { shopId as toShopId, type Money, type ShopId } from '@shopsense/shared';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type { ProductRow, ProductUnit } from './product.types';

// cost_price/selling_price arrive already converted to Money: DatabaseModule
// registers a pg type parser for NUMERIC that runs moneyFromPgNumeric once,
// centrally, instead of every repository having to remember to call it.
interface ProductRowDb {
  id: string;
  shop_id: string;
  category_id: string | null;
  supplier_id: string | null;
  name: string;
  sku: string | null;
  base_unit: ProductUnit;
  units_per_carton: number | null;
  cost_price: Money;
  selling_price: Money;
  reorder_threshold: number;
  current_stock: string;
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
    costPrice: row.cost_price,
    sellingPrice: row.selling_price,
    reorderThreshold: row.reorder_threshold,
    // sum(integer) comes back from pg as a string (it doesn't know the sum fits
    // in a JS number), so this one column needs an explicit, deliberate parse.
    currentStock: Number(row.current_stock),
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLUMNS = `
  p.id, p.shop_id, p.category_id, p.supplier_id, p.name, p.sku, p.base_unit,
  p.units_per_carton, p.cost_price, p.selling_price, p.reorder_threshold,
  p.archived_at, p.created_at, p.updated_at,
  coalesce(sm.current_stock, 0) as current_stock
`;

// Aggregating stock_movements per product via a join rather than pulling
// movements into JS and summing: cheap today, and the index on
// stock_movements(shop_id, product_id) keeps it cheap as the ledger grows.
// A materialised view would be the next step if this ever shows up in a
// slow query log.
const FROM_WITH_STOCK = `
  from products p
  left join (
    select product_id, sum(quantity_delta) as current_stock
    from stock_movements
    group by product_id
  ) sm on sm.product_id = p.id
`;

export interface CreateProductInput {
  name: string;
  sku: string | null;
  categoryId: string | null;
  supplierId: string | null;
  unit: ProductUnit;
  unitsPerCarton: number | null;
  costPrice: Money;
  sellingPrice: Money;
  reorderThreshold: number;
}

// Fields a client did not send stay unchanged (see the coalesce() in update()
// below); there is deliberately no way to null out categoryId/supplierId
// through this method — clearing a relation is a bigger decision than a
// plain field edit and is left out of scope here.
export type UpdateProductInput = Partial<CreateProductInput>;

@Injectable()
export class ProductsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByShop(shopId: ShopId): Promise<ProductRow[]> {
    const result = await this.pool.query<ProductRowDb>(
      `select ${SELECT_COLUMNS} ${FROM_WITH_STOCK}
       where p.shop_id = $1 and p.archived_at is null
       order by p.name`,
      [shopId],
    );
    return result.rows.map(toProductRow);
  }

  async findById(shopId: ShopId, productId: string): Promise<ProductRow | null> {
    const result = await this.pool.query<ProductRowDb>(
      `select ${SELECT_COLUMNS} ${FROM_WITH_STOCK}
       where p.id = $1 and p.shop_id = $2`,
      [productId, shopId],
    );
    return result.rows[0] ? toProductRow(result.rows[0]) : null;
  }

  async create(shopId: ShopId, input: CreateProductInput): Promise<ProductRow> {
    const result = await this.pool.query<ProductRowDb>(
      `with inserted as (
         insert into products (
           shop_id, category_id, supplier_id, name, sku, base_unit,
           units_per_carton, cost_price, selling_price, reorder_threshold
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         returning *
       )
       select ${SELECT_COLUMNS}
       from inserted p
       left join (
         select product_id, sum(quantity_delta) as current_stock
         from stock_movements
         group by product_id
       ) sm on sm.product_id = p.id`,
      [
        shopId,
        input.categoryId,
        input.supplierId,
        input.name,
        input.sku,
        input.unit,
        input.unitsPerCarton,
        input.costPrice,
        input.sellingPrice,
        input.reorderThreshold,
      ],
    );
    return toProductRow(result.rows[0]);
  }

  async update(
    shopId: ShopId,
    productId: string,
    input: UpdateProductInput,
  ): Promise<ProductRow | null> {
    const result = await this.pool.query<ProductRowDb>(
      `with updated as (
         update products set
           name = coalesce($3, name),
           sku = coalesce($4, sku),
           base_unit = coalesce($5, base_unit),
           units_per_carton = coalesce($6, units_per_carton),
           cost_price = coalesce($7, cost_price),
           selling_price = coalesce($8, selling_price),
           reorder_threshold = coalesce($9, reorder_threshold),
           updated_at = now()
         where id = $1 and shop_id = $2 and archived_at is null
         returning *
       )
       select ${SELECT_COLUMNS}
       from updated p
       left join (
         select product_id, sum(quantity_delta) as current_stock
         from stock_movements
         group by product_id
       ) sm on sm.product_id = p.id`,
      [
        productId,
        shopId,
        input.name ?? null,
        input.sku ?? null,
        input.unit ?? null,
        input.unitsPerCarton ?? null,
        input.costPrice ?? null,
        input.sellingPrice ?? null,
        input.reorderThreshold ?? null,
      ],
    );
    return result.rows[0] ? toProductRow(result.rows[0]) : null;
  }

  /** Archives rather than deletes: a deleted product would orphan past sale
   * line items and stock movements that reference it, breaking receipt history. */
  async archive(shopId: ShopId, productId: string): Promise<boolean> {
    const result = await this.pool.query(
      `update products set archived_at = now(), updated_at = now()
       where id = $1 and shop_id = $2 and archived_at is null`,
      [productId, shopId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
