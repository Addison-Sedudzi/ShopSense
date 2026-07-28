import { formatGHS, type Money } from '@shopsense/shared';

export interface MarginRow {
  key: string;
  name: string;
  revenue: Money;
  cost: Money;
  margin: Money;
}

export function MarginTable({ rows, emptyLabel }: { rows: MarginRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return <p className="p-6 text-center text-sm text-ink-500">{emptyLabel}</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
      <li className="flex items-center justify-between gap-3 px-4 py-2 text-xs font-medium uppercase tracking-wide text-ink-500">
        <span>Name</span>
        <span className="flex gap-4">
          <span className="w-20 text-right">Revenue</span>
          <span className="w-20 text-right">Cost</span>
          <span className="w-20 text-right">Margin</span>
        </span>
      </li>
      {rows.map((row) => (
        <li key={row.key} className="flex min-h-touch items-center justify-between gap-3 px-4 py-2">
          <span className="text-ink-900">{row.name}</span>
          <span className="flex gap-4 tabular-nums">
            <span className="w-20 text-right text-ink-700">{formatGHS(row.revenue)}</span>
            <span className="w-20 text-right text-ink-500">{formatGHS(row.cost)}</span>
            <span className={`w-20 text-right font-medium ${row.margin >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {formatGHS(row.margin)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
