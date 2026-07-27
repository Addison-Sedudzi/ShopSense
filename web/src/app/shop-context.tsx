import type { Me } from '@shopsense/shared';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from './auth-context';

interface ShopState {
  me: Me | null;
  isLoading: boolean;
}

const ShopContext = createContext<ShopState | undefined>(undefined);

/** Fetches GET /api/me once per sign-in (not per request -- the backend
 * derives shopId from the JWT for every actual API call already; this is
 * purely so the UI has a shop name/role to display without re-fetching it
 * on every screen). Re-fetches on sign-in, clears on sign-out. */
export function ShopProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setMe(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    apiClient.get<Me>('/me').then((result) => {
      if (cancelled) return;
      setMe(result.ok ? result.data : null);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return <ShopContext.Provider value={{ me, isLoading }}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopState {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
}
