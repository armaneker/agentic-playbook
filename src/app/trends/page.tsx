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

const ALL_CATEGORIES = 'All';

export default function TrendsPage() {
  const [range, setRange] = useState<TimeRange>('week');
  const [category, setCategory] = useState(ALL_CATEGORIES);

  // Collect unique categories from the data
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const repo of trendsData.repos as TrendRepo[]) {
      if (repo.category) set.add(repo.category);
    }
    return [ALL_CATEGORIES, ...Array.from(set).sort()];
  }, []);

  const sorted = useMemo(() => {
    const key = deltaKey[range];
    return [...(trendsData.repos as TrendRepo[])]
      .filter((r) => category === ALL_CATEGORIES || r.category === category)
      .sort((a, b) => (b[key] as number) - (a[key] as number));
  }, [range, category]);

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

        {/* Time range filters */}
        <TrendFilters active={range} onChange={setRange} />

        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                category === cat
                  ? 'bg-gray-700 text-gray-100'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              {cat}
              {cat !== ALL_CATEGORIES && (
                <span className="ml-1 text-gray-600">
                  {(trendsData.repos as TrendRepo[]).filter((r) => r.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {sorted.map((repo, i) => (
          <TrendCard key={repo.full_name} repo={repo} range={range} rank={i + 1} />
        ))}
      </div>

      {sorted.length === 0 && (
        <p className="text-sm text-gray-600 py-8 text-center">
          No repos found in this category.
        </p>
      )}

      {/* Footer note */}
      <p className="text-xs text-gray-600 mt-6">
        Star data collected from the GitHub Search API every 6 hours. New projects are analyzed automatically.
      </p>
    </div>
  );
}
