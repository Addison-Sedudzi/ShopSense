import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { shopId, type ShopId } from '@shopsense/shared';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AuthGuard, type AuthenticatedUser } from '../src/auth/auth.guard';
import { PG_POOL, shopSenseTypeParsers } from '../src/database/database.module';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { E2E_DATABASE_URL } from './e2e-db.config';

describe('Sale endpoint (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;
  let currentUser: AuthenticatedUser;

  let shopAId: ShopId;
  let shopBId: ShopId;
  let ownerAId: string;
  let ownerBId: string;
  let productId: string;

  const fakeAuthGuard: CanActivate = {
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      req.user = currentUser;
      return true;
    },
  };

  beforeAll(async () => {
    pool = new Pool({ connectionString: E2E_DATABASE_URL, types: shopSenseTypeParsers() });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PG_POOL)
      .useValue(pool)
      .overrideGuard(AuthGuard)
      .useValue(fakeAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    shopAId = shopId(randomUUID());
    shopBId = shopId(randomUUID());
    ownerAId = randomUUID();
    ownerBId = randomUUID();
    productId = randomUUID();

    await pool.query('insert into shops (id, name) values ($1, $2), ($3, $4)', [
      shopAId,
      'Shop A',
      shopBId,
      'Shop B',
    ]);
    await pool.query('insert into auth.users (id) values ($1), ($2)', [ownerAId, ownerBId]);
    await pool.query(
      'insert into users (id, shop_id, full_name, role) values ($1, $2, $3, $4), ($5, $6, $7, $8)',
      [ownerAId, shopAId, 'Owner A', 'owner', ownerBId, shopBId, 'Owner B', 'owner'],
    );
    await pool.query(
      `insert into products (id, shop_id, name, base_unit, cost_price, selling_price, reorder_threshold)
       values ($1, $2, 'Test Widget', 'piece', 5.00, 10.00, 5)`,
      [productId, shopAId],
    );
    // 10 units of initial stock, seeded directly rather than through the
    // receive endpoint -- this suite is testing the sale endpoint, not receiving.
    await pool.query(
      `insert into stock_movements (shop_id, product_id, movement_type, quantity_delta)
       values ($1, $2, 'receipt', 10)`,
      [shopAId, productId],
    );
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  function asOwnerA() {
    currentUser = { id: ownerAId, shopId: shopAId, role: 'owner' };
  }

  function asOwnerB() {
    currentUser = { id: ownerBId, shopId: shopBId, role: 'owner' };
  }

  it('records a sale and decrements stock', async () => {
    asOwnerA();
    const response = await request(app.getHttpServer())
      .post('/api/sales')
      .send({
        idempotencyKey: 'e2e-happy-path',
        items: [{ productId, quantity: 2, unit: 'piece' }],
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.grandTotal).toBe(2000);

    const products = await request(app.getHttpServer()).get('/api/products').expect(200);
    const product = products.body.data.find((p: { id: string }) => p.id === productId);
    expect(product.currentStock).toBe(8);
  });

  it('rejects a sale that exceeds current stock with 409', async () => {
    asOwnerA();
    const response = await request(app.getHttpServer())
      .post('/api/sales')
      .send({
        idempotencyKey: 'e2e-insufficient-stock',
        items: [{ productId, quantity: 999, unit: 'piece' }],
      })
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/Insufficient stock/);
  });

  it('rejects a sale for a product belonging to a different shop with 404', async () => {
    // Owner B is authenticated for Shop B, but the product belongs to Shop A.
    // The repository's WHERE clause scopes by shop_id, so this must come back
    // not-found rather than leaking or selling another shop's inventory.
    asOwnerB();
    const response = await request(app.getHttpServer())
      .post('/api/sales')
      .send({
        idempotencyKey: 'e2e-cross-shop-attempt',
        items: [{ productId, quantity: 1, unit: 'piece' }],
      })
      .expect(404);

    expect(response.body.success).toBe(false);
  });

  it('is idempotent: retrying the same idempotencyKey does not double-charge stock', async () => {
    asOwnerA();
    const first = await request(app.getHttpServer())
      .post('/api/sales')
      .send({
        idempotencyKey: 'e2e-idempotent-retry',
        items: [{ productId, quantity: 1, unit: 'piece' }],
      })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/api/sales')
      .send({
        idempotencyKey: 'e2e-idempotent-retry',
        items: [{ productId, quantity: 1, unit: 'piece' }],
      })
      .expect(201);

    expect(second.body.data.id).toBe(first.body.data.id);

    const stockResult = await pool.query<{ sum: string }>(
      'select sum(quantity_delta) as sum from stock_movements where product_id = $1',
      [productId],
    );
    // 10 seeded - 2 (happy path) - 1 (this test, exactly once despite two requests) = 7
    expect(Number(stockResult.rows[0].sum)).toBe(7);
  });
});
