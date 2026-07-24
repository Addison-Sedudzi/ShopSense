import type { Money, ShopId } from '@shopsense/shared';

export type VarianceCause = 'discount_driven' | 'unrecorded_sale' | 'counting_error' | 'unexplained';

export interface ExpectedCashSummary {
  businessDate: string;
  expectedCash: Money;
  totalDiscounts: Money;
  saleCount: number;
}

export interface ReconciliationRow {
  id: string;
  shopId: ShopId;
  businessDate: string;
  expectedCash: Money;
  countedCash: Money;
  // Signed: negative means counted less than expected (a shortage), positive
  // means counted more (an overage).
  variance: Money;
  varianceCause: VarianceCause | null;
  notes: string | null;
  submittedBy: string | null;
  submittedAt: string;
}
