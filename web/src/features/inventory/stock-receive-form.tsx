import type { ProductInventoryRow, ProductUnit } from '@shopsense/shared';
import { useState, type FormEvent } from 'react';
import { useReceiveStock } from './use-stock-mutations';

export function StockReceiveForm({ product, onDone }: { product: ProductInventoryRow; onDone: () => void }) {
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<ProductUnit>(product.unit);
  const [unitCost, setUnitCost] = useState('');
  const [error, setError] = useState<string | null>(null);
  const receiveStock = useReceiveStock();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      setError('Enter a whole number greater than 0.');
      return;
    }
    try {
      await receiveStock.mutateAsync({
        productId: product.id,
        quantity: qty,
        unit,
        ...(unitCost ? { unitCost } : {}),
      });
      onDone();
    } catch {
      setError('Could not record this receipt. Please try again.');
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3 p-4">
      <h3 className="text-lg font-semibold text-ink-900">Receive stock — {product.name}</h3>

      <div className="flex gap-3">
        <label className="block flex-1 text-sm font-medium text-ink-700">
          Quantity
          <input
            inputMode="numeric"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="mt-1 block h-touch w-full rounded-md border border-border px-3 text-base text-ink-900"
          />
        </label>
        {product.unitsPerCarton && (
          <label className="block flex-1 text-sm font-medium text-ink-700">
            Unit
            <select
              value={unit}
              onChange={(event) => setUnit(event.target.value as ProductUnit)}
              className="mt-1 block h-touch w-full rounded-md border border-border px-3 text-base text-ink-900"
            >
              <option value={product.unit}>{product.unit}</option>
              <option value={product.unit === 'piece' ? 'carton' : 'piece'}>
                {product.unit === 'piece' ? 'carton' : 'piece'}
              </option>
            </select>
          </label>
        )}
      </div>

      <label className="block text-sm font-medium text-ink-700">
        Unit cost (GH₵, optional)
        <input
          inputMode="decimal"
          value={unitCost}
          onChange={(event) => setUnitCost(event.target.value)}
          className="mt-1 block h-touch w-full rounded-md border border-border px-3 text-base text-ink-900"
        />
      </label>

      {error && <p className="text-sm text-danger-600">{error}</p>}

      <button
        type="submit"
        disabled={receiveStock.isPending}
        className="h-touch w-full rounded-md bg-brand-600 text-base font-medium text-white disabled:opacity-50"
      >
        {receiveStock.isPending ? 'Recording…' : 'Record receipt'}
      </button>
    </form>
  );
}
