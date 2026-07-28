import { NavLink, Outlet } from 'react-router-dom';
import { SyncStatusBar } from './sync-status-bar';

const NAV_ITEMS = [
  { to: '/', label: 'Sell' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/reconciliation', label: 'Reconcile' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
];

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <SyncStatusBar />
      <main className="flex-1 pb-[calc(var(--spacing-touch)+1rem)]">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-surface">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex h-touch flex-1 items-center justify-center text-sm font-medium ${
                isActive ? 'text-brand-600' : 'text-ink-500'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
