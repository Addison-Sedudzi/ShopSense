import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '@/features/auth/login-page';
import { SaleTerminalPage } from '@/features/sale-terminal/sale-terminal-page';
import { AppLayout } from './layout';
import { ProtectedRoute } from './protected-route';

// Login and the sale terminal ("/") are each a first-paint route for their
// respective auth state, so they stay eagerly bundled -- everything else is
// lazy so its code (and, for Reports, all of recharts) only loads when the
// owner actually navigates there.
const InventoryPage = lazy(() => import('@/features/inventory/inventory-page').then((m) => ({ default: m.InventoryPage })));
const ReconciliationPage = lazy(() =>
  import('@/features/reconciliation/reconciliation-page').then((m) => ({ default: m.ReconciliationPage })),
);
const ReportsPage = lazy(() => import('@/features/reports/reports-page').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('@/features/settings/settings-page').then((m) => ({ default: m.SettingsPage })));

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/', element: <SaleTerminalPage /> },
      { path: '/inventory', element: <InventoryPage /> },
      { path: '/reconciliation', element: <ReconciliationPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
]);
