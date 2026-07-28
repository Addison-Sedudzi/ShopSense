/**
 * Every failure mode an API call can hit, modelled as a typed union instead
 * of a thrown Error a call site would have to catch-and-guess the shape of.
 * A switch over `error.kind` is exhaustive-checkable by the compiler.
 */
export type ApiError =
  | { kind: 'network' }
  | { kind: 'unauthorized' }
  | { kind: 'http'; status: number; message: string }
  | { kind: 'unexpected'; message: string };

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/**
 * TanStack Query's queryFn contract is throw-on-error (it's what drives
 * isError/error), which is a different convention from apiClient's Result
 * type. This is the one place that bridges them, so every query hook stays
 * on the same Result-typed apiClient the rest of the app uses instead of a
 * parallel throwing client existing just for queries.
 */
export async function unwrap<T>(pending: Promise<ApiResult<T>>): Promise<T> {
  const result = await pending;
  if (!result.ok) {
    throw result.error;
  }
  return result.data;
}
