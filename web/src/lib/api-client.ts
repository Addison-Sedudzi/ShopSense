import type { ApiResponse } from '@shopsense/shared';
import type { ApiError, ApiResult } from './api-error';
import { env } from './env';
import { supabase } from './supabase-client';

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (session) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, { ...init, headers });
  } catch {
    return { ok: false, error: { kind: 'network' } };
  }

  if (response.status === 401) {
    // Supabase refreshes the access token in the background on its own; a
    // 401 reaching here means the session is genuinely no longer valid (a
    // revoked refresh token, a device that slept past it), not something a
    // retry would fix. Signing out flips AuthProvider's isAuthenticated to
    // false, and ProtectedRoute reacts with a client-side route change --
    // not a window.location reload -- so nothing held in memory elsewhere
    // in the app (an in-progress cart, once F4 exists) gets wiped just
    // because this one request's auth failed.
    await supabase.auth.signOut();
    return { ok: false, error: { kind: 'unauthorized' } };
  }

  let body: ApiResponse<T>;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    return { ok: false, error: { kind: 'unexpected', message: 'Response was not valid JSON' } };
  }

  if (!body.success) {
    const error: ApiError = { kind: 'http', status: response.status, message: body.error };
    return { ok: false, error };
  }
  return { ok: true, data: body.data };
}

export const apiClient = {
  get: <T>(path: string): Promise<ApiResult<T>> => request<T>(path),
  post: <T>(path: string, body?: unknown): Promise<ApiResult<T>> =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown): Promise<ApiResult<T>> =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
};
