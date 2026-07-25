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
import { E2E_DATABASE_URL } from './e2e-db.config';

describe('Products, reconciliations, and reports (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;
  let currentUser: AuthenticatedUser;
  let testShopId: ShopId;
  let ownerId: string;

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

    testShopId = shopId(randomUUID());
    ownerId = randomUUID();
    await pool.query('insert into shops (id, name) values ($1, $2)', [testShopId, 'CRUD Test Shop']);
    await pool.query('insert into auth.users (id) values ($1)', [ownerId]);
    await pool.query('insert into users (id, shop_id, full_name, role) values ($1, $2, $3, $4)', [
      ownerId,
      testShopId,
      'Owner',
      'owner',
    ]);
    currentUser = { id: ownerId, shopId: testShopId, role: 'owner' };
  });

  afterAll(async () => {
    // app.close() runs DatabaseModule's onModuleDestroy, which ends this same
    // pool (overridden as PG_POOL) -- ending it again here would throw.
    await app.close();
  });

  describe('Products CRUD', () => {
    let productId: string;

    it('creates a product and never returns cost price in the response', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/products')
        .send({ name: 'Widget', unit: 'piece', costPrice: '5.00', sellingPrice: '9.00', reorderThreshold: 3 })
        .expect(201);

      expect(response.body.data.name).toBe('Widget');
      expect(response.body.data.sellingPrice).toBe(900);
      expect(response.body.data).not.toHaveProperty('costPrice');
      productId = response.body.data.id;
    });

    it('rejects creation with a missing required field', async () => {
      await request(app.getHttpServer())
        .post('/api/products')
        .send({ unit: 'piece', costPrice: '5.00', sellingPrice: '9.00' })
        .expect(400);
    });

    it('updates a product field', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/products/${productId}`)
        .send({ name: 'Widget Deluxe' })
        .expect(200);

      expect(response.body.data.name).toBe('Widget Deluxe');
    });

    it('404s updating a product that does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/api/products/${randomUUID()}`)
        .send({ name: 'Ghost' })
        .expect(404);
    });

    describe('stock movements', () => {
      it('receives stock by carton, converting to base units', async () => {
        const cartonProduct = await request(app.getHttpServer())
          .post('/api/products')
          .send({
            name: 'Canned Beans',
            unit: 'piece',
            unitsPerCarton: 24,
            costPrice: '1.00',
            sellingPrice: '2.00',
          })
          .expect(201);
        const cartonProductId = cartonProduct.body.data.id;

        const movement = await request(app.getHttpServer())
          .post(`/api/products/${cartonProductId}/stock-movements/receive`)
          .send({ quantity: 2, unit: 'carton' })
          .expect(201);

        expect(movement.body.data.quantityDelta).toBe(48);

        const list = await request(app.getHttpServer()).get('/api/products').expect(200);
        const found = list.body.data.find((p: { id: string }) => p.id === cartonProductId);
        expect(found.currentStock).toBe(48);
      });

      it('rejects a damage adjustment with a positive delta', async () => {
        await request(app.getHttpServer())
          .post(`/api/products/${productId}/stock-movements/adjust`)
          .send({ type: 'adjustment_damage', quantityDelta: 5, reason: 'should be negative' })
          .expect(400);
      });

      it('records and lists a damage adjustment history', async () => {
        await request(app.getHttpServer())
          .post(`/api/products/${productId}/stock-movements/receive`)
          .send({ quantity: 10, unit: 'piece' })
          .expect(201);
        await request(app.getHttpServer())
          .post(`/api/products/${productId}/stock-movements/adjust`)
          .send({ type: 'adjustment_damage', quantityDelta: -3, reason: 'dropped' })
          .expect(201);

        const history = await request(app.getHttpServer())
          .get(`/api/products/${productId}/stock-movements`)
          .expect(200);

        expect(history.body.data[0].movementType).toBe('adjustment_damage');
        expect(history.body.data[0].quantityDelta).toBe(-3);
      });
    });

    it('archives a product and excludes it from the list afterward', async () => {
      await request(app.getHttpServer()).post(`/api/products/${productId}/archive`).expect(201);

      const list = await request(app.getHttpServer()).get('/api/products').expect(200);
      expect(list.body.data.find((p: { id: string }) => p.id === productId)).toBeUndefined();
    });

    it('404s archiving a product that is already archived', async () => {
      await request(app.getHttpServer()).post(`/api/products/${productId}/archive`).expect(404);
    });
  });

  describe('Reconciliations', () => {
    const businessDate = '2021-06-15';

    it('reports zero expected cash for a date with no sales', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/reconciliations/expected-cash?date=${businessDate}`)
        .expect(200);

      expect(response.body.data).toEqual({
        businessDate,
        expectedCash: 0,
        totalDiscounts: 0,
        saleCount: 0,
      });
    });

    it('submits a reconciliation and classifies an overage as unrecorded_sale', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/reconciliations')
        .send({ businessDate, countedCash: '100.00' })
        .expect(201);

      expect(response.body.data.variance).toBe(10000);
      expect(response.body.data.varianceCause).toBe('unrecorded_sale');
    });

    it('rejects resubmitting the same date with 409', async () => {
      await request(app.getHttpServer())
        .post('/api/reconciliations')
        .send({ businessDate, countedCash: '50.00' })
        .expect(409);
    });
  });

  describe('Reports', () => {
    it('sales-summary reflects a completed sale for the date it happened on', async () => {
      const product = await request(app.getHttpServer())
        .post('/api/products')
        .send({ name: 'Report Item', unit: 'piece', costPrice: '4.00', sellingPrice: '10.00' })
        .expect(201);
      const reportProductId = product.body.data.id;
      await request(app.getHttpServer())
        .post(`/api/products/${reportProductId}/stock-movements/receive`)
        .send({ quantity: 5, unit: 'piece' })
        .expect(201);
      const sale = await request(app.getHttpServer())
        .post('/api/sales')
        .send({
          idempotencyKey: 'report-e2e-sale',
          items: [{ productId: reportProductId, quantity: 2, unit: 'piece' }],
        })
        .expect(201);
      const saleDate = sale.body.data.createdAt.slice(0, 10);

      const summary = await request(app.getHttpServer())
        .get(`/api/reports/sales-summary?from=${saleDate}&to=${saleDate}`)
        .expect(200);

      const day = summary.body.data.find((d: { day: string }) => d.day === saleDate);
      expect(day.grandTotal).toBeGreaterThanOrEqual(2000);
    });

    it('rejects a report request where from is after to', async () => {
      await request(app.getHttpServer())
        .get('/api/reports/sales-summary?from=2021-06-20&to=2021-06-01')
        .expect(400);
    });
  });
});
