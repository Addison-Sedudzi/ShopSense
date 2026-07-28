import type { DiscountInput, DiscountType } from '@shopsense/shared';
import { useState } from 'react';

/** A collapsed "Add discount" affordance that expands into a type+value
 * editor -- kept out of the default line/cart layout so the common
 * no-discount path stays visually uncluttered. */
export function DiscountEditor({
  discount,
  onChange,
  label,
}: {
  discount: DiscountInput | null;
  onChange: (discount: DiscountInput | null) => void;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(discount !== null);

  if (!isOpen && !discount) {
    return (
      <button type="button" onClick={() => setIsOpen(true)} className="text-sm text-brand-600 underline">
        {label}
      </button>
    );
  }

  const type: DiscountType = discount?.type ?? 'percentage';
  const value = discount?.value ?? '';

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={`${label} type`}
        value={type}
        onChange={(event) => onChange({ type: event.target.value as DiscountType, value: value || '0' })}
        className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-ink-900"
      >
        <option value="percentage">%</option>
        <option value="fixed_amount">GH₵</option>
      </select>
      <input
        type="text"
        inputMode="decimal"
        aria-label={`${label} value`}
        placeholder={type === 'percentage' ? '10' : '5.00'}
        value={value}
        onChange={(event) => onChange({ type, value: event.target.value })}
        className="h-9 w-20 rounded-md border border-border bg-surface px-2 text-sm text-ink-900"
      />
      <button
        type="button"
        onClick={() => {
          setIsOpen(false);
          onChange(null);
        }}
        className="text-sm text-ink-500 underline"
      >
        Remove
      </button>
    </div>
  );
}
