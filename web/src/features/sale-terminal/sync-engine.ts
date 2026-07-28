import type { SaleRow } from '@shopsense/shared';
import { apiClient } from '@/lib/api-client';
import type { ApiError } from '@/lib/api-error';
import { getAllQueuedSales, putQueuedSale } from '@/lib/offline-db';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { QUEUED_SALE_SCHEMA_VERSION, type QueuedSale } from './offline-sale-types';

function describeSyncError(error: ApiError): string {
  switch (error.kind) {
    case 'http':
      return error.message;
    case 'unauthorized':
      return 'Session expired while syncing — sign in again to retry.';
    case 'network':
      return 'Network error while syncing.';
    case 'unexpected':
      return error.message;
  }
}

/** Attempts to sync one queued sale. Never throws -- every outcome
 * (success, a real server rejection, a network failure) is written back
 * into the record's own sync state and returned, so callers never need a
 * try/catch around this. */
export async function attemptSync(sale: QueuedSale): Promise<QueuedSale> {
  if (sale.schemaVersion !== QUEUED_SALE_SCHEMA_VERSION) {
    // Written by a different app version. Rather than guess whether its
    // shape still matches what the backend expects, this is surfaced to the
    // owner as failed for manual review, not silently attempted or dropped.
    const failed: QueuedSale = {
      ...sale,
      sync: {
        status: 'failed',
        error: 'This sale was queued by a different app version and needs manual review.',
        failedAt: new Date().toISOString(),
      },
    };
    await putQueuedSale(failed);
    return failed;
  }

  await putQueuedSale({ ...sale, sync: { status: 'syncing' } });

  const result = await apiClient.post<SaleRow>('/sales', sale.request);

  if (result.ok) {
    const synced: QueuedSale = {
      ...sale,
      sync: { status: 'synced', sale: result.data, syncedAt: new Date().toISOString() },
    };
    await putQueuedSale(synced);
    // Stock just changed server-side, whether this synced immediately in
    // the foreground or minutes later in the background — either way the
    // product list's currentStock is now stale and needs a refetch.
    void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    return synced;
  }

  // A network-kind failure means the request never really got a verdict
  // from the server -- stays pending so the next sync pass (the next
  // 'online' event) retries automatically. Anything else (the server
  // actually responded: insufficient stock, a validation error) is a real
  // answer that blind retrying won't change -- surfaced as failed instead.
  const isRetryable = result.error.kind === 'network';
  const updated: QueuedSale = isRetryable
    ? { ...sale, sync: { status: 'pending' } }
    : {
        ...sale,
        sync: { status: 'failed', error: describeSyncError(result.error), failedAt: new Date().toISOString() },
      };
  await putQueuedSale(updated);
  return updated;
}

/** Syncs every pending record, one at a time rather than in parallel. A
 * batch of sales landing on the server simultaneously right as
 * connectivity returns is exactly the scenario B7's SELECT FOR UPDATE
 * locking exists to handle safely, but serializing client-side keeps this
 * sync pass's own behavior easy to reason about and avoids hammering a
 * connection that may have just come back. */
export async function syncAllPending(): Promise<void> {
  const queue = await getAllQueuedSales();
  const pending = queue.filter((sale) => sale.sync.status === 'pending');
  for (const sale of pending) {
    await attemptSync(sale);
  }
}
