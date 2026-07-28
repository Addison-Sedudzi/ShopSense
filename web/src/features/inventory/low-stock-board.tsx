import type { ProductInventoryRow } from '@shopsense/shared';

/** An estimate from recent pace (last 28 days), not a forecast — a product
 * with no recent sales shows no estimate at all rather than a misleading
 * "infinite" or zero. */
function daysOfCover(row: ProductInventoryRow): number | null {
  if (row.quantitySoldLast28Days <= 0) return null;
  const perDay = row.quantitySoldLast28Days / 28;
  return Math.round(row.currentStock / perDay);
}

export function LowStockBoard({
  products,
  onSelect,
}: {
  products: ProductInventoryRow[];
  onSelect: (productId: string) => void;
}) {
  const lowStock = [...products]
    .filter((product) => product.currentStock <= product.reorderThreshold)
    .sort((a, b) => a.currentStock - b.currentStock);

  if (lowStock.length === 0) return null;

  return (
    <div className="rounded-lg border border-warning-500/40 bg-warning-50 p-3">
      <h2 className="text-sm font-semibold text-warning-600">Low stock ({lowStock.length})</h2>
      <ul className="mt-1 divide-y divide-warning-500/20">
        {lowStock.map((product) => {
          const cover = daysOfCover(product);
          return (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => onSelect(product.id)}
                className="flex min-h-touch w-full items-center justify-between gap-2 text-left text-sm"
              >
                <span className="text-ink-900">{product.name}</span>
                <span className="text-ink-700">
                  {product.currentStock} left{cover !== null && ` · ~${cover}d cover`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
