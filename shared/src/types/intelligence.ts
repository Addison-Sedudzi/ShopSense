import type { Money } from './money';
import type { VarianceCause } from './reconciliation';

export interface RestockRecommendation {
  productId: string;
  productName: string;
  suggestedQuantity: number;
  reason: string;
  // The figures Claude was actually shown to produce this recommendation —
  // included so the owner can check the reasoning against real numbers
  // instead of taking the model's word for it.
  currentStock: number;
  reorderThreshold: number;
  quantitySoldLast4Weeks: number;
  supplierName: string | null;
  supplierLeadTimeDays: number | null;
}

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
  varianceCause: VarianceCause | null;
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
