import { moneyToPgNumeric, type DailySalesSummary } from '@shopsense/shared';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartColors } from './chart-theme';

// Single series (total sales per day) — no legend needed per the dataviz
// guidance ("none for one"); the chart title already names what's plotted.
export function SalesTrendChart({ data }: { data: DailySalesSummary[] }) {
  if (data.length === 0) {
    return <p className="p-6 text-center text-sm text-ink-500">No sales in this date range.</p>;
  }

  const chartData = data.map((row) => ({ day: row.day.slice(5), total: Number(moneyToPgNumeric(row.grandTotal)) }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: chartColors.ink }} tickLine={false} axisLine={{ stroke: chartColors.grid }} />
          <YAxis
            tick={{ fontSize: 12, fill: chartColors.ink }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(value: number) => `${value}`}
          />
          <Tooltip
            formatter={(value) => [`GH₵${Number(value).toFixed(2)}`, 'Sales']}
            contentStyle={{ borderRadius: 8, borderColor: chartColors.grid, fontSize: 13 }}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke={chartColors.brand}
            strokeWidth={2}
            dot={{ r: 3, fill: chartColors.brand }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
