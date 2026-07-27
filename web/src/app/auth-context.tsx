import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * Placeholder shape for F3 (Supabase Auth) to fill in with a real session.
 * ProtectedRoute only needs isAuthenticated to exist and be typed correctly
 * today; wiring it to a real Supabase session, token refresh, and shop
 * context is F3's job, not F2's.
 */
export interface AuthState {
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // TODO(F3): replace with a real Supabase session check.
  const value = useMemo<AuthState>(() => ({ isAuthenticated: true }), []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
