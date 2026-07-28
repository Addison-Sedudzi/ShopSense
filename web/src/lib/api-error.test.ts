import { describe, expect, it } from 'vitest';
import { unwrap, type ApiResult } from './api-error';

describe('unwrap', () => {
  it('resolves to the data on a successful result', async () => {
    const result: ApiResult<{ id: string }> = { ok: true, data: { id: '1' } };
    await expect(unwrap(Promise.resolve(result))).resolves.toEqual({ id: '1' });
  });

  it('throws the ApiError on a failed result rather than resolving', async () => {
    const result: ApiResult<never> = { ok: false, error: { kind: 'network' } };
    await expect(unwrap(Promise.resolve(result))).rejects.toEqual({ kind: 'network' });
  });

  it('propagates an http error with its status and message intact', async () => {
    const result: ApiResult<never> = {
      ok: false,
      error: { kind: 'http', status: 404, message: 'Not found' },
    };
    await expect(unwrap(Promise.resolve(result))).rejects.toEqual({ kind: 'http', status: 404, message: 'Not found' });
  });
});
