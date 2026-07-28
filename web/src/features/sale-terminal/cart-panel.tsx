import { formatGHS } from '@shopsense/shared';
import type { Dispatch } from 'react';
import { cartTotals, effectiveMaxQuantity, lineSubtotal } from './cart-math';
import type { CartAction, CartLine, CartState } from './cart-types';
import { DiscountEditor } from './discount-editor';

function CartLineRow({ line, dispatch }: { line: CartLine; dispatch: Dispatch<CartAction> }) {
  const max = effectiveMaxQuantity(line);

  return (
    <li className="border-b border-border p-3 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <span className="text-ink-900">{line.productName}</span>
        <button
          type="button"
          onClick={() => dispatch({ type: 'remove-line', productId: line.productId })}
          className="text-sm text-danger-600 underline"
        >
          Remove
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <div className="flex h-touch items-center rounded-md border border-border">
          <button
            type="button"
            onClick={() => dispatch({ type: 'set-quantity', productId: line.productId, quantity: line.quantity - 1 })}
            className="flex h-full w-touch items-center justify-center text-lg text-ink-700"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-8 text-center text-base text-ink-900">{line.quantity}</span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'set-quantity', productId: line.productId, quantity: line.quantity + 1 })}
            disabled={line.quantity >= max}
            className="flex h-full w-touch items-center justify-center text-lg text-ink-700 disabled:opacity-40"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        {line.unitsPerCarton && (
          <select
            value={line.selectedUnit}
            onChange={(event) =>
              dispatch({ type: 'set-unit', productId: line.productId, unit: event.target.value as 'piece' | 'carton' })
            }
            className="h-touch rounded-md border border-border bg-surface px-2 text-sm text-ink-900"
          >
            <option value={line.baseUnit}>{line.baseUnit}</option>
            <option value={line.baseUnit === 'piece' ? 'carton' : 'piece'}>
              {line.baseUnit === 'piece' ? 'carton' : 'piece'}
            </option>
          </select>
        )}

        <span className="ml-auto text-base font-medium text-ink-900">{formatGHS(lineSubtotal(line))}</span>
      </div>

      <div className="mt-2">
        <DiscountEditor
          discount={line.discount}
          onChange={(discount) => dispatch({ type: 'set-line-discount', productId: line.productId, discount })}
          label="Add item discount"
        />
      </div>
    </li>
  );
}

export function CartPanel({ cart, dispatch }: { cart: CartState; dispatch: Dispatch<CartAction> }) {
  const totals = cartTotals(cart);

  if (cart.lines.length === 0) {
    return <p className="p-4 text-center text-ink-500">Cart is empty. Search for a product to get started.</p>;
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <ul>
        {cart.lines.map((line) => (
          <CartLineRow key={line.productId} line={line} dispatch={dispatch} />
        ))}
      </ul>

      <div className="border-t border-border p-3">
        <DiscountEditor
          discount={cart.saleDiscount}
          onChange={(discount) => dispatch({ type: 'set-sale-discount', discount })}
          label="Add sale discount"
        />
      </div>

      <dl className="space-y-1 border-t border-border p-3 text-sm">
        <div className="flex justify-between text-ink-500">
          <dt>Subtotal</dt>
          <dd>{formatGHS(totals.subtotal)}</dd>
        </div>
        {totals.discountTotal > 0 && (
          <div className="flex justify-between text-ink-500">
            <dt>Discount</dt>
            <dd>−{formatGHS(totals.discountTotal)}</dd>
          </div>
        )}
        <div className="flex justify-between text-lg font-semibold text-ink-900">
          <dt>Total</dt>
          <dd>{formatGHS(totals.grandTotal)}</dd>
        </div>
      </dl>
    </div>
  );
}
