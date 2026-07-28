import { formatGHS, type ProductInventoryRow } from '@shopsense/shared';
import { useState } from 'react';
import { StockAdjustForm } from './stock-adjust-form';
import { StockHistoryView } from './stock-history-view';
import { StockReceiveForm } from './stock-receive-form';

type Tab = 'overview' | 'receive' | 'adjust' | 'history';

export function ProductDetailPanel({
  product,
  onEdit,
  onClose,
  onArchive,
}: {
  product: ProductInventoryRow;
  onEdit: () => void;
  onClose: () => void;
  // Owned by the parent (InventoryPage), not this component: archiving
  // optimistically removes this product from the cache, which makes the
  // parent stop rendering this panel at all (it can no longer find the
  // product) — if the mutation hook lived here, its own onSuccess callback
  // would never get a chance to fire, since the component driving it had
  // already unmounted itself as a side effect of its own optimistic update.
  onArchive: () => void;
}) {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div>
      <div className="flex items-center justify-between p-4 pb-0">
        <button type="button" onClick={onClose} className="text-sm text-brand-600 underline">
          ← Back
        </button>
        <button type="button" onClick={onEdit} className="text-sm text-brand-600 underline">
          Edit
        </button>
      </div>

      {tab === 'overview' && (
        <div className="p-4">
          <h2 className="text-xl font-semibold text-ink-900">{product.name}</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Current stock</dt>
              <dd className="text-ink-900">
                {product.currentStock} {product.unit}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Cost price</dt>
              <dd className="text-ink-900">{formatGHS(product.costPrice)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Selling price</dt>
              <dd className="text-ink-900">{formatGHS(product.sellingPrice)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Margin</dt>
              <dd className="text-ink-900">{formatGHS(product.margin)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Reorder threshold</dt>
              <dd className="text-ink-900">{product.reorderThreshold}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => {
              if (confirm(`Archive ${product.name}? It can't be sold or restocked once archived.`)) {
                onArchive();
              }
            }}
            className="mt-4 h-touch w-full rounded-md border border-danger-500 text-base font-medium text-danger-600"
          >
            Archive product
          </button>
        </div>
      )}

      {tab === 'receive' && <StockReceiveForm product={product} onDone={() => setTab('overview')} />}
      {tab === 'adjust' && <StockAdjustForm product={product} onDone={() => setTab('overview')} />}
      {tab === 'history' && <StockHistoryView productId={product.id} />}

      <div className="mt-4 flex border-t border-border">
        {(['overview', 'receive', 'adjust', 'history'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`h-touch flex-1 text-sm font-medium capitalize ${tab === t ? 'text-brand-600' : 'text-ink-500'}`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
