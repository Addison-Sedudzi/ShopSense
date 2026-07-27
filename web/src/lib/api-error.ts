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
