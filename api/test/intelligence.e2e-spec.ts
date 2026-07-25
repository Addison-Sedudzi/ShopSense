import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { shopId, type ShopId } from '@shopsense/shared';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthGuard, type AuthenticatedUser } from '../src/auth/auth.guard';
import { configureApp } from '../src/configure-app';
import { PG_POOL, shopSenseTypeParsers } from '../src/database/database.module';
import { ClaudeService } from '../src/modules/intelligence/claude.service';
import { E2E_DATABASE_URL } from './e2e-db.config';

// Typed against ClaudeService's real public shape (Pick, not `any`) so a
// future change to structuredComplete's signature breaks this mock at
// compile time instead of silently drifting out of sync with the real class.
type MockClaudeService = Pick<ClaudeService, 'structuredComplete'>;

describe('Intelligence endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;
  let currentUser: AuthenticatedUser;
  let structuredComplete: jest.Mock;

  const fakeAuthGuard: CanActivate = {
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      req.user = currentUser;
      return true;
    },
  };

  beforeAll(async () => {
    pool = new Pool({ connectionString: E2E_DATABASE_URL, types: shopSenseTypeParsers() });
    structuredComplete = jest.fn();
    const mockClaude: MockClaudeService = { structuredComplete };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PG_POOL)
      .useValue(pool)
      .overrideProvider(ClaudeService)
      .useValue(mockClaude)
      .overrideGuard(AuthGuard)
      .useValue(fakeAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(() => {
    structuredComplete.mockReset();
  });

  /** Every test gets its own shop, so IntelligenceCache (a per-process
   * singleton, keyed by shopId) can never leak a result from one test into
   * another — each scenario genuinely exercises a fresh cache miss. */
  async function seedShop(): Promise<{ shopId: ShopId; ownerId: string }> {
    const newShopId = shopId(randomUUID());
    const ownerId = randomUUID();
    await pool.query('insert into shops (id, name) values ($1, $2)', [newShopId, `Shop ${newShopId}`]);
    await pool.query('insert into auth.users (id) values ($1)', [ownerId]);
    await pool.query('insert into users (id, shop_id, full_name, role) values ($1, $2, $3, $4)', [
      ownerId,
      newShopId,
      'Owner',
      'owner',
    ]);
    return { shopId: newShopId, ownerId };
  }

  async function seedProduct(
    shop: ShopId,
    name: string,
    reorderThreshold: number,
    initialStock: number,
  ): Promise<string> {
    const productId = randomUUID();
    await pool.query(
      `insert into products (id, shop_id, name, base_unit, cost_price, selling_price, reorder_threshold)
       values ($1, $2, $3, 'piece', 3.00, 6.00, $4)`,
      [productId, shop, name, reorderThreshold],
    );
    await pool.query(
      `insert into stock_movements (shop_id, product_id, movement_type, quantity_delta)
       values ($1, $2, 'receipt', $3)`,
      [shop, productId, initialStock],
    );
    return productId;
  }

  describe('GET /api/intelligence/restock-recommendations', () => {
    it('sends candidates to Claude and resolves the recommended product name from our own data, not from Claude', async () => {
      const { shopId: shop, ownerId } = await seedShop();
      const productId = await seedProduct(shop, 'Low Stock Widget', 10, 2); // 2 in stock, threshold 10
      currentUser = { id: ownerId, shopId: shop, role: 'owner' };

      structuredComplete.mockResolvedValueOnce({
        recommendations: [{ productId, suggestedQuantity: 20, reason: 'Low stock, steady demand' }],
      });

      const response = await request(app.getHttpServer())
        .get('/api/intelligence/restock-recommendations')
        .expect(200);

      expect(response.body.data).toEqual([
        {
          productId,
          productName: 'Low Stock Widget', // from our DB, never echoed by the mock
          suggestedQuantity: 20,
          reason: 'Low stock, steady demand',
        },
      ]);
      expect(structuredComplete).toHaveBeenCalledTimes(1);
    });

    it('degrades to an empty list instead of failing the request when Claude errors', async () => {
      const { shopId: shop, ownerId } = await seedShop();
      await seedProduct(shop, 'Another Low Stock Item', 10, 2);
      currentUser = { id: ownerId, shopId: shop, role: 'owner' };

      structuredComplete.mockRejectedValueOnce(new Error('simulated Claude outage'));

      const response = await request(app.getHttpServer())
        .get('/api/intelligence/restock-recommendations')
        .expect(200);

      expect(response.body).toEqual({ success: true, data: [] });
      expect(structuredComplete).toHaveBeenCalledTimes(1);
    });

    it('caches a successful result and does not call Claude again while nothing has changed', async () => {
      const { shopId: shop, ownerId } = await seedShop();
      const productId = await seedProduct(shop, 'Cached Case Item', 10, 2);
      currentUser = { id: ownerId, shopId: shop, role: 'owner' };

      structuredComplete.mockResolvedValueOnce({
        recommendations: [{ productId, suggestedQuantity: 15, reason: 'cached case' }],
      });

      await request(app.getHttpServer()).get('/api/intelligence/restock-recommendations').expect(200);
      const second = await request(app.getHttpServer())
        .get('/api/intelligence/restock-recommendations')
        .expect(200);

      expect(second.body.data[0].reason).toBe('cached case');
      expect(structuredComplete).toHaveBeenCalledTimes(1);
    });

    it('never calls Claude when there are no products below their reorder threshold', async () => {
      const { shopId: shop, ownerId } = await seedShop();
      await seedProduct(shop, 'Well Stocked Item', 1, 100); // 100 in stock, threshold 1
      currentUser = { id: ownerId, shopId: shop, role: 'owner' };

      const response = await request(app.getHttpServer())
        .get('/api/intelligence/restock-recommendations')
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(structuredComplete).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/intelligence/daily-briefing', () => {
    it('computes facts server-side and uses Claude only for the prose summary', async () => {
      const { shopId: shop, ownerId } = await seedShop();
      currentUser = { id: ownerId, shopId: shop, role: 'owner' };

      structuredComplete.mockResolvedValueOnce({ summary: 'A quiet day with one low-stock item to watch.' });

      const response = await request(app.getHttpServer())
        .get('/api/intelligence/daily-briefing?date=2020-01-01')
        .expect(200);

      expect(response.body.data.summary).toBe('A quiet day with one low-stock item to watch.');
      expect(response.body.data.businessDate).toBe('2020-01-01');
      expect(response.body.data.reconciliation).toEqual({
        submitted: false,
        variance: null,
        varianceCause: null,
      });
    });

    it('falls back to a fixed message instead of failing when Claude errors', async () => {
      const { shopId: shop, ownerId } = await seedShop();
      currentUser = { id: ownerId, shopId: shop, role: 'owner' };

      structuredComplete.mockRejectedValueOnce(new Error('simulated Claude outage'));

      const response = await request(app.getHttpServer())
        .get('/api/intelligence/daily-briefing?date=2020-01-02')
        .expect(200);

      expect(response.body.data.summary).toMatch(/AI summary unavailable/);
    });

    it('rejects a malformed date with 400 before ever touching Claude', async () => {
      const { shopId: shop, ownerId } = await seedShop();
      currentUser = { id: ownerId, shopId: shop, role: 'owner' };

      await request(app.getHttpServer())
        .get('/api/intelligence/daily-briefing?date=not-a-date')
        .expect(400);

      expect(structuredComplete).not.toHaveBeenCalled();
    });
  });
});
