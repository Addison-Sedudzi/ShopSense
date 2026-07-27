import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/app/auth-context';
import { router } from '@/app/router';
import { ShopProvider } from '@/app/shop-context';

function App() {
  return (
    <AuthProvider>
      <ShopProvider>
        <RouterProvider router={router} />
      </ShopProvider>
    </AuthProvider>
  );
}

export default App;
