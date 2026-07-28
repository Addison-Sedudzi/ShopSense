import type { DiscountInput, Money, SaleItemInput, SaleRow } from '@shopsense/shared';

/** Bumped whenever the shape of RecordSaleRequest (or this record itself)
 * changes. A record written by an older app version may still be sitting in
 * IndexedDB after an update -- the sync engine checks this before touching
 * anything, rather than assuming forward compatibility. */
export const QUEUED_SALE_SCHEMA_VERSION = 1;

export interface RecordSaleRequest {
  idempotencyKey: string;
  items: SaleItemInput[];
  saleDiscount?: DiscountInput;
}

/** Local-only display data, captured at enqueue time so a still-pending
 * sale can be shown to the cashier without waiting on the server -- this is
 * the client's estimate (cart-math.ts), not confirmed. */
export interface QueuedSaleSummary {
  itemCount: number;
  estimatedGrandTotal: Money;
}

export type SyncState =
  | { status: 'pending' }
  | { status: 'syncing' }
  | { status: 'synced'; sale: SaleRow; syncedAt: string }
  // A failure the server rejected on real grounds (insufficient stock, a
  // validation error) — retrying automatically would just fail again, so
  // this sits until the owner reviews and acts (e.g. adjust the cart, or
  // acknowledge and discard). Distinct from a request that never reached
  // the server at all, which stays 'pending' and is retried automatically.
  | { status: 'failed'; error: string; failedAt: string };

export interface QueuedSale {
  /** Same value as request.idempotencyKey — the primary key IS the
   * idempotency key, so there is exactly one record per logical sale no
   * matter how many times enqueue or sync is attempted. */
  id: string;
  schemaVersion: number;
  request: RecordSaleRequest;
  summary: QueuedSaleSummary;
  createdAt: string;
  sync: SyncState;
}
