'use client';

export type TimeRange = 'day' | 'week' | 'month' | 'year';

const filters: { label: string; value: TimeRange }[] = [
  { label: 'Today', value: 'day' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
];

export default function TrendFilters({
  active,
  onChange,
}: {
  active: TimeRange;
  onChange: (range: TimeRange) => void;
}) {
  return (
    <div className="flex gap-2">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            active === f.value
              ? 'bg-brand-600 text-white'
              : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
