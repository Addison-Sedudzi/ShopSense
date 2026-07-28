import { formatGHS } from '@shopsense/shared';
import { useReconciliationsList } from './use-reconciliations';

export function ReconciliationHistory({ onSelect }: { onSelect: (date: string) => void }) {
  const { data, isLoading, isError } = useReconciliationsList();

  if (isLoading) return <p className="p-4 text-ink-500">Loading history…</p>;
  if (isError) return <p className="p-4 text-danger-600">Could not load reconciliation history.</p>;
  if (!data || data.length === 0) return <p className="p-4 text-ink-500">No reconciliations submitted yet.</p>;

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
      {data.map((reconciliation) => (
        <li key={reconciliation.id}>
          <button
            type="button"
            onClick={() => onSelect(reconciliation.businessDate)}
            className="flex min-h-touch w-full items-center justify-between gap-3 px-4 py-2 text-left"
          >
            <span className="text-ink-900">{reconciliation.businessDate}</span>
            <span
              className={
                reconciliation.variance === 0
                  ? 'text-ink-500'
                  : reconciliation.variance > 0
                    ? 'text-success-600'
                    : 'text-danger-600'
              }
            >
              {reconciliation.variance > 0 ? '+' : ''}
              {formatGHS(reconciliation.variance)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
