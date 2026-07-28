import { formatGHS, type SaleRow } from '@shopsense/shared';

/** Renders only what the server returned from POST /api/sales -- every
 * figure here is the authoritative, server-computed one, not the client's
 * pre-submit estimate from cart-math.ts. */
export function ReceiptView({ sale, onNewSale }: { sale: SaleRow; onNewSale: () => void }) {
  return (
    <div className="p-4">
      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-ink-900">Sale complete</h2>
        <p className="text-sm text-ink-500">{new Date(sale.createdAt).toLocaleString()}</p>

        <ul className="mt-3 divide-y divide-border">
          {sale.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-ink-900">
                {item.productNameSnapshot} × {item.quantity} {item.unit}
              </span>
              <span className="text-ink-900">{formatGHS(item.lineSubtotal)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-ink-500">
            <dt>Subtotal</dt>
            <dd>{formatGHS(sale.subtotal)}</dd>
          </div>
          {sale.discountTotal > 0 && (
            <div className="flex justify-between text-ink-500">
              <dt>Discount</dt>
              <dd>−{formatGHS(sale.discountTotal)}</dd>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold text-ink-900">
            <dt>Total</dt>
            <dd>{formatGHS(sale.grandTotal)}</dd>
          </div>
        </dl>
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
