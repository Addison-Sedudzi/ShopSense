import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';
import type { Pool } from 'pg';
import { AuthGuard } from './auth.guard';

// jwtVerify/createRemoteJWKSet do real network I/O against Supabase's JWKS
// endpoint -- mocked so this test exercises AuthGuard's own logic (header
// parsing, error mapping, the DB lookup) without any network dependency.
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn().mockReturnValue('fake-jwks'),
  jwtVerify: jest.fn(),
}));

function fakeConfigService(): ConfigService {
  return { getOrThrow: () => 'https://project.supabase.co/rest/v1/' } as unknown as ConfigService;
}

function fakePool(rows: unknown[]): Pool {
  return { query: jest.fn().mockResolvedValue({ rows }) } as unknown as Pool;
}

function contextWithHeader(authorization?: string): ExecutionContext {
  const request: { headers: Record<string, string | undefined>; user?: unknown } = {
    headers: { authorization },
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  const mockedJwtVerify = jwtVerify as jest.Mock;

  beforeEach(() => {
    mockedJwtVerify.mockReset();
  });

  it('rejects a request with no Authorization header', async () => {
    const guard = new AuthGuard(fakePool([]), fakeConfigService());
    await expect(guard.canActivate(contextWithHeader(undefined))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a header that is not a Bearer token', async () => {
    const guard = new AuthGuard(fakePool([]), fakeConfigService());
    await expect(guard.canActivate(contextWithHeader('Basic abc123'))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when jwtVerify throws (invalid or expired token)', async () => {
    mockedJwtVerify.mockRejectedValueOnce(new Error('signature verification failed'));
    const guard = new AuthGuard(fakePool([]), fakeConfigService());
    await expect(guard.canActivate(contextWithHeader('Bearer bad.token.here'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects when the verified token has no string subject', async () => {
    mockedJwtVerify.mockResolvedValueOnce({ payload: {} });
    const guard = new AuthGuard(fakePool([]), fakeConfigService());
    await expect(guard.canActivate(contextWithHeader('Bearer ok.token.here'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a verified user with no linked shop', async () => {
    mockedJwtVerify.mockResolvedValueOnce({ payload: { sub: 'user-1' } });
    const guard = new AuthGuard(fakePool([]), fakeConfigService());
    await expect(guard.canActivate(contextWithHeader('Bearer ok.token.here'))).rejects.toThrow(
      /not linked to a shop/,
    );
  });

  it('attaches the authenticated user to the request on success', async () => {
    mockedJwtVerify.mockResolvedValueOnce({ payload: { sub: 'user-1' } });
    const pool = fakePool([{ shop_id: 'shop-1', role: 'owner' }]);
    const guard = new AuthGuard(pool, fakeConfigService());

    const context = contextWithHeader('Bearer ok.token.here');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const request = context.switchToHttp().getRequest();
    expect(request.user).toEqual({ id: 'user-1', shopId: 'shop-1', role: 'owner' });
  });

  it('builds the JWKS URL from SUPABASE_URL, stripping a trailing /rest/v1/', () => {
    const { createRemoteJWKSet } = jest.requireMock('jose') as { createRemoteJWKSet: jest.Mock };
    createRemoteJWKSet.mockClear();

    new AuthGuard(fakePool([]), fakeConfigService());

    expect(createRemoteJWKSet).toHaveBeenCalledWith(
      new URL('https://project.supabase.co/auth/v1/.well-known/jwks.json'),
    );
  });
});
