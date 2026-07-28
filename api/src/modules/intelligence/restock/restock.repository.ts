import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ShopId } from '@shopsense/shared';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../database/database.module';
import { ClaudeService } from '../claude.service';
import { IntelligenceCache } from '../intelligence-cache.service';
import { buildRestockSchema, type RestockCandidate, type RestockRecommendation } from './restock.types';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour backstop; activity marker invalidates sooner

const SYSTEM_PROMPT = `You are an inventory reordering assistant for a small Ghanaian retail shop.
You are given products that have fallen to or below their reorder threshold, along with their
recent sales velocity and supplier lead time. For each product that genuinely needs restocking,
recommend a specific reorder quantity and give a short, concrete, plain-language reason grounded
in the numbers you were given (e.g. sales pace vs. lead time, how close to zero stock is).
Do not recommend reordering a product with essentially no recent sales and stock still well above
zero — a low reorder_threshold does not by itself mean action is needed. Never invent a product
that was not in the list you were given.`;

@Injectable()
export class RestockRecommendationsRepository {
  private readonly logger = new Logger(RestockRecommendationsRepository.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly claude: ClaudeService,
    private readonly cache: IntelligenceCache,
  ) {}

  async getRecommendations(shopId: ShopId): Promise<RestockRecommendation[]> {
    const cacheKey = `restock:${shopId}`;
    const marker = await this.lastActivityMarker(shopId);

    const cached = this.cache.get<RestockRecommendation[]>(cacheKey, marker);
    if (cached) return cached;

    const candidates = await this.fetchCandidates(shopId);
    if (candidates.length === 0) {
      this.cache.set(cacheKey, [], CACHE_TTL_MS, marker);
      return [];
    }

    let recommendations: RestockRecommendation[];
    try {
      recommendations = await this.recommendFor(candidates);
    } catch (err) {
      // A failed or malformed AI call should degrade to "no recommendation
      // available" for this cache window, not a 500 on an otherwise-working
      // products/inventory endpoint the AI layer merely augments.
      this.logger.warn(`Restock recommendation call failed: ${(err as Error).message}`);
      return [];
    }

    this.cache.set(cacheKey, recommendations, CACHE_TTL_MS, marker);
    return recommendations;
  }

  private async recommendFor(candidates: RestockCandidate[]): Promise<RestockRecommendation[]> {
    const schema = buildRestockSchema(candidates.map((c) => c.productId));
    const payload = candidates.map((c) => ({
      productId: c.productId,
      name: c.productName,
      currentStock: c.currentStock,
      reorderThreshold: c.reorderThreshold,
      unitsSoldLast4Weeks: c.quantitySoldLast4Weeks,
      supplier: c.supplierName,
      supplierLeadTimeDays: c.supplierLeadTimeDays,
    }));

    const result = await this.claude.structuredComplete({
      schema,
      system: SYSTEM_PROMPT,
      prompt: `Products at or below their reorder threshold:\n${JSON.stringify(payload, null, 2)}`,
    });

    const byId = new Map(candidates.map((c) => [c.productId, c]));
    return result.recommendations.map((r) => {
      const candidate = byId.get(r.productId);
      return {
        productId: r.productId,
        // Product name and every figure below are taken from our own data,
        // not echoed back from Claude — the model only ever supplies the
        // suggested quantity and the reasoning text.
        productName: candidate?.productName ?? r.productId,
        suggestedQuantity: r.suggestedQuantity,
        reason: r.reason,
        currentStock: candidate?.currentStock ?? 0,
        reorderThreshold: candidate?.reorderThreshold ?? 0,
        quantitySoldLast4Weeks: candidate?.quantitySoldLast4Weeks ?? 0,
        supplierName: candidate?.supplierName ?? null,
        supplierLeadTimeDays: candidate?.supplierLeadTimeDays ?? null,
      };
    });
  }

  private async fetchCandidates(shopId: ShopId): Promise<RestockCandidate[]> {
    const result = await this.pool.query<{
      id: string;
      name: string;
      reorder_threshold: number;
      current_stock: string;
      qty_sold_4w: string;
      supplier_name: string | null;
      lead_time_days: number | null;
    }>(
      `select
         p.id, p.name, p.reorder_threshold,
         coalesce(sm.current_stock, 0) as current_stock,
         coalesce(sold.qty_sold_4w, 0) as qty_sold_4w,
         s.name as supplier_name, s.lead_time_days
       from products p
       left join (
         select product_id, sum(quantity_delta) as current_stock
         from stock_movements
         group by product_id
       ) sm on sm.product_id = p.id
       left join (
         select product_id, sum(-quantity_delta) as qty_sold_4w
         from stock_movements
         where movement_type = 'sale' and created_at >= now() - interval '28 days'
         group by product_id
       ) sold on sold.product_id = p.id
       left join suppliers s on s.id = p.supplier_id
       where p.shop_id = $1 and p.archived_at is null
         and coalesce(sm.current_stock, 0) <= p.reorder_threshold
       order by p.name`,
      [shopId],
    );
    return result.rows.map((row) => ({
      productId: row.id,
      productName: row.name,
      reorderThreshold: row.reorder_threshold,
      currentStock: Number(row.current_stock),
      quantitySoldLast4Weeks: Number(row.qty_sold_4w),
      supplierName: row.supplier_name,
      supplierLeadTimeDays: row.lead_time_days,
    }));
  }

  private async lastActivityMarker(shopId: ShopId): Promise<string> {
    const result = await this.pool.query<{ marker: string | null }>(
      `select greatest(
         coalesce((select max(created_at) from stock_movements where shop_id = $1), '-infinity'),
         coalesce((select max(updated_at) from products where shop_id = $1), '-infinity')
       )::text as marker`,
      [shopId],
    );
    return result.rows[0]?.marker ?? '';
  }
}
