import { addMoney, classifyVariance, computeVariance, formatGHS, moneyFromPgNumeric, type Money } from '@shopsense/shared';
import { useState } from 'react';
import { useExpectedCash } from './use-expected-cash';
import { useSubmitReconciliation } from './use-reconciliations';
import { varianceCauseLabel } from './variance-cause';

type Stage = 'entry' | 'confirm';

function varianceColor(variance: Money): string {
  if (variance === 0) return 'text-ink-900';
  return variance > 0 ? 'text-success-600' : 'text-danger-600';
}

export function ReconciliationForm({ date, onSubmitted }: { date: string; onSubmitted: () => void }) {
  const expectedCashQuery = useExpectedCash(date);
  const submitReconciliation = useSubmitReconciliation();
  const [countedCash, setCountedCash] = useState('');
  const [notes, setNotes] = useState('');
  const [stage, setStage] = useState<Stage>('entry');
  const [error, setError] = useState<string | null>(null);

  if (expectedCashQuery.isLoading) return <p className="p-4 text-ink-500">Loading…</p>;
  if (expectedCashQuery.isError || !expectedCashQuery.data) {
    return <p className="p-4 text-danger-600">Could not load expected cash for this date.</p>;
  }

  const summary = expectedCashQuery.data;
  // Gross sales isn't returned by the API directly — expectedCash is already
  // net of discounts, so gross = expected + discounts. Reconstructed here
  // purely for display, so the owner sees how the figure was reached rather
  // than being handed a single number to trust blindly.
  const grossSales = addMoney(summary.expectedCash, summary.totalDiscounts);

  let counted: Money | null = null;
  try {
    counted = countedCash.trim() ? moneyFromPgNumeric(countedCash.trim()) : null;
  } catch {
    counted = null;
  }

  // Live preview only — see use-reconciliations.ts's useSubmitReconciliation
  // for why the server's own computation on submit is what's authoritative.
  const variance = counted !== null ? computeVariance(counted, summary.expectedCash) : null;
  const cause = variance !== null ? classifyVariance(variance, summary.totalDiscounts) : null;

  async function handleConfirm() {
    if (counted === null) return;
    setError(null);
    try {
      await submitReconciliation.mutateAsync({
        businessDate: date,
        countedCash: countedCash.trim(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      onSubmitted();
    } catch {
      setError('Could not submit this reconciliation. Please try again.');
      setStage('entry');
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold text-ink-900">Reconciliation — {date}</h1>

      {stage === 'entry' && (
        <>
          <div className="mt-4 rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-ink-500">How expected cash was reached</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-700">
                  Gross sales ({summary.saleCount} sale{summary.saleCount === 1 ? '' : 's'})
                </dt>
                <dd className="text-ink-900">{formatGHS(grossSales)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-700">Discounts given</dt>
                <dd className="text-ink-900">−{formatGHS(summary.totalDiscounts)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1 text-base font-semibold">
                <dt className="text-ink-900">Expected cash</dt>
                <dd className="text-ink-900">{formatGHS(summary.expectedCash)}</dd>
              </div>
            </dl>
          </div>

          <label className="mt-4 block text-sm font-medium text-ink-700">
            Counted cash
            <input
              inputMode="decimal"
              value={countedCash}
              onChange={(event) => setCountedCash(event.target.value)}
              placeholder="0.00"
              className="mt-1 block h-touch w-full rounded-md border border-border px-3 text-base text-ink-900 focus:border-brand-500 focus:outline-2 focus:outline-offset-1 focus:outline-brand-500"
            />
          </label>

          {variance !== null && (
            <div className="mt-3 rounded-lg border border-border bg-surface p-3">
              <div className="flex justify-between text-base font-semibold">
                <span className="text-ink-900">Variance</span>
                <span className={varianceColor(variance)}>
                  {variance > 0 ? '+' : ''}
                  {formatGHS(variance)}
                </span>
              </div>
              {cause && <p className="mt-1 text-sm text-ink-700">{varianceCauseLabel[cause]}</p>}
              <p className="mt-1 text-xs text-ink-500">Preview — confirmed when you submit.</p>
            </div>
          )}

          <label className="mt-3 block text-sm font-medium text-ink-700">
            Notes (optional)
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-base text-ink-900"
            />
          </label>

          <button
            type="button"
            disabled={counted === null}
            onClick={() => setStage('confirm')}
            className="mt-4 h-touch w-full rounded-md bg-brand-600 text-base font-medium text-white disabled:opacity-50"
          >
            Review and submit
          </button>
        </>
      )}

      {stage === 'confirm' && counted !== null && variance !== null && (
        <div className="mt-4">
          <div className="rounded-lg border border-warning-500/40 bg-warning-50 p-4">
            <p className="text-sm font-semibold text-warning-600">This cannot be changed once submitted.</p>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-700">Expected cash</dt>
                <dd className="text-ink-900">{formatGHS(summary.expectedCash)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-700">Counted cash</dt>
                <dd className="text-ink-900">{formatGHS(counted)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt className="text-ink-900">Variance</dt>
                <dd className={varianceColor(variance)}>
                  {variance > 0 ? '+' : ''}
                  {formatGHS(variance)}
                </dd>
              </div>
            </dl>
          </div>

          {error && <p className="mt-3 rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600">{error}</p>}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setStage('entry')}
              className="h-touch flex-1 rounded-md border border-border text-base font-medium text-ink-900"
            >
              Back
            </button>
            <button
              type="button"
              disabled={submitReconciliation.isPending}
              onClick={() => void handleConfirm()}
              className="h-touch flex-1 rounded-md bg-brand-600 text-base font-medium text-white disabled:opacity-50"
            >
              {submitReconciliation.isPending ? 'Submitting…' : 'Confirm and submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
