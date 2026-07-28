import { formatGHS } from '@shopsense/shared';
import { useAuth } from '@/app/auth-context';
import { useShop } from '@/app/shop-context';
import { useSyncQueue } from '@/app/sync-context';
import { attemptSync } from '@/features/sale-terminal/sync-engine';

function SyncQueueSection() {
  const { queue, refresh } = useSyncQueue();
  const failed = queue.filter((sale) => sale.sync.status === 'failed');

  if (failed.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-danger-500/30 bg-surface p-4">
      <h2 className="text-base font-semibold text-ink-900">Sales needing review</h2>
      <ul className="mt-2 space-y-3">
        {failed.map((sale) => (
          <li key={sale.id} className="rounded-md bg-danger-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-900">
                {sale.summary.itemCount} item{sale.summary.itemCount === 1 ? '' : 's'} —{' '}
                {formatGHS(sale.summary.estimatedGrandTotal)}
              </span>
              <span className="text-ink-500">{new Date(sale.createdAt).toLocaleTimeString()}</span>
            </div>
            <p className="mt-1 text-danger-600">
              {sale.sync.status === 'failed' ? sale.sync.error : null}
            </p>
            <button
              type="button"
              onClick={() => {
                void attemptSync(sale).then(() => refresh());
              }}
              className="mt-2 text-sm text-brand-600 underline"
            >
              Retry
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SettingsPage() {
  const { signOut } = useAuth();
  const { me, isLoading } = useShop();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold text-ink-900">Settings</h1>

      <div className="mt-4 rounded-lg border border-border bg-surface p-4">
        {isLoading ? (
          <p className="text-ink-500">Loading…</p>
        ) : me ? (
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Shop</dt>
              <dd className="text-ink-900">{me.shop.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Signed in as</dt>
              <dd className="text-ink-900">{me.fullName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Role</dt>
              <dd className="text-ink-900 capitalize">{me.role}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-danger-600">Could not load shop details.</p>
        )}
      </div>

      <SyncQueueSection />

      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-4 h-touch w-full rounded-md border border-border text-base font-medium text-ink-900"
      >
        Sign out
      </button>
    </div>
  );
}
