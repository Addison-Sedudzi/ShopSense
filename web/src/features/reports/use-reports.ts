import type {
  CategoryMargin,
  DailySalesSummary,
  DiscountImpactReport,
  ProductMargin,
  ProductRankMetric,
  ProductRankOrder,
  ProductRanking,
  StockValuationReport,
} from '@shopsense/shared';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { unwrap } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export function useSalesSummary(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.reports.salesSummary(from, to),
    queryFn: () => unwrap(apiClient.get<DailySalesSummary[]>(`/reports/sales-summary?from=${from}&to=${to}`)),
  });
}

export function useProductRanking(from: string, to: string, metric: ProductRankMetric, order: ProductRankOrder) {
  return useQuery({
    queryKey: queryKeys.reports.productRanking(from, to, metric, order),
    queryFn: () =>
      unwrap(
        apiClient.get<ProductRanking[]>(
          `/reports/product-ranking?from=${from}&to=${to}&metric=${metric}&order=${order}&limit=10`,
        ),
      ),
  });
}

export function useMarginByProduct(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.reports.marginByProduct(from, to),
    queryFn: () => unwrap(apiClient.get<ProductMargin[]>(`/reports/margin-by-product?from=${from}&to=${to}`)),
  });
}

export function useMarginByCategory(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.reports.marginByCategory(from, to),
    queryFn: () => unwrap(apiClient.get<CategoryMargin[]>(`/reports/margin-by-category?from=${from}&to=${to}`)),
  });
}

export function useStockValuation() {
  return useQuery({
    queryKey: queryKeys.reports.stockValuation(),
    queryFn: () => unwrap(apiClient.get<StockValuationReport>('/reports/stock-valuation')),
  });
}

export function useDiscountImpact(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.reports.discountImpact(from, to),
    queryFn: () => unwrap(apiClient.get<DiscountImpactReport>(`/reports/discount-impact?from=${from}&to=${to}`)),
  });
}
