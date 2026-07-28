import type { ProductInventoryRow, ProductUnit, StockMovementRow } from '@shopsense/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { unwrap } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

interface ReceiveStockInput {
  productId: string;
  quantity: number;
  unit: ProductUnit;
  unitCost?: string;
}

interface AdjustStockInput {
  productId: string;
  type: 'adjustment_damage' | 'adjustment_loss' | 'adjustment_correction';
  quantityDelta: number;
  reason: string;
}

interface OptimisticContext {
  previous: ProductInventoryRow[] | undefined;
}

function optimisticStockDelta(
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
  baseUnitDelta: number,
): OptimisticContext {
  const previous = queryClient.getQueryData<ProductInventoryRow[]>(queryKeys.products.inventory());
  queryClient.setQueryData<ProductInventoryRow[]>(queryKeys.products.inventory(), (rows) =>
    rows?.map((row) => (row.id === productId ? { ...row, currentStock: row.currentStock + baseUnitDelta } : row)),
  );
  return { previous };
}

function rollbackAndRefetch(
  queryClient: ReturnType<typeof useQueryClient>,
  context: OptimisticContext | undefined,
) {
  if (context?.previous) {
    queryClient.setQueryData(queryKeys.products.inventory(), context.previous);
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
}

export function useReceiveStock() {
  const queryClient = useQueryClient();
  return useMutation<StockMovementRow, unknown, ReceiveStockInput, OptimisticContext>({
    mutationFn: ({ productId, ...body }) =>
      unwrap(apiClient.post<StockMovementRow>(`/products/${productId}/stock-movements/receive`, body)),
    // Optimistic only for the common case (receiving in the product's own
    // base unit, where the delta is exactly `quantity`); a carton receipt's
    // real base-unit delta depends on unitsPerCarton, which isn't worth
    // duplicating client-side just for a momentary display number — that
    // case waits for the real invalidated refetch instead of guessing.
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products.inventory() });
      const row = queryClient
        .getQueryData<ProductInventoryRow[]>(queryKeys.products.inventory())
        ?.find((r) => r.id === input.productId);
      if (!row || input.unit !== row.unit) {
        return { previous: undefined };
      }
      return optimisticStockDelta(queryClient, input.productId, input.quantity);
    },
    onError: (_err, _vars, context) => rollbackAndRefetch(queryClient, context),
    onSettled: (_data, _err, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements.byProduct(input.productId) });
    },
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation<StockMovementRow, unknown, AdjustStockInput, OptimisticContext>({
    mutationFn: ({ productId, ...body }) =>
      unwrap(apiClient.post<StockMovementRow>(`/products/${productId}/stock-movements/adjust`, body)),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products.inventory() });
      return optimisticStockDelta(queryClient, input.productId, input.quantityDelta);
    },
    onError: (_err, _vars, context) => rollbackAndRefetch(queryClient, context),
    onSettled: (_data, _err, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements.byProduct(input.productId) });
    },
  });
}
