import { formatGHS, type MovementType } from '@shopsense/shared';
import { useStockMovements } from './use-stock-movements';

const MOVEMENT_LABELS: Record<MovementType, string> = {
  receipt: 'Received',
  sale: 'Sold',
  adjustment_damage: 'Damage',
  adjustment_loss: 'Loss',
  adjustment_correction: 'Correction',
};

export function StockHistoryView({ productId }: { productId: string }) {
  const { data, isLoading, isError } = useStockMovements(productId);

  if (isLoading) return <p className="p-4 text-ink-500">Loading history…</p>;
  if (isError) return <p className="p-4 text-danger-600">Could not load stock history.</p>;
  if (!data || data.length === 0) return <p className="p-4 text-ink-500">No stock movements yet.</p>;

  return (
    <ul className="divide-y divide-border">
      {data.map((movement) => (
        <li key={movement.id} className="flex items-center justify-between px-4 py-2 text-sm">
          <div>
            <span className="text-ink-900">{MOVEMENT_LABELS[movement.movementType]}</span>
            {movement.reason && <span className="ml-2 text-ink-500">— {movement.reason}</span>}
            <div className="text-ink-500">{new Date(movement.createdAt).toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className={movement.quantityDelta > 0 ? 'text-success-600' : 'text-danger-600'}>
              {movement.quantityDelta > 0 ? '+' : ''}
              {movement.quantityDelta}
            </div>
            {movement.unitCost !== null && <div className="text-ink-500">{formatGHS(movement.unitCost)}/unit</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}
