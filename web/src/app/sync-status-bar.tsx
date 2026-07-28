import { useSyncQueue } from './sync-context';

/** Deliberately says nothing when there's nothing to say: online, nothing
 * pending, nothing failed. Offline gets a calm amber note (expected,
 * self-resolving), failed gets red (needs the owner's attention) -- pending
 * gets the same neutral, non-alarming information tone as F1's
 * `StatusTone` scale would give any in-progress state. */
export function SyncStatusBar() {
  const { isOnline, pendingCount, failedCount, isSyncing } = useSyncQueue();

  if (isOnline && pendingCount === 0 && failedCount === 0) return null;

  if (failedCount > 0) {
    return (
      <div className="bg-danger-50 px-4 py-2 text-center text-sm text-danger-600">
        {failedCount} sale{failedCount === 1 ? '' : 's'} need review — see Settings.
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="bg-warning-50 px-4 py-2 text-center text-sm text-warning-600">
        Offline
        {pendingCount > 0 && ` — ${pendingCount} sale${pendingCount === 1 ? '' : 's'} queued, will sync when back online`}
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="bg-info-50 px-4 py-2 text-center text-sm text-brand-600">
        {isSyncing ? 'Syncing…' : `${pendingCount} sale${pendingCount === 1 ? '' : 's'} waiting to sync`}
      </div>
    );
  }

  return null;
}
