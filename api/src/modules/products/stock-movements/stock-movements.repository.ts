import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { shopId as toShopId, type Money, type ShopId } from '@shopsense/shared';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../database/database.module';
import { withTransaction } from '../../../database/transaction';
import type { ClientMovementType, StockMovementRow } from './stock-movement.types';

interface StockMovementRowDb {
  id: string;
  shop_id: string;
  product_id: string;
  movement_type: StockMovementRow['movementType'];
  quantity_delta: number;
  unit_cost: Money | null;
  reason: string | null;
  recorded_by: string | null;
  created_at: string;
}

function toStockMovementRow(row: StockMovementRowDb): StockMovementRow {
  return {
    id: row.id,
    shopId: toShopId(row.shop_id),
    productId: row.product_id,
    movementType: row.movement_type,
    quantityDelta: row.quantity_delta,
    unitCost: row.unit_cost,
    reason: row.reason,
    recordedBy: row.recorded_by,
    createdAt: row.created_at,
  };
}

export interface RecordMovementInput {
  productId: string;
  movementType: ClientMovementType;
  quantityDelta: number;
  unitCost: Money | null;
  reason: string | null;
  recordedBy: string;
}

@Injectable()
export class StockMovementsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByProduct(shopId: ShopId, productId: string): Promise<StockMovementRow[]> {
    const result = await this.pool.query<StockMovementRowDb>(
      `select id, shop_id, product_id, movement_type, quantity_delta, unit_cost, reason, recorded_by, created_at
       from stock_movements
       where shop_id = $1 and product_id = $2
       order by created_at desc`,
      [shopId, productId],
    );
    return result.rows.map(toStockMovementRow);
  }

  /**
   * Verifies the product belongs to this shop and isn't archived, then writes the
   * movement, both inside one transaction — otherwise a movement could be recorded
   * an instant after the existence check for a product that turns out to belong to
   * a different shop.
   */
  async record(shopId: ShopId, input: RecordMovementInput): Promise<StockMovementRow> {
    return withTransaction(this.pool, async (client) => {
      const product = await client.query(
        'select id from products where id = $1 and shop_id = $2 and archived_at is null',
        [input.productId, shopId],
      );
      if (product.rows.length === 0) {
        throw new NotFoundException('Product not found');
      }

      const result = await client.query<StockMovementRowDb>(
        `insert into stock_movements
           (shop_id, product_id, movement_type, quantity_delta, unit_cost, reason, recorded_by)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id, shop_id, product_id, movement_type, quantity_delta, unit_cost, reason, recorded_by, created_at`,
        [
          shopId,
          input.productId,
          input.movementType,
          input.quantityDelta,
          input.unitCost,
          input.reason,
          input.recordedBy,
        ],
      );
      return toStockMovementRow(result.rows[0]);
    });
  }
}
