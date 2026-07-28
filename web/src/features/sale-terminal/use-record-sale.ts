import type { DiscountInput, SaleItemInput, SaleRow } from '@shopsense/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { unwrap } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

interface RecordSaleRequest {
  idempotencyKey: string;
  items: SaleItemInput[];
  saleDiscount?: DiscountInput;
}

export function useRecordSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RecordSaleRequest) => unwrap(apiClient.post<SaleRow>('/sales', request)),
    onSuccess: () => {
      // Stock just changed server-side (the sale decremented it); the
      // product list's currentStock is now stale. No optimistic update here
      // deliberately -- see the sale-terminal page for why the total/stock
      // outcome specifically must come from the server's response, not be
      // assumed client-side.
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
