import { QueryClient } from '@tanstack/react-query';

/**
 * A module-level singleton (not created inside App.tsx) so non-component
 * code — specifically sync-engine.ts, which runs sales sync outside of any
 * React render and has no hook access — can invalidate queries directly
 * after a background sync succeeds, the same way a mutation's onSuccess
 * would if the sale had gone through a normal foreground submit.
 */
export const queryClient = new QueryClient();
