import { z } from 'zod';
import type { Money } from '@shopsense/shared';

export interface ProductPerformance {
  productName: string;
  quantitySold: number;
}

export interface LowStockItem {
  productName: string;
  currentStock: number;
  reorderThreshold: number;
}

export interface ReconciliationStatus {
  submitted: boolean;
  variance: Money | null;
  varianceCause: string | null;
}

export interface DailyBriefingFacts {
  businessDate: string;
  totalSales: Money;
  saleCount: number;
  bestPerformer: ProductPerformance | null;
  worstPerformer: ProductPerformance | null;
  lowStockProducts: LowStockItem[];
  reconciliation: ReconciliationStatus;
}

export interface DailyBriefing extends DailyBriefingFacts {
  summary: string;
}

// Claude only ever supplies the prose. Every number in DailyBriefingFacts is
// computed server-side and handed to the model as fact, not derived by it —
// language models are unreliable at exact aggregation, and every figure here
// must be independently verifiable against the underlying data.
export const BriefingSummarySchema = z.object({
  summary: z.string(),
});
