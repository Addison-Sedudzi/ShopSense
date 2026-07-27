import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '@/features/auth/login-page';
import { InventoryPage } from '@/features/inventory/inventory-page';
import { ReconciliationPage } from '@/features/reconciliation/reconciliation-page';
import { ReportsPage } from '@/features/reports/reports-page';
import { SaleTerminalPage } from '@/features/sale-terminal/sale-terminal-page';
import { SettingsPage } from '@/features/settings/settings-page';
import { AppLayout } from './layout';
import { ProtectedRoute } from './protected-route';

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
