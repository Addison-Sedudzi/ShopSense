import { formatGHS, type ReconciliationRow } from '@shopsense/shared';
import { StatusBadge } from '@/components/status-badge';
import { varianceCauseLabel, varianceCauseTone } from './variance-cause';

/**
 * A submitted reconciliation only ever stores expectedCash as the already-net
 * figure (per B8's schema design — a point-in-time aggregate that must not
 * silently drift), not the gross-sales/discounts breakdown that produced it.
 * That breakdown is only ever shown live, at submission time
 * (ReconciliationForm, from a fresh ExpectedCashSummary fetch) — a
 * historical record here honestly shows only what was actually persisted.
 */
export function ReconciliationDetail({ reconciliation }: { reconciliation: ReconciliationRow }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900">{reconciliation.businessDate}</h2>
        {reconciliation.varianceCause && (
          <StatusBadge tone={varianceCauseTone[reconciliation.varianceCause]}>
            {reconciliation.variance > 0 ? 'Overage' : 'Shortage'}
          </StatusBadge>
        )}
      </div>

      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-500">Expected cash</dt>
          <dd className="text-ink-900">{formatGHS(reconciliation.expectedCash)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-500">Counted cash</dt>
          <dd className="text-ink-900">{formatGHS(reconciliation.countedCash)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-1 text-base font-semibold">
          <dt className="text-ink-900">Variance</dt>
          <dd className={reconciliation.variance === 0 ? 'text-ink-900' : reconciliation.variance > 0 ? 'text-success-600' : 'text-danger-600'}>
            {reconciliation.variance > 0 ? '+' : ''}
            {formatGHS(reconciliation.variance)}
          </dd>
        </div>
      </dl>

      {reconciliation.varianceCause && (
        <p className="mt-2 text-sm text-ink-700">{varianceCauseLabel[reconciliation.varianceCause]}</p>
      )}
      {reconciliation.notes && <p className="mt-2 text-sm text-ink-500">Note: {reconciliation.notes}</p>}

      <p className="mt-3 text-xs text-ink-500">
        Submitted {new Date(reconciliation.submittedAt).toLocaleString()} — final, cannot be edited.
      </p>
    </div>
  );
}
