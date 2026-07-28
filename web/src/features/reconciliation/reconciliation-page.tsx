import { useState } from 'react';
import { ReconciliationDetail } from './reconciliation-detail';
import { ReconciliationForm } from './reconciliation-form';
import { ReconciliationHistory } from './reconciliation-history';
import { useReconciliationByDate } from './use-reconciliations';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type View = { kind: 'date'; date: string; isToday: boolean } | { kind: 'history' };

function DateView({ date, isToday, onShowHistory, onBackToToday }: {
  date: string;
  isToday: boolean;
  onShowHistory: () => void;
  onBackToToday: () => void;
}) {
  const existingQuery = useReconciliationByDate(date);

  return (
    <div>
      <div className="flex items-center justify-between p-4 pb-0">
        {!isToday ? (
          <button type="button" onClick={onBackToToday} className="text-sm text-brand-600 underline">
            ← Today
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={onShowHistory} className="text-sm text-brand-600 underline">
          History
        </button>
      </div>

      {existingQuery.isLoading && <p className="p-4 text-ink-500">Loading…</p>}
      {existingQuery.isError && <p className="p-4 text-danger-600">Could not check this date.</p>}
      {existingQuery.data && (
        <div className="p-4">
          <ReconciliationDetail reconciliation={existingQuery.data} />
        </div>
      )}
      {existingQuery.data === null && (
        <ReconciliationForm date={date} onSubmitted={() => void existingQuery.refetch()} />
      )}
    </div>
  );
}

export function ReconciliationPage() {
  const [view, setView] = useState<View>({ kind: 'date', date: today(), isToday: true });

  if (view.kind === 'history') {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-ink-900">Reconciliation history</h1>
          <button
            type="button"
            onClick={() => setView({ kind: 'date', date: today(), isToday: true })}
            className="text-sm text-brand-600 underline"
          >
            Today
          </button>
        </div>
        <div className="mt-4">
          <ReconciliationHistory
            onSelect={(date) => setView({ kind: 'date', date, isToday: date === today() })}
          />
        </div>
      </div>
    );
  }

  return (
    <DateView
      date={view.date}
      isToday={view.isToday}
      onShowHistory={() => setView({ kind: 'history' })}
      onBackToToday={() => setView({ kind: 'date', date: today(), isToday: true })}
    />
  );
}
