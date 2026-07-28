import type { SaleRow } from '@shopsense/shared';
import { useReducer, useState } from 'react';
import { useSyncQueue } from '@/app/sync-context';
import { CartPanel } from './cart-panel';
import { cartReducer } from './cart-reducer';
import { cartTotals } from './cart-math';
import { emptyCart } from './cart-types';
import { QUEUED_SALE_SCHEMA_VERSION, type QueuedSale } from './offline-sale-types';
import { putQueuedSale } from '@/lib/offline-db';
import { PendingReceiptView } from './pending-receipt-view';
import { ProductSearch } from './product-search';
import { ReceiptView } from './receipt-view';
import { attemptSync } from './sync-engine';
import { useProducts } from './use-products';

export function SaleTerminalPage() {
  const [cart, dispatch] = useReducer(cartReducer, emptyCart);
  const productsQuery = useProducts();
  const { refresh: refreshQueue } = useSyncQueue();
  const [completedSale, setCompletedSale] = useState<SaleRow | null>(null);
  const [pendingSale, setPendingSale] = useState<QueuedSale | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (completedSale) {
    return (
      <ReceiptView
        sale={completedSale}
        onNewSale={() => {
          setCompletedSale(null);
          dispatch({ type: 'clear' });
        }}
      />
    );
  }

  if (pendingSale) {
    return (
      <PendingReceiptView
        queuedSale={pendingSale}
        onNewSale={() => {
          setPendingSale(null);
          dispatch({ type: 'clear' });
        }}
      />
    );
  }

  // The cart total shown while building a sale (CartPanel, via cart-math.ts)
  // is deliberately optimistic — it's just arithmetic on locally-held
  // prices, safe to show instantly because nothing has been committed yet.
  //
  // Checkout itself always writes to IndexedDB first (durable even if the
  // tab closes immediately after), then attempts an immediate sync. Three
  // outcomes:
  //   - synced:  the server confirmed it right now — show the real receipt.
  //   - pending: offline, or the request didn't reach the server — show the
  //              queued/pending view; SyncProvider retries automatically
  //              once connectivity returns.
  //   - failed:  the server actively rejected it (e.g. insufficient stock)
  //              — surfaced as an error on this screen, cart left intact,
  //              so the cashier can fix it and try again immediately,
  //              rather than only finding out later in Settings.
  async function handleCheckout() {
    setCheckoutError(null);
    setIsSubmitting(true);
    try {
      const totals = cartTotals(cart);
      const queued: QueuedSale = {
        id: crypto.randomUUID(),
        schemaVersion: QUEUED_SALE_SCHEMA_VERSION,
        request: {
          idempotencyKey: crypto.randomUUID(),
          items: cart.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unit: line.selectedUnit,
            ...(line.discount ? { discount: line.discount } : {}),
          })),
          ...(cart.saleDiscount ? { saleDiscount: cart.saleDiscount } : {}),
        },
        summary: { itemCount: cart.lines.length, estimatedGrandTotal: totals.grandTotal },
        createdAt: new Date().toISOString(),
        sync: { status: 'pending' },
      };

      await putQueuedSale(queued);
      await refreshQueue();

      const result = await attemptSync(queued);
      await refreshQueue();

      if (result.sync.status === 'synced') {
        setCompletedSale(result.sync.sale);
      } else if (result.sync.status === 'failed') {
        setCheckoutError(result.sync.error);
      } else {
        setPendingSale(result);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold text-ink-900">Sell</h1>

      {productsQuery.isLoading && <p className="mt-4 text-ink-500">Loading products…</p>}
      {productsQuery.isError && <p className="mt-4 text-danger-600">Could not load products.</p>}
      {productsQuery.data && (
        <div className="mt-4">
          <ProductSearch products={productsQuery.data} onAdd={(product) => dispatch({ type: 'add-product', product })} />
        </div>
      )}

      <div className="mt-6">
        <CartPanel cart={cart} dispatch={dispatch} />
      </div>

      {checkoutError && (
        <p className="mt-3 rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600">{checkoutError}</p>
      )}

      <button
        type="button"
        disabled={cart.lines.length === 0 || isSubmitting}
        onClick={() => void handleCheckout()}
        className="mt-4 h-touch w-full rounded-md bg-brand-600 text-base font-medium text-white disabled:opacity-50"
      >
        {isSubmitting ? 'Completing sale…' : 'Complete sale'}
      </button>
    </div>
  );
}
