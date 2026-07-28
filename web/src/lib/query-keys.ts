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
  reconciliations: {
    all: ['reconciliations'] as const,
    list: () => [...queryKeys.reconciliations.all, 'list'] as const,
    byDate: (date: string) => [...queryKeys.reconciliations.all, 'date', date] as const,
    expectedCash: (date: string) => [...queryKeys.reconciliations.all, 'expected-cash', date] as const,
  },
  reports: {
    all: ['reports'] as const,
    salesSummary: (from: string, to: string) => [...queryKeys.reports.all, 'sales-summary', from, to] as const,
    productRanking: (from: string, to: string, metric: string, order: string) =>
      [...queryKeys.reports.all, 'product-ranking', from, to, metric, order] as const,
    marginByProduct: (from: string, to: string) => [...queryKeys.reports.all, 'margin-by-product', from, to] as const,
    marginByCategory: (from: string, to: string) =>
      [...queryKeys.reports.all, 'margin-by-category', from, to] as const,
    stockValuation: () => [...queryKeys.reports.all, 'stock-valuation'] as const,
    discountImpact: (from: string, to: string) => [...queryKeys.reports.all, 'discount-impact', from, to] as const,
  },
  intelligence: {
    all: ['intelligence'] as const,
    restockRecommendations: () => [...queryKeys.intelligence.all, 'restock-recommendations'] as const,
    dailyBriefing: (date: string) => [...queryKeys.intelligence.all, 'daily-briefing', date] as const,
  },
} as const;
