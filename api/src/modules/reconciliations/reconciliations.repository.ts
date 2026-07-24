import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { shopId as toShopId, type Money, type ShopId } from '@shopsense/shared';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { moneyParam } from '../../database/money-param';
import { classifyVariance, computeVariance } from './reconciliation-calculations';
import type { ExpectedCashSummary, ReconciliationRow, VarianceCause } from './reconciliation.types';

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === '23505';
}

@Injectable()
export class ReconciliationsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Expected cash for a date, computed fresh from sales — never stored or
   * cached, so it's always a live read of what the ledger actually says,
   * right up until the moment it's about to be locked into a submission. */
  async getExpectedCash(shopId: ShopId, businessDate: string): Promise<ExpectedCashSummary> {
    const result = await this.pool.query<{
      expected_cash: Money;
      total_discounts: Money;
      sale_count: string;
    }>(
      `select
         coalesce(sum(grand_total), 0) as expected_cash,
         coalesce(sum(discount_total), 0) as total_discounts,
         count(*) as sale_count
       from sales
       where shop_id = $1 and status = 'completed' and created_at::date = $2::date`,
      [shopId, businessDate],
    );
    const row = result.rows[0];
    return {
      businessDate,
      expectedCash: row.expected_cash,
      totalDiscounts: row.total_discounts,
      saleCount: Number(row.sale_count),
    };
  }

  async submit(
    shopId: ShopId,
    userId: string,
    businessDate: string,
    countedCash: Money,
    notes: string | null,
  ): Promise<ReconciliationRow> {
    const existing = await this.findByDate(shopId, businessDate);
    if (existing) {
      throw new ConflictException(`A reconciliation for ${businessDate} was already submitted and cannot be resubmitted`);
    }

    const summary = await this.getExpectedCash(shopId, businessDate);
    const variance = computeVariance(countedCash, summary.expectedCash);
    const varianceCause = classifyVariance(variance, summary.totalDiscounts);

    try {
      const result = await this.pool.query<{
        id: string;
        submitted_at: string;
      }>(
        `insert into reconciliations
           (shop_id, business_date, expected_cash, counted_cash, variance, variance_cause, notes, submitted_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning id, submitted_at`,
        [
          shopId,
          businessDate,
          moneyParam(summary.expectedCash),
          moneyParam(countedCash),
          moneyParam(variance),
          varianceCause,
          notes,
          userId,
        ],
      );

      return {
        id: result.rows[0].id,
        shopId,
        businessDate,
        expectedCash: summary.expectedCash,
        countedCash,
        variance,
        varianceCause,
        notes,
        submittedBy: userId,
        submittedAt: result.rows[0].submitted_at,
      };
    } catch (err) {
      // A double-submit race (two requests for the same date landing at once)
      // is caught here by the unique (shop_id, business_date) index — the
      // pre-check above closes the common case, this closes the race.
      if (isUniqueViolation(err)) {
        throw new ConflictException(`A reconciliation for ${businessDate} was already submitted and cannot be resubmitted`);
      }
      throw err;
    }
  }

  async findByDate(shopId: ShopId, businessDate: string): Promise<ReconciliationRow | null> {
    const result = await this.pool.query<ReconciliationRowDb>(
      `select id, shop_id, business_date, expected_cash, counted_cash, variance, variance_cause, notes, submitted_by, submitted_at
       from reconciliations
       where shop_id = $1 and business_date = $2::date`,
      [shopId, businessDate],
    );
    return result.rows[0] ? toReconciliationRow(result.rows[0]) : null;
  }

  async findAll(shopId: ShopId): Promise<ReconciliationRow[]> {
    const result = await this.pool.query<ReconciliationRowDb>(
      `select id, shop_id, business_date, expected_cash, counted_cash, variance, variance_cause, notes, submitted_by, submitted_at
       from reconciliations
       where shop_id = $1
       order by business_date desc`,
      [shopId],
    );
    return result.rows.map(toReconciliationRow);
  }
}

interface ReconciliationRowDb {
  id: string;
  shop_id: string;
  business_date: string;
  expected_cash: Money;
  counted_cash: Money;
  variance: Money;
  variance_cause: VarianceCause | null;
  notes: string | null;
  submitted_by: string | null;
  submitted_at: string;
}

function toReconciliationRow(row: ReconciliationRowDb): ReconciliationRow {
  return {
    id: row.id,
    shopId: toShopId(row.shop_id),
    businessDate: row.business_date,
    expectedCash: row.expected_cash,
    countedCash: row.counted_cash,
    variance: row.variance,
    varianceCause: row.variance_cause,
    notes: row.notes,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at,
  };
}
