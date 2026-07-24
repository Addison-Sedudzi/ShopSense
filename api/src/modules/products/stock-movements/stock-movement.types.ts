import type { Money, ShopId } from '@shopsense/shared';

export type MovementType =
  | 'receipt'
  | 'sale'
  | 'adjustment_damage'
  | 'adjustment_loss'
  | 'adjustment_correction';

// What a client may record directly. 'sale' is excluded — it is written
// automatically by the (future) sale transaction, never by a direct request.
export type ClientMovementType = Exclude<MovementType, 'sale'>;

export interface StockMovementRow {
  id: string;
  shopId: ShopId;
  productId: string;
  movementType: MovementType;
  quantityDelta: number;
  unitCost: Money | null;
  reason: string | null;
  recordedBy: string | null;
  createdAt: string;
}
