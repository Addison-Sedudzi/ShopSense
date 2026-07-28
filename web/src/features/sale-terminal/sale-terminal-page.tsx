import type { SaleRow } from '@shopsense/shared';
import { useReducer, useState } from 'react';
import type { ApiError } from '@/lib/api-error';
import { CartPanel } from './cart-panel';
import { cartReducer } from './cart-reducer';
import { emptyCart } from './cart-types';
import { ProductSearch } from './product-search';
import { ReceiptView } from './receipt-view';
import { useProducts } from './use-products';
import { useRecordSale } from './use-record-sale';

function describeError(error: unknown): string {
  const apiError = error as ApiError;
  switch (apiError.kind) {
    case 'network':
      return 'Network error — check your connection and try again.';
    case 'unauthorized':
      return 'Your session expired. Please sign in again.';
    case 'http':
      return apiError.message;
    case 'unexpected':
      return apiError.message;
  }
}

export function SaleTerminalPage() {
  const [cart, dispatch] = useReducer(cartReducer, emptyCart);
  const productsQuery = useProducts();
  const recordSale = useRecordSale();
  const [completedSale, setCompletedSale] = useState<SaleRow | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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

  // The cart total shown while building a sale (CartPanel, via cart-math.ts)
  // is deliberately optimistic — it's just arithmetic on locally-held prices,
  // safe to show instantly because nothing has been committed yet. Checkout
  // itself is NOT optimistic: completedSale is only ever set from the
  // server's actual response, never assumed from the cart. A price could
  // have changed, a discount could resolve slightly differently, or another
  // device could have sold the last unit between building the cart and
  // tapping "Complete sale" — the receipt has to show what the server
  // actually recorded, not what the client predicted it would.
  async function handleCheckout() {
    setCheckoutError(null);
    try {
      const sale = await recordSale.mutateAsync({
        idempotencyKey: crypto.randomUUID(),
        items: cart.lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unit: line.selectedUnit,
          ...(line.discount ? { discount: line.discount } : {}),
        })),
        ...(cart.saleDiscount ? { saleDiscount: cart.saleDiscount } : {}),
      });
      setCompletedSale(sale);
    } catch (error) {
      setCheckoutError(describeError(error));
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
        disabled={cart.lines.length === 0 || recordSale.isPending}
        onClick={() => void handleCheckout()}
        className="mt-4 h-touch w-full rounded-md bg-brand-600 text-base font-medium text-white disabled:opacity-50"
      >
        {recordSale.isPending ? 'Completing sale…' : 'Complete sale'}
      </button>
    </div>
  );
}
