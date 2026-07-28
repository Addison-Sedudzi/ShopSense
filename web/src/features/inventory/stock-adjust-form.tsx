import type { ProductInventoryRow } from '@shopsense/shared';
import { useState, type FormEvent } from 'react';
import { useAdjustStock } from './use-stock-mutations';

type AdjustmentType = 'adjustment_damage' | 'adjustment_loss' | 'adjustment_correction';

const TYPE_LABELS: Record<AdjustmentType, string> = {
  adjustment_damage: 'Damage',
  adjustment_loss: 'Loss',
  adjustment_correction: 'Correction (recount)',
};

export function StockAdjustForm({ product, onDone }: { product: ProductInventoryRow; onDone: () => void }) {
  const [type, setType] = useState<AdjustmentType>('adjustment_damage');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const adjustStock = useAdjustStock();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty === 0) {
      setError('Enter a non-zero whole number.');
      return;
    }
    if (!reason.trim()) {
      setError('A reason is required for every adjustment.');
      return;
    }
    // Damage/loss always reduce stock; a correction can go either way
    // (a recount can find more stock than expected, not just less) — the
    // quantity typed is always a magnitude, sign is derived from the type.
    const quantityDelta = type === 'adjustment_correction' ? qty : -Math.abs(qty);
    try {
      await adjustStock.mutateAsync({ productId: product.id, type, quantityDelta, reason: reason.trim() });
      onDone();
    } catch {
      setError('Could not record this adjustment. Please try again.');
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3 p-4">
      <h3 className="text-lg font-semibold text-ink-900">Adjust stock — {product.name}</h3>

      <label className="block text-sm font-medium text-ink-700">
        Type
        <select
          value={type}
          onChange={(event) => setType(event.target.value as AdjustmentType)}
          className="mt-1 block h-touch w-full rounded-md border border-border px-3 text-base text-ink-900"
        >
          {(Object.keys(TYPE_LABELS) as AdjustmentType[]).map((key) => (
            <option key={key} value={key}>
              {TYPE_LABELS[key]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-ink-700">
        {type === 'adjustment_correction' ? 'Quantity change (+/-)' : 'Quantity'}
        <input
          inputMode="numeric"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder={type === 'adjustment_correction' ? 'e.g. -2 or 3' : 'e.g. 2'}
          className="mt-1 block h-touch w-full rounded-md border border-border px-3 text-base text-ink-900"
        />
      </label>

      <label className="block text-sm font-medium text-ink-700">
        Reason (required)
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-base text-ink-900"
        />
      </label>

      {error && <p className="text-sm text-danger-600">{error}</p>}

      <button
        type="submit"
        disabled={adjustStock.isPending}
        className="h-touch w-full rounded-md bg-brand-600 text-base font-medium text-white disabled:opacity-50"
      >
        {adjustStock.isPending ? 'Recording…' : 'Record adjustment'}
      </button>
    </form>
  );
}
