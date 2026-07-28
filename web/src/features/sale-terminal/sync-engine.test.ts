import { money } from '@shopsense/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueuedSale } from './offline-sale-types';

const { postMock, putQueuedSaleMock, getAllQueuedSalesMock, invalidateQueriesMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  putQueuedSaleMock: vi.fn(),
  getAllQueuedSalesMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({ apiClient: { post: postMock } }));
vi.mock('@/lib/offline-db', () => ({
  putQueuedSale: putQueuedSaleMock,
  getAllQueuedSales: getAllQueuedSalesMock,
}));
vi.mock('@/lib/query-client', () => ({ queryClient: { invalidateQueries: invalidateQueriesMock } }));

const { attemptSync, syncAllPending } = await import('./sync-engine');

function queuedSale(overrides: Partial<QueuedSale> = {}): QueuedSale {
  return {
    id: 'idem-1',
    schemaVersion: 1,
    request: { idempotencyKey: 'idem-1', items: [] },
    summary: { itemCount: 1, estimatedGrandTotal: money(500) },
    createdAt: '2026-07-28T10:00:00.000Z',
    sync: { status: 'pending' },
    ...overrides,
  };
}

beforeEach(() => {
  postMock.mockReset();
  putQueuedSaleMock.mockReset();
  getAllQueuedSalesMock.mockReset();
  invalidateQueriesMock.mockReset();
});

describe('attemptSync', () => {
  it('marks the record synced and invalidates the products cache on success', async () => {
    const saleRow = { id: 'idem-1' };
    postMock.mockResolvedValue({ ok: true, data: saleRow });

    const result = await attemptSync(queuedSale());

    expect(result.sync).toMatchObject({ status: 'synced', sale: saleRow });
    expect(invalidateQueriesMock).toHaveBeenCalledTimes(1);
    // syncing -> synced: two writes to the local record.
    expect(putQueuedSaleMock).toHaveBeenCalledTimes(2);
  });

  it('stays pending (for automatic retry) on a network failure', async () => {
    postMock.mockResolvedValue({ ok: false, error: { kind: 'network' } });

    const result = await attemptSync(queuedSale());

    expect(result.sync).toEqual({ status: 'pending' });
    expect(invalidateQueriesMock).not.toHaveBeenCalled();
  });

  it('marks the record failed (not retried) on a real server rejection', async () => {
    postMock.mockResolvedValue({ ok: false, error: { kind: 'http', status: 422, message: 'Insufficient stock' } });

    const result = await attemptSync(queuedSale());

    expect(result.sync.status).toBe('failed');
    expect(result.sync).toMatchObject({ error: 'Insufficient stock' });
  });

  it('marks the record failed on an unauthorized failure, with a human-readable message', async () => {
    postMock.mockResolvedValue({ ok: false, error: { kind: 'unauthorized' } });

    const result = await attemptSync(queuedSale());

    expect(result.sync.status).toBe('failed');
    expect(result.sync).toMatchObject({ error: expect.stringContaining('sign in again') });
  });

  it('refuses to sync a record from a different schema version without ever calling the API', async () => {
    const result = await attemptSync(queuedSale({ schemaVersion: 999 }));

    expect(result.sync.status).toBe('failed');
    expect(result.sync).toMatchObject({ error: expect.stringContaining('different app version') });
    expect(postMock).not.toHaveBeenCalled();
  });
});

describe('syncAllPending', () => {
  it('only attempts records that are actually pending', async () => {
    getAllQueuedSalesMock.mockResolvedValue([
      queuedSale({ id: 'a', sync: { status: 'pending' } }),
      queuedSale({ id: 'b', sync: { status: 'synced', sale: {} as never, syncedAt: 'x' } }),
      queuedSale({ id: 'c', sync: { status: 'pending' } }),
    ]);
    postMock.mockResolvedValue({ ok: true, data: {} });

    await syncAllPending();

    expect(postMock).toHaveBeenCalledTimes(2);
  });

  it('does nothing when there are no pending records', async () => {
    getAllQueuedSalesMock.mockResolvedValue([]);

    await syncAllPending();

    expect(postMock).not.toHaveBeenCalled();
  });
});
