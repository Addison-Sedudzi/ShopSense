import { useState } from 'react';
import type { ProductRankMetric, ProductRankOrder } from '@shopsense/shared';
import { CsvExportButton } from './csv-export-button';
import { DailyBriefingCard } from './daily-briefing-card';
import { DateRangeFilter, defaultDateRange } from './date-range-filter';
import { DiscountImpactView } from './discount-impact-view';
import type { MarginRow } from './margin-table';
import { MarginTable } from './margin-table';
import { ProductRankingChart } from './product-ranking-chart';
import { RestockPanel } from './restock-panel';
import { SalesTrendChart } from './sales-trend-chart';
import { StockValuationTable } from './stock-valuation-table';
import {
  useDiscountImpact,
  useMarginByCategory,
  useMarginByProduct,
  useProductRanking,
  useSalesSummary,
  useStockValuation,
} from './use-reports';

const today = new Date().toISOString().slice(0, 10);

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
        {action}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function LoadState({ isLoading, isError, children }: { isLoading: boolean; isError: boolean; children: React.ReactNode }) {
  if (isLoading) return <p className="p-4 text-ink-500">Loading…</p>;
  if (isError) return <p className="p-4 text-danger-600">Could not load this report.</p>;
  return <>{children}</>;
}

export function ReportsPage() {
  const [range, setRange] = useState(defaultDateRange);
  const [rankMetric, setRankMetric] = useState<ProductRankMetric>('revenue');
  const [rankOrder, setRankOrder] = useState<ProductRankOrder>('top');
  const [marginView, setMarginView] = useState<'product' | 'category'>('product');

  const salesSummary = useSalesSummary(range.from, range.to);
  const productRanking = useProductRanking(range.from, range.to, rankMetric, rankOrder);
  const marginByProduct = useMarginByProduct(range.from, range.to);
  const marginByCategory = useMarginByCategory(range.from, range.to);
  const stockValuation = useStockValuation();
  const discountImpact = useDiscountImpact(range.from, range.to);

  const marginRows: MarginRow[] =
    marginView === 'product'
      ? (marginByProduct.data ?? []).map((row) => ({
          key: row.productId,
          name: row.productName,
          revenue: row.revenue,
          cost: row.cost,
          margin: row.margin,
        }))
      : (marginByCategory.data ?? []).map((row) => ({
          key: row.categoryName,
          name: row.categoryName,
          revenue: row.revenue,
          cost: row.cost,
          margin: row.margin,
        }));

  return (
    <div className="p-4 pb-8">
      <h1 className="text-2xl font-semibold text-ink-900">Reports</h1>

      <div className="mt-4">
        <DailyBriefingCard date={today} />
      </div>

      <Section title="Restock suggestions">
        <RestockPanel />
      </Section>

      <div className="mt-6">
        <DateRangeFilter range={range} onChange={setRange} />
      </div>

      <Section
        title="Sales trend"
        action={
          <CsvExportButton
            path={`/reports/sales-summary?from=${range.from}&to=${range.to}&format=csv`}
            filename="sales-summary.csv"
          />
        }
      >
        <LoadState isLoading={salesSummary.isLoading} isError={salesSummary.isError}>
          <SalesTrendChart data={salesSummary.data ?? []} />
        </LoadState>
      </Section>

      <Section
        title="Product ranking"
        action={
          <CsvExportButton
            path={`/reports/product-ranking?from=${range.from}&to=${range.to}&metric=${rankMetric}&order=${rankOrder}&limit=10&format=csv`}
            filename="product-ranking.csv"
          />
        }
      >
        <LoadState isLoading={productRanking.isLoading} isError={productRanking.isError}>
          <ProductRankingChart
            data={productRanking.data ?? []}
            metric={rankMetric}
            onMetricChange={setRankMetric}
            order={rankOrder}
            onOrderChange={setRankOrder}
          />
        </LoadState>
      </Section>

      <Section
        title="Margin"
        action={
          <CsvExportButton
            path={
              marginView === 'product'
                ? `/reports/margin-by-product?from=${range.from}&to=${range.to}&format=csv`
                : `/reports/margin-by-category?from=${range.from}&to=${range.to}&format=csv`
            }
            filename={marginView === 'product' ? 'margin-by-product.csv' : 'margin-by-category.csv'}
          />
        }
      >
        <div className="mb-2 flex gap-1">
          <button
            type="button"
            onClick={() => setMarginView('product')}
            className={`h-touch rounded-md border border-border px-3 text-sm ${marginView === 'product' ? 'bg-brand-600 text-white' : 'text-ink-700'}`}
          >
            By product
          </button>
          <button
            type="button"
            onClick={() => setMarginView('category')}
            className={`h-touch rounded-md border border-border px-3 text-sm ${marginView === 'category' ? 'bg-brand-600 text-white' : 'text-ink-700'}`}
          >
            By category
          </button>
        </div>
        <LoadState
          isLoading={marginView === 'product' ? marginByProduct.isLoading : marginByCategory.isLoading}
          isError={marginView === 'product' ? marginByProduct.isError : marginByCategory.isError}
        >
          <MarginTable rows={marginRows} emptyLabel="No sales in this date range." />
        </LoadState>
      </Section>

      <Section
        title="Stock valuation"
        action={<CsvExportButton path="/reports/stock-valuation?format=csv" filename="stock-valuation.csv" />}
      >
        <LoadState isLoading={stockValuation.isLoading} isError={stockValuation.isError}>
          {stockValuation.data && <StockValuationTable report={stockValuation.data} />}
        </LoadState>
      </Section>

      <Section
        title="Discount impact"
        action={
          <CsvExportButton
            path={`/reports/discount-impact?from=${range.from}&to=${range.to}&format=csv`}
            filename="discount-impact.csv"
          />
        }
      >
        <LoadState isLoading={discountImpact.isLoading} isError={discountImpact.isError}>
          {discountImpact.data && <DiscountImpactView report={discountImpact.data} />}
        </LoadState>
      </Section>
    </div>
  );
}
