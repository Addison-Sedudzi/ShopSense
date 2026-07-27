import { StatusBadge } from '@/components/status-badge';
import { stockStatusFor, stockStatusLabel, stockStatusTone } from '@/lib/design-tokens';

// A few illustrative rows proving stockStatusFor()'s thresholds and the
// StatusBadge/design-token wiring end-to-end; real data arrives in F6.
const SAMPLE_ROWS = [
  { name: 'Milo 400g', currentStock: 24, reorderThreshold: 10 },
  { name: 'Peak Milk 170g', currentStock: 8, reorderThreshold: 10 },
  { name: 'Geisha Soap', currentStock: 0, reorderThreshold: 5 },
];

export function InventoryPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold text-ink-900">Inventory</h1>
      <p className="mt-2 text-ink-500">Product list, receiving, and adjustments (F6) go here.</p>
      <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
        {SAMPLE_ROWS.map((row) => {
          const status = stockStatusFor(row.currentStock, row.reorderThreshold);
          return (
            <li key={row.name} className="flex min-h-touch items-center justify-between gap-3 px-4 py-2">
              <span className="text-ink-900">{row.name}</span>
              <StatusBadge tone={stockStatusTone[status]}>{stockStatusLabel[status]}</StatusBadge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
