'use client';

import { useState, useMemo } from 'react';
import TrendFilters, { type TimeRange } from '@/components/TrendFilters';
import TrendCard, { type TrendRepo } from '@/components/TrendCard';
import RepoPopup from '@/components/RepoPopup';
import { deltaKey } from '@/lib/trends';
import trendsData from '@/data/trends/computed/trends.json';

const ALL_CATEGORIES = 'All';
const repos = trendsData.repos as TrendRepo[];

export default function TrendsPage() {
  const [range, setRange] = useState<TimeRange>('week');
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [selectedRepo, setSelectedRepo] = useState<TrendRepo | null>(null);

  const { categories, categoryCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const repo of repos) {
      if (repo.category) counts[repo.category] = (counts[repo.category] || 0) + 1;
    }
    return {
      categories: [ALL_CATEGORIES, ...Object.keys(counts).sort()],
      categoryCounts: counts,
    };
  }, []);

  const sorted = useMemo(() => {
    const key = deltaKey[range];
    return [...repos]
      .filter((r) => category === ALL_CATEGORIES || r.category === category)
      .sort((a, b) => (b[key as keyof TrendRepo] as number) - (a[key as keyof TrendRepo] as number));
  }, [range, category]);

  const updatedDate = new Date(trendsData.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="not-prose">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-50 mb-2">
          Trending Repos
        </h1>
        <p className="text-sm text-gray-500 mb-5">
          GitHub projects gaining stars. Updated {updatedDate}.
        </p>

        <TrendFilters active={range} onChange={setRange} />

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
                <span className="ml-1 text-gray-600">{categoryCounts[cat]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((repo, i) => (
          <TrendCard
            key={repo.full_name}
            repo={repo}
            range={range}
            rank={i + 1}
            onClick={() => setSelectedRepo(repo)}
          />
        ))}
      </div>

      {sorted.length === 0 && (
        <p className="text-sm text-gray-600 py-8 text-center">
          No repos found in this category.
        </p>
      )}

      <p className="text-xs text-gray-600 mt-6">
        Star data collected from the GitHub Search API every 6 hours. New projects are analyzed automatically.
      </p>

      {selectedRepo && (
        <RepoPopup repo={selectedRepo} onClose={() => setSelectedRepo(null)} />
      )}
    </div>
  );
}
