import { useEffect, useState } from 'react';
import { useRestockRecommendations } from './use-intelligence';

type Decision = 'accepted' | 'dismissed';

function storageKey(date: string): string {
  return `shopsense.restock-decisions.${date}`;
}

// Accept/dismiss has no backend concept of a decision — it's a same-day
// reminder to the owner of what they've already reviewed, so it lives in
// localStorage rather than a new persisted endpoint.
function loadDecisions(date: string): Record<string, Decision> {
  try {
    const raw = localStorage.getItem(storageKey(date));
    return raw ? (JSON.parse(raw) as Record<string, Decision>) : {};
  } catch {
    return {};
  }
}

export function RestockPanel() {
  const { data, isLoading, isError } = useRestockRecommendations();
  const today = new Date().toISOString().slice(0, 10);
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() => loadDecisions(today));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(today), JSON.stringify(decisions));
    } catch {
      // Private browsing / quota exceeded — decisions just won't survive a reload.
    }
  }, [decisions, today]);

  if (isLoading) {
    return <p className="p-4 text-ink-500">Checking stock levels…</p>;
  }
  if (isError) {
    return (
      <p className="p-4 text-ink-500">
        Restock suggestions aren't available right now — check the Inventory page for low-stock items directly.
      </p>
    );
  }
  if (!data || data.length === 0) {
    return <p className="p-4 text-ink-500">No restock suggestions right now.</p>;
  }

  const pending = data.filter((rec) => !decisions[rec.productId]);
  const reviewed = data.filter((rec) => decisions[rec.productId]);

  function decide(productId: string, decision: Decision) {
    setDecisions((prev) => ({ ...prev, [productId]: decision }));
  }

  function undo(productId: string) {
    setDecisions((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {pending.length === 0 ? (
        <p className="p-4 text-sm text-ink-500">All caught up — no pending suggestions.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((rec) => (
            <li key={rec.productId} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink-900">{rec.productName}</p>
                  <p className="mt-1 text-sm text-ink-700">Suggest ordering {rec.suggestedQuantity} units</p>
                  <p className="mt-1 text-sm text-ink-500">{rec.reason}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => decide(rec.productId, 'dismissed')}
                    className="h-touch rounded-md border border-border px-3 text-sm font-medium text-ink-700"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(rec.productId, 'accepted')}
                    className="h-touch rounded-md bg-brand-600 px-3 text-sm font-medium text-white"
                  >
                    Accept
                  </button>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-xs text-ink-500 sm:grid-cols-4">
                <div>
                  <dt>Current stock</dt>
                  <dd className="text-sm text-ink-900">{rec.currentStock}</dd>
                </div>
                <div>
                  <dt>Reorder threshold</dt>
                  <dd className="text-sm text-ink-900">{rec.reorderThreshold}</dd>
                </div>
                <div>
                  <dt>Sold, last 4 weeks</dt>
                  <dd className="text-sm text-ink-900">{rec.quantitySoldLast4Weeks}</dd>
                </div>
                <div>
                  <dt>Supplier</dt>
                  <dd className="text-sm text-ink-900">
                    {rec.supplierName ?? '—'}
                    {rec.supplierLeadTimeDays != null ? ` (${rec.supplierLeadTimeDays}d lead)` : ''}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}

      {reviewed.length > 0 && (
        <details className="rounded-lg border border-border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-medium text-ink-700">Reviewed ({reviewed.length})</summary>
          <ul className="mt-2 divide-y divide-border">
            {reviewed.map((rec) => (
              <li key={rec.productId} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-ink-700">{rec.productName}</span>
                <span className="flex items-center gap-3">
                  <span className={decisions[rec.productId] === 'accepted' ? 'text-success-600' : 'text-ink-500'}>
                    {decisions[rec.productId] === 'accepted' ? 'Accepted' : 'Dismissed'}
                  </span>
                  <button type="button" onClick={() => undo(rec.productId)} className="text-xs text-brand-600 underline">
                    Undo
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
