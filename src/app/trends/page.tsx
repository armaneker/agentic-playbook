'use client';

import { useState, useMemo } from 'react';
import TrendFilters, { type TimeRange } from '@/components/TrendFilters';
import TrendCard, { type TrendRepo } from '@/components/TrendCard';
import trendsData from '@/data/trends/computed/trends.json';

const deltaKey: Record<TimeRange, keyof TrendRepo> = {
  day: 'delta_day',
  week: 'delta_week',
  month: 'delta_month',
  year: 'delta_year',
};

export default function TrendsPage() {
  const [range, setRange] = useState<TimeRange>('week');

  const sorted = useMemo(() => {
    const key = deltaKey[range];
    return [...(trendsData.repos as TrendRepo[])].sort(
      (a, b) => (b[key] as number) - (a[key] as number)
    );
  }, [range]);

  const updatedDate = new Date(trendsData.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="not-prose">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-50 mb-2">
          Trending Repos
        </h1>
        <p className="text-sm text-gray-500 mb-5">
          GitHub projects gaining stars. Updated {updatedDate}.
        </p>
        <TrendFilters active={range} onChange={setRange} />
      </div>

      {/* List */}
      <div className="space-y-2">
        {sorted.map((repo, i) => (
          <TrendCard key={repo.full_name} repo={repo} range={range} rank={i + 1} />
        ))}
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-600 mt-6">
        Star data collected from the GitHub Search API every 6 hours. New projects are analyzed automatically.
      </p>
    </div>
  );
}
