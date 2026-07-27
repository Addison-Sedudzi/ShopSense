import { Inject, Injectable } from '@nestjs/common';
import { shopId as toShopId, type Me, type ShopId } from '@shopsense/shared';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';

@Injectable()
export class MeRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByUserId(userId: string, shopId: ShopId): Promise<Me | null> {
    const result = await this.pool.query<{
      full_name: string;
      role: 'owner' | 'staff';
      shop_id: string;
      shop_name: string;
      currency: string;
    }>(
      `select u.full_name, u.role, s.id as shop_id, s.name as shop_name, s.currency
       from users u
       join shops s on s.id = u.shop_id
       where u.id = $1 and u.shop_id = $2`,
      [userId, shopId],
    );
    const row = result.rows[0];
    if (!row) return null;

    return {
      userId,
      fullName: row.full_name,
      role: row.role,
      shop: { id: toShopId(row.shop_id), name: row.shop_name, currency: row.currency },
    };
  }
}
