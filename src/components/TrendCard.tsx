import { Star, TrendingUp, TrendingDown, Minus, ExternalLink, Tag } from 'lucide-react';
import type { TimeRange } from './TrendFilters';

export interface TrendRepo {
  full_name: string;
  description: string;
  language: string;
  url: string;
  stars: number;
  delta_day: number;
  delta_week: number;
  delta_month: number;
  delta_year: number;
  has_summary: boolean;
  category: string;
  version: string | null;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toString();
}

function getDelta(repo: TrendRepo, range: TimeRange): number {
  switch (range) {
    case 'day': return repo.delta_day;
    case 'week': return repo.delta_week;
    case 'month': return repo.delta_month;
    case 'year': return repo.delta_year;
  }
}

const langColors: Record<string, string> = {
  TypeScript: 'bg-blue-400',
  Python: 'bg-yellow-400',
  Go: 'bg-cyan-400',
  Rust: 'bg-orange-400',
  JavaScript: 'bg-yellow-300',
  Java: 'bg-red-400',
  'C++': 'bg-pink-400',
  C: 'bg-gray-400',
  Swift: 'bg-orange-300',
  Kotlin: 'bg-purple-400',
  Ruby: 'bg-red-500',
  PHP: 'bg-indigo-400',
  Shell: 'bg-green-400',
  Dart: 'bg-teal-400',
};

const categoryColors: Record<string, string> = {
  'AI / ML': 'border-purple-500/40 text-purple-400',
  'Agentic': 'border-violet-500/40 text-violet-400',
  'Security': 'border-red-500/40 text-red-400',
  'Web Framework': 'border-blue-500/40 text-blue-400',
  'DevTools': 'border-emerald-500/40 text-emerald-400',
  'Database': 'border-amber-500/40 text-amber-400',
  'Mobile': 'border-cyan-500/40 text-cyan-400',
  'Infra': 'border-orange-500/40 text-orange-400',
  'Language': 'border-pink-500/40 text-pink-400',
  'Data': 'border-teal-500/40 text-teal-400',
  'Other': 'border-gray-500/40 text-gray-400',
};

export default function TrendCard({
  repo,
  range,
  rank,
}: {
  repo: TrendRepo;
  range: TimeRange;
  rank: number;
}) {
  const delta = getDelta(repo, range);
  const [owner, name] = repo.full_name.split('/');
  const summaryHref = `/trends/projects/${owner}-${name}`;

  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor = delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-gray-500';
  const dotColor = langColors[repo.language] || 'bg-gray-400';
  const catColor = categoryColors[repo.category] || categoryColors['Other'];

  return (
    <div className="group rounded-lg border border-gray-800 bg-gray-900/50 p-4 transition-colors hover:border-gray-700">
      <div className="flex items-start justify-between gap-4">
        {/* Left: rank + info */}
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-sm font-mono text-gray-600 pt-0.5 w-5 text-right shrink-0">
            {rank}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-gray-100 hover:text-brand-300 transition-colors truncate"
              >
                <span className="text-gray-500 font-normal">{owner}/</span>{name}
              </a>
              <ExternalLink size={12} className="text-gray-600 shrink-0" />
            </div>
            <p className="text-xs text-gray-500 mb-2 line-clamp-1">
              {repo.description}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Star size={12} className="text-yellow-500" />
                {formatNumber(repo.stars)}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                {repo.language}
              </span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${catColor}`}>
                {repo.category}
              </span>
              {repo.version && (
                <span className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                  <Tag size={10} className="text-gray-600" />
                  {repo.version}
                </span>
              )}
              {repo.has_summary && (
                <a
                  href={summaryHref}
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Summary
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right: delta */}
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          <TrendIcon size={14} className={trendColor} />
          <span className={`text-sm font-semibold tabular-nums ${trendColor}`}>
            {delta > 0 ? '+' : ''}{formatNumber(delta)}
          </span>
        </div>
      </div>
    </div>
  );
}
