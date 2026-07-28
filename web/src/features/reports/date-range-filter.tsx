export interface DateRange {
  from: string;
  to: string;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return isoDate(date);
}

export const defaultDateRange: DateRange = { from: daysAgo(29), to: isoDate(new Date()) };

const PRESETS: { label: string; days: number }[] = [
  { label: '7d', days: 6 },
  { label: '30d', days: 29 },
  { label: '90d', days: 89 },
];

export function DateRangeFilter({ range, onChange }: { range: DateRange; onChange: (range: DateRange) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        aria-label="From date"
        value={range.from}
        max={range.to}
        onChange={(event) => onChange({ ...range, from: event.target.value })}
        className="h-touch rounded-md border border-border bg-surface px-2 text-sm text-ink-900"
      />
      <span className="text-ink-500">to</span>
      <input
        type="date"
        aria-label="To date"
        value={range.to}
        min={range.from}
        max={isoDate(new Date())}
        onChange={(event) => onChange({ ...range, to: event.target.value })}
        className="h-touch rounded-md border border-border bg-surface px-2 text-sm text-ink-900"
      />
      <div className="flex gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange({ from: daysAgo(preset.days), to: isoDate(new Date()) })}
            className="h-touch rounded-md border border-border px-2 text-sm text-ink-700"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
