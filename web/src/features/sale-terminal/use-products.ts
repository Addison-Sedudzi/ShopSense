import type { ProductResponse } from '@shopsense/shared';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { unwrap } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

/**
 * TanStack Query over plain useState+useEffect: caching (switching tabs and
 * back doesn't re-fetch), request de-duplication (two components mounting
 * this hook at once share one request), background refetch-on-focus (stock
 * levels change from other devices), and loading/error state that doesn't
 * need to be hand-rolled per hook -- all of that would otherwise be manually
 * reimplemented, and usually is reimplemented inconsistently across hooks.
 */
export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: () => unwrap(apiClient.get<ProductResponse[]>('/products')),
  });
}
