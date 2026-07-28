import type { ReconciliationRow } from '@shopsense/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { unwrap } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export function useReconciliationsList() {
  return useQuery({
    queryKey: queryKeys.reconciliations.list(),
    queryFn: () => unwrap(apiClient.get<ReconciliationRow[]>('/reconciliations')),
  });
}

/** null (not undefined/loading) specifically means "no reconciliation exists
 * for this date yet" — a normal, expected state (most dates), distinct from
 * still-loading or a real fetch error. A 404 from the API is translated to
 * this here rather than surfacing as isError, since "nothing submitted yet"
 * isn't a failure. */
export function useReconciliationByDate(date: string) {
  return useQuery({
    queryKey: queryKeys.reconciliations.byDate(date),
    queryFn: async (): Promise<ReconciliationRow | null> => {
      const result = await apiClient.get<ReconciliationRow>(`/reconciliations/${date}`);
      if (result.ok) return result.data;
      if (result.error.kind === 'http' && result.error.status === 404) return null;
      throw result.error;
    },
  });
}

interface SubmitReconciliationInput {
  businessDate: string;
  countedCash: string;
  notes?: string;
}

export function useSubmitReconciliation() {
  const queryClient = useQueryClient();
  // No optimistic update here, deliberately: unlike updating a product's
  // price, a reconciliation's variance and cause are the whole point of the
  // record, and the shared classifyVariance() preview shown while typing
  // can drift from what the server actually stores if a sale lands in the
  // gap between fetching expected-cash and submitting — the confirmation
  // step (ReconciliationForm) exists so the owner commits to a number
  // that's about to become genuinely final, not a guess assumed to be right.
  return useMutation({
    mutationFn: (input: SubmitReconciliationInput) =>
      unwrap(apiClient.post<ReconciliationRow>('/reconciliations', input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reconciliations.all });
    },
  });
}
