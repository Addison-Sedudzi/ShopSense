import { moneyFromPgNumeric, subtractMoney, type ProductInventoryRow, type ProductResponse, type ProductUnit } from '@shopsense/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { unwrap } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export interface ProductPatch {
  name?: string;
  sku?: string | null;
  unit?: ProductUnit;
  unitsPerCarton?: number | null;
  costPrice?: string;
  sellingPrice?: string;
  reorderThreshold?: number;
}

interface OptimisticContext {
  previous: ProductInventoryRow[] | undefined;
}

function invalidateProductQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  // No optimistic entry here: the server assigns the id, and a temporary
  // placeholder row risks a visible "flip" once the real one arrives.
  // Creating a brand-new item is exactly the case the doc's "where it is
  // not safe" applies to — the update/archive mutations below are the
  // optimistic ones, since they act on a row the cache already has in full.
  return useMutation({
    mutationFn: (patch: ProductPatch) =>
      unwrap(apiClient.post<ProductResponse>('/products', patch)),
    onSuccess: () => invalidateProductQueries(queryClient),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation<ProductResponse, unknown, { id: string; patch: ProductPatch }, OptimisticContext>({
    mutationFn: ({ id, patch }) => unwrap(apiClient.patch<ProductResponse>(`/products/${id}`, patch)),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products.inventory() });
      const previous = queryClient.getQueryData<ProductInventoryRow[]>(queryKeys.products.inventory());

      queryClient.setQueryData<ProductInventoryRow[]>(queryKeys.products.inventory(), (rows) =>
        rows?.map((row) => {
          if (row.id !== id) return row;
          const costPrice = patch.costPrice !== undefined ? moneyFromPgNumeric(patch.costPrice) : row.costPrice;
          const sellingPrice =
            patch.sellingPrice !== undefined ? moneyFromPgNumeric(patch.sellingPrice) : row.sellingPrice;
          return {
            ...row,
            ...(patch.name !== undefined && { name: patch.name }),
            ...(patch.sku !== undefined && { sku: patch.sku }),
            ...(patch.unit !== undefined && { unit: patch.unit }),
            ...(patch.unitsPerCarton !== undefined && { unitsPerCarton: patch.unitsPerCarton }),
            ...(patch.reorderThreshold !== undefined && { reorderThreshold: patch.reorderThreshold }),
            costPrice,
            sellingPrice,
            margin: subtractMoney(sellingPrice, costPrice),
          };
        }),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.products.inventory(), context.previous);
      }
    },
    onSettled: () => invalidateProductQueries(queryClient),
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();
  return useMutation<{ archived: true }, unknown, string, OptimisticContext>({
    mutationFn: (id: string) => unwrap(apiClient.post<{ archived: true }>(`/products/${id}/archive`)),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.products.inventory() });
      const previous = queryClient.getQueryData<ProductInventoryRow[]>(queryKeys.products.inventory());
      queryClient.setQueryData<ProductInventoryRow[]>(queryKeys.products.inventory(), (rows) =>
        rows?.filter((row) => row.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.products.inventory(), context.previous);
      }
    },
    onSettled: () => invalidateProductQueries(queryClient),
  });
}
