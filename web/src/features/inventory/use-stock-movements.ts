import type { StockMovementRow } from '@shopsense/shared';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { unwrap } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export function useStockMovements(productId: string) {
  return useQuery({
    queryKey: queryKeys.stockMovements.byProduct(productId),
    queryFn: () => unwrap(apiClient.get<StockMovementRow[]>(`/products/${productId}/stock-movements`)),
  });
}
