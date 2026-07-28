import { formatGHS } from '@shopsense/shared';
import { useMemo, useState } from 'react';
import { CsvImport } from './csv-import';
import { LowStockBoard } from './low-stock-board';
import { ProductDetailPanel } from './product-detail-panel';
import { ProductForm } from './product-form';
import { useArchiveProduct, useCreateProduct, useUpdateProduct, type ProductPatch } from './use-product-mutations';
import { useInventoryProducts } from './use-inventory-products';

type View = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; productId: string } | { kind: 'detail'; productId: string } | { kind: 'import' };

export function InventoryPage() {
  const [view, setView] = useState<View>({ kind: 'list' });
  const [query, setQuery] = useState('');
  const productsQuery = useInventoryProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const archiveProduct = useArchiveProduct();

  const filtered = useMemo(() => {
    const rows = productsQuery.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(q) || row.sku?.toLowerCase().includes(q));
  }, [productsQuery.data, query]);

  if (view.kind === 'create') {
    return (
      <ProductForm
        isSubmitting={createProduct.isPending}
        onCancel={() => setView({ kind: 'list' })}
        onSubmit={(patch: ProductPatch) => {
          createProduct.mutate(patch, { onSuccess: () => setView({ kind: 'list' }) });
        }}
      />
    );
  }

  if (view.kind === 'edit') {
    const product = productsQuery.data?.find((row) => row.id === view.productId);
    if (!product) return null;
    return (
      <ProductForm
        product={product}
        isSubmitting={updateProduct.isPending}
        onCancel={() => setView({ kind: 'detail', productId: product.id })}
        onSubmit={(patch: ProductPatch) => {
          updateProduct.mutate(
            { id: product.id, patch },
            { onSuccess: () => setView({ kind: 'detail', productId: product.id }) },
          );
        }}
      />
    );
  }

  if (view.kind === 'detail') {
    const product = productsQuery.data?.find((row) => row.id === view.productId);
    if (!product) return null;
    return (
      <ProductDetailPanel
        product={product}
        onEdit={() => setView({ kind: 'edit', productId: product.id })}
        onClose={() => setView({ kind: 'list' })}
        onArchive={() => archiveProduct.mutate(product.id, { onSuccess: () => setView({ kind: 'list' }) })}
      />
    );
  }

  if (view.kind === 'import') {
    return <CsvImport onDone={() => setView({ kind: 'list' })} />;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Inventory</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView({ kind: 'import' })}
            className="h-touch rounded-md border border-border px-3 text-sm font-medium text-ink-900"
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={() => setView({ kind: 'create' })}
            className="h-touch rounded-md bg-brand-600 px-3 text-sm font-medium text-white"
          >
            + Add
          </button>
        </div>
      </div>

      {productsQuery.data && (
        <div className="mt-4">
          <LowStockBoard products={productsQuery.data} onSelect={(productId) => setView({ kind: 'detail', productId })} />
        </div>
      )}

      <input
        type="search"
        placeholder="Search by name or code…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="mt-4 h-touch w-full rounded-md border border-border bg-surface px-3 text-base text-ink-900 outline-none focus:border-brand-500"
      />

      {productsQuery.isLoading && <p className="mt-4 text-ink-500">Loading products…</p>}
      {productsQuery.isError && <p className="mt-4 text-danger-600">Could not load products.</p>}

      <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
        {filtered.length === 0 && productsQuery.data && (
          <li className="p-4 text-sm text-ink-500">No products match.</li>
        )}
        {filtered.map((product) => (
          <li key={product.id}>
            <button
              type="button"
              onClick={() => setView({ kind: 'detail', productId: product.id })}
              className="flex min-h-touch w-full items-center justify-between gap-3 px-4 py-2 text-left"
            >
              <span>
                <span className="block text-ink-900">{product.name}</span>
                <span className="block text-sm text-ink-500">
                  {formatGHS(product.sellingPrice)} · margin {formatGHS(product.margin)}
                </span>
              </span>
              <span className="text-sm text-ink-700">
                {product.currentStock} {product.unit}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
