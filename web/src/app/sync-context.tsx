import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { QueuedSale } from '@/features/sale-terminal/offline-sale-types';
import { syncAllPending } from '@/features/sale-terminal/sync-engine';
import { getAllQueuedSales } from '@/lib/offline-db';
import { useOnlineStatus } from '@/lib/use-online-status';
import { useAuth } from './auth-context';

interface SyncQueueState {
  queue: QueuedSale[];
  pendingCount: number;
  failedCount: number;
  isSyncing: boolean;
  isOnline: boolean;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncQueueState | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const isOnline = useOnlineStatus();
  const [queue, setQueue] = useState<QueuedSale[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setQueue(await getAllQueuedSales());
  }, []);

  const syncNow = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsSyncing(true);
    try {
      await syncAllPending();
    } finally {
      setIsSyncing(false);
      await refresh();
    }
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Connectivity returning is the primary trigger for catching up the whole
  // queue; the checkout flow separately attempts an immediate sync for the
  // sale it just enqueued, so a sale made while already online confirms
  // right away instead of waiting for this effect.
  useEffect(() => {
    if (isOnline && isAuthenticated) {
      void syncNow();
    }
  }, [isOnline, isAuthenticated, syncNow]);

  const pendingCount = queue.filter((sale) => sale.sync.status === 'pending' || sale.sync.status === 'syncing').length;
  const failedCount = queue.filter((sale) => sale.sync.status === 'failed').length;

  return (
    <SyncContext.Provider value={{ queue, pendingCount, failedCount, isSyncing, isOnline, refresh, syncNow }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncQueue(): SyncQueueState {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncQueue must be used within a SyncProvider');
  }
  return context;
}
