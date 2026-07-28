import type { ProductInventoryRow } from '@shopsense/shared';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { unwrap } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export function useInventoryProducts() {
  return useQuery({
    queryKey: queryKeys.products.inventory(),
    queryFn: () => unwrap(apiClient.get<ProductInventoryRow[]>('/products/inventory')),
  });
}
