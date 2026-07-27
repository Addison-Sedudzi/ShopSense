import { useAuth } from '@/app/auth-context';
import { useShop } from '@/app/shop-context';

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
