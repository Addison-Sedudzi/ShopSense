import { money, shopId } from '@shopsense/shared';
import { toProductResponse, type ProductResponse, type ProductRow } from './product.types';

const row: ProductRow = {
  id: 'p1',
  shopId: shopId('shop1'),
  categoryId: null,
  supplierId: null,
  name: 'Milo 400g',
  sku: 'MILO-400',
  unit: 'piece',
  unitsPerCarton: null,
  costPrice: money(1200),
  sellingPrice: money(1800),
  reorderThreshold: 10,
  currentStock: 24,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('toProductResponse', () => {
  it('strips internal-only fields, including cost price', () => {
    const response = toProductResponse(row);
    expect(response).not.toHaveProperty('costPrice');
    expect(response).not.toHaveProperty('shopId');
    expect(response).not.toHaveProperty('supplierId');
    expect(response.sellingPrice).toBe(row.sellingPrice);
  });

  it('derives archived from archivedAt', () => {
    expect(toProductResponse(row).archived).toBe(false);
    expect(
      toProductResponse({ ...row, archivedAt: '2026-02-01T00:00:00.000Z' }).archived,
    ).toBe(true);
  });

  it('cannot return a bare ProductRow where a ProductResponse is expected', () => {
    function controllerHandler(): ProductResponse {
      // @ts-expect-error a ProductRow lacks the response brand — must go through toProductResponse()
      return row;
    }
    void controllerHandler;
  });
});
