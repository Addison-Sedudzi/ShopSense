import { moneyToPgNumeric, type ProductRankMetric, type ProductRankOrder, type ProductRanking } from '@shopsense/shared';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartColors } from './chart-theme';

export function ProductRankingChart({
  data,
  metric,
  onMetricChange,
  order,
  onOrderChange,
}: {
  data: ProductRanking[];
  metric: ProductRankMetric;
  onMetricChange: (metric: ProductRankMetric) => void;
  order: ProductRankOrder;
  onOrderChange: (order: ProductRankOrder) => void;
}) {
  const chartData = data.map((row) => ({
    name: row.productName.length > 18 ? `${row.productName.slice(0, 17)}…` : row.productName,
    value: metric === 'revenue' ? Number(moneyToPgNumeric(row.totalRevenue)) : row.totalQuantity,
  }));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Rank by"
          value={metric}
          onChange={(event) => onMetricChange(event.target.value as ProductRankMetric)}
          className="h-touch rounded-md border border-border bg-surface px-2 text-sm text-ink-900"
        >
          <option value="revenue">By revenue</option>
          <option value="quantity">By quantity</option>
        </select>
        <select
          aria-label="Ranking order"
          value={order}
          onChange={(event) => onOrderChange(event.target.value as ProductRankOrder)}
          className="h-touch rounded-md border border-border bg-surface px-2 text-sm text-ink-900"
        >
          <option value="top">Top performers</option>
          <option value="bottom">Bottom performers</option>
        </select>
      </div>

      {data.length === 0 ? (
        <p className="p-6 text-center text-sm text-ink-500">No sales in this date range.</p>
      ) : (
        <div style={{ height: Math.max(160, chartData.length * 36) }} className="mt-3 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: chartColors.ink }}
                tickLine={false}
                axisLine={{ stroke: chartColors.grid }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: chartColors.ink }}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip
                formatter={(value) => [
                  metric === 'revenue' ? `GH₵${Number(value).toFixed(2)}` : `${Number(value)} units`,
                  metric === 'revenue' ? 'Revenue' : 'Quantity',
                ]}
                contentStyle={{ borderRadius: 8, borderColor: chartColors.grid, fontSize: 13 }}
              />
              <Bar dataKey="value" fill={chartColors.brand} radius={[0, 4, 4, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
