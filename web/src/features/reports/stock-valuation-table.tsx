import { formatGHS, type StockValuationReport } from '@shopsense/shared';

export function StockValuationTable({ report }: { report: StockValuationReport }) {
  if (report.lines.length === 0) {
    return <p className="p-6 text-center text-sm text-ink-500">No stock on hand.</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        <li className="flex items-center justify-between gap-3 px-4 py-2 text-xs font-medium uppercase tracking-wide text-ink-500">
          <span>Product</span>
          <span className="flex gap-4">
            <span className="w-14 text-right">Stock</span>
            <span className="w-24 text-right">At cost</span>
            <span className="w-24 text-right">At retail</span>
          </span>
        </li>
        {report.lines.map((line) => (
          <li key={line.productId} className="flex min-h-touch items-center justify-between gap-3 px-4 py-2">
            <span className="text-ink-900">{line.productName}</span>
            <span className="flex gap-4 tabular-nums">
              <span className="w-14 text-right text-ink-700">{line.currentStock}</span>
              <span className="w-24 text-right text-ink-700">{formatGHS(line.valueAtCost)}</span>
              <span className="w-24 text-right text-ink-700">{formatGHS(line.valueAtRetail)}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-end gap-6 px-4 text-sm">
        <span className="text-ink-500">
          Total at cost: <span className="font-medium text-ink-900">{formatGHS(report.totalValueAtCost)}</span>
        </span>
        <span className="text-ink-500">
          Total at retail: <span className="font-medium text-ink-900">{formatGHS(report.totalValueAtRetail)}</span>
        </span>
      </div>
    </div>
  );
}
