import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/app/auth-context';
import { router } from '@/app/router';
import { ShopProvider } from '@/app/shop-context';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ShopProvider>
          <RouterProvider router={router} />
        </ShopProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
