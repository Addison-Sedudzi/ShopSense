import { formatGHS } from '@shopsense/shared';
import type { QueuedSale } from './offline-sale-types';

/** Shown when a sale was recorded locally but hasn't been confirmed by the
 * server yet -- visually and textually distinct from ReceiptView on
 * purpose, since this total is the client's estimate (cart-math.ts), not a
 * server-confirmed figure. Stock in particular cannot be verified while
 * offline; the real check happens when this syncs. */
export function PendingReceiptView({ queuedSale, onNewSale }: { queuedSale: QueuedSale; onNewSale: () => void }) {
  return (
    <div className="p-4">
      <div className="rounded-lg border border-warning-500/40 bg-warning-50 p-4">
        <h2 className="text-lg font-semibold text-ink-900">Sale recorded — will sync</h2>
        <p className="mt-1 text-sm text-ink-700">
          You're offline. This sale is saved on this device and will be sent automatically once you're back online.
        </p>
        <p className="mt-3 text-2xl font-semibold text-ink-900">{formatGHS(queuedSale.summary.estimatedGrandTotal)}</p>
        <p className="text-sm text-ink-500">
          {queuedSale.summary.itemCount} item{queuedSale.summary.itemCount === 1 ? '' : 's'} — estimated total, pending confirmation
        </p>
      </div>

      <button
        type="button"
        onClick={onNewSale}
        className="mt-4 h-touch w-full rounded-md bg-brand-600 text-base font-medium text-white"
      >
        New sale
      </button>
    </div>
  );
}
