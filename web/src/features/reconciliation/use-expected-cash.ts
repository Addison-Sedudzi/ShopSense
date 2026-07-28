import type { ExpectedCashSummary } from '@shopsense/shared';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { unwrap } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export function useExpectedCash(date: string) {
  return useQuery({
    queryKey: queryKeys.reconciliations.expectedCash(date),
    queryFn: () => unwrap(apiClient.get<ExpectedCashSummary>(`/reconciliations/expected-cash?date=${date}`)),
  });
}
