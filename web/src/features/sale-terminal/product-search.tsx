import { formatGHS, type ProductResponse } from '@shopsense/shared';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { StatusBadge } from '@/components/status-badge';
import { stockStatusFor, stockStatusLabel, stockStatusTone } from '@/lib/design-tokens';

export function ProductSearch({
  products,
  onAdd,
}: {
  products: ProductResponse[];
  onAdd: (product: ProductResponse) => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (product) => product.name.toLowerCase().includes(q) || product.sku?.toLowerCase().includes(q),
    );
  }, [products, query]);

  function addAndReset(product: ProductResponse) {
    onAdd(product);
    setQuery('');
    inputRef.current?.focus();
  }

  // Keyboard-first fast entry: type a name/code, press Enter, it's in the
  // cart -- no reach for the mouse/touch target for a familiar item.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && filtered.length > 0 && filtered[0].currentStock > 0) {
      addAndReset(filtered[0]);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        autoFocus
        type="search"
        inputMode="search"
        placeholder="Search by name or code…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        className="h-touch w-full rounded-md border border-border bg-surface px-3 text-base text-ink-900 focus:border-brand-500 focus:outline-2 focus:outline-offset-1 focus:outline-brand-500"
      />

      <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-surface">
        {filtered.length === 0 && <li className="p-4 text-sm text-ink-500">No products match "{query}".</li>}
        {filtered.map((product) => {
          const status = stockStatusFor(product.currentStock, product.reorderThreshold);
          const outOfStock = product.currentStock <= 0;
          return (
            <li key={product.id}>
              <button
                type="button"
                disabled={outOfStock}
                onClick={() => addAndReset(product)}
                className="flex min-h-touch w-full items-center justify-between gap-3 px-4 py-2 text-left disabled:opacity-50"
              >
                <span>
                  <span className="block text-ink-900">{product.name}</span>
                  <span className="block text-sm text-ink-500">{formatGHS(product.sellingPrice)}</span>
                </span>
                <StatusBadge tone={stockStatusTone[status]}>{stockStatusLabel[status]}</StatusBadge>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
