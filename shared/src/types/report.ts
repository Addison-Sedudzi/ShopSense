import type { Money } from './money';

export interface DailySalesSummary {
  day: string;
  saleCount: number;
  subtotal: Money;
  discountTotal: Money;
  grandTotal: Money;
}

export type ProductRankMetric = 'quantity' | 'revenue';
export type ProductRankOrder = 'top' | 'bottom';

export interface ProductRanking {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: Money;
}

export interface ProductMargin {
  productId: string;
  productName: string;
  revenue: Money;
  cost: Money;
  margin: Money;
}

export interface CategoryMargin {
  categoryName: string;
  revenue: Money;
  cost: Money;
  margin: Money;
}

export interface StockValuationLine {
  productId: string;
  productName: string;
  currentStock: number;
  costPrice: Money;
  sellingPrice: Money;
  valueAtCost: Money;
  valueAtRetail: Money;
}

export interface StockValuationReport {
  lines: StockValuationLine[];
  totalValueAtCost: Money;
  totalValueAtRetail: Money;
}

export type DiscountLevel = 'item' | 'sale';

export interface DiscountImpactLine {
  discountType: 'percentage' | 'fixed_amount';
  level: DiscountLevel;
  discountCount: number;
  totalAmount: Money;
}

export interface DiscountImpactReport {
  lines: DiscountImpactLine[];
  grossSales: Money;
  totalDiscounts: Money;
}
