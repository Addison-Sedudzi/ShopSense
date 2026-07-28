import { formatGHS, negateMoney } from '@shopsense/shared';
import { varianceCauseLabel } from '@/features/reconciliation/variance-cause';
import { useDailyBriefing } from './use-intelligence';

export function DailyBriefingCard({ date }: { date: string }) {
  const { data, isLoading, isError } = useDailyBriefing(date);

  if (isLoading) {
    return <p className="p-4 text-ink-500">Preparing today's briefing…</p>;
  }
  if (isError || !data) {
    return (
      <p className="p-4 text-ink-500">
        Daily briefing isn't available right now — the reports below still reflect live data.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-ink-500">{data.businessDate}</p>
      <p className="mt-1 text-ink-900">{data.summary}</p>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-xs text-ink-500 sm:grid-cols-4">
        <div>
          <dt>Total sales</dt>
          <dd className="text-sm text-ink-900">{formatGHS(data.totalSales)}</dd>
        </div>
        <div>
          <dt>Sales made</dt>
          <dd className="text-sm text-ink-900">{data.saleCount}</dd>
        </div>
        <div>
          <dt>Best seller</dt>
          <dd className="text-sm text-ink-900">
            {data.bestPerformer ? `${data.bestPerformer.productName} (${data.bestPerformer.quantitySold})` : '—'}
          </dd>
        </div>
        <div>
          <dt>Slowest seller</dt>
          <dd className="text-sm text-ink-900">
            {data.worstPerformer ? `${data.worstPerformer.productName} (${data.worstPerformer.quantitySold})` : '—'}
          </dd>
        </div>
      </dl>

      {data.lowStockProducts.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs uppercase tracking-wide text-ink-500">Low stock</p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-warning-600">
            {data.lowStockProducts.map((item) => (
              <li key={item.productName}>
                {item.productName} ({item.currentStock}/{item.reorderThreshold})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 border-t border-border pt-3 text-sm">
        <p className="text-xs uppercase tracking-wide text-ink-500">Reconciliation</p>
        {data.reconciliation.submitted && data.reconciliation.variance !== null ? (
          <p className="mt-1 text-ink-900">
            {data.reconciliation.variance === 0
              ? 'Balanced'
              : data.reconciliation.variance > 0
                ? `Over by ${formatGHS(data.reconciliation.variance)}`
                : `Short by ${formatGHS(negateMoney(data.reconciliation.variance))}`}
            {data.reconciliation.varianceCause && ` — ${varianceCauseLabel[data.reconciliation.varianceCause]}`}
          </p>
        ) : (
          <p className="mt-1 text-ink-500">Not submitted yet</p>
        )}
      </div>
    </div>
  );
}
