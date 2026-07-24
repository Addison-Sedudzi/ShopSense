import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { shopId, type ShopId } from '@shopsense/shared';
import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

export interface AuthenticatedUser {
  id: string;
  shopId: ShopId;
  role: 'owner' | 'staff';
}

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly jwks: JWTVerifyGetKey;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    configService: ConfigService,
  ) {
    const supabaseUrl = configService
      .getOrThrow<string>('SUPABASE_URL')
      .replace(/\/rest\/v1\/?$/, '');
    this.jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice('Bearer '.length);

    let sub: string;
    try {
      const { payload } = await jwtVerify(token, this.jwks);
      if (typeof payload.sub !== 'string') {
        throw new UnauthorizedException('Token missing subject');
      }
      sub = payload.sub;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired token');
    }

    const result = await this.pool.query<{ shop_id: string; role: 'owner' | 'staff' }>(
      'select shop_id, role from users where id = $1',
      [sub],
    );
    if (result.rows.length === 0) {
      throw new UnauthorizedException('User is not linked to a shop');
    }

    request.user = {
      id: sub,
      shopId: shopId(result.rows[0].shop_id),
      role: result.rows[0].role,
    };
    return true;
  }
}
