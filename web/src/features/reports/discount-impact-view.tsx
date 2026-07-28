import { formatGHS, moneyToPgNumeric, type DiscountImpactReport } from '@shopsense/shared';

const TYPE_LABELS: Record<string, string> = {
  percentage: 'Percentage',
  fixed_amount: 'Fixed amount',
};

const LEVEL_LABELS: Record<string, string> = {
  item: 'Item-level',
  sale: 'Sale-level',
};

export function DiscountImpactView({ report }: { report: DiscountImpactReport }) {
  const gross = Number(moneyToPgNumeric(report.grossSales));
  const discounted = Number(moneyToPgNumeric(report.totalDiscounts));
  const discountRate = gross > 0 ? (discounted / gross) * 100 : 0;

  return (
    <div>
      <div className="flex flex-wrap gap-6 rounded-lg border border-border bg-surface p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-500">Gross sales</p>
          <p className="text-lg font-medium text-ink-900">{formatGHS(report.grossSales)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-500">Total discounts</p>
          <p className="text-lg font-medium text-danger-600">{formatGHS(report.totalDiscounts)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-500">Discount rate</p>
          <p className="text-lg font-medium text-ink-900">{discountRate.toFixed(1)}%</p>
        </div>
      </div>

      {report.lines.length === 0 ? (
        <p className="p-6 text-center text-sm text-ink-500">No discounts applied in this date range.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
          {report.lines.map((line) => (
            <li
              key={`${line.discountType}-${line.level}`}
              className="flex min-h-touch items-center justify-between gap-3 px-4 py-2"
            >
              <span className="text-ink-900">
                {TYPE_LABELS[line.discountType] ?? line.discountType} · {LEVEL_LABELS[line.level] ?? line.level}
              </span>
              <span className="flex gap-4 tabular-nums">
                <span className="text-ink-500">{line.discountCount}×</span>
                <span className="w-24 text-right font-medium text-ink-900">{formatGHS(line.totalAmount)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
