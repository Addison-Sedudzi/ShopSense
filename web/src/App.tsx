import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/app/auth-context';
import { router } from '@/app/router';

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
