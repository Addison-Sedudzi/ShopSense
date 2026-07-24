import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Money, ShopId } from '@shopsense/shared';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../database/database.module';
import { ClaudeService } from '../claude.service';
import { IntelligenceCache } from '../intelligence-cache.service';
import { BriefingSummarySchema, type DailyBriefing, type DailyBriefingFacts } from './briefing.types';

const CACHE_TTL_MS = 60 * 60 * 1000;

const SYSTEM_PROMPT = `You write a short daily briefing for the owner of a small Ghanaian retail shop,
summarizing their sales, inventory concerns, and reconciliation status for one business day. You are
given the exact figures already computed — do not invent, recompute, or round differently than given.
Write two to four sentences a busy shop owner can read in a few seconds. Mention stock concerns only
if any were given. Mention the reconciliation only if one was submitted for the day.`;

@Injectable()
export class DailyBriefingRepository {
  private readonly logger = new Logger(DailyBriefingRepository.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly claude: ClaudeService,
    private readonly cache: IntelligenceCache,
  ) {}

  async getBriefing(shopId: ShopId, businessDate: string): Promise<DailyBriefing> {
    const cacheKey = `briefing:${shopId}:${businessDate}`;
    const marker = await this.activityMarker(shopId, businessDate);

    const cached = this.cache.get<DailyBriefing>(cacheKey, marker);
    if (cached) return cached;

    const facts = await this.computeFacts(shopId, businessDate);

    let summary: string;
    try {
      const result = await this.claude.structuredComplete({
        schema: BriefingSummarySchema,
        system: SYSTEM_PROMPT,
        prompt: `Facts for ${facts.businessDate}:\n${JSON.stringify(facts, null, 2)}`,
      });
      summary = result.summary;
    } catch (err) {
      this.logger.warn(`Daily briefing call failed: ${(err as Error).message}`);
      // Fall back to the raw figures with no AI narration rather than
      // failing the whole endpoint -- the numbers are the part that matters.
      summary = 'AI summary unavailable right now. See the figures above for today\'s activity.';
    }

    const briefing: DailyBriefing = { ...facts, summary };
    this.cache.set(cacheKey, briefing, CACHE_TTL_MS, marker);
    return briefing;
  }

  private async computeFacts(shopId: ShopId, businessDate: string): Promise<DailyBriefingFacts> {
    const salesResult = await this.pool.query<{ total_sales: Money; sale_count: string }>(
      `select coalesce(sum(grand_total), 0) as total_sales, count(*) as sale_count
       from sales
       where shop_id = $1 and status = 'completed' and created_at::date = $2::date`,
      [shopId, businessDate],
    );

    const performanceResult = await this.pool.query<{ product_name_snapshot: string; qty: string }>(
      `select si.product_name_snapshot, sum(si.quantity) as qty
       from sale_items si
       join sales s on s.id = si.sale_id
       where s.shop_id = $1 and s.status = 'completed' and s.created_at::date = $2::date
       group by si.product_name_snapshot
       order by qty desc`,
      [shopId, businessDate],
    );

    const lowStockResult = await this.pool.query<{
      name: string;
      current_stock: string;
      reorder_threshold: number;
    }>(
      `select p.name, coalesce(sm.current_stock, 0) as current_stock, p.reorder_threshold
       from products p
       left join (
         select product_id, sum(quantity_delta) as current_stock
         from stock_movements
         group by product_id
       ) sm on sm.product_id = p.id
       where p.shop_id = $1 and p.archived_at is null
         and coalesce(sm.current_stock, 0) <= p.reorder_threshold
       order by p.name`,
      [shopId],
    );

    const reconciliationResult = await this.pool.query<{ variance: Money; variance_cause: string | null }>(
      `select variance, variance_cause from reconciliations where shop_id = $1 and business_date = $2::date`,
      [shopId, businessDate],
    );

    const performances = performanceResult.rows.map((row) => ({
      productName: row.product_name_snapshot,
      quantitySold: Number(row.qty),
    }));

    return {
      businessDate,
      totalSales: salesResult.rows[0].total_sales,
      saleCount: Number(salesResult.rows[0].sale_count),
      bestPerformer: performances[0] ?? null,
      worstPerformer: performances.length > 1 ? performances[performances.length - 1] : null,
      lowStockProducts: lowStockResult.rows.map((row) => ({
        productName: row.name,
        currentStock: Number(row.current_stock),
        reorderThreshold: row.reorder_threshold,
      })),
      reconciliation: reconciliationResult.rows[0]
        ? {
            submitted: true,
            variance: reconciliationResult.rows[0].variance,
            varianceCause: reconciliationResult.rows[0].variance_cause,
          }
        : { submitted: false, variance: null, varianceCause: null },
    };
  }

  private async activityMarker(shopId: ShopId, businessDate: string): Promise<string> {
    const result = await this.pool.query<{ marker: string | null }>(
      `select greatest(
         coalesce((select max(created_at) from sales where shop_id = $1 and created_at::date = $2::date), '-infinity'),
         coalesce((select max(submitted_at) from reconciliations where shop_id = $1 and business_date = $2::date), '-infinity')
       )::text as marker`,
      [shopId, businessDate],
    );
    return result.rows[0]?.marker ?? '';
  }
}
