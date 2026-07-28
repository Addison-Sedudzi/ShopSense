/**
 * A typed factory rather than inline array literals at each call site: every
 * key that touches "products" is derived from queryKeys.products.all, so
 * `queryClient.invalidateQueries({ queryKey: queryKeys.products.all })`
 * cannot silently miss a products query whose key was hand-typed slightly
 * differently (a stray extra field, a different array order) elsewhere.
 */
export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: () => [...queryKeys.products.all, 'list'] as const,
    inventory: () => [...queryKeys.products.all, 'inventory'] as const,
  },
  stockMovements: {
    all: ['stock-movements'] as const,
    byProduct: (productId: string) => [...queryKeys.stockMovements.all, productId] as const,
  },
  me: {
    all: ['me'] as const,
  },
} as const;
