import { Inject, Injectable } from '@nestjs/common';
import { addMoney, ZERO_MONEY, type Money, type ShopId } from '@shopsense/shared';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import type {
  CategoryMargin,
  DailySalesSummary,
  DiscountImpactReport,
  DiscountLevel,
  ProductMargin,
  ProductRankMetric,
  ProductRankOrder,
  ProductRanking,
  StockValuationReport,
} from './report.types';

@Injectable()
export class ReportsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async salesSummary(shopId: ShopId, from: string, to: string): Promise<DailySalesSummary[]> {
    const result = await this.pool.query<{
      day: string;
      sale_count: string;
      subtotal: Money;
      discount_total: Money;
      grand_total: Money;
    }>(
      `select
         date_trunc('day', created_at)::date as day,
         count(*) as sale_count,
         coalesce(sum(subtotal), 0) as subtotal,
         coalesce(sum(discount_total), 0) as discount_total,
         coalesce(sum(grand_total), 0) as grand_total
       from sales
       where shop_id = $1 and status = 'completed' and created_at::date between $2::date and $3::date
       group by date_trunc('day', created_at)
       order by day`,
      [shopId, from, to],
    );
    return result.rows.map((row) => ({
      day: row.day,
      saleCount: Number(row.sale_count),
      subtotal: row.subtotal,
      discountTotal: row.discount_total,
      grandTotal: row.grand_total,
    }));
  }

  async productRanking(
    shopId: ShopId,
    from: string,
    to: string,
    metric: ProductRankMetric,
    order: ProductRankOrder,
    limit: number,
  ): Promise<ProductRanking[]> {
    // metric/order are validated against a fixed enum by the DTO before this
    // is ever called, never raw user input, so interpolating them into the
    // ORDER BY clause (which can't be parameterized) doesn't open injection.
    const sortColumn = metric === 'quantity' ? 'total_quantity' : 'total_revenue';
    const direction = order === 'top' ? 'desc' : 'asc';

    const result = await this.pool.query<{
      product_id: string;
      product_name: string;
      total_quantity: string;
      total_revenue: Money;
    }>(
      `select
         si.product_id, si.product_name_snapshot as product_name,
         sum(si.quantity) as total_quantity,
         coalesce(sum(si.line_subtotal), 0) as total_revenue
       from sale_items si
       join sales s on s.id = si.sale_id
       where s.shop_id = $1 and s.status = 'completed' and s.created_at::date between $2::date and $3::date
       group by si.product_id, si.product_name_snapshot
       order by ${sortColumn} ${direction}
       limit $4`,
      [shopId, from, to, limit],
    );
    return result.rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      totalQuantity: Number(row.total_quantity),
      totalRevenue: row.total_revenue,
    }));
  }

  /**
   * Cost is priced at the product's *current* cost_price, not a historical
   * snapshot -- sale_items only snapshots the selling price, not cost. For a
   * product whose cost has since changed, this is an approximation of past
   * margin, not an exact one. Snapshotting cost at sale time would remove
   * this caveat but is a schema change outside B10's scope.
   */
  async marginByProduct(shopId: ShopId, from: string, to: string): Promise<ProductMargin[]> {
    const result = await this.pool.query<{
      product_id: string;
      product_name: string;
      revenue: Money;
      cost: Money;
      margin: Money;
    }>(
      `select
         p.id as product_id, p.name as product_name,
         coalesce(sum(si.line_subtotal), 0) as revenue,
         coalesce(sum(si.quantity * p.cost_price), 0) as cost,
         coalesce(sum(si.line_subtotal - si.quantity * p.cost_price), 0) as margin
       from products p
       join sale_items si on si.product_id = p.id
       join sales s on s.id = si.sale_id
       where p.shop_id = $1 and s.status = 'completed' and s.created_at::date between $2::date and $3::date
       group by p.id, p.name
       order by margin desc`,
      [shopId, from, to],
    );
    return result.rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      revenue: row.revenue,
      cost: row.cost,
      margin: row.margin,
    }));
  }

  async marginByCategory(shopId: ShopId, from: string, to: string): Promise<CategoryMargin[]> {
    const result = await this.pool.query<{
      category_name: string;
      revenue: Money;
      cost: Money;
      margin: Money;
    }>(
      `select
         coalesce(c.name, 'Uncategorized') as category_name,
         coalesce(sum(si.line_subtotal), 0) as revenue,
         coalesce(sum(si.quantity * p.cost_price), 0) as cost,
         coalesce(sum(si.line_subtotal - si.quantity * p.cost_price), 0) as margin
       from products p
       join sale_items si on si.product_id = p.id
       join sales s on s.id = si.sale_id
       left join categories c on c.id = p.category_id
       where p.shop_id = $1 and s.status = 'completed' and s.created_at::date between $2::date and $3::date
       group by coalesce(c.name, 'Uncategorized')
       order by margin desc`,
      [shopId, from, to],
    );
    return result.rows.map((row) => ({
      categoryName: row.category_name,
      revenue: row.revenue,
      cost: row.cost,
      margin: row.margin,
    }));
  }

  async stockValuation(shopId: ShopId): Promise<StockValuationReport> {
    const result = await this.pool.query<{
      product_id: string;
      product_name: string;
      current_stock: string;
      cost_price: Money;
      selling_price: Money;
      value_at_cost: Money;
      value_at_retail: Money;
    }>(
      `select
         p.id as product_id, p.name as product_name,
         coalesce(sm.current_stock, 0) as current_stock,
         p.cost_price, p.selling_price,
         coalesce(sm.current_stock, 0) * p.cost_price as value_at_cost,
         coalesce(sm.current_stock, 0) * p.selling_price as value_at_retail
       from products p
       left join (
         select product_id, sum(quantity_delta) as current_stock
         from stock_movements
         group by product_id
       ) sm on sm.product_id = p.id
       where p.shop_id = $1 and p.archived_at is null
       order by p.name`,
      [shopId],
    );

    const lines = result.rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      currentStock: Number(row.current_stock),
      costPrice: row.cost_price,
      sellingPrice: row.selling_price,
      valueAtCost: row.value_at_cost,
      valueAtRetail: row.value_at_retail,
    }));

    return {
      lines,
      totalValueAtCost: lines.reduce((sum, l) => addMoney(sum, l.valueAtCost), ZERO_MONEY),
      totalValueAtRetail: lines.reduce((sum, l) => addMoney(sum, l.valueAtRetail), ZERO_MONEY),
    };
  }

  async discountImpact(shopId: ShopId, from: string, to: string): Promise<DiscountImpactReport> {
    const linesResult = await this.pool.query<{
      discount_type: 'percentage' | 'fixed_amount';
      level: DiscountLevel;
      discount_count: string;
      total_amount: Money;
    }>(
      `select
         d.discount_type,
         case when d.sale_item_id is null then 'sale' else 'item' end as level,
         count(*) as discount_count,
         coalesce(sum(d.amount), 0) as total_amount
       from discounts d
       join sales s on s.id = d.sale_id
       where s.shop_id = $1 and s.status = 'completed' and s.created_at::date between $2::date and $3::date
       group by d.discount_type, level
       order by d.discount_type, level`,
      [shopId, from, to],
    );

    const grossResult = await this.pool.query<{ gross_sales: Money }>(
      `select coalesce(sum(subtotal), 0) as gross_sales
       from sales
       where shop_id = $1 and status = 'completed' and created_at::date between $2::date and $3::date`,
      [shopId, from, to],
    );

    const lines = linesResult.rows.map((row) => ({
      discountType: row.discount_type,
      level: row.level,
      discountCount: Number(row.discount_count),
      totalAmount: row.total_amount,
    }));
    const grossSales = grossResult.rows[0].gross_sales;
    const totalDiscounts = lines.reduce((sum, l) => addMoney(sum, l.totalAmount), ZERO_MONEY);

    return { lines, grossSales, totalDiscounts };
  }
}
