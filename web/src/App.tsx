import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/app/auth-context';
import { router } from '@/app/router';
import { ShopProvider } from '@/app/shop-context';
import { SyncProvider } from '@/app/sync-context';
import { queryClient } from '@/lib/query-client';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ShopProvider>
          <SyncProvider>
            <RouterProvider router={router} />
          </SyncProvider>
        </ShopProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
