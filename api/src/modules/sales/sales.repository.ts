import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  addMoney,
  moneyFromPgNumeric,
  scaleMoney,
  shopId as toShopId,
  subtractMoney,
  ZERO_MONEY,
  type Money,
  type ShopId,
} from '@shopsense/shared';
import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { moneyParam } from '../../database/money-param';
import { withTransaction } from '../../database/transaction';
import type { ProductUnit } from '../products/product.types';
import { convertToBaseUnit } from '../products/unit-conversion';
import type {
  DiscountInput,
  DiscountRow,
  DiscountType,
  SaleItemInput,
  SaleItemRow,
  SaleRow,
  SaleStatus,
} from './sale.types';

interface Queryable {
  query<T extends QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
}

export interface RecordSaleInput {
  idempotencyKey: string;
  items: SaleItemInput[];
  saleDiscount?: DiscountInput;
}

interface ResolvedDiscount {
  discountType: DiscountType;
  discountValue: number;
  amount: Money;
}

/** Resolves a client-supplied discount against the amount it applies to, in Money,
 * never trusting a percentage or fixed amount the client sends without re-deriving
 * the actual currency figure from it here. */
function computeDiscount(base: Money, discount: DiscountInput | undefined, label: string): ResolvedDiscount | null {
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

function priceForUnit(
  unit: ProductUnit,
  product: { unit: ProductUnit; unitsPerCarton: number | null; sellingPrice: Money },
): Money {
  if (unit === product.unit) return product.sellingPrice;
  // convertToBaseUnit() validates unitsPerCarton is set and rejects the
  // unsupported piece-from-carton combination before this is ever reached.
  return scaleMoney(product.sellingPrice, product.unitsPerCarton as number);
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === '23505';
}

@Injectable()
export class SalesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async record(shopId: ShopId, userId: string, input: RecordSaleInput): Promise<SaleRow> {
    const existing = await this.fetchFullSaleByIdempotencyKey(this.pool, shopId, input.idempotencyKey);
    if (existing) return existing;

    try {
      return await withTransaction(this.pool, (client) => this.recordWithinTransaction(client, shopId, userId, input));
    } catch (err) {
      // Two identical retries can both pass the pre-check above and race each
      // other into the transaction; the unique index on (shop_id, idempotency_key)
      // is the real guard, and this recovers the loser's response instead of
      // surfacing a raw constraint-violation 500.
      if (isUniqueViolation(err)) {
        const winner = await this.fetchFullSaleByIdempotencyKey(this.pool, shopId, input.idempotencyKey);
        if (winner) return winner;
      }
      throw err;
    }
  }

  private async recordWithinTransaction(
    client: PoolClient,
    shopId: ShopId,
    userId: string,
    input: RecordSaleInput,
  ): Promise<SaleRow> {
    let subtotal: Money = ZERO_MONEY;
    let itemDiscountTotal: Money = ZERO_MONEY;

    interface PreparedItem {
      productId: string;
      productName: string;
      unit: ProductUnit;
      quantity: number;
      unitPriceSnapshot: Money;
      lineSubtotal: Money;
      quantityDeltaBaseUnit: number;
      discount: ResolvedDiscount | null;
    }
    const prepared: PreparedItem[] = [];

    for (const item of input.items) {
      // Row-level lock on the product row serializes concurrent sales of the
      // same product: a second transaction's FOR UPDATE blocks until this one
      // commits or rolls back, so its stock SUM afterwards always reflects this
      // sale's movement. The ledger has no stored counter to lock directly, so
      // the product row stands in as the lock target for "this product's stock".
      const productResult = await client.query<{
        id: string;
        name: string;
        base_unit: ProductUnit;
        units_per_carton: number | null;
        selling_price: Money;
      }>(
        `select id, name, base_unit, units_per_carton, selling_price
         from products
         where id = $1 and shop_id = $2 and archived_at is null
         for update`,
        [item.productId, shopId],
      );
      const product = productResult.rows[0];
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      const quantityDeltaBaseUnit = convertToBaseUnit(item.quantity, item.unit, {
        unit: product.base_unit,
        unitsPerCarton: product.units_per_carton,
      });

      const stockResult = await client.query<{ current_stock: string | null }>(
        'select sum(quantity_delta) as current_stock from stock_movements where product_id = $1',
        [product.id],
      );
      const currentStock = Number(stockResult.rows[0]?.current_stock ?? 0);
      if (currentStock < quantityDeltaBaseUnit) {
        throw new ConflictException(
          `Insufficient stock for ${product.name}: have ${currentStock}, need ${quantityDeltaBaseUnit}`,
        );
      }

      const unitPriceSnapshot = priceForUnit(item.unit, {
        unit: product.base_unit,
        unitsPerCarton: product.units_per_carton,
        sellingPrice: product.selling_price,
      });
      const lineSubtotal = scaleMoney(unitPriceSnapshot, item.quantity);
      const discount = computeDiscount(lineSubtotal, item.discount, 'Item');

      subtotal = addMoney(subtotal, lineSubtotal);
      if (discount) itemDiscountTotal = addMoney(itemDiscountTotal, discount.amount);

      prepared.push({
        productId: product.id,
        productName: product.name,
        unit: item.unit,
        quantity: item.quantity,
        unitPriceSnapshot,
        lineSubtotal,
        quantityDeltaBaseUnit,
        discount,
      });
    }

    const preSaleDiscountTotal = subtractMoney(subtotal, itemDiscountTotal);
    const saleDiscount = computeDiscount(preSaleDiscountTotal, input.saleDiscount, 'Sale');
    const discountTotal = addMoney(itemDiscountTotal, saleDiscount?.amount ?? ZERO_MONEY);
    const grandTotal = subtractMoney(preSaleDiscountTotal, saleDiscount?.amount ?? ZERO_MONEY);

    const saleResult = await client.query<{ id: string; created_at: string }>(
      `insert into sales (shop_id, sold_by, status, subtotal, discount_total, grand_total, idempotency_key)
       values ($1, $2, 'completed', $3, $4, $5, $6)
       returning id, created_at`,
      [shopId, userId, moneyParam(subtotal), moneyParam(discountTotal), moneyParam(grandTotal), input.idempotencyKey],
    );
    const saleId = saleResult.rows[0].id;

    const items: SaleItemRow[] = [];
    for (const item of prepared) {
      const itemResult = await client.query<{ id: string }>(
        `insert into sale_items
           (sale_id, product_id, product_name_snapshot, unit, quantity, unit_price_snapshot, line_subtotal)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id`,
        [
          saleId,
          item.productId,
          item.productName,
          item.unit,
          item.quantity,
          moneyParam(item.unitPriceSnapshot),
          moneyParam(item.lineSubtotal),
        ],
      );
      const saleItemId = itemResult.rows[0].id;

      let discountRow: DiscountRow | null = null;
      if (item.discount) {
        discountRow = await this.insertDiscount(client, shopId, saleId, saleItemId, userId, item.discount);
      }

      await client.query(
        `insert into stock_movements (shop_id, product_id, movement_type, quantity_delta, reference_sale_id, recorded_by)
         values ($1, $2, 'sale', $3, $4, $5)`,
        [shopId, item.productId, -item.quantityDeltaBaseUnit, saleId, userId],
      );

      items.push({
        id: saleItemId,
        productId: item.productId,
        productNameSnapshot: item.productName,
        unit: item.unit,
        quantity: item.quantity,
        unitPriceSnapshot: item.unitPriceSnapshot,
        lineSubtotal: item.lineSubtotal,
        discount: discountRow,
      });
    }

    let saleDiscountRow: DiscountRow | null = null;
    if (saleDiscount) {
      saleDiscountRow = await this.insertDiscount(client, shopId, saleId, null, userId, saleDiscount);
    }

    return {
      id: saleId,
      shopId,
      soldBy: userId,
      status: 'completed',
      subtotal,
      discountTotal,
      grandTotal,
      idempotencyKey: input.idempotencyKey,
      createdAt: saleResult.rows[0].created_at,
      items,
      saleDiscount: saleDiscountRow,
    };
  }

  private async insertDiscount(
    client: PoolClient,
    shopId: ShopId,
    saleId: string,
    saleItemId: string | null,
    userId: string,
    discount: ResolvedDiscount,
  ): Promise<DiscountRow> {
    const result = await client.query<{ id: string }>(
      `insert into discounts (shop_id, sale_id, sale_item_id, discount_type, discount_value, amount, applied_by)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id`,
      [shopId, saleId, saleItemId, discount.discountType, discount.discountValue, moneyParam(discount.amount), userId],
    );
    return {
      id: result.rows[0].id,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      amount: discount.amount,
      reason: null,
    };
  }

  async findById(shopId: ShopId, saleId: string): Promise<SaleRow | null> {
    return this.fetchFullSale(this.pool, shopId, saleId);
  }

  private async fetchFullSaleByIdempotencyKey(
    queryable: Queryable,
    shopId: ShopId,
    idempotencyKey: string,
  ): Promise<SaleRow | null> {
    const result = await queryable.query<{ id: string }>(
      'select id from sales where shop_id = $1 and idempotency_key = $2',
      [shopId, idempotencyKey],
    );
    if (result.rows.length === 0) return null;
    return this.fetchFullSale(queryable, shopId, result.rows[0].id);
  }

  private async fetchFullSale(queryable: Queryable, shopId: ShopId, saleId: string): Promise<SaleRow | null> {
    const saleResult = await queryable.query<{
      id: string;
      shop_id: string;
      sold_by: string | null;
      status: SaleStatus;
      subtotal: Money;
      discount_total: Money;
      grand_total: Money;
      idempotency_key: string | null;
      created_at: string;
    }>(
      `select id, shop_id, sold_by, status, subtotal, discount_total, grand_total, idempotency_key, created_at
       from sales where id = $1 and shop_id = $2`,
      [saleId, shopId],
    );
    if (saleResult.rows.length === 0) return null;
    const sale = saleResult.rows[0];

    const itemsResult = await queryable.query<{
      id: string;
      product_id: string;
      product_name_snapshot: string;
      unit: ProductUnit;
      quantity: number;
      unit_price_snapshot: Money;
      line_subtotal: Money;
    }>(
      `select id, product_id, product_name_snapshot, unit, quantity, unit_price_snapshot, line_subtotal
       from sale_items where sale_id = $1 order by created_at`,
      [saleId],
    );

    // discount_value is cast to text here to bypass the NUMERIC->Money pg type
    // parser from DatabaseModule: it's a rate/quantity (percentage or raw
    // amount), not itself a Money value the way `amount` is, and running it
    // through moneyFromPgNumeric's 2-decimal money parsing would misread it.
    const discountsResult = await queryable.query<{
      id: string;
      sale_item_id: string | null;
      discount_type: DiscountType;
      discount_value: string;
      amount: Money;
      reason: string | null;
    }>(
      `select id, sale_item_id, discount_type, discount_value::text as discount_value, amount, reason
       from discounts where sale_id = $1`,
      [saleId],
    );

    const discountsByItemId = new Map<string, DiscountRow>();
    let saleDiscountRow: DiscountRow | null = null;
    for (const row of discountsResult.rows) {
      const discountRow: DiscountRow = {
        id: row.id,
        discountType: row.discount_type,
        discountValue: Number(row.discount_value),
        amount: row.amount,
        reason: row.reason,
      };
      if (row.sale_item_id) {
        discountsByItemId.set(row.sale_item_id, discountRow);
      } else {
        saleDiscountRow = discountRow;
      }
    }

    const items: SaleItemRow[] = itemsResult.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      productNameSnapshot: row.product_name_snapshot,
      unit: row.unit,
      quantity: row.quantity,
      unitPriceSnapshot: row.unit_price_snapshot,
      lineSubtotal: row.line_subtotal,
      discount: discountsByItemId.get(row.id) ?? null,
    }));

    return {
      id: sale.id,
      shopId: toShopId(sale.shop_id),
      soldBy: sale.sold_by,
      status: sale.status,
      subtotal: sale.subtotal,
      discountTotal: sale.discount_total,
      grandTotal: sale.grand_total,
      idempotencyKey: sale.idempotency_key,
      createdAt: sale.created_at,
      items,
      saleDiscount: saleDiscountRow,
    };
  }
}
